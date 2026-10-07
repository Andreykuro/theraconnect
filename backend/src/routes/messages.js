const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../db");
const { therapistCanAccess, ON_CASELOAD_SQL } = require("../services/careTeam");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// --- Chat photo uploads ---
// Deliberately NOT under /uploads (which is served as public static files):
// photos of children shared between a parent and therapist should only be
// viewable by people who can open that thread, so they're served through
// the auth-checked GET /:messageId/image route below.
const IMAGE_DIR = path.join(__dirname, "..", "..", "private_uploads", "messages");
fs.mkdirSync(IMAGE_DIR, { recursive: true });

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGE_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_MIME.has(file.mimetype)) return cb(new Error("Only photos (JPG, PNG, WEBP, GIF, HEIC) can be sent"));
    cb(null, true);
  },
});

function removeImageFile(filename) {
  if (!filename) return;
  fs.unlink(path.join(IMAGE_DIR, path.basename(filename)), () => {});
}

// Never leak the on-disk filename - the client only needs to know there is one.
function present(m) {
  if (!m) return m;
  const { image_path, ...rest } = m;
  return { ...rest, has_image: Boolean(image_path) };
}

function getClient(clientId) {
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId);
}

function canAccessClient(user, client) {
  if (!client) return false;
  if (user.role === "admin") return true;
  if (user.role === "therapist") return therapistCanAccess(user, client);
  return user.role === "parent" && Number(client.user_id) === Number(user.id);
}

