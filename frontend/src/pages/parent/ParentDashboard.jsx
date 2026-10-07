import { useEffect, useState, useCallback, useMemo } from "react";
import { isPast, parseISO } from "date-fns";
import { CalendarCheck2, CalendarClock, History, Plus } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import SessionCard from "../../components/SessionCard";
import BookingModal from "../../components/BookingModal";

// Appointments page for parents: sessions to confirm first, then upcoming,
// then the most recent past sessions.
export default function ParentDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);

  const load = useCallback(async () => {
    const [apptsRes, therapistsRes] = await Promise.all([api.get("/appointments"), api.get("/therapists")]);
    setAppointments(apptsRes.data);
    setTherapists(therapistsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm(appt) {
    await api.post(`/appointments/${appt.id}/confirm`);
    await load();
  }

  async function handleCantAttend(appt, reason) {
    await api.post(`/appointments/${appt.id}/cant-attend`, { reason });
    await load();
  }

  const groups = useMemo(() => {
    const toConfirm = [];
    const upcoming = [];
    const history = [];
    for (const a of appointments) {
      const ended = isPast(parseISO(a.end_time));
      const started = isPast(parseISO(a.start_time));
      if (!started && a.status === "pending") toConfirm.push(a);
      else if (!ended && a.status !== "cancelled") upcoming.push(a);
      else history.push(a);
    }
    history.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    return { toConfirm, upcoming, history };
  }, [appointments]);

  const cardProps = { viewer: "parent", onConfirm: handleConfirm, onCantAttend: handleCantAttend };
  const pastShown = showAllPast ? groups.history : groups.history.slice(0, 3);

  return (
    <DashboardLayout
      title="Appointments"
      subtitle="Confirm attendance and see every session for your child"
      actions={
        <button
          onClick={() => setBooking(true)}
          className="flex items-center gap-2 rounded-lg bg-sunrise px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
        >
          <Plus size={16} />
          Book a session
        </button>
      }
    >
      <div className="mx-auto max-w-3xl space-y-8">
        {loading && <p className="text-sm text-mist">Loading…</p>}

        {!loading && appointments.length === 0 && (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-mist ring-1 ring-mist-light">
            No sessions scheduled yet. Tap "Book a session" to pick a time.
          </p>
        )}

        {groups.toConfirm.length > 0 && (
          <Section
            icon={CalendarCheck2}
            title="Please confirm attendance"
            note={`${groups.toConfirm.length} session${groups.toConfirm.length === 1 ? "" : "s"} waiting for your answer`}
            accent
          >
            {groups.toConfirm.map((a) => (
              <SessionCard key={a.id} appt={a} {...cardProps} />
            ))}
          </Section>
        )}

        {!loading && appointments.length > 0 && (
          <Section icon={CalendarClock} title="Upcoming sessions">
            {groups.upcoming.length === 0 ? (
              <Empty>No other upcoming sessions.</Empty>
            ) : (
              groups.upcoming.map((a) => <SessionCard key={a.id} appt={a} {...cardProps} />)
            )}
          </Section>
        )}

        {groups.history.length > 0 && (
          <Section icon={History} title="Past and cancelled">
            {pastShown.map((a) => (
              <SessionCard key={a.id} appt={a} viewer="parent" />
            ))}
            {groups.history.length > 3 && (
              <button
                onClick={() => setShowAllPast((v) => !v)}
                className="w-full rounded-xl border border-dashed border-mist-light py-2.5 text-xs font-semibold text-mist hover:bg-white"
              >
                {showAllPast ? "Show fewer" : `Show all ${groups.history.length} past sessions`}
              </button>
            )}
          </Section>
        )}
      </div>

      {booking && (
        <BookingModal
          therapists={therapists}
          onClose={() => setBooking(false)}
          onBooked={() => {
            setBooking(false);
            load();
          }}
        />
      )}
    </DashboardLayout>
  );
}

function Section({ icon: Icon, title, note, accent = false, children }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Icon size={18} className={accent ? "text-amber" : "text-harbor"} />
          {title}
        </h2>
        {note && <span className="text-xs font-semibold text-mist">{note}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-mist ring-1 ring-mist-light">{children}</p>;
}
