import { useEffect, useState, useCallback } from "react";
import { Megaphone } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import SessionCard from "../../components/SessionCard";

export default function ParentDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [apptsRes, annRes] = await Promise.all([
      api.get("/appointments"),
      api.get("/announcements"),
    ]);
    setAppointments(apptsRes.data.filter((a) => a.status !== "cancelled"));
    setAnnouncements(annRes.data.slice(0, 3));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm(appt) {
    await api.post(`/appointments/${appt.id}/confirm`);
    load();
  }

  return (
    <DashboardLayout title="My appointments" subtitle="Sessions for your child, soonest first">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {loading && <p className="text-sm text-mist">Loading…</p>}
          {!loading && appointments.length === 0 && (
            <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-mist ring-1 ring-mist-light">
              No sessions scheduled yet. The clinic will notify you once one is booked.
            </p>
          )}
          {appointments.map((a) => (
            <SessionCard key={a.id} appt={a} onConfirm={handleConfirm} showChild={false} />
          ))}
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Megaphone size={18} className="text-sunrise" />
            Clinic announcements
          </h2>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
                <h3 className="mb-1 font-display text-sm font-semibold text-ink">{a.title}</h3>
                <p className="text-sm text-mist">{a.body}</p>
              </div>
            ))}
            {!loading && announcements.length === 0 && (
              <p className="text-sm text-mist">No announcements right now.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
