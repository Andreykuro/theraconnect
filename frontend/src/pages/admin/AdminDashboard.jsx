import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Plus, CalendarClock, CircleCheck, CircleAlert, Inbox, Check, X, Loader2 } from "lucide-react";
import { animate } from "animejs";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import AppointmentModal from "../../components/AppointmentModal";
import { prefersReducedMotion } from "../../lib/motion";

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [modalState, setModalState] = useState(null); // null | { initial }
  const [loading, setLoading] = useState(true);

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

  const events = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== "cancelled")
        .map((a) => ({
          id: String(a.id),
          title: `${a.client_name} · ${a.service_type}`,
          start: a.start_time,
          end: a.end_time,
          backgroundColor: a.therapist_color,
          borderColor: a.therapist_color,
          extendedProps: { appt: a },
        })),
    [appointments]
  );

  const stats = useMemo(() => {
    const upcoming = appointments.filter((a) => a.status !== "cancelled" && new Date(a.end_time) >= new Date());
    return {
      upcoming: upcoming.length,
      requested: upcoming.filter((a) => a.status === "requested").length,
      pending: upcoming.filter((a) => a.status === "pending").length,
      confirmed: upcoming.filter((a) => a.status === "confirmed").length,
    };
  }, [appointments]);

  // Requests parents booked themselves - need admin sign-off before they're
  // official. Newest-request-last so the queue reads top-to-bottom by time.
  const requests = useMemo(
    () => appointments.filter((a) => a.status === "requested").sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
    [appointments]
  );

  return (
    <DashboardLayout
      title="Weekly schedule"
      subtitle="Monday to Saturday · all therapists"
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
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={CalendarClock} label="Upcoming sessions" value={stats.upcoming} color="harbor" />
        <StatCard icon={Inbox} label="Requests to review" value={stats.requested} color="amber" />
        <StatCard icon={CircleAlert} label="Awaiting confirmation" value={stats.pending} color="amber" />
        <StatCard icon={CircleCheck} label="Confirmed" value={stats.confirmed} color="harbor" />
      </div>

      {requests.length > 0 && (
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
          <p className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink">
            <Inbox size={15} className="text-sunrise" />
            Appointment requests awaiting your approval
          </p>
          <div className="space-y-2">
            {requests.map((r) => (
              <RequestRow key={r.id} appt={r} onDone={loadAll} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        {therapists.map((t) => (
          <span key={t.id} className="flex items-center gap-1.5 text-xs text-mist">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
            {t.name}
          </span>
        ))}
      </div>

      <div className="tc-calendar rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
        {!loading && (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            hiddenDays={[0]}
            headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridWeek,dayGridMonth" }}
            slotMinTime="08:00:00"
            slotMaxTime="18:00:00"
            height="auto"
            nowIndicator
            events={events}
            selectable
            select={(info) => {
              setModalState({
                initial: { start_time: info.startStr, end_time: info.endStr },
              });
            }}
            eventClick={(info) => {
              setModalState({ initial: info.event.extendedProps.appt });
            }}
          />
        )}
      </div>

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

function RequestRow({ appt, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/appointments/${appt.id}/${action}`);
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't update this request.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-chalk px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          {appt.client_name} · {appt.service_type}
        </p>
        <p className="font-mono text-xs text-mist">
          {new Date(appt.start_time).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          with {appt.therapist_name}
        </p>
        {error && <p className="mt-1 text-xs font-semibold text-coral-red">{error}</p>}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          onClick={() => act("approve")}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-harbor px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-harbor-dark disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Approve
        </button>
        <button
          onClick={() => act("decline")}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-coral-red/30 px-3 py-1.5 text-xs font-semibold text-coral-red transition hover:bg-coral-red-light disabled:opacity-50"
        >
          <X size={13} />
          Decline
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const iconWrapClass =
    color === "amber" ? "bg-amber-light text-amber" : "bg-harbor-light text-harbor-dark";
  const numRef = useRef(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;

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
  }, [value]);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconWrapClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p ref={numRef} className="font-display text-xl font-semibold leading-none text-ink">
          {value}
        </p>
        <p className="text-xs text-mist">{label}</p>
      </div>
    </div>
  );
}
