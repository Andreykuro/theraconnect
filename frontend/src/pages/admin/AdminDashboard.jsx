import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  addHours,
  differenceInMinutes,
  endOfWeek,
  format,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import {
  BellRing,
  CalendarCheck2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Gauge,
  Hourglass,
  Inbox,
  Loader2,
  Plus,
  Search,
  Sun,
  X,
} from "lucide-react";
import { animate } from "animejs";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import AppointmentModal from "../../components/AppointmentModal";
import StatusBadge from "../../components/StatusBadge";
import { prefersReducedMotion } from "../../lib/motion";

const STATUS_FILTERS = [
  { value: "active", label: "All active" },
  { value: "requested", label: "Requests" },
  { value: "pending", label: "Awaiting parent" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const VIEWS = [
  { value: "timeGridDay", label: "Day" },
  { value: "timeGridWeek", label: "Week" },
  { value: "dayGridMonth", label: "Month" },
];

// Clinic hours: Monday to Saturday, 8 AM to 6 PM -> 60 bookable hours a week.
const WEEKLY_CAPACITY_HOURS = 60;

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [modalState, setModalState] = useState(null); // null | { initial }
  const [loading, setLoading] = useState(true);
  const [hiddenTherapists, setHiddenTherapists] = useState(() => new Set());
  const [statusFilter, setStatusFilter] = useState("active");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("timeGridWeek");
  const [title, setTitle] = useState("");
  const [toast, setToast] = useState(null); // { tone, text }
  const calRef = useRef(null);

  const loadAll = useCallback(async () => {
    const [apptsRes, clientsRes, therapistsRes] = await Promise.all([
      api.get("/appointments"),
      api.get("/clients"),
      api.get("/therapists"),
    ]);
    setAppointments(apptsRes.data);
    setClients(clientsRes.data);
    setTherapists(therapistsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ---------- monitoring numbers ----------
  const monitor = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const soon = addHours(now, 48);
    const live = appointments.filter((a) => a.status !== "cancelled");

    const today = live
      .filter((a) => isToday(parseISO(a.start_time)))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const week = live.filter((a) => {
      const s = parseISO(a.start_time);
      return s >= weekStart && s <= weekEnd;
    });
    const upcoming = live.filter((a) => parseISO(a.end_time) >= now);
    const requests = appointments
      .filter((a) => a.status === "requested")
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const unconfirmedSoon = appointments
      .filter((a) => a.status === "pending" && parseISO(a.start_time) > now && parseISO(a.start_time) <= soon)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const wrapUp = appointments
      .filter((a) => (a.status === "pending" || a.status === "confirmed") && parseISO(a.end_time) < now)
      .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    const confirmed = upcoming.filter((a) => a.status === "confirmed").length;
    const pending = upcoming.filter((a) => a.status === "pending").length;
    const weekHours = week.reduce(
      (sum, a) => sum + differenceInMinutes(parseISO(a.end_time), parseISO(a.start_time)) / 60,
      0
    );

    const load = therapists.map((t) => {
      const mine = week.filter((a) => Number(a.therapist_id) === Number(t.id));
      const hours = mine.reduce(
        (sum, a) => sum + differenceInMinutes(parseISO(a.end_time), parseISO(a.start_time)) / 60,
        0
      );
      return { ...t, sessions: mine.length, hours };
    });

    return {
      today,
      todayDone: today.filter((a) => a.status === "completed").length,
      weekCount: week.length,
      weekHours,
      requests,
      unconfirmedSoon,
      wrapUp,
      pending,
      confirmRate: confirmed + pending === 0 ? null : Math.round((confirmed / (confirmed + pending)) * 100),
      load,
    };
  }, [appointments, therapists]);

  // ---------- calendar events ----------
  const events = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments
      .filter((a) => (statusFilter === "active" ? a.status !== "cancelled" : a.status === statusFilter))
      .filter((a) => !hiddenTherapists.has(Number(a.therapist_id)))
      .filter((a) => !q || a.client_name.toLowerCase().includes(q) || a.therapist_name.toLowerCase().includes(q))
      .map((a) => ({
        id: String(a.id),
        title: a.client_name,
        start: a.start_time,
        end: a.end_time,
        classNames: [`tc-st-${a.status}`],
        editable: !["completed", "cancelled"].includes(a.status),
        extendedProps: { appt: a },
      }));
  }, [appointments, statusFilter, hiddenTherapists, query]);

  function toggleTherapist(id) {
    setHiddenTherapists((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function calendar(action, arg) {
    const apiCal = calRef.current?.getApi();
    if (!apiCal) return;
    if (action === "view") apiCal.changeView(arg);
    else apiCal[action]();
  }

  // Drag or stretch a session on the calendar to reschedule it.
  async function reschedule(info) {
    const appt = info.event.extendedProps.appt;
    try {
      await api.put(`/appointments/${appt.id}`, {
        start_time: info.event.start.toISOString(),
        end_time: info.event.end.toISOString(),
      });
      setToast({
        tone: "ok",
        text: `${appt.client_name} moved to ${format(info.event.start, "EEE, MMM d · h:mm a")}. The guardian was notified.`,
      });
      loadAll();
    } catch (err) {
      info.revert();
      setToast({ tone: "error", text: err.response?.data?.error || "Couldn't move that session." });
    }
  }

  async function runAction(path, okText) {
    try {
      await api.post(path);
      setToast({ tone: "ok", text: okText });
      await loadAll();
    } catch (err) {
      setToast({ tone: "error", text: err.response?.data?.error || "That didn't work. Please try again." });
    }
  }

  return (
    <DashboardLayout
      title="Schedule monitor"
      subtitle={`${format(new Date(), "EEEE, MMMM d")} · Monday to Saturday · all therapists`}
      actions={
        <button
          onClick={() => setModalState({ initial: null })}
          className="flex items-center gap-2 rounded-lg bg-sunrise px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
        >
          <Plus size={16} />
          New session
        </button>
      }
    >
      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={Sun}
          tone="sunrise"
          label="Sessions today"
          value={monitor.today.length}
          hint={`${monitor.todayDone} done`}
        />
        <StatCard
          icon={CalendarClock}
          tone="harbor"
          label="This week"
          value={monitor.weekCount}
          hint={`${+monitor.weekHours.toFixed(1)} hrs booked`}
        />
        <StatCard
          icon={Inbox}
          tone="sky"
          label="Requests to review"
          value={monitor.requests.length}
          hint="Booked by parents"
        />
        <StatCard
          icon={Hourglass}
          tone="amber"
          label="Awaiting parent"
          value={monitor.pending}
          hint={`${monitor.unconfirmedSoon.length} within 48 hrs`}
        />
        <StatCard
          icon={Gauge}
          tone="lime"
          label="Confirmation rate"
          value={monitor.confirmRate === null ? "—" : `${monitor.confirmRate}%`}
          hint="of upcoming sessions"
          raw
        />
      </div>

      <AttentionPanel monitor={monitor} onAction={runAction} onOpen={(appt) => setModalState({ initial: appt })} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Calendar */}
        <section className="tc-calendar min-w-0 rounded-2xl bg-white shadow-sm ring-1 ring-mist-light">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist-light px-4 py-3.5">
            <div className="flex items-center gap-2">
              <IconButton label="Previous" onClick={() => calendar("prev")}>
                <ChevronLeft size={17} />
              </IconButton>
              <IconButton label="Next" onClick={() => calendar("next")}>
                <ChevronRight size={17} />
              </IconButton>
              <button
                onClick={() => calendar("today")}
                className="rounded-full border border-mist-light px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-harbor-light"
              >
                Today
              </button>
              <h2 className="ml-2 font-display text-lg font-semibold text-ink">{title}</h2>
            </div>
            <div className="flex rounded-full bg-chalk p-1 ring-1 ring-mist-light">
              {VIEWS.map((v) => (
                <button
                  key={v.value}
                  onClick={() => calendar("view", v.value)}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                    view === v.value ? "bg-harbor text-white shadow-sm" : "text-mist hover:text-ink"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3 border-b border-mist-light px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-lg bg-chalk px-3 ring-1 ring-mist-light">
                <Search size={14} className="text-mist" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a child or therapist…"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-mist-light bg-white px-3 text-sm text-ink outline-none focus:border-harbor"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {therapists.map((t) => {
                const hidden = hiddenTherapists.has(Number(t.id));
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTherapist(Number(t.id))}
                    title={hidden ? "Show on calendar" : "Hide from calendar"}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      hidden ? "border-mist-light text-mist/70 line-through" : "border-transparent text-ink"
                    }`}
                    style={hidden ? undefined : { backgroundColor: `color-mix(in srgb, ${t.color} 12%, white)` }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hidden ? "#ccc" : t.color }} />
                    {t.name.replace(/^(Therapist|Coach)\s+/, "")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-3 pb-3 pt-2">
            {!loading && (
              <FullCalendar
                ref={calRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={window.innerWidth < 768 ? "timeGridDay" : "timeGridWeek"}
                headerToolbar={false}
                firstDay={1}
                hiddenDays={[0]}
                allDaySlot={false}
                slotMinTime="08:00:00"
                slotMaxTime="18:00:00"
                slotDuration="00:30:00"
                slotLabelInterval="01:00"
                slotLabelFormat={{ hour: "numeric", meridiem: "short" }}
                businessHours={{ daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "18:00" }}
                height="auto"
                expandRows
                nowIndicator
                dayMaxEvents={3}
                events={events}
                selectable
                selectMirror
                editable
                eventDrop={reschedule}
                eventResize={reschedule}
                datesSet={(arg) => {
                  setTitle(arg.view.title);
                  setView(arg.view.type);
                }}
                dayHeaderContent={(arg) =>
                  arg.view.type === "dayGridMonth" ? (
                    <span className="tc-dayhead-week">{format(arg.date, "EEE")}</span>
                  ) : (
                    <span className={`tc-dayhead ${arg.isToday ? "is-today" : ""}`}>
                      <span className="tc-dayhead-week">{format(arg.date, "EEE")}</span>
                      <span className="tc-dayhead-num">{format(arg.date, "d")}</span>
                    </span>
                  )
                }
                eventContent={renderEvent}
                select={(info) => setModalState({ initial: { start_time: info.startStr, end_time: info.endStr } })}
                eventClick={(info) => setModalState({ initial: info.event.extendedProps.appt })}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-mist-light px-4 py-3 text-[11px] text-mist">
            <span className="font-semibold uppercase tracking-wide">Legend</span>
            <Legend className="tc-legend-requested" label="Request (needs approval)" />
            <Legend className="tc-legend-pending" label="Awaiting parent" />
            <Legend className="tc-legend-confirmed" label="Confirmed" />
            <Legend className="tc-legend-completed" label="Completed" />
            <span className="ml-auto">Drag a session to move it · drag on empty time to add one</span>
          </div>
        </section>

        {/* Side panels */}
        <aside className="space-y-6">
          <TodayAgenda items={monitor.today} onOpen={(appt) => setModalState({ initial: appt })} />
          <TherapistLoad rows={monitor.load} />
        </aside>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.tone === "ok" ? "bg-ink text-white" : "bg-coral-red text-white"
          }`}
        >
          {toast.tone === "ok" ? <CheckCircle2 size={16} /> : <X size={16} />}
          {toast.text}
        </div>
      )}

      {modalState && (
        <AppointmentModal
          clients={clients}
          therapists={therapists}
          initial={modalState.initial}
          onClose={() => setModalState(null)}
          onSaved={() => {
            setModalState(null);
            loadAll();
          }}
        />
      )}
    </DashboardLayout>
  );
}

// ---------- calendar event ----------
const STATUS_ICON = {
  requested: Inbox,
  pending: Hourglass,
  confirmed: CalendarCheck2,
  completed: CheckCircle2,
  cancelled: X,
};

const STATUS_SHORT = {
  requested: "Request",
  pending: "Awaiting parent",
  confirmed: "Confirmed",
  completed: "Done",
  cancelled: "Cancelled",
};

function renderEvent(arg) {
  const appt = arg.event.extendedProps.appt;
  const Icon = STATUS_ICON[appt.status] || Hourglass;
  const style = { "--tc-color": appt.therapist_color };
  if (arg.view.type === "dayGridMonth") {
    return (
      <div className="tc-event-chip" style={style} title={`${appt.client_name} · ${appt.therapist_name}`}>
        <span className="tc-event-dot" style={{ backgroundColor: appt.therapist_color }} />
        <span className="font-mono text-[10px] text-mist">{format(arg.event.start, "h:mma").toLowerCase()}</span>
        <span className="truncate">{appt.client_name}</span>
      </div>
    );
  }
  const minutes = (arg.event.end - arg.event.start) / 60000;
  return (
    <div className="tc-event-ticket" style={style}>
      <div className="flex items-center justify-between gap-1">
        <span className="tc-event-time">
          {format(arg.event.start, "h:mm")} – {format(arg.event.end, "h:mm")}
        </span>
        <Icon size={11} className="tc-event-icon flex-shrink-0" />
      </div>
      <span className="tc-event-title">{appt.client_name}</span>
      <span className="tc-event-sub">
        {appt.therapist_name.replace(/^(Therapist|Coach)\s+/, "")} · {appt.service_type}
      </span>
      {minutes >= 60 && <span className="tc-event-status">{STATUS_SHORT[appt.status]}</span>}
    </div>
  );
}

function Legend({ className, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`tc-legend ${className}`} />
      {label}
    </span>
  );
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-mist-light text-ink transition hover:bg-harbor-light hover:text-harbor-dark"
    >
      {children}
    </button>
  );
}

// ---------- needs attention ----------
function AttentionPanel({ monitor, onAction, onOpen }) {
  const tabs = [
    { key: "requests", label: "Requests to approve", icon: Inbox, items: monitor.requests },
    { key: "soon", label: "Unconfirmed in next 48 hrs", icon: BellRing, items: monitor.unconfirmedSoon },
    { key: "wrap", label: "Ended, not marked done", icon: ClipboardCheck, items: monitor.wrapUp },
  ];
  const firstWithItems = tabs.find((t) => t.items.length > 0)?.key || "requests";
  const [active, setActive] = useState(firstWithItems);
  const total = tabs.reduce((n, t) => n + t.items.length, 0);
  const current = tabs.find((t) => t.key === active) || tabs[0];

  if (total === 0) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-2xl bg-harbor-light/50 px-4 py-3 text-sm font-semibold text-harbor-dark ring-1 ring-harbor/15">
        <CheckCircle2 size={16} />
        All caught up - no requests, unconfirmed sessions, or sessions to close.
      </div>
    );
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-light">
      <div className="flex flex-wrap items-center gap-1 border-b border-mist-light px-3 pt-3">
        <p className="mr-3 px-1 pb-3 font-display text-sm font-semibold text-ink">Needs attention</p>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-xs font-semibold transition ${
              active === t.key ? "border-harbor text-harbor-dark" : "border-transparent text-mist hover:text-ink"
            }`}
          >
            <t.icon size={14} />
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                t.items.length ? "bg-sunrise text-white" : "bg-chalk text-mist"
              }`}
            >
              {t.items.length}
            </span>
          </button>
        ))}
      </div>
      <div className="max-h-[260px] divide-y divide-mist-light overflow-y-auto">
        {current.items.length === 0 && <p className="px-4 py-6 text-center text-sm text-mist">Nothing here right now.</p>}
        {current.items.map((appt) => (
          <AttentionRow key={appt.id} appt={appt} kind={current.key} onAction={onAction} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function AttentionRow({ appt, kind, onAction, onOpen }) {
  const [busy, setBusy] = useState(null);
  async function act(name, path, okText) {
    setBusy(name);
    await onAction(path, okText);
    setBusy(null);
  }
  const btn = "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <button onClick={() => onOpen(appt)} className="flex min-w-0 items-center gap-3 text-left">
        <span className="h-9 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: appt.therapist_color }} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">
            {appt.client_name} <span className="font-normal text-mist">· {appt.service_type}</span>
          </span>
          <span className="block text-xs text-mist">
            {format(parseISO(appt.start_time), "EEE, MMM d · h:mm a")} · {appt.therapist_name}
          </span>
        </span>
      </button>
      <div className="flex flex-shrink-0 items-center gap-2">
        {kind === "requests" && (
          <>
            <button
              disabled={Boolean(busy)}
              onClick={() => act("decline", `/appointments/${appt.id}/decline`, "Request declined. The parent was notified.")}
              className={`${btn} border border-coral-red/30 text-coral-red hover:bg-coral-red-light`}
            >
              <X size={13} /> Decline
            </button>
            <button
              disabled={Boolean(busy)}
              onClick={() => act("approve", `/appointments/${appt.id}/approve`, "Request approved. The parent was notified.")}
              className={`${btn} bg-harbor text-white hover:bg-harbor-dark`}
            >
              {busy === "approve" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
            </button>
          </>
        )}
        {kind === "soon" && (
          <button
            disabled={Boolean(busy)}
            onClick={() => act("remind", `/appointments/${appt.id}/remind`, `Reminder sent to ${appt.guardian_name}.`)}
            className={`${btn} border border-mist-light text-ink hover:bg-chalk`}
          >
            {busy === "remind" ? <Loader2 size={13} className="animate-spin" /> : <BellRing size={13} />} Send SMS reminder
          </button>
        )}
        {kind === "wrap" && (
          <>
            <StatusBadge status={appt.status} />
            <button
              disabled={Boolean(busy)}
              onClick={() => act("done", `/appointments/${appt.id}/complete`, "Session marked as done.")}
              className={`${btn} bg-harbor text-white hover:bg-harbor-dark`}
            >
              {busy === "done" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Mark as done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- side panels ----------
function TodayAgenda({ items, onOpen }) {
  const now = new Date();
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
      <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink">
        <Sun size={16} className="text-sunrise" />
        Today's sessions
      </h3>
      {items.length === 0 ? (
        <p className="rounded-xl bg-chalk px-3 py-5 text-center text-sm text-mist">No sessions today.</p>
      ) : (
        <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[52px] before:top-2 before:w-px before:bg-mist-light">
          {items.map((a) => {
            const start = parseISO(a.start_time);
            const live = start <= now && parseISO(a.end_time) >= now;
            return (
              <li key={a.id}>
                <button onClick={() => onOpen(a)} className="flex w-full items-start gap-3 text-left">
                  <span className="w-11 flex-shrink-0 pt-0.5 text-right font-mono text-[11px] font-semibold text-mist">
                    {format(start, "h:mm")}
                    <span className="block text-[9px] uppercase">{format(start, "a")}</span>
                  </span>
                  <span
                    className={`relative z-10 mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ring-4 ring-white ${live ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: a.therapist_color }}
                  />
                  <span className="min-w-0 flex-1 rounded-xl px-2 py-1 transition hover:bg-chalk">
                    <span className="block truncate text-sm font-semibold text-ink">{a.client_name}</span>
                    <span className="block truncate text-xs text-mist">{a.therapist_name}</span>
                    <span className="mt-1 inline-block">
                      {live ? (
                        <span className="rounded-full bg-sunrise-light px-2 py-0.5 text-[11px] font-semibold text-sunrise">
                          In session now
                        </span>
                      ) : (
                        <StatusBadge status={a.status} />
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function TherapistLoad({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.hours));
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
      <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-ink">
        <Gauge size={16} className="text-harbor" />
        Therapist load this week
      </h3>
      <p className="mb-4 text-xs text-mist">Booked hours out of {WEEKLY_CAPACITY_HOURS} clinic hours</p>
      <div className="space-y-3.5">
        {rows.map((r) => {
          const pct = Math.min(100, Math.round((r.hours / WEEKLY_CAPACITY_HOURS) * 100));
          return (
            <div key={r.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="truncate">{r.name.replace(/^(Therapist|Coach)\s+/, "")}</span>
                </span>
                <span className="flex-shrink-0 font-mono text-mist">
                  {r.sessions} {r.sessions === 1 ? "session" : "sessions"} · {+r.hours.toFixed(1)}h
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-chalk ring-1 ring-mist-light">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(pct, r.hours > 0 ? 3 : 0)}%`, backgroundColor: r.color }}
                  title={`${pct}% of clinic hours`}
                />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-mist">No therapists yet.</p>}
        {rows.length > 0 && max === 1 && rows.every((r) => r.hours === 0) && (
          <p className="text-xs text-mist">No sessions booked this week yet.</p>
        )}
      </div>
    </section>
  );
}

// ---------- KPI card ----------
const TONES = {
  harbor: "bg-harbor-light text-harbor",
  amber: "bg-amber-light text-[#8a5a00]",
  sunrise: "bg-sunrise-light text-sunrise",
  sky: "bg-therafun-sky-light text-therafun-sky-dark",
  lime: "bg-therafun-lime-light text-therafun-lime-dark",
};

function StatCard({ icon: Icon, label, value, hint, tone, raw = false }) {
  const numRef = useRef(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const el = numRef.current;
    if (!el || raw || typeof value !== "number") return;
    if (prefersReducedMotion()) {
      el.textContent = value;
      prevValue.current = value;
      return;
    }
    const counter = { n: prevValue.current };
    animate(counter, {
      n: value,
      duration: 700,
      ease: "outExpo",
      onUpdate: () => {
        el.textContent = Math.round(counter.n);
      },
    });
    prevValue.current = value;
  }, [value, raw]);

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p ref={numRef} className="font-mono text-2xl font-semibold leading-none text-ink">
          {value}
        </p>
        <p className="mt-1 text-xs font-semibold leading-tight text-ink/80">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-tight text-mist">{hint}</p>}
      </div>
    </div>
  );
}
