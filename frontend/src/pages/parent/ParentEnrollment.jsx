import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Phone,
  UserRound,
} from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";

export default function ParentEnrollment() {
  const location = useLocation();
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/enrollment/me")
      .then(({ data }) => setEnrollment(data.enrollment))
      .catch((requestError) =>
        setError(requestError.response?.data?.error || "We couldn't load your enrollment details.")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      title="Enrollment"
      subtitle="Your child's saved care and contact information"
      actions={
        <Link
          to="/parent"
          className="flex items-center gap-2 rounded-lg bg-harbor px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-harbor-dark"
        >
          <CalendarDays size={16} />
          View appointments
        </Link>
      }
    >
      <div className="mx-auto max-w-5xl space-y-5">
        {location.state?.justEnrolled && (
          <div className="flex items-start gap-3 rounded-2xl bg-harbor-light p-4 text-harbor-dark ring-1 ring-harbor/20">
            <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Enrollment completed successfully</p>
              <p className="text-sm text-harbor-dark/80">
                Your parent account and patient record are ready. You can now book sessions.
              </p>
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-mist">Loading enrollment details...</p>}
        {error && (
          <p className="rounded-2xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>
        )}

        {enrollment && (
          <>
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-mist-light">
                <SectionTitle icon={UserRound} title="Patient information" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Detail label="Patient name" value={enrollment.name} />
                  <Detail
                    label="Birthdate"
                    value={
                      enrollment.birthdate
                        ? format(parseISO(enrollment.birthdate), "MMMM d, yyyy")
                        : "Not provided"
                    }
                  />
                </div>
                <div className="mt-4">
                  <Detail
                    label="Notes for the therapist"
                    value={enrollment.notes || "No additional notes were provided."}
                  />
                </div>
              </section>

              <section className="rounded-2xl bg-harbor p-6 text-white shadow-sm">
                <SectionTitle icon={HeartHandshake} title="Selected care" inverse />
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">Treatment</p>
                <p className="mt-1 font-display text-xl font-semibold">{enrollment.service_type}</p>
                <div className="mt-5 border-t border-white/15 pt-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60">Therapist</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white/30"
                      style={{ backgroundColor: enrollment.therapist_color || "#0E4F4F" }}
                    >
                      {enrollment.therapist_name?.charAt(0) || "T"}
                    </span>
                    <div>
                      <p className="font-semibold">{enrollment.therapist_name || "To be assigned"}</p>
                      <p className="text-xs text-white/70">{enrollment.therapist_specialty}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-mist-light">
              <SectionTitle icon={MessageSquareText} title="Parent contact and notifications" />
              <div className="grid gap-4 md:grid-cols-3">
                <Contact icon={UserRound} label="Parent or guardian" value={enrollment.guardian_name} />
                <Contact
                  icon={Phone}
                  label="SMS notifications"
                  value={enrollment.guardian_phone}
                  note="Appointment reminders"
                />
                <Contact
                  icon={Mail}
                  label="Email announcements"
                  value={enrollment.guardian_email}
                  note="Clinic news and updates"
                />
              </div>
            </section>

            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-mist-light bg-white/60 p-4 text-sm text-mist">
              <LockKeyhole size={18} className="mt-0.5 flex-shrink-0 text-harbor" />
              <p>
                Your login password is securely hashed and is never displayed here. Contact the
                front desk if any enrollment information needs to be updated.
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function SectionTitle({ icon: Icon, title, inverse = false }) {
  return (
    <h2
      className={`mb-5 flex items-center gap-2 font-display text-lg font-semibold ${
        inverse ? "text-white" : "text-ink"
      }`}
    >
      <Icon size={18} className={inverse ? "text-white/80" : "text-sunrise"} />
      {title}
    </h2>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-mist">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Contact({ icon: Icon, label, value, note }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-chalk p-4">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-harbor-light text-harbor-dark">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-mist">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-ink">{value}</p>
        {note && <p className="mt-0.5 text-xs text-mist">{note}</p>}
      </div>
    </div>
  );
}
