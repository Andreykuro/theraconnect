const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function getClient(clientId) {
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId);
}

function canAccessClient(user, client) {
  if (!client) return false;
  if (user.role === "admin") return true;
  if (user.role === "therapist") return Number(client.therapist_id) === Number(user.therapist_id);
  return user.role === "parent" && Number(client.user_id) === Number(user.id);
}

function threadFor(clientId, readerRole) {
  // Mark the other party's messages as read the moment this thread is opened.
  const otherRole = readerRole === "therapist" ? "parent" : "therapist";
  db.prepare(
    `UPDATE messages SET read_at = datetime('now')
     WHERE client_id = ? AND sender_role = ? AND read_at IS NULL`
  ).run(clientId, otherRole);

  const client = db.prepare("SELECT id, name, therapist_id FROM clients WHERE id = ?").get(clientId);
  const messages = db
    .prepare(
      `SELECT m.*, u.name AS sender_name FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.client_id = ? ORDER BY m.created_at ASC`
    )
    .all(clientId);

  return { client, messages };
}

function sendMessage(clientId, user, body) {
  const trimmed = typeof body === "string" ? body.trim() : "";
  if (!trimmed) return null;

  const info = db
    .prepare("INSERT INTO messages (client_id, sender_id, sender_role, body) VALUES (?, ?, ?, ?)")
    .run(clientId, user.id, user.role, trimmed);

  return db
    .prepare(
      `SELECT m.*, u.name AS sender_name FROM messages m
       JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
    )
    .get(info.lastInsertRowid);
}

function parentsOwnClient(userId) {
  return db.prepare("SELECT id FROM clients WHERE user_id = ? ORDER BY id ASC LIMIT 1").get(userId);
}

function getMessageWithSender(id) {
  return db
    .prepare(
      `SELECT m.*, u.name AS sender_name FROM messages m
       JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
    )
    .get(id);
}

// --- Parent: their own thread (mirrors the /progress/me convention) ---
router.get("/me", requireAuth, requireRole("parent"), (req, res) => {
  const client = parentsOwnClient(req.user.id);
  if (!client) return res.status(404).json({ error: "No patient profile is linked to this account" });
  res.json(threadFor(client.id, "parent"));
});

router.post("/me", requireAuth, requireRole("parent"), (req, res) => {
  const client = parentsOwnClient(req.user.id);
  if (!client) return res.status(404).json({ error: "No patient profile is linked to this account" });
  const message = sendMessage(client.id, req.user, req.body?.body);
  if (!message) return res.status(400).json({ error: "Message body is required" });
  res.status(201).json(message);
});

// --- Therapist inbox: one row per assigned client, with last message + unread count ---
router.get("/threads", requireAuth, requireRole("therapist", "admin"), (req, res) => {
  let sql = "SELECT id, name FROM clients WHERE 1=1";
  const params = [];
  if (req.user.role === "therapist") {
    sql += " AND therapist_id = ?";
    params.push(req.user.therapist_id);
  }
  sql += " ORDER BY name ASC";

  const threads = db
    .prepare(sql)
    .all(...params)
    .map((c) => {
      const last = db
        .prepare(
          "SELECT body, sender_role, created_at, deleted_at FROM messages WHERE client_id = ? ORDER BY created_at DESC LIMIT 1"
        )
        .get(c.id);
      const unread = db
        .prepare(
          `SELECT COUNT(*) AS n FROM messages
           WHERE client_id = ? AND sender_role = 'parent' AND read_at IS NULL AND deleted_at IS NULL`
        )
        .get(c.id);
      return {
        client_id: c.id,
        client_name: c.name,
        last_message: last ? (last.deleted_at ? "Unsent a message" : last.body) : null,
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

router.post("/clients/:clientId", requireAuth, requireRole("admin", "therapist"), (req, res) => {
  const client = getClient(req.params.clientId);
  if (!canAccessClient(req.user, client)) return res.status(403).json({ error: "Forbidden" });
  const message = sendMessage(client.id, req.user, req.body?.body);
  if (!message) return res.status(400).json({ error: "Message body is required" });
  res.status(201).json(message);
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
  if (!body) return res.status(400).json({ error: "Message body is required" });

  db.prepare("UPDATE messages SET body = ?, edited_at = datetime('now') WHERE id = ?").run(
    body,
    message.id
  );
  res.json(getMessageWithSender(message.id));
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
    return res.json(getMessageWithSender(message.id)); // already unsent - no-op
  }

  db.prepare("UPDATE messages SET body = '', deleted_at = datetime('now') WHERE id = ?").run(message.id);
  res.json(getMessageWithSender(message.id));
});

module.exports = router;
