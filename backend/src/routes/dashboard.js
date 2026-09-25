const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { progressForClient } = require("./progress");

const router = express.Router();

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function sortNotifications(items) {
  return items
    .sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      if (!a.created_at && !b.created_at) return 0;
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .slice(0, 12);
}

function truncate(text, max = 60) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function parentsOwnClient(userId) {
  return db
    .prepare("SELECT * FROM clients WHERE user_id = ? ORDER BY id ASC LIMIT 1")
    .get(userId);
}

// ---------------------------------------------------------------- parent ---

function parentHome(req, res) {
  const client = parentsOwnClient(req.user.id);
  if (!client) {
    return res.status(404).json({ error: "No patient profile is linked to this account" });
  }

  // Registration still under review (or was turned down) - none of the
  // usual dashboard data applies yet, so hand back a minimal status payload
  // instead. The frontend shows a dedicated waiting/declined screen for this.
  if (client.status !== "active") {
    return res.json({
      status: client.status,
      client_name: client.name,
      rejection_reason: client.rejection_reason || null,
    });
  }

  const progress = progressForClient(client.id, "parent");
  const now = new Date().toISOString();

  const upcoming = db
    .prepare(
      `SELECT a.*, t.name AS therapist_name, t.color AS therapist_color
       FROM appointments a
       JOIN therapists t ON t.id = a.therapist_id
       WHERE a.client_id = ? AND a.status != 'cancelled' AND a.end_time >= ?
       ORDER BY a.start_time ASC LIMIT 6`
    )
    .all(client.id, now);
  const pending = upcoming.filter((a) => a.status === "pending");

  const announcements = db
    .prepare("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5")
    .all();

  const unreadMessages = db
    .prepare(
      `SELECT m.*, u.name AS sender_name FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.client_id = ? AND m.sender_role != 'parent' AND m.read_at IS NULL
       ORDER BY m.created_at DESC LIMIT 5`
    )
    .all(client.id);

  const activeGoals = progress.goals.filter((g) => g.status === "active");
  const goalsNeedingReview = activeGoals.filter((g) => g.trend === "needs-review");

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const notifications = sortNotifications([
    ...pending.map((a) => ({
      id: `appt-${a.id}`,
      type: "confirm",
      priority: "high",
      message: `Confirm your ${a.service_type} session with ${a.therapist_name}`,
      created_at: a.created_at,
      link: "/parent/appointments",
    })),
    ...unreadMessages.map((m) => ({
      id: `msg-${m.id}`,
      type: "message",
      priority: "medium",
      message: `${m.sender_name}: ${truncate(m.body)}`,
      created_at: m.created_at,
      link: "/parent/messages",
    })),
    ...goalsNeedingReview.map((g) => ({
      id: `goal-${g.id}`,
      type: "progress",
      priority: "medium",
      message: `${g.title}: recent sessions moved away from the target`,
      created_at: null,
      link: "/parent/progress",
    })),
    ...announcements
      .filter((a) => new Date(a.created_at) > fourteenDaysAgo)
      .map((a) => ({
        id: `ann-${a.id}`,
        type: "announcement",
        priority: "low",
        message: a.title,
        created_at: a.created_at,
        link: "/parent",
      })),
  ]);

  res.json({
    status: "active",
    client: progress.client,
    overall_progress: progress.overall_progress,
    goals: activeGoals,
    upcoming_appointments: upcoming,
    pending_confirmations: pending,
    announcements,
    unread_message_count: unreadMessages.length,
    notifications,
  });
}

// ------------------------------------------------------------- therapist ---

function therapistHome(req, res) {
  const therapistId = req.user.therapist_id;
  const now = new Date().toISOString();
  const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const upcoming = db
    .prepare(
      `SELECT a.*, c.name AS client_name
       FROM appointments a JOIN clients c ON c.id = a.client_id
       WHERE a.therapist_id = ? AND a.status != 'cancelled' AND a.start_time >= ? AND a.start_time < ?
       ORDER BY a.start_time ASC`
    )
    .all(therapistId, now, inSevenDays);

  const overdueNotes = db
    .prepare(
      `SELECT a.id AS appointment_id, a.end_time, c.name AS client_name
       FROM appointments a JOIN clients c ON c.id = a.client_id
       WHERE a.therapist_id = ? AND a.status != 'cancelled' AND a.end_time < ?
         AND NOT EXISTS (SELECT 1 FROM session_notes sn WHERE sn.appointment_id = a.id)
       ORDER BY a.end_time DESC LIMIT 10`
    )
    .all(therapistId, now);

  const unreadMessages = db
    .prepare(
      `SELECT m.*, u.name AS sender_name, m.client_id
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       JOIN clients c ON c.id = m.client_id
       WHERE c.therapist_id = ? AND m.sender_role = 'parent' AND m.read_at IS NULL
       ORDER BY m.created_at DESC LIMIT 5`
    )
    .all(therapistId);

  const notifications = sortNotifications([
    ...overdueNotes.map((n) => ({
      id: `note-${n.appointment_id}`,
      type: "documentation",
      priority: "high",
      message: `${n.client_name}'s session is missing an approved note`,
      created_at: n.end_time,
      link: "/therapist/progress",
    })),
    ...unreadMessages.map((m) => ({
      id: `msg-${m.id}`,
      type: "message",
      priority: "medium",
      message: `${m.sender_name}: ${truncate(m.body)}`,
      created_at: m.created_at,
      link: "/therapist/messages",
    })),
  ]);

  res.json({
    upcoming_sessions_7d: upcoming.length,
    overdue_notes: overdueNotes,
    unread_message_count: unreadMessages.length,
    notifications,
  });
}

