const express = require("express");
const { ask } = require("../services/chatbotEngine");

const router = express.Router();

// Public-ish endpoint (still requires auth so it's tied to a logged-in role)
const { requireAuth } = require("../middleware/auth");

router.post("/ask", requireAuth, (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  res.json(ask(message));
});

module.exports = router;
