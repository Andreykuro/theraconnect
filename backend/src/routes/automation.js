const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function overlaps(start, end, appointments) {
  return appointments.some(
    (appointment) =>
      new Date(appointment.start_time) < end && new Date(appointment.end_time) > start
  );
}

function dateAt(date, hour) {
  const copy = new Date(date);
  copy.setHours(hour, 0, 0, 0);
  return copy;
}

function progressFlags() {
  const rows = db
    .prepare(
      `SELECT g.id AS goal_id, g.title, g.direction, p.client_id, c.name AS client_name,
              gm.value, sn.session_date
       FROM treatment_goals g
       JOIN treatment_plans p ON p.id = g.plan_id
       JOIN clients c ON c.id = p.client_id
       JOIN goal_measurements gm ON gm.goal_id = g.id
       JOIN session_notes sn ON sn.id = gm.session_note_id
       WHERE g.status = 'active' AND p.status = 'active'
       ORDER BY g.id ASC, sn.session_date ASC, gm.id ASC`
    )
    .all();
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.goal_id)) grouped.set(row.goal_id, []);
    grouped.get(row.goal_id).push(row);
  }

  const flags = [];
  for (const measurements of grouped.values()) {
    if (measurements.length < 3) continue;
    const recent = measurements.slice(-3);
    const first = Number(recent[0].value);
    const last = Number(recent[recent.length - 1].value);
    const movement = recent[0].direction === "decrease" ? first - last : last - first;
    if (movement <= 0.5) {
      flags.push({
        client_id: recent[0].client_id,
        client_name: recent[0].client_name,
        goal_id: recent[0].goal_id,
        goal_title: recent[0].title,
        reason: movement < 0 ? "Recent measurements moved away from the target" : "No measurable change across three sessions",
      });
    }
  }
  return flags;
}

router.get(
  "/manager-insights",
  requireAuth,
  requireRole("admin"),
  (req, res) => {
    const now = new Date();
    const inThirtyDays = new Date(now);
    inThirtyDays.setDate(inThirtyDays.getDate() + 30);
    const inFourteenDays = new Date(now);
    inFourteenDays.setDate(inFourteenDays.getDate() + 14);

    const totalClients = db.prepare("SELECT COUNT(*) AS count FROM clients").get().count;
    const upcoming = db
      .prepare(
        `SELECT COUNT(*) AS count FROM appointments
         WHERE status != 'cancelled' AND start_time >= ? AND start_time < ?`
      )
      .get(now.toISOString(), inThirtyDays.toISOString()).count;
    const pending = db
      .prepare(
        `SELECT COUNT(*) AS count FROM appointments
         WHERE status = 'pending' AND start_time >= ?`
      )
      .get(now.toISOString()).count;

    const unscheduledClients = db
      .prepare(
        `SELECT c.id, c.name, c.service_type, c.therapist_id,
                t.name AS therapist_name, c.guardian_name
         FROM clients c
         LEFT JOIN therapists t ON t.id = c.therapist_id
         WHERE NOT EXISTS (
           SELECT 1 FROM appointments a
           WHERE a.client_id = c.id AND a.status != 'cancelled' AND a.end_time >= ?
         )
         ORDER BY c.name ASC`
      )
      .all(now.toISOString());

    const overdueNotes = db
      .prepare(
        `SELECT a.id AS appointment_id, a.end_time, c.id AS client_id, c.name AS client_name,
                t.name AS therapist_name
         FROM appointments a
         JOIN clients c ON c.id = a.client_id
         JOIN therapists t ON t.id = a.therapist_id
         WHERE a.status != 'cancelled' AND a.end_time < ?
           AND NOT EXISTS (SELECT 1 FROM session_notes sn WHERE sn.appointment_id = a.id)
         ORDER BY a.end_time DESC
         LIMIT 25`
      )
      .all(now.toISOString());

    const therapistLoad = db
      .prepare(
        `SELECT t.id, t.name, t.specialty, t.color, COUNT(a.id) AS upcoming_sessions
         FROM therapists t
         LEFT JOIN appointments a ON a.therapist_id = t.id
           AND a.status != 'cancelled' AND a.start_time >= ? AND a.start_time < ?
         WHERE t.active = 1
         GROUP BY t.id
         ORDER BY upcoming_sessions DESC, t.name ASC`
      )
      .all(now.toISOString(), inFourteenDays.toISOString());

    const notificationFailures = db
      .prepare(
        `SELECT COUNT(*) AS count FROM notifications_log
         WHERE status = 'failed' AND created_at >= datetime('now', '-30 days')`
      )
      .get().count;
    const aiDrafts = db
      .prepare(
        `SELECT COUNT(*) AS count FROM ai_audit_logs
         WHERE action = 'draft_session_note' AND created_at >= datetime('now', '-30 days')`
      )
      .get().count;
    const progressReviewFlags = progressFlags();

    const recommendations = [];
    if (unscheduledClients.length) {
      recommendations.push({
        type: "schedule",
        priority: "high",
        message: `${unscheduledClients.length} client${unscheduledClients.length === 1 ? " has" : "s have"} no upcoming session.`,
      });
    }
    if (overdueNotes.length) {
      recommendations.push({
        type: "documentation",
        priority: "high",
        message: `${overdueNotes.length} past session${overdueNotes.length === 1 ? " is" : "s are"} missing an approved note.`,
      });
    }
    if (progressReviewFlags.length) {
      recommendations.push({
        type: "progress",
        priority: "medium",
        message: `${progressReviewFlags.length} goal${progressReviewFlags.length === 1 ? " needs" : "s need"} therapist review based on recent measurements.`,
      });
    }
    if (pending) {
      recommendations.push({
        type: "confirmation",
        priority: "medium",
        message: `${pending} upcoming appointment${pending === 1 ? " is" : "s are"} awaiting confirmation.`,
      });
    }

    res.json({
      generated_at: now.toISOString(),
      stats: {
        total_clients: totalClients,
        upcoming_30_days: upcoming,
        pending_confirmations: pending,
        unscheduled_clients: unscheduledClients.length,
        overdue_notes: overdueNotes.length,
        progress_review_flags: progressReviewFlags.length,
        notification_failures_30_days: notificationFailures,
        assisted_notes_30_days: aiDrafts,
      },
      recommendations,
      unscheduled_clients: unscheduledClients,
      overdue_notes: overdueNotes,
      progress_flags: progressReviewFlags,
      therapist_load: therapistLoad,
    });
  }
);

