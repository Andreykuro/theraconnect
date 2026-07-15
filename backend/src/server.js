require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const db = require("./db");

async function main() {
  await db.ready; // sql.js loads its WASM binary asynchronously - wait for it
                   // before requiring routes, so every db.prepare(...) below
                   // sees a fully-initialized database.

  const authRoutes = require("./routes/auth");
  const enrollmentRoutes = require("./routes/enrollment");
  const progressRoutes = require("./routes/progress");
  const automationRoutes = require("./routes/automation");
  const appointmentRoutes = require("./routes/appointments");
  const clientRoutes = require("./routes/clients");
  const therapistRoutes = require("./routes/therapists");
  const announcementRoutes = require("./routes/announcements");
  const chatbotRoutes = require("./routes/chatbot");
  const notificationRoutes = require("./routes/notifications");

  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/api/health", (req, res) => res.json({ ok: true, service: "TheraConnect API" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/enrollment", enrollmentRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/automation", automationRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/therapists", therapistRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/chatbot", chatbotRoutes);
  app.use("/api/notifications", notificationRoutes);

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
