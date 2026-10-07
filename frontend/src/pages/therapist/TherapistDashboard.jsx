import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfWeek, format, isPast, isToday, parseISO, startOfWeek } from "date-fns";
import { CalendarCheck2, CalendarClock, ClipboardCheck, Hourglass, Sun } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import SessionCard from "../../components/SessionCard";

export default function TherapistDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await api.get("/appointments");
    setAppointments(data.filter((a) => a.status !== "cancelled"));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleComplete(appt) {
    await api.post(`/appointments/${appt.id}/complete`);
    await load();
  }

  const data = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const today = [];
    const later = [];
    const wrapUp = [];
    let thisWeek = 0;
    let todayCount = 0;
    for (const a of appointments) {
      const start = parseISO(a.start_time);
      const ended = isPast(parseISO(a.end_time));
      if (start >= weekStart && start <= weekEnd) thisWeek += 1;
      if (isToday(start)) todayCount += 1;
      if (ended && (a.status === "pending" || a.status === "confirmed")) wrapUp.push(a);
      else if (isToday(start) && !ended) today.push(a);
      else if (!ended) later.push(a);
    }
    const upcoming = [...today, ...later];
    return {
      today,
      later,
      wrapUp: wrapUp.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)),
      thisWeek,
      todayCount,
      awaitingParent: upcoming.filter((a) => a.status === "pending").length,
      confirmed: upcoming.filter((a) => a.status === "confirmed").length,
    };
  }, [appointments]);

  // Group later sessions by day so the list reads like an agenda.
  const laterByDay = useMemo(() => {
    const map = new Map();
    for (const a of data.later) {
      const key = format(parseISO(a.start_time), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return [...map.entries()];
  }, [data.later]);

  return (
    <DashboardLayout title="My schedule" subtitle={format(new Date(), "EEEE, MMMM d")}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Sun} label="Today" value={data.todayCount} tone="sunrise" />
          <Stat icon={CalendarClock} label="This week" value={data.thisWeek} tone="harbor" />
          <Stat icon={Hourglass} label="Awaiting parent" value={data.awaitingParent} tone="amber" />
          <Stat icon={CalendarCheck2} label="Confirmed" value={data.confirmed} tone="harbor" />
        </div>

        {loading && <p className="text-sm text-mist">Loading…</p>}

        {!loading && data.wrapUp.length > 0 && (
          <Section icon={ClipboardCheck} title="Needs wrap-up" note="Sessions that ended but aren't marked done">
            {data.wrapUp.map((a) => (
              <SessionCard key={a.id} appt={a} viewer="therapist" onComplete={handleComplete} />
            ))}
          </Section>
        )}

        {!loading && (
          <Section icon={Sun} title="Today">
            {data.today.length === 0 ? (
              <Empty>No sessions today.</Empty>
            ) : (
              data.today.map((a) => <SessionCard key={a.id} appt={a} viewer="therapist" onComplete={handleComplete} />)
            )}
          </Section>
        )}

        {!loading && (
          <Section icon={CalendarClock} title="Coming up">
            {laterByDay.length === 0 && <Empty>Nothing else on the books yet.</Empty>}
            {laterByDay.map(([day, items]) => (
              <div key={day} className="space-y-3">
                <p className="pt-1 text-xs font-bold uppercase tracking-wide text-mist">
                  {format(parseISO(day), "EEEE, MMMM d")}
                </p>
                {items.map((a) => (
                  <SessionCard key={a.id} appt={a} viewer="therapist" />
                ))}
              </div>
            ))}
          </Section>
        )}
      </div>
    </DashboardLayout>
  );
}

const TONES = {
  harbor: "bg-harbor-light text-harbor",
  amber: "bg-amber-light text-[#8a5a00]",
  sunrise: "bg-sunrise-light text-sunrise",
};

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-xl font-semibold text-ink">{value}</p>
        <p className="truncate text-xs font-semibold text-mist">{label}</p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, note, children }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Icon size={18} className="text-harbor" />
          {title}
        </h2>
        {note && <span className="text-xs text-mist">{note}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-mist ring-1 ring-mist-light">{children}</p>;
}
