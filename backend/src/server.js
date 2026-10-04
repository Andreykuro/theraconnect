require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const db = require("./db");

async function main() {
  // Without a secret every login and token check fails with a confusing
  // "secretOrPrivateKey must have a value" error - stop early and say why.
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing - add JWT_SECRET=<any long random text> to backend/.env");
  }

  await db.ready; // sql.js loads its WASM binary asynchronously - wait for it
                   // before requiring routes, so every db.prepare(...) below
                   // sees a fully-initialized database.

  const authRoutes = require("./routes/auth");
  const enrollmentRoutes = require("./routes/enrollment");
  const progressRoutes = require("./routes/progress");
  const dashboardRoutes = require("./routes/dashboard");
  const registrationsRoutes = require("./routes/registrations");
  const automationRoutes = require("./routes/automation");
  const maintenanceRoutes = require("./routes/maintenance");
  const reportRoutes = require("./routes/reports");
  const appointmentRoutes = require("./routes/appointments");
  const clientRoutes = require("./routes/clients");
  const therapistRoutes = require("./routes/therapists");
  const announcementRoutes = require("./routes/announcements");
  const chatbotRoutes = require("./routes/chatbot");
  const notificationRoutes = require("./routes/notifications");
  const messageRoutes = require("./routes/messages");
  const classworkRoutes = require("./routes/classwork");

  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/api/health", (req, res) => res.json({ ok: true, service: "TheraConnect API" }));

  // Only classwork worksheets/submissions are served as plain files. Enrollment
  // diagnosis documents are medical records, so they go through the login-checked
  // GET /api/enrollment/attachments/:id/file route instead (never public).
  app.use("/api/uploads/classwork", express.static(path.join(__dirname, "..", "uploads", "classwork")));

  app.use("/api/auth", authRoutes);
  app.use("/api/enrollment", enrollmentRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/registrations", registrationsRoutes);
  app.use("/api/automation", automationRoutes);
  app.use("/api/maintenance", maintenanceRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/therapists", therapistRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/chatbot", chatbotRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/classwork", classworkRoutes);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`TheraConnect API listening on port ${PORT}`));
}

main().catch((err) => {
  console.error("Failed to start TheraConnect API:", err);
  process.exit(1);
});
