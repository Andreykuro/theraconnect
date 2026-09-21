const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/login", (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  // Optional: role na pinili sa login page (parent / therapist / admin)
  const role = typeof req.body?.role === "string" ? req.body.role.trim().toLowerCase() : "";
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Tama na ang email at password, pero kung ibang role ang pinili, hindi papapasukin
  if (role && role !== user.role) {
    return res.status(403).json({
      error: "This account doesn't match the role you selected. Please choose the right role and try again.",
    });
  }

  const payload = {
    id: user.id,
    role: user.role,
    name: user.name,
    therapist_id: user.therapist_id,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, user: payload });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;