// SQLite via sql.js (pure WebAssembly - no native compiler, works identically
// on any OS/machine, no Visual Studio / build-essential required).
//
// sql.js keeps the whole database in memory and we persist it to a single
// data.sqlite file on disk after every write. This module wraps it so the
// rest of the app (every route file) can keep using the same
// db.prepare(sql).run/get/all(...) calls it already had with better-sqlite3 -
// nothing else in the codebase needed to change.

const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "data.sqlite");

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS therapists (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  specialty     TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#146B6B',
  phone         TEXT,
  email         TEXT,
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','therapist','parent')),
  name          TEXT NOT NULL,
  therapist_id  INTEGER REFERENCES therapists(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  birthdate         TEXT,
  service_type      TEXT NOT NULL DEFAULT 'Speech Therapy',
  guardian_name     TEXT NOT NULL,
  guardian_phone    TEXT NOT NULL,
  guardian_email    TEXT,
  therapist_id      INTEGER REFERENCES therapists(id),
  user_id           INTEGER REFERENCES users(id),
  notes             TEXT,
  -- Registration review: self-service signups start 'pending' until admin
  -- checks the diagnosis and the system auto-assigns a therapist; clients
  -- added directly by an admin/therapist default to 'active' (already vetted).
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','rejected')),
  diagnosis         TEXT,
  rejection_reason  TEXT,
  reviewed_by       INTEGER REFERENCES users(id),
  reviewed_at       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  therapist_id  INTEGER NOT NULL REFERENCES therapists(id),
  service_type  TEXT NOT NULL,
  start_time    TEXT NOT NULL,
  end_time      TEXT NOT NULL,
  -- 'requested'  = parent self-booked, awaiting admin approval
  -- 'pending'    = admin scheduled it directly, awaiting parent confirmation
  -- 'confirmed'  = locked in (either parent confirmed, or admin approved a request)
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('requested','pending','confirmed','cancelled','completed')),
  notes         TEXT,
  created_by    INTEGER REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS treatment_plans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  therapist_id  INTEGER REFERENCES therapists(id),
  title         TEXT NOT NULL DEFAULT 'Individual Treatment Plan',
  start_date    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  created_by    INTEGER REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS treatment_goals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id       INTEGER NOT NULL REFERENCES treatment_plans(id),
  title         TEXT NOT NULL,
  description   TEXT,
  metric_type   TEXT NOT NULL DEFAULT 'accuracy' CHECK (metric_type IN ('accuracy','frequency','duration','rating','assistance')),
  baseline      REAL NOT NULL,
  target        REAL NOT NULL,
  direction     TEXT NOT NULL DEFAULT 'increase' CHECK (direction IN ('increase','decrease')),
  unit          TEXT NOT NULL DEFAULT '%',
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','achieved','paused')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_notes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id       INTEGER NOT NULL REFERENCES clients(id),
  therapist_id    INTEGER NOT NULL REFERENCES therapists(id),
  appointment_id  INTEGER REFERENCES appointments(id),
  session_date    TEXT NOT NULL,
  subjective      TEXT,
  intervention    TEXT NOT NULL,
  assessment      TEXT NOT NULL,
  plan            TEXT,
  parent_summary  TEXT NOT NULL,
  raw_notes       TEXT,
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','assisted')),
  approved_by     INTEGER NOT NULL REFERENCES users(id),
  approved_at     TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goal_measurements (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id           INTEGER NOT NULL REFERENCES treatment_goals(id),
  session_note_id   INTEGER NOT NULL REFERENCES session_notes(id),
  value             REAL NOT NULL,
  assistance_level  TEXT,
  observation       TEXT,
  recorded_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER REFERENCES users(id),
  action          TEXT NOT NULL,
  provider        TEXT NOT NULL DEFAULT 'local',
  input_redacted  TEXT,
  output_text     TEXT,
  status          TEXT NOT NULL DEFAULT 'completed',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS announcements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','holiday','promo')),
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER REFERENCES appointments(id),
  recipient      TEXT NOT NULL,
  channel        TEXT NOT NULL CHECK (channel IN ('sms','email')),
  message        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'simulated',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  sender_id     INTEGER NOT NULL REFERENCES users(id),
  sender_role   TEXT NOT NULL CHECK (sender_role IN ('parent','therapist','admin')),
  body          TEXT NOT NULL,
  read_at       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_attachments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  label         TEXT NOT NULL DEFAULT 'Doctor''s note',
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  uploaded_by   INTEGER REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classwork (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id           INTEGER NOT NULL REFERENCES clients(id),
  therapist_id        INTEGER NOT NULL REFERENCES therapists(id),
  title               TEXT NOT NULL,
  instructions        TEXT,
  category            TEXT NOT NULL DEFAULT 'Speech Therapy',
  due_date            TEXT,
  points_possible     INTEGER NOT NULL DEFAULT 10,
  attachment_filename TEXT,
  attachment_original_name TEXT,
  attachment_mime_type TEXT,
  status              TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','submitted','graded')),
  submission_note     TEXT,
  submission_filename TEXT,
  submission_original_name TEXT,
  submission_mime_type TEXT,
  submitted_at        TEXT,
  points_earned       INTEGER,
  -- 1-5 star rating replaces points as the family-facing grade; kept
  -- separate from points_possible/points_earned so existing rows are
  -- unaffected. NULL until the therapist grades the submission.
  star_rating         INTEGER CHECK (star_rating IS NULL OR (star_rating BETWEEN 1 AND 5)),
  feedback            TEXT,
  graded_at           TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appt_therapist_time ON appointments(therapist_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appt_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_plan_client ON treatment_plans(client_id, status);
CREATE INDEX IF NOT EXISTS idx_goal_plan ON treatment_goals(plan_id, status);
CREATE INDEX IF NOT EXISTS idx_note_client_date ON session_notes(client_id, session_date);
CREATE INDEX IF NOT EXISTS idx_measurement_goal ON goal_measurements(goal_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_messages_client_time ON messages(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_client ON client_attachments(client_id);
CREATE INDEX IF NOT EXISTS idx_classwork_client ON classwork(client_id, status);
CREATE INDEX IF NOT EXISTS idx_classwork_therapist ON classwork(therapist_id, status);
`;

const wrapper = {};
let sqljsDb;
let dirty = false;
let flushTimer = null;

function persist() {
  // Debounced write: multiple statements in the same tick share one disk write.
  dirty = true;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (!dirty) return;
    dirty = false;
    const data = sqljsDb.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  }, 0);
}

function persistNow() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  dirty = false;
  const data = sqljsDb.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function isPlainParamsObject(params) {
  return (
      params.length === 1 &&
      params[0] !== null &&
      typeof params[0] === "object" &&
      !Array.isArray(params[0])
  );
}

function bindArgs(params) {
  if (params.length === 0) return [];
  if (isPlainParamsObject(params)) {
    // Named parameters, e.g. db.prepare("... VALUES (@foo)").run({ foo: 1 })
    const obj = {};
    for (const [key, value] of Object.entries(params[0])) {
      obj[`@${key}`] = value === undefined ? null : value;
    }
    return obj;
  }
  return params.map((p) => (p === undefined ? null : p));
}

function prepare(sql) {
  return {
    run(...params) {
      const stmt = sqljsDb.prepare(sql);
      try {
        stmt.bind(bindArgs(params));
        stmt.step();
      } finally {
        stmt.free();
      }
      const idRes = sqljsDb.exec("SELECT last_insert_rowid() AS id");
      const lastInsertRowid = idRes[0] ? idRes[0].values[0][0] : undefined;
      persist();
      return { lastInsertRowid, changes: sqljsDb.getRowsModified() };
    },
    get(...params) {
      const stmt = sqljsDb.prepare(sql);
      try {
        stmt.bind(bindArgs(params));
        return stmt.step() ? stmt.getAsObject() : undefined;
      } finally {
        stmt.free();
      }
    },
    all(...params) {
      const stmt = sqljsDb.prepare(sql);
      const rows = [];
      try {
        stmt.bind(bindArgs(params));
        while (stmt.step()) rows.push(stmt.getAsObject());
      } finally {
        stmt.free();
      }
      return rows;
    },
  };
}

wrapper.prepare = prepare;

wrapper.exec = (sql) => {
  sqljsDb.exec(sql);
  persist();
};

wrapper.pragma = () => {
  // No-op: WAL mode isn't meaningful for sql.js's in-memory + export model,
  // and foreign key enforcement is turned on explicitly during init below.
};

let txDepth = 0;

wrapper.transaction = (fn) => {
  return (...args) => {
    txDepth++;
    const depth = txDepth;
    const savepoint = `sp_${depth}`;
    try {
      sqljsDb.exec(depth === 1 ? "BEGIN" : `SAVEPOINT ${savepoint}`);
      const result = fn(...args);
      sqljsDb.exec(depth === 1 ? "COMMIT" : `RELEASE ${savepoint}`);
      return result;
    } catch (err) {
      sqljsDb.exec(depth === 1 ? "ROLLBACK" : `ROLLBACK TO ${savepoint}`);
      throw err;
    } finally {
      txDepth--;
      if (txDepth === 0) persistNow();
    }
  };
};

// Lightweight, idempotent migration for data.sqlite files created before a
// schema change - CREATE TABLE IF NOT EXISTS only applies to brand-new
// files, so an existing file needs its columns/constraints patched in place.
// Safe to run on every boot: each step first checks whether it's already
// been applied before doing anything.
function migrate() {
  function hasColumn(table, column) {
    const rows = sqljsDb.exec(`PRAGMA table_info(${table})`);
    if (!rows[0]) return false;
    const idx = rows[0].columns.indexOf("name");
    return rows[0].values.some((row) => row[idx] === column);
  }

  function tableSql(table) {
    const rows = sqljsDb.exec(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`
    );
    return rows[0]?.values?.[0]?.[0] || "";
  }

  // --- additive columns: plain ALTER TABLE, one guard each ---
  if (!hasColumn("clients", "status")) {
    sqljsDb.exec(
        `ALTER TABLE clients ADD COLUMN status TEXT NOT NULL DEFAULT 'active';`
    );
  }
  if (!hasColumn("clients", "diagnosis")) {
    sqljsDb.exec(`ALTER TABLE clients ADD COLUMN diagnosis TEXT;`);
  }
  if (!hasColumn("clients", "rejection_reason")) {
    sqljsDb.exec(`ALTER TABLE clients ADD COLUMN rejection_reason TEXT;`);
  }
  if (!hasColumn("clients", "reviewed_by")) {
    sqljsDb.exec(`ALTER TABLE clients ADD COLUMN reviewed_by INTEGER REFERENCES users(id);`);
  }
  if (!hasColumn("clients", "reviewed_at")) {
    sqljsDb.exec(`ALTER TABLE clients ADD COLUMN reviewed_at TEXT;`);
  }
  if (!hasColumn("classwork", "star_rating")) {
    sqljsDb.exec(
        `ALTER TABLE classwork ADD COLUMN star_rating INTEGER CHECK (star_rating IS NULL OR (star_rating BETWEEN 1 AND 5));`
    );
  }

  // --- CHECK constraint change: SQLite can't ALTER a CHECK in place, so
  // rebuild the table only if the old constraint (without 'requested') is
  // still the one on disk. FK enforcement has to be off for the rebuild:
  // RENAME makes other tables' FKs point at appointments_old, and DROP TABLE
  // does an implicit delete that gets checked against session_notes /
  // notifications_log rows still referencing those old appointment ids. ---
  const apptSql = tableSql("appointments");
  if (apptSql && !apptSql.includes("'requested'")) {
    sqljsDb.exec(`
      PRAGMA foreign_keys = OFF;
      ALTER TABLE appointments RENAME TO appointments_old;
      CREATE TABLE appointments (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id     INTEGER NOT NULL REFERENCES clients(id),
        therapist_id  INTEGER NOT NULL REFERENCES therapists(id),
        service_type  TEXT NOT NULL,
        start_time    TEXT NOT NULL,
        end_time      TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('requested','pending','confirmed','cancelled','completed')),
        notes         TEXT,
        created_by    INTEGER REFERENCES users(id),
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO appointments SELECT * FROM appointments_old;
      DROP TABLE appointments_old;
      PRAGMA foreign_keys = ON;
    `);
  }
}

wrapper.ready = (async () => {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, "..", "node_modules", "sql.js", "dist", file),
  });

  const existing = fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE) : undefined;
  sqljsDb = new SQL.Database(existing);
  sqljsDb.exec("PRAGMA foreign_keys = ON;");
  sqljsDb.exec(SCHEMA_SQL);
  migrate();
  persistNow();

  return wrapper;
})();

module.exports = wrapper;