router.get("/schedule-suggestions", requireAuth, (req, res) => {
  let clientId = Number(req.query.client_id);
  if (req.user.role === "parent") {
    const ownClient = db.prepare("SELECT id FROM clients WHERE user_id = ? ORDER BY id ASC LIMIT 1").get(req.user.id);
    clientId = ownClient?.id;
  }
  const client = db
    .prepare(
      `SELECT c.*, t.name AS therapist_name, t.specialty AS therapist_specialty,
              t.color AS therapist_color
       FROM clients c
       LEFT JOIN therapists t ON t.id = c.therapist_id
       WHERE c.id = ?`
    )
    .get(clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });
  if (
    req.user.role === "therapist" &&
    Number(client.therapist_id) !== Number(req.user.therapist_id)
  ) {
    return res.status(403).json({ error: "Forbidden for this client" });
  }
  if (req.user.role === "parent" && Number(client.user_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: "Forbidden for this client" });
  }
  if (!client.therapist_id) {
    return res.status(400).json({ error: "Assign a therapist before generating schedule suggestions" });
  }

  const days = Math.min(60, Math.max(7, Number(req.query.days) || 21));
  const preferredPeriod = ["morning", "afternoon"].includes(req.query.preferred_period)
    ? req.query.preferred_period
    : "any";
  const startRange = new Date();
  startRange.setHours(0, 0, 0, 0);
  startRange.setDate(startRange.getDate() + 1);
  const endRange = new Date(startRange);
  endRange.setDate(endRange.getDate() + days);

  const therapistAppointments = db
    .prepare(
      `SELECT * FROM appointments
       WHERE therapist_id = ? AND status != 'cancelled'
         AND start_time < ? AND end_time > ?`
    )
    .all(client.therapist_id, endRange.toISOString(), startRange.toISOString());
  const clientAppointments = db
    .prepare(
      `SELECT * FROM appointments
       WHERE client_id = ? AND status != 'cancelled'
         AND start_time < ? AND end_time > ?`
    )
    .all(client.id, endRange.toISOString(), startRange.toISOString());

  const suggestions = [];
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const date = new Date(startRange);
    date.setDate(date.getDate() + dayOffset);
    if (date.getDay() === 0) continue;

    const sameDayAppointments = therapistAppointments.filter(
      (appointment) => new Date(appointment.start_time).toDateString() === date.toDateString()
    );
    for (let hour = 8; hour < 17; hour++) {
      const start = dateAt(date, hour);
      const end = dateAt(date, hour + 1);
      if (overlaps(start, end, therapistAppointments) || overlaps(start, end, clientAppointments)) continue;

      const reasons = ["Matches assigned therapist and treatment"];
      let score = Math.max(0, 30 - dayOffset);
      const periodMatches =
        preferredPeriod === "any" ||
        (preferredPeriod === "morning" && hour < 12) ||
        (preferredPeriod === "afternoon" && hour >= 12);
      if (periodMatches && preferredPeriod !== "any") {
        score += 20;
        reasons.push(`Matches ${preferredPeriod} preference`);
      }

      const adjacent = sameDayAppointments.some((appointment) => {
        const existingStart = new Date(appointment.start_time);
        const existingEnd = new Date(appointment.end_time);
        return Math.abs(existingEnd - start) <= 60 * 60 * 1000 || Math.abs(end - existingStart) <= 60 * 60 * 1000;
      });
      if (adjacent) {
        score += 8;
        reasons.push("Reduces gaps in the therapist's day");
      }
      score -= sameDayAppointments.length * 0.5;

      suggestions.push({
        client_id: client.id,
        client_name: client.name,
        therapist_id: client.therapist_id,
        therapist_name: client.therapist_name,
        therapist_color: client.therapist_color,
        service_type: client.service_type,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        score: Number(score.toFixed(1)),
        reasons,
      });
    }
  }

  suggestions.sort((a, b) => b.score - a.score || new Date(a.start_time) - new Date(b.start_time));
  res.json({ client, preferred_period: preferredPeriod, suggestions: suggestions.slice(0, 10) });
});

