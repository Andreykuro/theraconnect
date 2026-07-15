const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { generateNoteDraft } = require("../services/noteAssistant");

const router = express.Router();
const METRIC_TYPES = new Set(["accuracy", "frequency", "duration", "rating", "assistance"]);
const GOAL_STATUSES = new Set(["active", "achieved", "paused"]);

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getClient(clientId) {
  return db
    .prepare(
      `SELECT c.*, t.name AS therapist_name, t.specialty AS therapist_specialty,
              t.color AS therapist_color
       FROM clients c
       LEFT JOIN therapists t ON t.id = c.therapist_id
       WHERE c.id = ?`
    )
    .get(clientId);
}

function canReadClient(user, client) {
  if (!client) return false;
  if (user.role === "admin") return true;
  if (user.role === "therapist") return Number(client.therapist_id) === Number(user.therapist_id);
  return user.role === "parent" && Number(client.user_id) === Number(user.id);
}

function canManageClient(user, client) {
  return (
    client &&
    (user.role === "admin" ||
      (user.role === "therapist" && Number(client.therapist_id) === Number(user.therapist_id)))
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function progressPercent(goal, currentValue) {
  if (currentValue === null || currentValue === undefined) return null;
  const baseline = Number(goal.baseline);
  const target = Number(goal.target);
  const current = Number(currentValue);
  const span = goal.direction === "decrease" ? baseline - target : target - baseline;
  if (span === 0) return current === target ? 100 : 0;
  const movement = goal.direction === "decrease" ? baseline - current : current - baseline;
  return Number(clamp((movement / span) * 100, 0, 100).toFixed(1));
}

function trendFor(goal, measurements) {
  if (measurements.length < 2) return "insufficient-data";
  const current = Number(measurements[measurements.length - 1].value);
  const previous = Number(measurements[measurements.length - 2].value);
  const improvement = goal.direction === "decrease" ? previous - current : current - previous;
  if (Math.abs(improvement) < 0.01) return "stable";
  return improvement > 0 ? "improving" : "needs-review";
}

function progressForClient(clientId, role) {
  const client = getClient(clientId);
  const plan = db
    .prepare(
      `SELECT * FROM treatment_plans
       WHERE client_id = ?
       ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, id DESC
       LIMIT 1`
    )
    .get(clientId);

  const goals = plan
    ? db.prepare("SELECT * FROM treatment_goals WHERE plan_id = ? ORDER BY id ASC").all(plan.id)
    : [];

  const goalsWithProgress = goals.map((goal) => {
    const measurements = db
      .prepare(
        `SELECT gm.*, sn.session_date
         FROM goal_measurements gm
         JOIN session_notes sn ON sn.id = gm.session_note_id
         WHERE gm.goal_id = ?
         ORDER BY sn.session_date ASC, gm.id ASC`
      )
      .all(goal.id);
    const latest = measurements[measurements.length - 1] || null;
    return {
      ...goal,
      current_value: latest?.value ?? null,
      progress_percent: progressPercent(goal, latest?.value),
      trend: trendFor(goal, measurements),
      measurements,
    };
  });

  const measuredGoals = goalsWithProgress.filter((goal) => goal.progress_percent !== null);
  const overall_progress = measuredGoals.length
    ? Number(
        (
          measuredGoals.reduce((total, goal) => total + goal.progress_percent, 0) /
          measuredGoals.length
        ).toFixed(1)
      )
    : null;

  const notes =
    role === "parent"
      ? db
          .prepare(
            `SELECT id, session_date, parent_summary, created_at
             FROM session_notes
             WHERE client_id = ? AND approved_at IS NOT NULL
             ORDER BY session_date DESC, id DESC
             LIMIT 20`
          )
          .all(clientId)
      : db
          .prepare(
            `SELECT sn.*, u.name AS approved_by_name
             FROM session_notes sn
             LEFT JOIN users u ON u.id = sn.approved_by
             WHERE sn.client_id = ?
             ORDER BY sn.session_date DESC, sn.id DESC
             LIMIT 50`
          )
          .all(clientId);

  return { client, plan: plan || null, goals: goalsWithProgress, overall_progress, notes };
}

function ensureClientAccess(req, res, manage = false) {
  const clientId = Number(req.params.clientId || req.body?.client_id);
  const client = Number.isInteger(clientId) ? getClient(clientId) : null;
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return null;
  }
  const allowed = manage ? canManageClient(req.user, client) : canReadClient(req.user, client);
  if (!allowed) {
    res.status(403).json({ error: "You do not have access to this client's progress" });
    return null;
  }
  return client;
}

router.get("/me", requireAuth, requireRole("parent"), (req, res) => {
  const client = db.prepare("SELECT id FROM clients WHERE user_id = ? ORDER BY id ASC LIMIT 1").get(req.user.id);
  if (!client) return res.status(404).json({ error: "No patient profile is linked to this account" });
  res.json(progressForClient(client.id, "parent"));
});

router.get("/clients/:clientId", requireAuth, (req, res) => {
  const client = ensureClientAccess(req, res);
  if (!client) return;
  res.json(progressForClient(client.id, req.user.role));
});

router.post(
  "/clients/:clientId/goals",
  requireAuth,
  requireRole("admin", "therapist"),
  (req, res) => {
    const client = ensureClientAccess(req, res, true);
    if (!client) return;

    const title = clean(req.body?.title);
    const description = clean(req.body?.description);
    const metric_type = clean(req.body?.metric_type) || "accuracy";
    const baseline = Number(req.body?.baseline);
    const target = Number(req.body?.target);
    const direction = clean(req.body?.direction) || (target < baseline ? "decrease" : "increase");
    const unit = clean(req.body?.unit) || (metric_type === "accuracy" ? "%" : "score");

    if (!title || !Number.isFinite(baseline) || !Number.isFinite(target)) {
      return res.status(400).json({ error: "Goal title, baseline, and target are required" });
    }
    if (!METRIC_TYPES.has(metric_type) || !["increase", "decrease"].includes(direction)) {
      return res.status(400).json({ error: "Invalid goal measurement configuration" });
    }
    if (baseline === target) {
      return res.status(400).json({ error: "The target must be different from the baseline" });
    }

    let plan = db
      .prepare("SELECT * FROM treatment_plans WHERE client_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1")
      .get(client.id);
    if (!plan) {
      const planInfo = db
        .prepare(
          `INSERT INTO treatment_plans (client_id, therapist_id, title, start_date, created_by)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          client.id,
          client.therapist_id || req.user.therapist_id || null,
          `${client.service_type} Treatment Plan`,
          new Date().toISOString().slice(0, 10),
          req.user.id
        );
      plan = db.prepare("SELECT * FROM treatment_plans WHERE id = ?").get(planInfo.lastInsertRowid);
    }

    const info = db
      .prepare(
        `INSERT INTO treatment_goals
           (plan_id, title, description, metric_type, baseline, target, direction, unit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(plan.id, title, description || null, metric_type, baseline, target, direction, unit);
    res.status(201).json(db.prepare("SELECT * FROM treatment_goals WHERE id = ?").get(info.lastInsertRowid));
  }
);

router.patch(
  "/goals/:goalId",
  requireAuth,
  requireRole("admin", "therapist"),
  (req, res) => {
    const goal = db
      .prepare(
        `SELECT g.*, p.client_id FROM treatment_goals g
         JOIN treatment_plans p ON p.id = g.plan_id
         WHERE g.id = ?`
      )
      .get(req.params.goalId);
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    req.params.clientId = goal.client_id;
    if (!ensureClientAccess(req, res, true)) return;

    const merged = {
      ...goal,
      title: req.body?.title === undefined ? goal.title : clean(req.body.title),
      description: req.body?.description === undefined ? goal.description : clean(req.body.description),
      baseline: req.body?.baseline === undefined ? goal.baseline : Number(req.body.baseline),
      target: req.body?.target === undefined ? goal.target : Number(req.body.target),
      direction: req.body?.direction || goal.direction,
      unit: req.body?.unit === undefined ? goal.unit : clean(req.body.unit),
      status: req.body?.status || goal.status,
    };
    if (
      !merged.title ||
      !Number.isFinite(Number(merged.baseline)) ||
      !Number.isFinite(Number(merged.target)) ||
      Number(merged.baseline) === Number(merged.target) ||
      !["increase", "decrease"].includes(merged.direction) ||
      !GOAL_STATUSES.has(merged.status)
    ) {
      return res.status(400).json({ error: "Invalid goal update" });
    }

    db.prepare(
      `UPDATE treatment_goals
       SET title=?, description=?, baseline=?, target=?, direction=?, unit=?, status=?
       WHERE id=?`
    ).run(
      merged.title,
      merged.description || null,
      merged.baseline,
      merged.target,
      merged.direction,
      merged.unit,
      merged.status,
      goal.id
    );
    res.json(db.prepare("SELECT * FROM treatment_goals WHERE id = ?").get(goal.id));
  }
);

router.post(
  "/notes/assist",
  requireAuth,
  requireRole("admin", "therapist"),
  async (req, res) => {
    const client = ensureClientAccess(req, res, true);
    if (!client) return;
    const rawNotes = clean(req.body?.raw_notes);
    if (rawNotes.length < 10 || rawNotes.length > 5000) {
      return res.status(400).json({ error: "Enter between 10 and 5,000 characters of session notes" });
    }

    const plan = db
      .prepare("SELECT id FROM treatment_plans WHERE client_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1")
      .get(client.id);
    const goals = plan
      ? db.prepare("SELECT * FROM treatment_goals WHERE plan_id = ? AND status = 'active'").all(plan.id)
      : [];

    let redactedNotes = rawNotes;
    for (const privateValue of [
      client.name,
      client.guardian_name,
      client.guardian_email,
      client.guardian_phone,
    ]) {
      if (!privateValue) continue;
      redactedNotes = redactedNotes.replace(new RegExp(escapeRegExp(privateValue), "gi"), "[redacted]");
    }
    redactedNotes = redactedNotes
      .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[redacted-email]")
      .replace(/(?:\+?63|0)9(?:[\s-]?\d){9}/g, "[redacted-phone]");

    const result = await generateNoteDraft({ rawNotes: redactedNotes, goals });
    db.prepare(
      `INSERT INTO ai_audit_logs
         (user_id, action, provider, input_redacted, output_text, status)
       VALUES (?, 'draft_session_note', ?, ?, ?, ?)`
    ).run(
      req.user.id,
      result.provider,
      JSON.stringify({ client_id: client.id, character_count: rawNotes.length, goal_ids: goals.map((g) => g.id) }),
      JSON.stringify(result.draft),
      result.status
    );

    res.json({ ...result, requires_therapist_approval: true });
  }
);

router.post(
  "/notes",
  requireAuth,
  requireRole("admin", "therapist"),
  (req, res) => {
    const client = ensureClientAccess(req, res, true);
    if (!client) return;

    const intervention = clean(req.body?.intervention);
    const assessment = clean(req.body?.assessment);
    const parent_summary = clean(req.body?.parent_summary);
    const subjective = clean(req.body?.subjective);
    const planText = clean(req.body?.plan);
    const rawNotes = clean(req.body?.raw_notes);
    const source = req.body?.source === "assisted" ? "assisted" : "manual";
    const appointmentId = req.body?.appointment_id ? Number(req.body.appointment_id) : null;
    const measurements = Array.isArray(req.body?.measurements) ? req.body.measurements : [];
    const sessionDate = req.body?.session_date ? new Date(req.body.session_date) : new Date();

    if (!intervention || !assessment || !parent_summary) {
      return res.status(400).json({ error: "Intervention, assessment, and parent summary are required" });
    }
    if (Number.isNaN(sessionDate.getTime())) {
      return res.status(400).json({ error: "Invalid session date" });
    }
    if ([intervention, assessment, parent_summary, subjective, planText].some((value) => value.length > 5000)) {
      return res.status(400).json({ error: "One or more note fields are too long" });
    }

    if (appointmentId) {
      const appointment = db
        .prepare("SELECT * FROM appointments WHERE id = ? AND client_id = ?")
        .get(appointmentId, client.id);
      if (!appointment) return res.status(400).json({ error: "The selected appointment is invalid" });
    }

    const validatedMeasurements = [];
    for (const item of measurements) {
      if (item.value === "" || item.value === null || item.value === undefined) continue;
      const value = Number(item.value);
      const goal = db
        .prepare(
          `SELECT g.* FROM treatment_goals g
           JOIN treatment_plans p ON p.id = g.plan_id
           WHERE g.id = ? AND p.client_id = ?`
        )
        .get(item.goal_id, client.id);
      if (!goal || !Number.isFinite(value)) {
        return res.status(400).json({ error: "One or more goal measurements are invalid" });
      }
      validatedMeasurements.push({
        goal_id: goal.id,
        value,
        assistance_level: clean(item.assistance_level) || null,
        observation: clean(item.observation) || null,
      });
    }

    const therapistId =
      req.user.role === "therapist" ? req.user.therapist_id : client.therapist_id;
    if (!therapistId) return res.status(400).json({ error: "Assign a therapist before adding notes" });

    const saveNote = db.transaction(() => {
      const noteInfo = db
        .prepare(
          `INSERT INTO session_notes
             (client_id, therapist_id, appointment_id, session_date, subjective,
              intervention, assessment, plan, parent_summary, raw_notes, source,
              approved_by, approved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          client.id,
          therapistId,
          appointmentId,
          sessionDate.toISOString(),
          subjective || null,
          intervention,
          assessment,
          planText || null,
          parent_summary,
          rawNotes || null,
          source,
          req.user.id,
          new Date().toISOString()
        );

      const insertMeasurement = db.prepare(
        `INSERT INTO goal_measurements
           (goal_id, session_note_id, value, assistance_level, observation)
         VALUES (?, ?, ?, ?, ?)`
      );
      for (const measurement of validatedMeasurements) {
        insertMeasurement.run(
          measurement.goal_id,
          noteInfo.lastInsertRowid,
          measurement.value,
          measurement.assistance_level,
          measurement.observation
        );
      }
      if (appointmentId) {
        db.prepare("UPDATE appointments SET status = 'completed' WHERE id = ?").run(appointmentId);
      }
      return noteInfo.lastInsertRowid;
    });

    const noteId = saveNote();
    res.status(201).json({
      note: db.prepare("SELECT * FROM session_notes WHERE id = ?").get(noteId),
      progress: progressForClient(client.id, req.user.role),
    });
  }
);

module.exports = router;
