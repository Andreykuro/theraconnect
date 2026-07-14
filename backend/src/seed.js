require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./db");

function hash(pw) {
  return bcrypt.hashSync(pw, 10);
}

async function main() {
  await db.ready; // wait for sql.js's WASM engine to finish loading

  const wipe = db.transaction(() => {
    db.exec(`
      DELETE FROM notifications_log;
      DELETE FROM appointments;
      DELETE FROM announcements;
      DELETE FROM clients;
      DELETE FROM users;
      DELETE FROM therapists;
    `);
  });

  const seed = db.transaction(() => {
    wipe();

    const insertTherapist = db.prepare(
      "INSERT INTO therapists (name, specialty, color, phone, email) VALUES (?, ?, ?, ?, ?)"
    );
    const t1 = insertTherapist.run("Therapist Anna Reyes", "Speech Therapy", "#146B6B", "09171234567", "anna@theraconnect.ph");
    const t2 = insertTherapist.run("Therapist Ben Cruz", "Occupational Therapy", "#FF7A59", "09171234568", "ben@theraconnect.ph");
    const t3 = insertTherapist.run("Therapist Cathy Lim", "Physical Therapy", "#3B7DDB", "09171234569", "cathy@theraconnect.ph");

    const insertUser = db.prepare(
      "INSERT INTO users (email, password_hash, role, name, therapist_id) VALUES (?, ?, ?, ?, ?)"
    );
    insertUser.run("admin@theraconnect.ph", hash("admin123"), "admin", "Front Desk Admin", null);
    insertUser.run("anna@theraconnect.ph", hash("therapist123"), "therapist", "Anna Reyes", t1.lastInsertRowid);
    insertUser.run("ben@theraconnect.ph", hash("therapist123"), "therapist", "Ben Cruz", t2.lastInsertRowid);
    const parentUser = insertUser.run(
      "parent1@theraconnect.ph",
      hash("parent123"),
      "parent",
      "Mrs. Dela Cruz",
      null
    );

    const insertClient = db.prepare(`
      INSERT INTO clients (name, birthdate, service_type, guardian_name, guardian_phone, guardian_email, therapist_id, user_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const c1 = insertClient.run(
      "Miguel Dela Cruz",
      "2019-03-14",
      "Speech Therapy",
      "Mrs. Dela Cruz",
      "09201234567",
      "parent1@theraconnect.ph",
      t1.lastInsertRowid,
      parentUser.lastInsertRowid,
      "Working on articulation of /r/ and /s/ sounds."
    );
    insertClient.run(
      "Sofia Santos",
      "2020-07-02",
      "Occupational Therapy",
      "Mr. Santos",
      "09201234568",
      "santos.parent@example.com",
      t2.lastInsertRowid,
      null,
      "Fine motor skills development."
    );
    insertClient.run(
      "Ella Ramos",
      "2018-11-20",
      "Physical Therapy",
      "Mrs. Ramos",
      "09201234569",
      "ramos.parent@example.com",
      t3.lastInsertRowid,
      null,
      null
    );

    const insertAppt = db.prepare(`
      INSERT INTO appointments (client_id, therapist_id, service_type, start_time, end_time, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const today = new Date();
    function atHour(daysFromNow, hour, minute = 0) {
      const d = new Date(today);
      d.setDate(d.getDate() + daysFromNow);
      d.setHours(hour, minute, 0, 0);
      return d.toISOString();
    }

    insertAppt.run(
      c1.lastInsertRowid,
      t1.lastInsertRowid,
      "Speech Therapy",
      atHour(1, 9, 0),
      atHour(1, 10, 0),
      "pending",
      "Weekly session"
    );
    insertAppt.run(
      c1.lastInsertRowid,
      t1.lastInsertRowid,
      "Speech Therapy",
      atHour(8, 9, 0),
      atHour(8, 10, 0),
      "pending",
      "Follow-up session"
    );
    insertAppt.run(
      2,
      t2.lastInsertRowid,
      "Occupational Therapy",
      atHour(2, 13, 0),
      atHour(2, 14, 0),
      "confirmed",
      null
    );
    insertAppt.run(
      3,
      t3.lastInsertRowid,
      "Physical Therapy",
      atHour(3, 10, 30),
      atHour(3, 11, 30),
      "pending",
      null
    );

    db.prepare(
      "INSERT INTO announcements (title, body, category, created_by) VALUES (?, ?, ?, ?)"
    ).run(
      "Clinic closed for Bataan Day",
      "TheraFun Intervention Centre will be closed on April 9 in observance of Araw ng Kagitingan. Sessions on that day will be rescheduled; the front desk will reach out individually.",
      "holiday",
      1
    );
  });

  seed();

  console.log("Seed complete. Demo accounts:");
  console.log("  admin@theraconnect.ph / admin123");
  console.log("  anna@theraconnect.ph / therapist123  (Speech Therapy)");
  console.log("  ben@theraconnect.ph / therapist123   (Occupational Therapy)");
  console.log("  parent1@theraconnect.ph / parent123  (guardian of Miguel Dela Cruz)");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
