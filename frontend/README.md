<div align="center">
  <img src="frontend/public/therafun-logo.png" alt="TheraFun Intervention Centre" width="220" />

  # TheraConnect

  **A web-based scheduling, communication, and clinical-progress platform for TheraFun Intervention Centre**
  Balanga City, Bataan · est. 2011

  Built for the thesis proposal *"TheraConnect: A Web-Based Intelligent Learning and Communication
  System for Speech Therapy Services."*
</div>

---

## About the app

TheraFun Intervention Centre offers Speech Therapy, Occupational Therapy, Physical Therapy,
Special Education tutorials, Playgroup classes, Early Intervention, and Childcare to over a
hundred children a week. Before this system, coordinating that meant a front-desk secretary
manually texting every parent the day before their session, waiting for a reply, and re-typing
the whole week's schedule by hand — a process that ate hours daily and left plenty of room for
missed appointments and double-booked therapists.

TheraConnect replaces that manual loop with a single web app three kinds of people log into:

- **Admins** run the front desk from it — the weekly schedule, the client roster, clinic
  announcements, and a log of every automated reminder that's gone out.
- **Therapists** see their own caseload, chat with the families they're treating, and write
  session notes with an AI assistant that drafts the clinical write-up for them to review.
- **Parents** book their child's own sessions from a live list of open slots, get reminders,
  confirm attendance, message their child's therapist directly, and enroll a new child entirely
  online — including uploading a doctor's note or diagnosis as part of signup.

Alongside the clinic's therapy programs, the app also has a second public-facing site,
**TheraFun Play**, for families who just want daycare or playgroup — a separate front door with
its own enrollment flow, so someone doesn't have to wade through therapy-program language to
sign their kid up for playgroup.

## What's actually in it

**Scheduling**
- Interactive Monday–Saturday calendar (FullCalendar) for admins, color-coded per therapist
- Automatic double-booking prevention — checked server-side, not just hidden in the UI
- Parent self-service booking: pick a therapist and date, see only genuinely open hourly slots,
  book instantly. A slot another parent just took disappears from the list on the next check.

**Communication**
- Rule-based FAQ chatbot (hours, services, rescheduling, cancelling, therapist assignment)
- Simulated-by-default SMS + email reminders, confirmations, and announcements — every attempt is
  logged for the admin, and becomes a real send the moment a provider API key is added
- Direct parent ↔ therapist messaging, one thread per child, with read receipts and an unread
  badge in the therapist's inbox