// ----------------------------------------------------------------- admin ---

function adminHome(req, res) {
  const now = new Date().toISOString();

  const requested = db
    .prepare(
      `SELECT a.id, a.service_type, a.start_time, c.name AS client_name
       FROM appointments a JOIN clients c ON c.id = a.client_id
       WHERE a.status = 'requested'
       ORDER BY a.created_at ASC LIMIT 5`
    )
    .all();

  const pendingRegistrations = db
    .prepare(
      `SELECT id, name, service_type, created_at FROM clients
       WHERE status = 'pending' ORDER BY created_at ASC LIMIT 5`
    )
    .all();

  const pending = db
    .prepare(
      `SELECT a.id, a.service_type, a.start_time, c.name AS client_name
       FROM appointments a JOIN clients c ON c.id = a.client_id
       WHERE a.status = 'pending' AND a.start_time >= ?
       ORDER BY a.start_time ASC LIMIT 5`
    )
    .all(now);

  const unscheduled = db
    .prepare(
      `SELECT c.id, c.name FROM clients c
       WHERE NOT EXISTS (
         SELECT 1 FROM appointments a
         WHERE a.client_id = c.id AND a.status != 'cancelled' AND a.end_time >= ?
       )
       LIMIT 5`
    )
    .all(now);

  const overdueNotes = db
    .prepare(
      `SELECT a.id AS appointment_id, a.end_time, c.name AS client_name
       FROM appointments a JOIN clients c ON c.id = a.client_id
       WHERE a.status != 'cancelled' AND a.end_time < ?
         AND NOT EXISTS (SELECT 1 FROM session_notes sn WHERE sn.appointment_id = a.id)
       ORDER BY a.end_time DESC LIMIT 5`
    )
    .all(now);

  const notifications = sortNotifications([
    ...requested.map((a) => ({
      id: `req-${a.id}`,
      type: "confirm",
      priority: "high",
      message: `${a.client_name} requested a ${a.service_type} session - needs your approval`,
      created_at: a.start_time,
      link: "/admin",
    })),
    ...pendingRegistrations.map((c) => ({
      id: `reg-${c.id}`,
      type: "schedule",
      priority: "high",
      message: `${c.name}'s registration (${c.service_type}) is awaiting review`,
      created_at: c.created_at,
      link: "/admin/registrations",
    })),
    ...unscheduled.map((c) => ({
      id: `unsched-${c.id}`,
      type: "schedule",
      priority: "high",
      message: `${c.name} has no upcoming session`,
      created_at: null,
      link: "/admin/clients",
    })),
    ...overdueNotes.map((n) => ({
      id: `note-${n.appointment_id}`,
      type: "documentation",
      priority: "high",
      message: `${n.client_name}'s session is missing an approved note`,
      created_at: n.end_time,
      link: "/admin/automation",
    })),
    ...pending.map((a) => ({
      id: `appt-${a.id}`,
      type: "confirm",
      priority: "medium",
      message: `${a.client_name}'s ${a.service_type} is awaiting confirmation`,
      created_at: a.start_time,
      link: "/admin",
    })),
  ]);

  res.json({
    appointment_requests: requested.length,
    pending_registrations: pendingRegistrations.length,
    pending_confirmations: pending.length,
    unscheduled_clients: unscheduled.length,
    overdue_notes: overdueNotes.length,
    notifications,
  });
}

router.get("/home", requireAuth, (req, res) => {
  if (req.user.role === "parent") return parentHome(req, res);
  if (req.user.role === "therapist") return therapistHome(req, res);
  return adminHome(req, res);
});

module.exports = router;
