const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// --- Attachment uploads (doctor's note / diagnosis images) ---
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "enrollment");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10);
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: 5 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Only image files (JPG, PNG, WEBP, HEIC) are accepted"));
    }
    cb(null, true);
  },
});

function attachmentsFor(clientId) {
  return db
    .prepare(
      `SELECT id, label, original_name, mime_type, size_bytes, created_at,
              '/api/uploads/enrollment/' || filename AS url
       FROM client_attachments WHERE client_id = ? ORDER BY created_at DESC`
    )
    .all(clientId);
}

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

const MIN_AGE_YEARS = 2;

// Buong taon lang ang tinitignan dito (year/month/day), hindi oras - kaya
// gumagamit ng simpleng date math sa halip na ms-per-day division.
function ageInYears(birthdate, onDate = new Date()) {
  const [y, m, d] = birthdate.split("-").map(Number);
  let age = onDate.getFullYear() - y;
  const hadBirthdayThisYear =
    onDate.getMonth() + 1 > m || (onDate.getMonth() + 1 === m && onDate.getDate() >= d);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
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
  const diagnosis = text(req.body?.diagnosis);
  const notes = text(req.body?.notes);

  if (!guardian_name || !guardian_phone_input || !email || !password || !patient_name || !birthdate) {
    return res.status(400).json({
      error: "Guardian, contact, credentials, and patient information are required",
    });
  }
  if (!service_type) {
    return res.status(400).json({ error: "Please choose a type of treatment" });
  }
  if (!diagnosis) {
    return res.status(400).json({
      error: "A doctor's diagnosis is required so the clinic can confirm the right kind of care",
    });
  }
  if (diagnosis.length > 2000) {
    return res.status(400).json({ error: "The diagnosis description is too long" });
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
  if (ageInYears(normalizedBirthdate) < MIN_AGE_YEARS) {
    return res.status(400).json({
      error: `The patient must be at least ${MIN_AGE_YEARS} years old to register`,
    });
  }

  const hasTherapistForService = db
    .prepare("SELECT 1 FROM therapists WHERE specialty = ? AND active = 1 LIMIT 1")
    .get(service_type);
  if (!hasTherapistForService) {
    return res.status(400).json({ error: "That treatment isn't currently offered" });
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
              guardian_email, therapist_id, user_id, notes, status, diagnosis)
           VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 'pending', ?)`
        )
        .run(
          patient_name,
          birthdate,
          service_type,
          guardian_name,
          guardian_phone,
          email,
          userInfo.lastInsertRowid,
          notes || null,
          diagnosis
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
      enrollment: client,
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

// Parent: attachments linked to their own enrollment (add more any time, e.g.
// after the initial signup, or a follow-up diagnosis).
router.get("/me/attachments", requireAuth, requireRole("parent"), (req, res) => {
  const client = db
    .prepare("SELECT id FROM clients WHERE user_id = ? ORDER BY id ASC LIMIT 1")
    .get(req.user.id);
  if (!client) return res.status(404).json({ error: "No enrollment is linked to this parent account" });
  res.json(attachmentsFor(client.id));
});

router.post(
  "/me/attachments",
  requireAuth,
  requireRole("parent"),
  upload.array("files", 5),
  (req, res) => {
    const client = db
      .prepare("SELECT id FROM clients WHERE user_id = ? ORDER BY id ASC LIMIT 1")
      .get(req.user.id);
    if (!client) return res.status(404).json({ error: "No enrollment is linked to this parent account" });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Please choose at least one image to upload" });
    }

    const label = text(req.body?.label) || "Doctor's note";
    const insertAttachment = db.prepare(
      `INSERT INTO client_attachments (client_id, label, filename, original_name, mime_type, size_bytes, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const file of req.files) {
      insertAttachment.run(client.id, label, file.filename, file.originalname, file.mimetype, file.size, req.user.id);
    }
    res.status(201).json(attachmentsFor(client.id));
  }
);

// Admin/therapist (and the owning parent): view a specific client's attachments.
// NOTE: must stay below "/me/attachments" above, or Express would treat "me"
// as a :clientId value here instead.
router.get("/:clientId/attachments", requireAuth, (req, res) => {
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const allowed =
    req.user.role === "admin" ||
    (req.user.role === "therapist" && Number(client.therapist_id) === Number(req.user.therapist_id)) ||
    (req.user.role === "parent" && Number(client.user_id) === Number(req.user.id));
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  res.json(attachmentsFor(client.id));
});

// Friendly error message when multer rejects a file (wrong type / too large)
// instead of the default unhandled-error 500.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message || "Upload failed" });
  }
  next();
});

module.exports = router;
