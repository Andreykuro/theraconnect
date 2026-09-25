const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { assignTherapist } = require("../services/therapistAssignment");
const { sendSMS } = require("../services/notify");

const router = express.Router();

function attachmentsFor(clientId) {
  return db
    .prepare(
      `SELECT id, label, original_name, mime_type, size_bytes, created_at,
              '/api/uploads/enrollment/' || filename AS url
       FROM client_attachments WHERE client_id = ? ORDER BY created_at DESC`
    )
    .all(clientId);
}

// Pending self-service registrations, oldest first (first come, first reviewed).
router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM clients WHERE status = 'pending' ORDER BY created_at ASC`
    )
    .all();
  res.json(rows.map((client) => ({ ...client, attachments: attachmentsFor(client.id) })));
});

// Approve: confirms the diagnosis is valid, auto-assigns an active
// therapist matching the chosen treatment (least-loaded caseload wins - see
// services/therapistAssignment.js), and activates the client.
router.post("/:id/approve", requireAuth, requireRole("admin"), (req, res) => {
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!client) return res.status(404).json({ error: "Registration not found" });
  if (client.status !== "pending") {
    return res.status(400).json({ error: "This registration has already been reviewed" });
  }

  const therapist = assignTherapist(client.service_type);
  if (!therapist) {
    return res.status(409).json({
      error: `No active therapist currently offers ${client.service_type}. Add or activate one before approving.`,
    });
  }

  db.prepare(
    `UPDATE clients
     SET status = 'active', therapist_id = ?, reviewed_by = ?, reviewed_at = datetime('now')
     WHERE id = ?`
  ).run(therapist.id, req.user.id, client.id);

  const updated = db
    .prepare(
      `SELECT c.*, t.name AS therapist_name, t.specialty AS therapist_specialty, t.color AS therapist_color
       FROM clients c LEFT JOIN therapists t ON t.id = c.therapist_id WHERE c.id = ?`
    )
    .get(client.id);

  sendSMS({
    to: client.guardian_phone,
    message: `Good news! ${client.name}'s registration at TheraFun is approved. Your therapist is ${therapist.name} (${therapist.specialty}). You can now book sessions.`,
  }).catch(() => {});

  res.json(updated);
});

// Reject: requires a reason so the family portal can explain what happened.
router.post("/:id/reject", requireAuth, requireRole("admin"), (req, res) => {
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!client) return res.status(404).json({ error: "Registration not found" });
  if (client.status !== "pending") {
    return res.status(400).json({ error: "This registration has already been reviewed" });
  }

  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (!reason) return res.status(400).json({ error: "Please provide a reason for the family" });
  if (reason.length > 1000) return res.status(400).json({ error: "That reason is too long" });

  db.prepare(
    `UPDATE clients
     SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = datetime('now')
     WHERE id = ?`
  ).run(reason, req.user.id, client.id);

  sendSMS({
    to: client.guardian_phone,
    message: `Hi, regarding ${client.name}'s registration at TheraFun: we're unable to proceed right now (${reason}). Please contact the front desk with any questions.`,
  }).catch(() => {});

  res.json(db.prepare("SELECT * FROM clients WHERE id = ?").get(client.id));
});

module.exports = router;
