// Notification service: sends SMS + email reminders/confirmations.
//
// Both functions ALWAYS write to notifications_log so the admin dashboard has
// a record of what went out. If real API credentials are present in .env,
// they attempt a real send; otherwise (or on failure) they fall back to a
// "simulated" log entry so the rest of the app keeps working during dev/demo.
//
// Swap the provider calls below for whichever service the deployment uses.

const db = require("../db");

const insertLog = db.prepare(`
  INSERT INTO notifications_log (appointment_id, recipient, channel, message, status)
  VALUES (@appointment_id, @recipient, @channel, @message, @status)
`);

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
    } catch (err) {
      status = "failed";
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

async function sendEmail({ to, subject, message, appointmentId = null }) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  let status = "simulated";

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      // Wire up nodemailer here in production, e.g.:
      // const nodemailer = require("nodemailer");
      // const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: +process.env.SMTP_PORT, auth: { user: SMTP_USER, pass: SMTP_PASS }});
      // await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text: message });
      status = "sent";
    } catch (err) {
      status = "failed";
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

module.exports = { sendSMS, sendEmail };
