const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value) => (typeof value === "string" ? value.trim() : "");

// Profile + login account + workload numbers for the admin Therapists page.
function withDetails(therapist) {
  const login = db
    .prepare("SELECT id, email FROM users WHERE role = 'therapist' AND therapist_id = ? ORDER BY id ASC LIMIT 1")
    .get(therapist.id);
  const caseload = db
    .prepare(
      `SELECT COUNT(*) AS n FROM clients c
       WHERE c.status = 'active' AND (c.therapist_id = ? OR EXISTS (
         SELECT 1 FROM client_therapists ct WHERE ct.client_id = c.id AND ct.therapist_id = ?))`
    )
    .get(therapist.id, therapist.id).n;
  const upcoming = db
    .prepare(
      `SELECT COUNT(*) AS n FROM appointments
       WHERE therapist_id = ? AND status != 'cancelled' AND start_time >= ?`
    )
    .get(therapist.id, new Date().toISOString()).n;
  return {
    ...therapist,
    login_email: login?.email || null,
    has_login: Boolean(login),
    caseload,
    upcoming_sessions: upcoming,
  };
}

function validate({ name, specialty, color, email }) {
  if (!name) return "Name is required";
  if (!specialty) return "Specialty is required";
  if (name.length > 120 || specialty.length > 80) return "Name or specialty is too long";
  if (color && !COLOR_RE.test(color)) return "Color must look like #146B6B";
  if (email && !EMAIL_RE.test(email)) return "Please enter a valid email address";
  return null;
}

// Everyone signed in gets the active list (booking forms, calendars).
// Admins can ask for ?all=1 to include deactivated therapists.
router.get("/", requireAuth, (req, res) => {
  const includeInactive = req.user.role === "admin" && req.query.all === "1";
  const rows = db
    .prepare(`SELECT * FROM therapists ${includeInactive ? "" : "WHERE active = 1"} ORDER BY name ASC`)
    .all();
  res.json(req.user.role === "admin" ? rows.map(withDetails) : rows);
});

// Create a therapist profile, and optionally their login account in one go.
router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const body = req.body || {};
  const fields = {
    name: clean(body.name),
    specialty: clean(body.specialty),
    color: clean(body.color) || "#146B6B",
    phone: clean(body.phone) || null,
    email: clean(body.email).toLowerCase() || null,
  };
  const error = validate(fields);
  if (error) return res.status(400).json({ error });

  const createLogin = Boolean(body.create_login);
  const password = typeof body.password === "string" ? body.password : "";
  if (createLogin) {
    if (!fields.email) return res.status(400).json({ error: "An email is needed for the login account" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(fields.email)) {
      return res.status(409).json({ error: "That email is already used by another account" });
    }
  }

  let therapistId;
  db.transaction(() => {
    const info = db
      .prepare("INSERT INTO therapists (name, specialty, color, phone, email) VALUES (?, ?, ?, ?, ?)")
      .run(fields.name, fields.specialty, fields.color, fields.phone, fields.email);
    therapistId = info.lastInsertRowid;
    if (createLogin) {
      db.prepare(
        "INSERT INTO users (email, password_hash, role, name, therapist_id) VALUES (?, ?, 'therapist', ?, ?)"
      ).run(fields.email, bcrypt.hashSync(password, 10), fields.name, therapistId);
    }
  })();

  res.status(201).json(withDetails(db.prepare("SELECT * FROM therapists WHERE id = ?").get(therapistId)));
});

// Edit profile details or activate/deactivate a therapist.
router.put("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const existing = db.prepare("SELECT * FROM therapists WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Therapist not found" });

  const body = req.body || {};
  const fields = {
    name: "name" in body ? clean(body.name) : existing.name,
    specialty: "specialty" in body ? clean(body.specialty) : existing.specialty,
    color: "color" in body ? clean(body.color) : existing.color,
    phone: "phone" in body ? clean(body.phone) || null : existing.phone,
    email: "email" in body ? clean(body.email).toLowerCase() || null : existing.email,
    active: "active" in body ? (body.active ? 1 : 0) : existing.active,
  };
  const error = validate(fields);
  if (error) return res.status(400).json({ error });

  db.prepare("UPDATE therapists SET name=?, specialty=?, color=?, phone=?, email=?, active=? WHERE id=?").run(
    fields.name,
    fields.specialty,
    fields.color,
    fields.phone,
    fields.email,
    fields.active,
    existing.id
  );
  // Keep the login's display name in step with the profile.
  db.prepare("UPDATE users SET name = ? WHERE role = 'therapist' AND therapist_id = ?").run(fields.name, existing.id);

  res.json(withDetails(db.prepare("SELECT * FROM therapists WHERE id = ?").get(existing.id)));
});

module.exports = router;
