const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendSMS } = require("../services/notify");

const router = express.Router();

const withDetails = `
  SELECT a.*, c.name AS client_name, c.guardian_name, c.guardian_phone, c.guardian_email,
         t.name AS therapist_name, t.color AS therapist_color
  FROM appointments a
  JOIN clients c ON c.id = a.client_id
  JOIN therapists t ON t.id = a.therapist_id
`;

function hasConflict({ therapist_id, start_time, end_time, excludeId }) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM appointments
       WHERE therapist_id = ? AND status != 'cancelled'
         AND id != COALESCE(?, -1)
         AND start_time < ? AND end_time > ?`
    )
    .get(therapist_id, excludeId ?? null, end_time, start_time);
  return row.n > 0;
}

// GET /api/appointments?start=&end=
router.get("/", requireAuth, (req, res) => {
  const { start, end } = req.query;
  let sql = withDetails + " WHERE 1=1";
  const params = [];

  if (start) {
    sql += " AND a.end_time >= ?";
    params.push(start);
  }
  if (end) {
    sql += " AND a.start_time <= ?";
    params.push(end);
  }

  if (req.user.role === "therapist") {
    sql += " AND a.therapist_id = ?";
    params.push(req.user.therapist_id);
  } else if (req.user.role === "parent") {
    sql += " AND c.user_id = ?";
    params.push(req.user.id);
  }

  sql += " ORDER BY a.start_time ASC";
  res.json(db.prepare(sql).all(...params));
});

// GET /api/appointments/slots?therapist_id=&date=YYYY-MM-DD
// Returns open hourly slots for that therapist on that day - already-booked
// and already-passed slots are simply left out of the list (not flagged,
// just absent), so a slot another parent just took disappears on next fetch.
router.get("/slots", requireAuth, (req, res) => {
  const { therapist_id, date } = req.query;
  if (!therapist_id || !date) {
    return res.status(400).json({ error: "therapist_id and date are required" });
  }

  const therapist = db.prepare("SELECT * FROM therapists WHERE id = ?").get(therapist_id);
  if (!therapist) return res.status(404).json({ error: "Therapist not found" });

  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return res.status(400).json({ error: "date must be YYYY-MM-DD" });

  const dayOfWeek = new Date(y, m - 1, d).getDay();
  if (dayOfWeek === 0) {
    return res.json({ date, therapist_id: Number(therapist_id), closed: true, slots: [] });
  }

  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

  const booked = db
    .prepare(
      `SELECT start_time, end_time FROM appointments
       WHERE therapist_id = ? AND status != 'cancelled'
         AND start_time < ? AND end_time > ?`
    )
    .all(therapist_id, dayEnd.toISOString(), dayStart.toISOString());

  const now = new Date();
  const CLINIC_OPEN_HOUR = 8;
  const CLINIC_CLOSE_HOUR = 17;
  const slots = [];

  for (let hour = CLINIC_OPEN_HOUR; hour < CLINIC_CLOSE_HOUR; hour++) {
    const start = new Date(y, m - 1, d, hour, 0, 0, 0);
    const end = new Date(y, m - 1, d, hour + 1, 0, 0, 0);
    if (start < now) continue;

    const taken = booked.some(
      (b) => new Date(b.start_time) < end && new Date(b.end_time) > start
    );
    if (!taken) {
      slots.push({ start_time: start.toISOString(), end_time: end.toISOString() });
    }
  }

  res.json({ date, therapist_id: Number(therapist_id), closed: false, slots });
});

// POST /api/appointments/book  (parent self-service booking)
// The parent picks one of the slots returned above. client_id is resolved
// from their own account server-side - they can only ever book for their
// own child. hasConflict() runs again here as a safety net in case two
// parents grabbed the same slot at the same moment.
router.post("/book", requireAuth, requireRole("parent"), (req, res) => {
  const { therapist_id, service_type, start_time, end_time } = req.body || {};
  if (!therapist_id || !service_type || !start_time || !end_time) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const client = db.prepare("SELECT * FROM clients WHERE user_id = ?").get(req.user.id);
  if (!client) {
    return res
      .status(400)
      .json({ error: "No client profile is linked to your account yet - please contact the front desk." });
  }

  if (hasConflict({ therapist_id, start_time, end_time })) {
    return res.status(409).json({ error: "Sorry, that slot was just taken. Please pick another." });
  }

  // Requested lang, hindi agad 'confirmed' - kailangan munang aprubahan ng
  // admin bago ito opisyal (see /:id/approve below).
  const info = db
    .prepare(
      `INSERT INTO appointments (client_id, therapist_id, service_type, start_time, end_time, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'requested', ?)`
    )
    .run(client.id, therapist_id, service_type, start_time, end_time, req.user.id);

  const appt = db.prepare(withDetails + " WHERE a.id = ?").get(info.lastInsertRowid);

  sendSMS({
    to: appt.guardian_phone,
    appointmentId: appt.id,
    message: `We got your request! ${appt.service_type} with ${appt.therapist_name} on ${appt.start_time}. We'll text you once the clinic confirms it.`,
  }).catch(() => {});

  res.status(201).json(appt);
});

