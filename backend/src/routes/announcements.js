const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendEmail } = require("../services/notify");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM announcements ORDER BY created_at DESC").all());
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { title, body, category } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: "title and body are required" });

  const info = db
    .prepare("INSERT INTO announcements (title, body, category, created_by) VALUES (?, ?, ?, ?)")
    .run(title, body, category || "general", req.user.id);

  const announcement = db.prepare("SELECT * FROM announcements WHERE id = ?").get(info.lastInsertRowid);

  // Fan out an email to every guardian on file with a distinct email address.
  const guardians = db
    .prepare("SELECT DISTINCT guardian_email FROM clients WHERE guardian_email IS NOT NULL")
    .all();
  for (const g of guardians) {
    sendEmail({ to: g.guardian_email, subject: title, message: body }).catch(() => {});
  }

  res.status(201).json(announcement);
});

module.exports = router;