**Enrollment**
- Public self-signup (creates the parent account and the child's record together)
- Doctor's note / diagnosis image upload at signup or any time after, from the parent portal
- A second enrollment path themed for TheraFun Play (daycare/playgroup, no therapy framing)

**Clinical / progress tracking**
- Treatment plans and goals per client
- Session notes, with an AI assistant (OpenAI, or a clinic-approved alternative endpoint) that
  drafts a structured note — subjective, intervention, assessment, plan, and a parent-friendly
  summary — from a therapist's raw session input, for the therapist to review and finalize
- An automation pass that cross-references goals, measurements, and session history to flag
  goals that appear to have stalled, so a therapist doesn't have to notice that by hand

**Design**
- A public marketing homepage (and TheraFun Play's sister page) with anime.js-driven entrance
  animations, scroll reveals, and an animated off-canvas menu
- Consistent spring-based modal and page-transition animations across the whole authenticated app
- Full `prefers-reduced-motion` support — every animation degrades to an instant, static state for
  anyone with that OS accessibility setting on

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Database | **SQLite via `sql.js`** (WebAssembly) | Real relational schema (foreign keys, joins, overlap queries for conflict detection) with zero native compilation — no Visual Studio Build Tools, no `node-gyp`. `npm install` just works on Windows, macOS, or Linux. Swap for Postgres if this ever needs to run as a real multi-user hosted service. |
| Backend | **Express 5 + JWT + bcrypt** | The most-documented Node stack — easiest for a thesis panel (or a teammate) to read and extend. |
| File uploads | **multer** | Doctor's note / diagnosis images, validated by MIME type and size, served statically. |
| SMS | **Semaphore** | Philippine SMS gateway, billed in PHP, works with local `09xx` numbers without A2P registration or USD billing. |
| Email | **SMTP** (Gmail App Password or any provider) | Zero-cost to start. |
| AI note drafting | **OpenAI**, with a swappable fallback endpoint | Keeps the clinical AI feature vendor-agnostic. |
| Calendar | **FullCalendar** (`@fullcalendar/react`) | The exact library named in the original thesis proposal. |
| Frontend | **React + Vite + Tailwind CSS v4** | Fast dev loop, utility-first styling matched to a custom TheraFun theme (colors, fonts, spacing all defined once in `index.css`). |
| Animation | **anime.js v4** | Spring-based entrances, scroll reveals, and page transitions across both the public site and the authenticated app. |

## Quick start

**Backend**
```bash
cd backend
npm install
npm run seed   # creates data.sqlite with demo accounts + sample data
npm run dev    # http://localhost:4000
```
No native compiler required — `sql.js` ships as WebAssembly.

**Frontend** (second terminal)
```bash
cd frontend
npm install
npm run dev    # http://localhost:5173, proxies /api to the backend
```

Open http://localhost:5173 — the login screen has one-click buttons to fill in each demo account.
TheraFun Play is at `/play`; the therapy-program homepage is at `/`.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin (front desk) | `admin@theraconnect.ph` | `admin123` |
| Therapist | `anna@theraconnect.ph` | `therapist123` (Speech Therapy) |
| Therapist | `ben@theraconnect.ph` | `therapist123` (Occupational Therapy) |
| Parent | `parent1@theraconnect.ph` | `parent123` (guardian of Miguel Dela Cruz) |

### Environment variables (`backend/.env`)

Notifications and AI note drafting all work in a **simulated** mode with zero configuration — the
app is fully demoable right out of `npm run seed`. Add real credentials only when you want them
to actually send/call out:

```
SEMAPHORE_API_KEY=       # real SMS
SMTP_HOST / SMTP_USER / SMTP_PASS   # real email
OPENAI_API_KEY=          # real AI-drafted session notes
AI_NOTES_ENDPOINT=       # alternative note-drafting service, used only if OPENAI_API_KEY is blank
```

## Project structure

```
backend/src/
  server.js              Express app, route mounting, static /api/uploads serving
  db.js                   SQLite schema (13 tables, auto-created on boot)
  seed.js                 Demo data
  middleware/auth.js       JWT verification + role guard
  routes/
    auth, appointments, clients, therapists, announcements   core clinic operations
    chatbot, notifications                                    FAQ bot + SMS/email log
    messages                                                  parent-therapist chat
    enrollment                                                public signup + attachments
    progress, automation                                      treatment plans, goals, note AI
  services/
    notify.js              SMS + email sending, simulated fallback
    chatbotEngine.js        keyword-matching FAQ engine
    noteAssistant.js        AI session-note drafting

frontend/src/
  pages/                   Home, PlayHome, Login, Enrollment, plus admin/ therapist/ parent/
  components/              DashboardLayout, Sidebar, PublicNavbar, Chatbot, every modal
  hooks/                   useHeroIntro, useModalEntrance (shared anime.js choreography)
  context/AuthContext.jsx   Login state, persisted in localStorage
  lib/api.js, lib/motion.js  axios client; prefers-reduced-motion helper
```

---

## How it works

A closer look at the mechanisms behind the four things that make this more than a CRUD app.

**Conflict-free self-booking.** When a parent opens the booking modal, the frontend asks the
backend for every open hourly slot for a chosen therapist and date. The backend generates
candidate 8am–5pm slots, subtracts anything already booked for that therapist that day, and drops
anything already in the past — so a taken slot is never even shown, rather than shown-then-
rejected. When the parent picks one, the same overlap check runs again server-side before the
booking is written, as a safety net in case two parents grabbed the same slot at the same moment;
whoever loses the race gets a clear "that slot was just taken" message instead of a silent
double-booking.

**Parent ↔ therapist messaging.** Each parent's account is linked to exactly one child record,
and that child has an assigned therapist — so a "conversation" is really just `client_id`,
with no separate thread-management system needed. A parent always talks to whoever their child is
assigned to; a therapist sees one thread per family on their caseload, with an unread count drawn
from messages the parent has sent that the therapist hasn't opened yet. It's polling-based (checked
every few seconds while a thread is open) rather than WebSockets — simpler to run, and more than
fast enough for this kind of message volume.

**AI-assisted session notes.** After a session, a therapist enters raw notes — what was worked
on, how the child responded — and the note assistant sends that, plus the relevant treatment
goal's metadata, to an LLM with a fixed schema it must return: subjective, intervention,
assessment, plan, a parent-friendly summary, and any measurement values worth logging. The
therapist reviews and edits before saving; nothing is written to a client's record without a human
checking it first. Every AI-assisted note is written to `ai_audit_logs`, so there's a record of
when AI was involved in drafting clinical documentation.

**Progress automation.** Separately, a scheduled-suggestions pass joins active treatment goals to
their measurement history and the session notes those measurements came from, looking for goals
whose numbers have plateaued or slipped across recent sessions. Rather than a therapist needing to
mentally track a dozen children's trendlines, the flags surface on their own.

**Motion system.** Every animation runs through two shared pieces: a `Reveal` component
(IntersectionObserver decides *when*, anime.js spring physics decide *how*) used across both
public homepages, and a `useModalEntrance` hook shared by all five modals in the app, so a new
modal gets the same polished entrance for free instead of needing its own animation code. Both —
along with the hero and page-transition animations — check `prefers-reduced-motion` before doing
anything, and resolve straight to their end state if it's on.
