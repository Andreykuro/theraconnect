const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM therapists WHERE active = 1 ORDER BY name ASC").all());
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, specialty, color, phone, email } = req.body || {};
  if (!name || !specialty) return res.status(400).json({ error: "name and specialty are required" });
  const info = db
    .prepare("INSERT INTO therapists (name, specialty, color, phone, email) VALUES (?, ?, ?, ?, ?)")
    .run(name, specialty, color || "#146B6B", phone || null, email || null);
  res.status(201).json(db.prepare("SELECT * FROM therapists WHERE id = ?").get(info.lastInsertRowid));
});

module.exports = router;
