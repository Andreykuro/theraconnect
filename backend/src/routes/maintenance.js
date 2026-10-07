const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const DB_FILE = path.join(__dirname, "..", "..", "data.sqlite");

// Every table the app keeps data in - used for the record-count readout and
// to make sure a future new table doesn't silently fall out of the status
// view (add it here when it's added to db.js).
const TABLES = [
  "therapists",
  "users",
  "clients",
  "appointments",
  "treatment_plans",
  "treatment_goals",
  "session_notes",
  "goal_measurements",
  "ai_audit_logs",
  "announcements",
  "announcement_images",
  "notifications_log",
  "messages",
  "client_attachments",
  "classwork",
  "client_therapists",
];

function tableCount(table) {
  try {
    return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  } catch {
    return null; // table doesn't exist yet on this install - skip quietly
  }
}

// System health + housekeeping snapshot: database file size/age, how many
// rows are in each table, and how many old log rows are cleanup candidates.
// This is the "maintenance" half of the admin Automation page - keeping the
// clinic's data tidy, separate from the growth/business stats.
router.get("/status", requireAuth, requireRole("admin"), (req, res) => {
  const fileStats = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE) : null;

  const record_counts = {};
  for (const table of TABLES) {
    const count = tableCount(table);
    if (count !== null) record_counts[table] = count;
  }

  const oldNotifications = db
    .prepare(`SELECT COUNT(*) AS count FROM notifications_log WHERE created_at < datetime('now', '-90 days')`)
    .get().count;
  const oldAiLogs = db
    .prepare(`SELECT COUNT(*) AS count FROM ai_audit_logs WHERE created_at < datetime('now', '-90 days')`)
    .get().count;
  const orphanedUnscheduled = db
    .prepare(
      `SELECT COUNT(*) AS count FROM clients c
       WHERE c.status = 'active'
         AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.client_id = c.id AND a.status != 'cancelled')`
    )
    .get().count;

  res.json({
    database: {
      file: "data.sqlite",
      size_bytes: fileStats ? fileStats.size : 0,
      last_modified: fileStats ? fileStats.mtime.toISOString() : null,
    },
    record_counts,
    cleanup_candidates: {
      notifications_log_older_than_90_days: oldNotifications,
      ai_audit_logs_older_than_90_days: oldAiLogs,
    },
    health_flags: {
      active_clients_never_scheduled: orphanedUnscheduled,
    },
  });
});

// Downloads the live sql.js-backed SQLite file as a timestamped backup.
// Simple but real: this *is* the database, so copying the file is a
// complete, restorable backup (stop the server first to restore it).
router.get("/backup", requireAuth, requireRole("admin"), (req, res) => {
  if (!fs.existsSync(DB_FILE)) {
    return res.status(404).json({ error: "Database file not found" });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  res.download(DB_FILE, `theraconnect-backup-${stamp}.sqlite`);
});

// Purges old notification/AI-audit log rows past a retention window
// (default 90 days, minimum 30) to keep the database lean. Clinical data
// (clients, appointments, session notes, etc.) is never touched here.
router.post("/cleanup", requireAuth, requireRole("admin"), (req, res) => {
  const days = Math.max(30, Number(req.body?.older_than_days) || 90);
  const window = `-${days} days`;

  const removedNotifications = db
    .prepare(`DELETE FROM notifications_log WHERE created_at < datetime('now', ?)`)
    .run(window);
  const removedAiLogs = db
    .prepare(`DELETE FROM ai_audit_logs WHERE created_at < datetime('now', ?)`)
    .run(window);

  res.json({
    older_than_days: days,
    removed_notifications_log: removedNotifications.changes,
    removed_ai_audit_logs: removedAiLogs.changes,
  });
});

module.exports = router;
