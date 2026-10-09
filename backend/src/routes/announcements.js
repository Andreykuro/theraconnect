const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendEmail } = require("../services/notify");

const router = express.Router();

// --- Newsfeed photos ---
const IMAGE_DIR = path.join(__dirname, "..", "..", "uploads", "announcements");
fs.mkdirSync(IMAGE_DIR, { recursive: true });
const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGES = 6;

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGE_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_MIME.has(file.mimetype)) return cb(new Error("Only JPG, PNG, WEBP or GIF photos can be posted"));
    cb(null, true);
  },
});

// Turns multer errors (too big, wrong type, too many) into a friendly 400.
function acceptImages(req, res, next) {
  upload.array("images", MAX_IMAGES)(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each photo must be 8 MB or smaller"
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
          ? `You can attach up to ${MAX_IMAGES} photos`
          : err.message;
    res.status(400).json({ error: message });
  });
}

function removeFiles(filenames) {
  for (const name of filenames) {
    fs.unlink(path.join(IMAGE_DIR, path.basename(name)), () => {});
  }
}

const CATEGORIES = new Set(["general", "holiday", "promo"]);
const AUDIENCES = new Set(["all", "parents", "therapists"]);

// Which posts a role may see.
function audienceFilter(role) {
  if (role === "parent") return "a.audience IN ('all','parents')";
  if (role === "therapist") return "a.audience IN ('all','therapists')";
  return "1=1";
}

function withImages(post) {
  const images = db
    .prepare("SELECT id, filename FROM announcement_images WHERE announcement_id = ? ORDER BY position ASC, id ASC")
    .all(post.id)
    .map((img) => ({ id: img.id, url: `/api/announcements/images/${img.filename}` }));
  return { ...post, pinned: Boolean(post.pinned), images };
}

function getPost(id) {
  return db
    .prepare(
      `SELECT a.*, u.name AS author_name FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by WHERE a.id = ?`
    )
    .get(id);
}

// GET /api/announcements/images/:filename - newsfeed photos. Served from this
// router (not a separate static folder in server.js) so the photos work as
// long as this file is in place. Public on purpose: <img> tags can't send the
// login token, and these are clinic posts meant for every family.
router.get("/images/:filename", (req, res) => {
  const name = path.basename(req.params.filename);
  const file = path.join(IMAGE_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "Photo not found" });
  res.set("Cache-Control", "public, max-age=86400");
  res.sendFile(file);
});

// GET /api/announcements?category=  - the newsfeed (pinned first, newest next)
router.get("/", requireAuth, (req, res) => {
  const params = [];
  let sql = `SELECT a.*, u.name AS author_name FROM announcements a
             LEFT JOIN users u ON u.id = a.created_by
             WHERE ${audienceFilter(req.user.role)}`;
  if (CATEGORIES.has(req.query.category)) {
    sql += " AND a.category = ?";
    params.push(req.query.category);
  }
  sql += " ORDER BY a.pinned DESC, a.created_at DESC, a.id DESC";
  res.json(db.prepare(sql).all(...params).map(withImages));
});

// POST /api/announcements  (admin) - multipart: title, body, category, audience, pinned, send_email, images[]
router.post("/", requireAuth, requireRole("admin"), acceptImages, (req, res) => {
  const files = req.files || [];
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  const category = CATEGORIES.has(req.body?.category) ? req.body.category : "general";
  const audience = AUDIENCES.has(req.body?.audience) ? req.body.audience : "all";
  const pinned = req.body?.pinned === "true" || req.body?.pinned === true ? 1 : 0;
  const sendEmails = req.body?.send_email !== "false" && req.body?.send_email !== false;

  if (!body && files.length === 0) {
    removeFiles(files.map((f) => f.filename));
    return res.status(400).json({ error: "Write something or add a photo" });
  }
  if (title.length > 150 || body.length > 5000) {
    removeFiles(files.map((f) => f.filename));
    return res.status(400).json({ error: "The title or message is too long" });
  }

  let postId;
  db.transaction(() => {
    const info = db
      .prepare(
        "INSERT INTO announcements (title, body, category, audience, pinned, created_by) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(title, body, category, audience, pinned, req.user.id);
    postId = info.lastInsertRowid;
    const insertImage = db.prepare(
      "INSERT INTO announcement_images (announcement_id, filename, original_name, mime_type, position) VALUES (?, ?, ?, ?, ?)"
    );
    files.forEach((f, i) => insertImage.run(postId, f.filename, f.originalname, f.mimetype, i));
  })();

  // Email every guardian on file when the post is meant for parents.
  if (sendEmails && audience !== "therapists") {
    const guardians = db
      .prepare("SELECT DISTINCT guardian_email FROM clients WHERE guardian_email IS NOT NULL")
      .all();
    const subject = title || "News from TheraFun Intervention Centre";
    const message = `${body || "We posted new photos."}\n\nSee the full post in the TheraConnect parent portal.`;
    for (const g of guardians) {
      sendEmail({ to: g.guardian_email, subject, message }).catch(() => {});
    }
  }

  res.status(201).json(withImages(getPost(postId)));
});

// PUT /api/announcements/:id  (admin) - edit text, category, audience, or pin
router.put("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const existing = getPost(req.params.id);
  if (!existing) return res.status(404).json({ error: "Post not found" });
  const b = req.body || {};
  const next = {
    title: typeof b.title === "string" ? b.title.trim() : existing.title,
    body: typeof b.body === "string" ? b.body.trim() : existing.body,
    category: CATEGORIES.has(b.category) ? b.category : existing.category,
    audience: AUDIENCES.has(b.audience) ? b.audience : existing.audience,
    pinned: "pinned" in b ? (b.pinned ? 1 : 0) : existing.pinned,
  };
  if (next.title.length > 150 || next.body.length > 5000) {
    return res.status(400).json({ error: "The title or message is too long" });
  }
  db.prepare("UPDATE announcements SET title=?, body=?, category=?, audience=?, pinned=? WHERE id=?").run(
    next.title,
    next.body,
    next.category,
    next.audience,
    next.pinned,
    existing.id
  );
  res.json(withImages(getPost(existing.id)));
});

// DELETE /api/announcements/:id  (admin) - removes the post and its photos
router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const existing = getPost(req.params.id);
  if (!existing) return res.status(404).json({ error: "Post not found" });
  const images = db.prepare("SELECT filename FROM announcement_images WHERE announcement_id = ?").all(existing.id);
  db.transaction(() => {
    db.prepare("DELETE FROM announcement_images WHERE announcement_id = ?").run(existing.id);
    db.prepare("DELETE FROM announcements WHERE id = ?").run(existing.id);
  })();
  removeFiles(images.map((i) => i.filename));
  res.json({ ok: true });
});

module.exports = router;
