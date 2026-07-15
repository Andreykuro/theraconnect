import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { BarChart3, CalendarDays, CheckCircle2, FileHeart, ShieldCheck, Target } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import ProgressGoalCard from "../../components/ProgressGoalCard";

export default function ParentProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/progress/me")
      .then(({ data }) => setProgress(data))
      .catch((requestError) =>
        setError(requestError.response?.data?.error || "We couldn't load your child's progress.")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Child progress" subtitle="Therapist-approved goals and session updates">
      <div className="mx-auto max-w-6xl space-y-6">
        {loading && <p className="text-sm text-mist">Loading progress...</p>}
        {error && <p className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>}

        {!loading && progress && (
          <>
            <section className="overflow-hidden rounded-3xl bg-harbor text-white shadow-sm lg:grid lg:grid-cols-[1fr_320px]">
              <div className="p-7 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Progress overview</p>
                <h2 className="mt-2 font-display text-3xl font-semibold">{progress.client.name}</h2>
                <p className="mt-1 text-sm text-white/75">
                  {progress.client.service_type} · {progress.client.therapist_name || "Therapist to be assigned"}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <OverviewPill icon={Target} value={progress.goals.length} label="Treatment goals" />
                  <OverviewPill icon={CalendarDays} value={progress.notes.length} label="Session updates" />
                </div>
              </div>
              <div className="flex items-center justify-center border-t border-white/10 bg-white/5 p-7 lg:border-l lg:border-t-0">
                <div className="text-center">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-[9px] border-white/15 bg-white/5">
                    <span className="font-mono text-3xl font-semibold">
                      {progress.overall_progress === null ? "—" : `${Math.round(progress.overall_progress)}%`}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-white/75">Overall measured progress</p>
                  <p className="mt-1 max-w-[220px] text-[11px] leading-4 text-white/55">
                    Calculated from therapist-recorded baselines, targets, and session measurements.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
                  <BarChart3 size={20} className="text-sunrise" />
                  Treatment goals
                </h2>
                {progress.plan && <span className="rounded-full bg-harbor-light px-3 py-1 text-xs font-semibold text-harbor-dark">Active plan</span>}
              </div>

              {progress.goals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-mist-light bg-white/60 px-6 py-9 text-center">
                  <Target size={26} className="mx-auto mb-2 text-mist" />
                  <p className="font-semibold text-ink">Your therapist is preparing the treatment goals.</p>
                  <p className="mt-1 text-sm text-mist">Progress scores will appear after goals and measurements are approved.</p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {progress.goals.map((goal) => (
                    <ProgressGoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold text-ink">
                <FileHeart size={20} className="text-harbor" />
                Updates from your therapist
              </h2>
              {progress.notes.length === 0 ? (
                <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-mist shadow-sm ring-1 ring-mist-light">
                  No approved session updates yet. Your therapist's summaries will appear here.
                </p>
              ) : (
                <div className="relative space-y-4 before:absolute before:bottom-5 before:left-[18px] before:top-5 before:w-px before:bg-mist-light">
                  {progress.notes.map((note) => (
                    <article key={note.id} className="relative flex gap-4">
                      <span className="z-[1] mt-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-harbor text-white ring-4 ring-chalk">
                        <CheckCircle2 size={16} />
                      </span>
                      <div className="flex-1 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
                        <p className="text-xs font-bold uppercase tracking-wide text-sunrise">
                          {format(parseISO(note.session_date), "MMMM d, yyyy")}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-ink">{note.parent_summary}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 text-sm text-mist ring-1 ring-mist-light">
              <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-harbor" />
              <p>
                Every update shown here has been reviewed and approved by the therapist. Automated
                scores summarize recorded measurements and do not replace your therapist's clinical judgment.
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function OverviewPill({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 ring-1 ring-white/10">
      <Icon size={14} />
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs text-white/65">{label}</span>
    </div>
  );
}