// Business/growth statistics for the admin Automation page's charts: how
// enrollment is trending, how sessions are distributed by status, and the
// mix of service types / registration states - the numbers an owner would
// want to see the clinic's growth in, not just day-to-day operations.
function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

// Shared by the JSON endpoint below and the PDF export in reports.js.
function buildBusinessStats() {
    const now = new Date();

    // --- Enrollment growth: new clients per month, last 6 months ---
    const monthLabels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push({
        key: monthKey(d),
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      });
    }
    const enrollmentRows = db
      .prepare(`SELECT strftime('%Y-%m', created_at) AS ym, COUNT(*) AS count FROM clients GROUP BY ym`)
      .all();
    const enrollmentByMonth = new Map(enrollmentRows.map((r) => [r.ym, r.count]));
    const enrollment_growth = monthLabels.map((m) => ({
      month: m.label,
      new_enrollments: enrollmentByMonth.get(m.key) || 0,
    }));
    const thisMonth = enrollment_growth[enrollment_growth.length - 1].new_enrollments;
    const lastMonth = enrollment_growth[enrollment_growth.length - 2]?.new_enrollments || 0;
    const enrollment_growth_rate_pct =
      lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10;

    // --- Sessions booked by status (pie-chart ready) + attendance rate ---
    const sessionsByStatusRows = db
      .prepare(`SELECT status, COUNT(*) AS count FROM appointments GROUP BY status`)
      .all();
    const totalSessions = sessionsByStatusRows.reduce((sum, r) => sum + r.count, 0);
    const sessions_by_status = sessionsByStatusRows.map((r) => ({
      status: r.status,
      count: r.count,
      percentage: pct(r.count, totalSessions),
    }));
    const completedCount = sessionsByStatusRows.find((r) => r.status === "completed")?.count || 0;
    const cancelledCount = sessionsByStatusRows.find((r) => r.status === "cancelled")?.count || 0;
    const attendance_rate_pct =
      completedCount + cancelledCount ? pct(completedCount, completedCount + cancelledCount) : null;

    // --- Sessions booked trend: last 8 weeks (excluding cancelled) ---
    const apptStartTimes = db
      .prepare(`SELECT start_time FROM appointments WHERE status != 'cancelled'`)
      .all()
      .map((r) => new Date(r.start_time));
    const sessions_booked_trend = [];
    for (let i = 7; i >= 0; i--) {
      const start = startOfWeek(now);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      sessions_booked_trend.push({
        week: `${start.getMonth() + 1}/${start.getDate()}`,
        sessions: apptStartTimes.filter((t) => t >= start && t < end).length,
      });
    }

    // --- Clients by service type (pie-chart ready) ---
    const byServiceRows = db
      .prepare(`SELECT service_type, COUNT(*) AS count FROM clients GROUP BY service_type ORDER BY count DESC`)
      .all();
    const totalClients = byServiceRows.reduce((sum, r) => sum + r.count, 0);
    const clients_by_service = byServiceRows.map((r) => ({
      service_type: r.service_type,
      count: r.count,
      percentage: pct(r.count, totalClients),
    }));

    // --- Registration funnel: active / pending / rejected (pie-chart ready) ---
    const byStatusRows = db.prepare(`SELECT status, COUNT(*) AS count FROM clients GROUP BY status`).all();
    const clients_by_status = byStatusRows.map((r) => ({
      status: r.status,
      count: r.count,
      percentage: pct(r.count, totalClients),
    }));

    // --- Therapist utilization: active (non-cancelled) sessions per therapist ---
    const therapist_utilization = db
      .prepare(
        `SELECT t.id, t.name, t.specialty, t.color, COUNT(a.id) AS session_count
         FROM therapists t
         LEFT JOIN appointments a ON a.therapist_id = t.id AND a.status != 'cancelled'
         WHERE t.active = 1
         GROUP BY t.id
         ORDER BY session_count DESC`
      )
      .all();

    return {
      generated_at: now.toISOString(),
      enrollment_growth,
      enrollment_growth_rate_pct,
      sessions_by_status,
      attendance_rate_pct,
      sessions_booked_trend,
      clients_by_service,
      clients_by_status,
      therapist_utilization,
      totals: {
        total_clients: totalClients,
        total_sessions: totalSessions,
        active_therapists: therapist_utilization.length,
      },
    };
}
router.buildBusinessStats = buildBusinessStats;

