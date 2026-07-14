# TheraConnect

A scheduling and communication platform for TheraFun Intervention Centre (Balanga City, Bataan) —
built for the thesis "TheraConnect: A Web-Based Intelligent Learning and Communication System for
Speech Therapy Services."

Two folders, two servers:

```
theraconnect/
  backend/   Node.js + Express API, SQLite database
  frontend/  React + Vite + Tailwind CSS
```

## Why this stack ("the perfect fit")

| Need from the proposal | Choice | Why |
|---|---|---|
| Centralized scheduling, conflict detection, reports | **SQLite via `sql.js`** (WebAssembly) | Relational data (clients ↔ therapists ↔ appointments) with real foreign keys and `WHERE` overlap queries for double-booking checks. Runs as pure WebAssembly — no C++ compiler, no Visual Studio Build Tools, no `node-gyp`. `npm install` just works on any machine (this replaced an earlier native `better-sqlite3` version after it hit Windows build-tool errors). Swap for Postgres later if you deploy for real. |
| REST API, JWT auth, role-based access (admin/therapist/parent) | **Express + jsonwebtoken + bcryptjs** | The most-documented, most-taught Node stack — easiest for your panel and teammates to read and extend. |
| Interactive weekly calendar (Mon–Sat) | **FullCalendar (`@fullcalendar/react`)** | This is the exact library named in your proposal. |
| SMS reminders/confirmations | **Semaphore** (`api.semaphore.co`) | A Philippine SMS gateway — works with local `09xx` numbers and is billed in PHP, unlike Twilio which needs USD billing and A2P registration. Swap in `src/services/notify.js`. |
| Email announcements | **SMTP (Gmail App Password, or any provider)** via a thin wrapper | Zero-cost to start; swap for SendGrid/Resend later without touching route code. |
| FAQ chatbot | **Rule-based keyword matcher** (`src/services/chatbotEngine.js`) | No ML dependency, no training data, fully explainable — a realistic, defensible scope for a thesis rather than an open-ended NLP project. |

**Notifications work out of the box in "simulated" mode.** Every SMS/email attempt is logged to
the database and visible on the admin's Notification Log page, whether or not you've added real
API keys. That means the whole appointment → reminder → confirm flow is demoable immediately.
Add a `SEMAPHORE_API_KEY` or SMTP credentials in `backend/.env` when you're ready to send for real.

## Quick start

**Backend**
```bash
cd backend
npm install
npm run seed   # creates data.sqlite with demo accounts + sample appointments
npm run dev    # http://localhost:4000
```
No native compiler or build tools required — `sql.js` ships as WebAssembly, so this installs cleanly on Windows, macOS, and Linux alike.

**Frontend** (in a second terminal)
```bash
cd frontend
npm install
npm run dev    # http://localhost:5173, proxies /api to the backend
```

Open http://localhost:5173 — the login screen has one-click buttons to fill in each demo account.

### Demo accounts (from `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin (front desk) | `admin@theraconnect.ph` | `admin123` |
| Therapist | `anna@theraconnect.ph` | `therapist123` |
| Parent | `parent1@theraconnect.ph` | `parent123` |

## What's implemented

- **Admin**: weekly Mon–Sat calendar, create/edit/cancel sessions with automatic double-booking
  prevention per therapist, client roster (add/edit), announcements (posts + emails every guardian
  on file), notification log.
- **Therapist**: read-only view of their own today/upcoming sessions.
- **Parent**: their child's upcoming sessions with a "Confirm attendance" button, latest clinic
  announcements, FAQ chatbot.
- **Chatbot**: floating widget on every screen, answers questions about hours, services,
  rescheduling, cancelling, and assigned therapist.
- **Auth**: JWT-based, three roles, routes are protected and scoped (a parent only ever sees their
  own child's appointments — enforced server-side, not just hidden in the UI).

## What you'll still want before a real production deployment

- Real SMS/email credentials (see table above).
- Swap SQLite for Postgres if you deploy somewhere with concurrent writers at scale.
- Password reset flow and account self-registration for parents (currently accounts are
  provisioned by the admin, matching how the front desk works today).
- HTTPS + a real `JWT_SECRET` rotation policy once this leaves your dev machine.

## Project structure

```
backend/src/
  server.js            Express app + route mounting
  db.js                SQLite (sql.js/WASM) connection + schema (auto-runs on boot)
  seed.js              Demo data
  middleware/auth.js    JWT verification + role guard
  routes/               auth, appointments, clients, therapists, announcements, chatbot, notifications
  services/notify.js    SMS + email sending (with simulated fallback)
  services/chatbotEngine.js   Keyword-matching FAQ engine
  data/faq.json          Chatbot's question/answer set — edit this to add more FAQs

frontend/src/
  context/AuthContext.jsx     Login state, persisted in localStorage
  lib/api.js                  axios instance with auth header + 401 redirect
  components/                 Sidebar, DashboardLayout, SessionCard, AppointmentModal, ClientModal, Chatbot
  pages/admin/                Schedule (calendar), Clients, Announcements, Notifications
  pages/therapist/            TherapistDashboard
  pages/parent/                ParentDashboard
```
