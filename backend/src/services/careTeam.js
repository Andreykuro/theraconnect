// Care team = the child's main therapist (clients.therapist_id) plus any
// extra therapists the admin added (client_therapists table). A therapist on
// the care team can open the child's records, progress, classwork and chat.
const db = require("../db");

// SQL snippet for "this client is on the therapist's caseload".
// Use with the client table aliased as `c` and pass the therapist id twice.
const ON_CASELOAD_SQL = `(c.therapist_id = ? OR EXISTS (
  SELECT 1 FROM client_therapists ct WHERE ct.client_id = c.id AND ct.therapist_id = ?))`;

function isOnCareTeam(client, therapistId) {
  if (!client || !therapistId) return false;
  if (Number(client.therapist_id) === Number(therapistId)) return true;
  return Boolean(
    db
      .prepare("SELECT 1 AS ok FROM client_therapists WHERE client_id = ? AND therapist_id = ?")
      .get(client.id ?? client.client_id, therapistId)
  );
}

// Therapist users only see clients on their care team.
function therapistCanAccess(user, client) {
  return user.role === "therapist" && isOnCareTeam(client, user.therapist_id);
}

// Extra therapists only (the main one is clients.therapist_id).
function additionalTherapists(clientId) {
  return db
    .prepare(
      `SELECT t.id, t.name, t.specialty, t.color
       FROM client_therapists ct JOIN therapists t ON t.id = ct.therapist_id
       WHERE ct.client_id = ?
       ORDER BY t.name ASC`
    )
    .all(clientId);
}

// Replace the extra therapists of a client. The main therapist is skipped so
// nobody is listed twice.
function setAdditionalTherapists(clientId, therapistIds, mainTherapistId) {
  const ids = [...new Set((therapistIds || []).map(Number).filter(Boolean))].filter(
    (id) => id !== Number(mainTherapistId)
  );
  db.prepare("DELETE FROM client_therapists WHERE client_id = ?").run(clientId);
  const insert = db.prepare("INSERT INTO client_therapists (client_id, therapist_id) VALUES (?, ?)");
  for (const id of ids) {
    if (db.prepare("SELECT id FROM therapists WHERE id = ?").get(id)) insert.run(clientId, id);
  }
}

module.exports = { ON_CASELOAD_SQL, isOnCareTeam, therapistCanAccess, additionalTherapists, setAdditionalTherapists };