// POST /api/appointments  (admin/therapist)
router.post("/", requireAuth, requireRole("admin", "therapist"), (req, res) => {
  const { client_id, therapist_id, service_type, start_time, end_time, notes } = req.body || {};
  if (!client_id || !therapist_id || !service_type || !start_time || !end_time) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (new Date(start_time) >= new Date(end_time)) {
    return res.status(400).json({ error: "start_time must be before end_time" });
  }
  if (hasConflict({ therapist_id, start_time, end_time })) {
    return res.status(409).json({ error: "This therapist already has a session in that time slot" });
  }

  const info = db
    .prepare(
      `INSERT INTO appointments (client_id, therapist_id, service_type, start_time, end_time, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(client_id, therapist_id, service_type, start_time, end_time, notes || null, req.user.id);

  const appt = db.prepare(withDetails + " WHERE a.id = ?").get(info.lastInsertRowid);

  sendSMS({
    to: appt.guardian_phone,
    appointmentId: appt.id,
    message: `Hello! Your ${appt.service_type} schedule is on ${appt.start_time}. Kindly confirm if you can attend. Thank you!`,
  }).catch(() => {});

  res.status(201).json(appt);
});

// PUT /api/appointments/:id  (admin/therapist) - edit/reschedule
router.put("/:id", requireAuth, requireRole("admin", "therapist"), (req, res) => {
  const existing = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Appointment not found" });

  const therapist_id = req.body.therapist_id ?? existing.therapist_id;
  const start_time = req.body.start_time ?? existing.start_time;
  const end_time = req.body.end_time ?? existing.end_time;
  const service_type = req.body.service_type ?? existing.service_type;
  const notes = req.body.notes ?? existing.notes;

  if (hasConflict({ therapist_id, start_time, end_time, excludeId: existing.id })) {
    return res.status(409).json({ error: "This therapist already has a session in that time slot" });
  }

  db.prepare(
    `UPDATE appointments SET therapist_id=?, start_time=?, end_time=?, service_type=?, notes=? WHERE id=?`
  ).run(therapist_id, start_time, end_time, service_type, notes, existing.id);

  const appt = db.prepare(withDetails + " WHERE a.id = ?").get(existing.id);

  sendSMS({
    to: appt.guardian_phone,
    appointmentId: appt.id,
    message: `Hi! Your ${appt.service_type} schedule was updated to ${appt.start_time}. Kindly confirm if you can attend.`,
  }).catch(() => {});

  res.json(appt);
});

// POST /api/appointments/:id/approve  (admin approves a self-service request)
router.post("/:id/approve", requireAuth, requireRole("admin"), (req, res) => {
  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  if (appt.status !== "requested") {
    return res.status(400).json({ error: "This request has already been reviewed" });
  }

  db.prepare("UPDATE appointments SET status = 'confirmed' WHERE id = ?").run(appt.id);
  const updated = db.prepare(withDetails + " WHERE a.id = ?").get(appt.id);

  sendSMS({
    to: updated.guardian_phone,
    appointmentId: updated.id,
    message: `Confirmed! Your ${updated.service_type} with ${updated.therapist_name} on ${updated.start_time} is set. See you then!`,
  }).catch(() => {});

  res.json(updated);
});

// POST /api/appointments/:id/decline  (admin declines a self-service request)
router.post("/:id/decline", requireAuth, requireRole("admin"), (req, res) => {
  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  if (appt.status !== "requested") {
    return res.status(400).json({ error: "This request has already been reviewed" });
  }

  db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appt.id);
  const updated = db.prepare(withDetails + " WHERE a.id = ?").get(appt.id);

  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  sendSMS({
    to: updated.guardian_phone,
    appointmentId: updated.id,
    message: `Sorry, we're unable to confirm the ${updated.service_type} request for ${updated.start_time}${reason ? ` (${reason})` : ""}. Please pick another time.`,
  }).catch(() => {});

  res.json(updated);
});

// POST /api/appointments/:id/confirm  (parent confirms attendance)
router.post("/:id/confirm", requireAuth, requireRole("parent", "admin"), (req, res) => {
  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });

  db.prepare("UPDATE appointments SET status = 'confirmed' WHERE id = ?").run(appt.id);
  res.json(db.prepare(withDetails + " WHERE a.id = ?").get(appt.id));
});

// DELETE /api/appointments/:id  (admin) - soft cancel
router.delete("/:id", requireAuth, requireRole("admin", "therapist"), (req, res) => {
  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });

  db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appt.id);
  res.json({ ok: true });
});

module.exports = router;
