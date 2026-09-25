// Therapist auto-assignment - runs when the admin approves a self-service
// registration.
//
// Algorithm: greedy load balancing. Among active therapists whose specialty
// matches the family's chosen treatment, pick the one with the fewest
// upcoming (non-cancelled, not-yet-ended) sessions on their books. This is
// the same "assign to whoever has the lightest caseload" heuristic used by
// the schedule-suggestions scorer in automation.js - simple, explainable,
// and doesn't need historical data to make a reasonable call.
//
// Kung may tie (parehong upcoming session count), yung unang match sa query
// (ORDER BY id ASC) ang mananalo - deterministic, walang random.

const db = require("../db");

function assignTherapist(serviceType) {
  const candidates = db
    .prepare(
      `SELECT t.id, t.name, t.specialty,
              (SELECT COUNT(*) FROM appointments a
               WHERE a.therapist_id = t.id AND a.status != 'cancelled' AND a.end_time >= datetime('now')
              ) AS upcoming_load
       FROM therapists t
       WHERE t.active = 1 AND t.specialty = ?
       ORDER BY upcoming_load ASC, t.id ASC`
    )
    .all(serviceType);

  return candidates[0] || null;
}

module.exports = { assignTherapist };
