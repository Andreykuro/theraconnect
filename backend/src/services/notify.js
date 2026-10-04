// Notification service: sends SMS + email reminders/confirmations.
//
// Both functions ALWAYS write to notifications_log so the admin dashboard has
// a record of what went out. If real API credentials are present in .env,
// they attempt a real send; otherwise they log a "simulated" entry so the
// rest of the app keeps working during dev/demo. A real attempt that errors
// is logged as "failed" - never as "sent".

const nodemailer = require("nodemailer");
const db = require("../db");

const insertLog = db.prepare(`
  INSERT INTO notifications_log (appointment_id, recipient, channel, message, status)
  VALUES (@appointment_id, @recipient, @channel, @message, @status)
`);

// Session times are stored as UTC ISO strings. Families read texts in
// Philippine time, so format them like "Tue, Oct 7, 9:00 AM".
const PH_TIME = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatSessionTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : PH_TIME.format(d);
}

async function sendSMS({ to, message, appointmentId = null }) {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  let status = "simulated";

  if (apiKey) {
    try {
      // Semaphore SMS API (https://semaphore.co/docs) - PH-based gateway,
      // works with local mobile numbers without needing USD billing.
      const res = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ apikey: apiKey, number: to, message }),
      });
      status = res.ok ? "sent" : "failed";
      if (!res.ok) console.error(`[notify] SMS to ${to} failed: HTTP ${res.status}`);
    } catch (err) {
      status = "failed";
      console.error(`[notify] SMS to ${to} failed:`, err.message);
    }
  }

  insertLog.run({
    appointment_id: appointmentId,
    recipient: to,
    channel: "sms",
    message,
    status,
  });

  return { status };
}

// Built once, on first real email, from the SMTP_* settings in .env.
let transporter = null;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = SSL; 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, message, appointmentId = null }) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  let status = "simulated";

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      await getTransporter().sendMail({
        from: process.env.SMTP_FROM || SMTP_USER,
        to,
        subject,
        text: message,
      });
      status = "sent";
    } catch (err) {
      status = "failed";
      console.error(`[notify] Email to ${to} failed:`, err.message);
    }
  }

  insertLog.run({
    appointment_id: appointmentId,
    recipient: to,
    channel: "email",
    message: `${subject}: ${message}`,
    status,
  });

  return { status };
}

module.exports = { sendSMS, sendEmail, formatSessionTime };