router.get(
  "/business-stats",
  requireAuth,
  requireRole("admin"),
  (req, res) => {
    res.json(buildBusinessStats());
  }
);

// Daily/weekly summary feeding the downloadable PDF report (Feature 4):
// counts of sessions and enrollments for "today" and "this week" (Sun-Sat),
// plus a short list of today's sessions and this week's new enrollments so
// the PDF has real detail, not just totals.
// Shared by the JSON endpoint below and the PDF export in reports.js -
// one source of truth for what "today" and "this week" mean and what
// counts as a summary, so the on-screen numbers and the downloaded PDF
// never drift apart.
function buildReportSummary() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  function countAppointments(start, end) {
    return db
      .prepare(
        `SELECT COUNT(*) AS count FROM appointments
         WHERE status != 'cancelled' AND start_time >= ? AND start_time < ?`
      )
      .get(start.toISOString(), end.toISOString()).count;
  }
  function countEnrollments(start, end) {
    return db
      .prepare(`SELECT COUNT(*) AS count FROM clients WHERE created_at >= ? AND created_at < ?`)
      .get(start.toISOString(), end.toISOString()).count;
  }

  const todaysSessions = db
    .prepare(
      `SELECT a.id, a.start_time, a.end_time, a.status, a.service_type,
              c.name AS client_name, t.name AS therapist_name
       FROM appointments a
       JOIN clients c ON c.id = a.client_id
       JOIN therapists t ON t.id = a.therapist_id
       WHERE a.status != 'cancelled' AND a.start_time >= ? AND a.start_time < ?
       ORDER BY a.start_time ASC`
    )
    .all(startOfToday.toISOString(), endOfToday.toISOString());

  const weeksNewEnrollments = db
    .prepare(
      `SELECT id, name, service_type, status, created_at
       FROM clients WHERE created_at >= ? AND created_at < ?
       ORDER BY created_at ASC`
    )
    .all(weekStart.toISOString(), weekEnd.toISOString());

  return {
    generated_at: now.toISOString(),
    range: {
      today: { start: startOfToday.toISOString(), end: endOfToday.toISOString() },
      week: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
    },
    daily: {
      sessions_booked: countAppointments(startOfToday, endOfToday),
      new_enrollments: countEnrollments(startOfToday, endOfToday),
      sessions: todaysSessions,
    },
    weekly: {
      sessions_booked: countAppointments(weekStart, weekEnd),
      new_enrollments: countEnrollments(weekStart, weekEnd),
      new_enrollment_list: weeksNewEnrollments,
    },
    totals: {
      total_clients: db.prepare("SELECT COUNT(*) AS count FROM clients").get().count,
      active_clients: db.prepare("SELECT COUNT(*) AS count FROM clients WHERE status = 'active'").get().count,
      total_sessions_all_time: db
        .prepare("SELECT COUNT(*) AS count FROM appointments WHERE status != 'cancelled'")
        .get().count,
    },
  };
}
router.buildReportSummary = buildReportSummary;

router.get(
  "/report-summary",
  requireAuth,
  requireRole("admin"),
  (req, res) => {
    res.json(buildReportSummary());
  }
);

router.get(
  "/ai-audit",
  requireAuth,
  requireRole("admin"),
  (req, res) => {
    res.json(
      db
        .prepare(
          `SELECT a.id, a.action, a.provider, a.input_redacted, a.status, a.created_at,
                  u.name AS user_name
           FROM ai_audit_logs a
           LEFT JOIN users u ON u.id = a.user_id
           ORDER BY a.id DESC
           LIMIT 100`
        )
        .all()
    );
  }
);

module.exports = router;
