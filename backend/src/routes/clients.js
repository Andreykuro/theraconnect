const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, requireRole("admin", "therapist"), (req, res) => {
  let sql = `SELECT c.*, t.name AS therapist_name FROM clients c
             LEFT JOIN therapists t ON t.id = c.therapist_id WHERE 1=1`;
  const params = [];
  if (req.user.role === "therapist") {
    sql += " AND c.therapist_id = ?";
    params.push(req.user.therapist_id);
  }
  sql += " ORDER BY c.name ASC";
  res.json(db.prepare(sql).all(...params));
});

router.get("/:id", requireAuth, (req, res) => {
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  if (req.user.role === "parent" && Number(client.user_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  // Therapists only see children on their own caseload (guardian contact details included)
  if (req.user.role === "therapist" && Number(client.therapist_id) !== Number(req.user.therapist_id)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(client);
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const {
    last_name,
    first_name,
    middle_name,
    name: nameOverride,
    birthdate,
    service_type,
    guardian_name,
    guardian_phone,
    guardian_email,
    therapist_id,
    notes,
  } = req.body || {};

  // Accept either the split last/first/middle fields (the enrollment-style
  // form) or a single `name` (older callers/scripts) - whichever is given,
  // `name` always ends up composed from the split fields when they exist.
  const last = (last_name || "").trim();
  const first = (first_name || "").trim();
  const middle = (middle_name || "").trim();
  const name = first || last ? [first, middle, last].filter(Boolean).join(" ").trim() : (nameOverride || "").trim();

  if (!name || !guardian_name || !guardian_phone) {
    return res.status(400).json({ error: "name, guardian_name and guardian_phone are required" });
  }
  const info = db
    .prepare(
      `INSERT INTO clients (last_name, first_name, middle_name, name, birthdate, service_type, guardian_name, guardian_phone, guardian_email, therapist_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      last,
      first,
      middle || null,
      name,
      birthdate || null,
      service_type || "Speech Therapy",
      guardian_name,
      guardian_phone,
      guardian_email || null,
      therapist_id || null,
      notes || null
    );
  res.status(201).json(db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid));
});

router.put("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Client not found" });

  const merged = { ...existing, ...req.body };
  // If the split name fields changed, keep the composed `name` in sync.
  const splitChanged =
    "last_name" in req.body || "first_name" in req.body || "middle_name" in req.body;
  if (splitChanged) {
    merged.name = [merged.first_name, merged.middle_name, merged.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  db.prepare(
    `UPDATE clients SET last_name=?, first_name=?, middle_name=?, name=?, birthdate=?, service_type=?, guardian_name=?, guardian_phone=?, guardian_email=?, therapist_id=?, notes=?
     WHERE id=?`
  ).run(
    merged.last_name || "",
    merged.first_name || "",
    merged.middle_name || null,
    merged.name,
    merged.birthdate,
    merged.service_type,
    merged.guardian_name,
    merged.guardian_phone,
    merged.guardian_email,
    merged.therapist_id,
    merged.notes,
    existing.id
  );
  res.json(db.prepare("SELECT * FROM clients WHERE id = ?").get(existing.id));
});

module.exports = router;
