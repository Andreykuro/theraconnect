const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  res.json(db.prepare("SELECT * FROM notifications_log ORDER BY created_at DESC LIMIT 100").all());
});

module.exports = router;
