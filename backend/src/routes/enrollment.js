const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value) {
  const digits = text(value).replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^639\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  return null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function tokenFor(user) {
  const payload = {
    id: user.id,
    role: user.role,
    name: user.name,
    therapist_id: user.therapist_id,
  };
  return { payload, token: jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" }) };
}

// Public choices used by the parent enrollment form. Only active therapists
// are offered, and treatment types come from their current specialties.
router.get("/options", (req, res) => {
  const therapists = db
    .prepare(
      `SELECT id, name, specialty, color
       FROM therapists
       WHERE active = 1
       ORDER BY specialty ASC, name ASC`
    )
    .all();

  const treatment_types = [...new Set(therapists.map((therapist) => therapist.specialty))];
  res.json({ treatment_types, therapists });
});

// Public self-enrollment. The parent account and patient profile are created
// in one transaction so a failure can never leave an orphaned record.
router.post("/", (req, res) => {
  const guardian_name = text(req.body?.guardian_name);
  const guardian_phone_input = text(req.body?.guardian_phone);
  const guardian_phone = normalizePhone(guardian_phone_input);
  const email = text(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const patient_name = text(req.body?.patient_name);
  const birthdate = text(req.body?.birthdate);
  const service_type = text(req.body?.service_type);
  const therapist_id = Number(req.body?.therapist_id);
  const notes = text(req.body?.notes);

  if (!guardian_name || !guardian_phone_input || !email || !password || !patient_name || !birthdate) {
    return res.status(400).json({
      error: "Guardian, contact, credentials, and patient information are required",
    });
  }
  if (!service_type || !Number.isInteger(therapist_id) || therapist_id < 1) {
    return res.status(400).json({ error: "Please choose a treatment and therapist" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }
  if (!guardian_phone) {
    return res.status(400).json({ error: "Please enter a valid Philippine mobile number" });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: "Password must be between 8 and 72 characters" });
  }
  if (guardian_name.length > 120 || patient_name.length > 120 || notes.length > 1000) {
    return res.status(400).json({ error: "One or more fields are too long" });
  }

  const parsedBirthdate = new Date(`${birthdate}T00:00:00`);
  const normalizedBirthdate = Number.isNaN(parsedBirthdate.getTime())
    ? ""
    : `${parsedBirthdate.getFullYear()}-${String(parsedBirthdate.getMonth() + 1).padStart(2, "0")}-${String(
        parsedBirthdate.getDate()
      ).padStart(2, "0")}`;
  if (normalizedBirthdate !== birthdate || parsedBirthdate > new Date()) {
    return res.status(400).json({ error: "Please enter a valid patient birthdate" });
  }

  const therapist = db
    .prepare("SELECT id, name, specialty, color FROM therapists WHERE id = ? AND active = 1")
    .get(therapist_id);
  if (!therapist) {
    return res.status(400).json({ error: "The selected therapist is no longer available" });
  }
  if (therapist.specialty !== service_type) {
    return res.status(400).json({ error: "The selected therapist does not offer that treatment" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  try {
    const createEnrollment = db.transaction(() => {
      const userInfo = db
        .prepare(
          `INSERT INTO users (email, password_hash, role, name, therapist_id)
           VALUES (?, ?, 'parent', ?, NULL)`
        )
        .run(email, bcrypt.hashSync(password, 10), guardian_name);

      const clientInfo = db
        .prepare(
          `INSERT INTO clients
             (name, birthdate, service_type, guardian_name, guardian_phone,
              guardian_email, therapist_id, user_id, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          patient_name,
          birthdate,
          service_type,
          guardian_name,
          guardian_phone,
          email,
          therapist.id,
          userInfo.lastInsertRowid,
          notes || null
        );

      return {
        user: db.prepare("SELECT * FROM users WHERE id = ?").get(userInfo.lastInsertRowid),
        client: db.prepare("SELECT * FROM clients WHERE id = ?").get(clientInfo.lastInsertRowid),
      };
    });

    const { user, client } = createEnrollment();
    const auth = tokenFor(user);
    res.status(201).json({
      token: auth.token,
      user: auth.payload,
      enrollment: {
        ...client,
        therapist_name: therapist.name,
        therapist_specialty: therapist.specialty,
        therapist_color: therapist.color,
      },
    });
  } catch (error) {
    if (String(error.message).includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }
    throw error;
  }
});

// Parent-facing enrollment summary inside the protected portal.
router.get("/me", requireAuth, requireRole("parent"), (req, res) => {
  const enrollment = db
    .prepare(
      `SELECT c.*, t.name AS therapist_name, t.specialty AS therapist_specialty,
              t.color AS therapist_color
       FROM clients c
       LEFT JOIN therapists t ON t.id = c.therapist_id
       WHERE c.user_id = ?
       ORDER BY c.id ASC
       LIMIT 1`
    )
    .get(req.user.id);

  if (!enrollment) {
    return res.status(404).json({ error: "No enrollment is linked to this parent account" });
  }
  res.json({ enrollment });
});

module.exports = router;
