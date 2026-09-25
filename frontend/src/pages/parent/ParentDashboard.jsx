import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import SessionCard from "../../components/SessionCard";
import BookingModal from "../../components/BookingModal";

// Appointments list lang ngayon 'to (dati pinagsama pa sa announcements) -
// nailipat na yung "overview" na bahagi (metrics, goals, announcements) sa
// bagong ParentHome.jsx na siyang home page ng account.
export default function ParentDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const load = useCallback(async () => {
    const [apptsRes, therapistsRes] = await Promise.all([
      api.get("/appointments"),
      api.get("/therapists"),
    ]);
    setAppointments(apptsRes.data.filter((a) => a.status !== "cancelled"));
    setTherapists(therapistsRes.data);
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
    <DashboardLayout
      title="Appointments"
      subtitle="Sessions for your child, soonest first"
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
      <div className="mx-auto max-w-3xl space-y-3">
        {loading && <p className="text-sm text-mist">Loading…</p>}
        {!loading && appointments.length === 0 && (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-mist ring-1 ring-mist-light">
            No sessions scheduled yet. Tap "Book a session" to pick a time.
          </p>
        )}
        {appointments.map((a) => (
          <SessionCard key={a.id} appt={a} onConfirm={handleConfirm} showChild={false} />
        ))}
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
