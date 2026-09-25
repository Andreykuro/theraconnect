import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CalendarDays, MessageCircle, Plus, Target } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import SessionCard from "../../components/SessionCard";
import ProgressGoalCard from "../../components/ProgressGoalCard";
import BookingModal from "../../components/BookingModal";

export default function ParentHome() {
  const [data, setData] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [homeRes, therapistsRes] = await Promise.all([
        api.get("/dashboard/home"),
        api.get("/therapists"),
      ]);
      setData(homeRes.data);
      setTherapists(therapistsRes.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "We couldn't load your home page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm(appt) {
    await api.post(`/appointments/${appt.id}/confirm`);
    load();
  }

  const childFirstName = data?.client?.name?.split(" ")[0];

  return (
    <DashboardLayout
      title="Home"
      subtitle={
        childFirstName
          ? `Here's what's happening for ${childFirstName}`
          : "A quick look at appointments, goals, and updates"
      }
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
      <div className="mx-auto max-w-6xl space-y-6">
        {loading && <p className="text-sm text-mist">Loading…</p>}
        {error && (
          <p className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>
        )}

        {!loading && data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={Activity}
                label="Overall progress"
                value={data.overall_progress === null ? "—" : `${Math.round(data.overall_progress)}%`}
              />
              <StatCard icon={Target} label="Active goals" value={data.goals.length} />
              <StatCard
                icon={CalendarDays}
                label="Upcoming sessions"
                value={data.upcoming_appointments.length}
                to="/parent/appointments"
              />
              <StatCard
                icon={MessageCircle}
                label="Unread messages"
                value={data.unread_message_count}
                to="/parent/messages"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
              <div className="space-y-6">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-ink">Upcoming sessions</h2>
                    <Link
                      to="/parent/appointments"
                      className="text-xs font-semibold text-harbor hover:text-harbor-dark"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {data.upcoming_appointments.length === 0 && (
                      <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-mist ring-1 ring-mist-light">
                        Nothing scheduled yet. Tap "Book a session" to pick a time.
                      </p>
                    )}
                    {data.upcoming_appointments.slice(0, 3).map((a) => (
                      <SessionCard key={a.id} appt={a} onConfirm={handleConfirm} showChild={false} />
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-ink">Goals in progress</h2>
                    <Link
                      to="/parent/progress"
                      className="text-xs font-semibold text-harbor hover:text-harbor-dark"
                    >
                      Full details
                    </Link>
                  </div>
                  {data.goals.length === 0 ? (
                    <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-mist ring-1 ring-mist-light">
                      Your therapist is preparing the treatment goals.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {data.goals.map((goal) => (
                        <ProgressGoalCard key={goal.id} goal={goal} compact />
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div>
                <h2 className="mb-3 font-display text-lg font-semibold text-ink">Clinic announcements</h2>
                <div className="space-y-3">
                  {data.announcements.map((a) => (
                    <div key={a.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
                      <h3 className="mb-1 font-display text-sm font-semibold text-ink">{a.title}</h3>
                      <p className="text-sm text-mist">{a.body}</p>
                    </div>
                  ))}
                  {data.announcements.length === 0 && (
                    <p className="text-sm text-mist">No announcements right now.</p>
                  )}
                </div>
              </div>
            </div>
          </>
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

function StatCard({ icon: Icon, label, value, to }) {
  const content = (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light transition hover:ring-harbor/30">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-harbor-light text-harbor">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-xl font-semibold text-ink">{value}</p>
        <p className="truncate text-xs font-semibold text-mist">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}
