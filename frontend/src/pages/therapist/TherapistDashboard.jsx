import { useEffect, useState, useMemo } from "react";
import { isToday, isFuture, parseISO } from "date-fns";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import SessionCard from "../../components/SessionCard";

export default function TherapistDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/appointments").then(({ data }) => {
      setAppointments(data.filter((a) => a.status !== "cancelled"));
      setLoading(false);
    });
  }, []);

  const { today, upcoming } = useMemo(() => {
    const t = [];
    const u = [];
    for (const a of appointments) {
      const start = parseISO(a.start_time);
      if (isToday(start)) t.push(a);
      else if (isFuture(start)) u.push(a);
    }
    return { today: t, upcoming: u };
  }, [appointments]);

  return (
    <DashboardLayout title="My schedule" subtitle="Your assigned sessions, soonest first">
      <Section title="Today" empty="No sessions today." items={today} loading={loading} />
      <Section title="Upcoming" empty="Nothing else on the books yet." items={upcoming} loading={loading} />
    </DashboardLayout>
  );
}

function Section({ title, empty, items, loading }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink">{title}</h2>
      {loading ? (
        <p className="text-sm text-mist">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-mist ring-1 ring-mist-light">
          {empty}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <SessionCard key={a.id} appt={a} />
          ))}
        </div>
      )}
    </div>
  );
}