function getMessageWithSender(id) {
  return db
    .prepare(
      `SELECT m.*, u.name AS sender_name FROM messages m
       JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
    )
    .get(id);
}

function threadFor(clientId, readerRole) {
  // Mark the other side's messages as read the moment this thread is opened.
  // Parents read everything the clinic sent (therapist or admin); therapists
  // read the parent's messages. An admin just looking doesn't mark anything.
  if (readerRole === "parent") {
    db.prepare(
      `UPDATE messages SET read_at = datetime('now')
       WHERE client_id = ? AND sender_role != 'parent' AND read_at IS NULL`
    ).run(clientId);
  } else if (readerRole === "therapist") {
    db.prepare(
      `UPDATE messages SET read_at = datetime('now')
       WHERE client_id = ? AND sender_role = 'parent' AND read_at IS NULL`
    ).run(clientId);
  }

  const client = db.prepare("SELECT id, name, therapist_id FROM clients WHERE id = ?").get(clientId);
  const messages = db
    .prepare(
      `SELECT m.*, u.name AS sender_name FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.client_id = ? ORDER BY m.created_at ASC, m.id ASC`
    )
    .all(clientId)
    .map(present);

  return { client, messages };
}

// Returns { message } on success or { error } when there's nothing to send.
function sendMessage(clientId, user, body, file) {
  const trimmed = typeof body === "string" ? body.trim() : "";
  if (!trimmed && !file) return { error: "Type a message or attach a photo" };
  if (trimmed.length > 4000) {
    removeImageFile(file?.filename);
    return { error: "Message is too long" };
  }

  const info = db
    .prepare("INSERT INTO messages (client_id, sender_id, sender_role, body, image_path) VALUES (?, ?, ?, ?, ?)")
    .run(clientId, user.id, user.role, trimmed, file ? file.filename : null);

  return { message: present(getMessageWithSender(info.lastInsertRowid)) };
}

function parentsOwnClient(userId) {
  return db.prepare("SELECT id FROM clients WHERE user_id = ? ORDER BY id ASC LIMIT 1").get(userId);
}

// --- Parent: their own thread (mirrors the /progress/me convention) ---
router.get("/me", requireAuth, requireRole("parent"), (req, res) => {
  const client = parentsOwnClient(req.user.id);
  if (!client) return res.status(404).json({ error: "No patient profile is linked to this account" });
  res.json(threadFor(client.id, "parent"));
});

router.post("/me", requireAuth, requireRole("parent"), upload.single("image"), (req, res) => {
  const client = parentsOwnClient(req.user.id);
  if (!client) {
    removeImageFile(req.file?.filename);
    return res.status(404).json({ error: "No patient profile is linked to this account" });
  }
  const { message, error } = sendMessage(client.id, req.user, req.body?.body, req.file);
  if (error) return res.status(400).json({ error });
  res.status(201).json(message);
});

// --- Unread badge for the sidebar Messages link ---
router.get("/unread-count", requireAuth, (req, res) => {
  let count = 0;
  if (req.user.role === "parent") {
    count = db
      .prepare(
        `SELECT COUNT(*) AS n FROM messages m JOIN clients c ON c.id = m.client_id
         WHERE c.user_id = ? AND m.sender_role != 'parent' AND m.read_at IS NULL AND m.deleted_at IS NULL`
      )
      .get(req.user.id).n;
  } else if (req.user.role === "therapist") {
    count = db
      .prepare(
        `SELECT COUNT(*) AS n FROM messages m JOIN clients c ON c.id = m.client_id
         WHERE ${ON_CASELOAD_SQL} AND m.sender_role = 'parent' AND m.read_at IS NULL AND m.deleted_at IS NULL`
      )
      .get(req.user.therapist_id, req.user.therapist_id).n;
  }
  res.json({ count });
});

// --- Therapist inbox: one row per assigned client, with last message + unread count ---
router.get("/threads", requireAuth, requireRole("therapist", "admin"), (req, res) => {
  let sql = "SELECT c.id, c.name FROM clients c WHERE 1=1";
  const params = [];
  if (req.user.role === "therapist") {
    sql += ` AND ${ON_CASELOAD_SQL}`;
    params.push(req.user.therapist_id, req.user.therapist_id);
  }
  sql += " ORDER BY c.name ASC";

  const threads = db
    .prepare(sql)
    .all(...params)
    .map((c) => {
      const last = db
        .prepare(
          `SELECT body, sender_role, created_at, deleted_at, image_path FROM messages
           WHERE client_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`
        )
        .get(c.id);
      const unread = db
        .prepare(
          `SELECT COUNT(*) AS n FROM messages
           WHERE client_id = ? AND sender_role = 'parent' AND read_at IS NULL AND deleted_at IS NULL`
        )
        .get(c.id);

      let preview = null;
      if (last) {
        if (last.deleted_at) preview = "Unsent a message";
        else if (last.body) preview = last.body;
        else if (last.image_path) preview = "Sent a photo";
      }

      return {
        client_id: c.id,
        client_name: c.name,
        last_message: preview,
        last_sender: last?.sender_role ?? null,
        last_at: last?.created_at ?? null,
        unread: unread.n,
      };
    })
    .sort((a, b) => {
      if (!a.last_at && !b.last_at) return 0;
      if (!a.last_at) return 1;
      if (!b.last_at) return -1;
      return new Date(b.last_at) - new Date(a.last_at);
    });

  res.json(threads);
});

// --- Admin/therapist: a specific client's thread ---
router.get("/clients/:clientId", requireAuth, (req, res) => {
  const client = getClient(req.params.clientId);
  if (!canAccessClient(req.user, client)) return res.status(403).json({ error: "Forbidden" });
  res.json(threadFor(client.id, req.user.role));
});

router.post(
  "/clients/:clientId",
  requireAuth,
  requireRole("admin", "therapist"),
  upload.single("image"),
  (req, res) => {
    const client = getClient(req.params.clientId);
    if (!canAccessClient(req.user, client)) {
      removeImageFile(req.file?.filename);
      return res.status(403).json({ error: "Forbidden" });
    }
    const { message, error } = sendMessage(client.id, req.user, req.body?.body, req.file);
    if (error) return res.status(400).json({ error });
    res.status(201).json(message);
  }
);

// --- Photo for a message - same access rule as the thread itself ---
router.get("/:messageId/image", requireAuth, (req, res) => {
  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(req.params.messageId);
  if (!message || !message.image_path || message.deleted_at) {
    return res.status(404).json({ error: "Photo not found" });
  }
  if (!canAccessClient(req.user, getClient(message.client_id))) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.set("Cache-Control", "private, max-age=86400");
  res.sendFile(path.join(IMAGE_DIR, path.basename(message.image_path)), (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: "Photo not found" });
  });
});

// --- Edit / unsend a message. Works for any role (parent, therapist, admin)
// since access is checked the same way the thread itself is: the caller
// must be able to see this client's thread, AND must be the original
// sender - nobody can edit or unsend someone else's message. ---
router.patch("/:messageId", requireAuth, (req, res) => {
  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(req.params.messageId);
  if (!message) return res.status(404).json({ error: "Message not found" });

  const client = getClient(message.client_id);
  if (!canAccessClient(req.user, client)) return res.status(403).json({ error: "Forbidden" });
  if (Number(message.sender_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: "You can only edit your own messages" });
  }
  if (message.deleted_at) {
    return res.status(400).json({ error: "An unsent message can't be edited" });
  }

  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  // A photo message may have its caption cleared; a text-only one can't go blank.
  if (!body && !message.image_path) return res.status(400).json({ error: "Message body is required" });
  if (body.length > 4000) return res.status(400).json({ error: "Message is too long" });

  db.prepare("UPDATE messages SET body = ?, edited_at = datetime('now') WHERE id = ?").run(body, message.id);
  res.json(present(getMessageWithSender(message.id)));
});

router.delete("/:messageId", requireAuth, (req, res) => {
  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(req.params.messageId);
  if (!message) return res.status(404).json({ error: "Message not found" });

  const client = getClient(message.client_id);
  if (!canAccessClient(req.user, client)) return res.status(403).json({ error: "Forbidden" });
  if (Number(message.sender_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: "You can only unsend your own messages" });
  }
  if (message.deleted_at) {
    return res.json(present(getMessageWithSender(message.id))); // already unsent - no-op
  }

  // Unsending a photo really removes it from disk, not just from view.
  removeImageFile(message.image_path);
  db.prepare(
    "UPDATE messages SET body = '', image_path = NULL, deleted_at = datetime('now') WHERE id = ?"
  ).run(message.id);
  res.json(present(getMessageWithSender(message.id)));
});

// Friendly error for rejected photos (wrong type / too large) instead of a raw 500.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "Photo is too large (max 8MB)" : err.message;
    return res.status(400).json({ error: msg });
  }
  if (err) return res.status(400).json({ error: err.message || "Upload failed" });
  next();
});

module.exports = router;
