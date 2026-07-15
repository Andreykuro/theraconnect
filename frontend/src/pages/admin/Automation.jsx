import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileWarning,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  WandSparkles,
} from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";

export default function Automation() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [preferredPeriod, setPreferredPeriod] = useState("any");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [bookingKey, setBookingKey] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/automation/manager-insights");
      setInsights(data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Couldn't load management insights.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxLoad = useMemo(
    () => Math.max(1, ...(insights?.therapist_load || []).map((therapist) => therapist.upcoming_sessions)),
    [insights]
  );

  async function findSuggestions(client, period = preferredPeriod) {
    setSelectedClient(client);
    setLoadingSuggestions(true);
    setSuggestions([]);
    setError("");
    try {
      const { data } = await api.get("/automation/schedule-suggestions", {
        params: { client_id: client.id, days: 21, preferred_period: period },
      });
      setSuggestions(data.suggestions);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Couldn't generate schedule suggestions.");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function changePeriod(period) {
    setPreferredPeriod(period);
    if (selectedClient) await findSuggestions(selectedClient, period);
  }

  async function bookSuggestion(suggestion) {
    const key = suggestion.start_time;
    setBookingKey(key);
    setError("");
    setSuccess("");
    try {
      await api.post("/appointments", {
        client_id: suggestion.client_id,
        therapist_id: suggestion.therapist_id,
        service_type: suggestion.service_type,
        start_time: suggestion.start_time,
        end_time: suggestion.end_time,
        notes: "Booked from automated schedule recommendation",
      });
      setSuccess(`${suggestion.client_name} was scheduled for ${format(parseISO(suggestion.start_time), "MMM d at h:mm a")}.`);
      setSuggestions([]);
      setSelectedClient(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Couldn't book that recommendation.");
      if (selectedClient) await findSuggestions(selectedClient);
    } finally {
      setBookingKey("");
    }
  }

  return (
    <DashboardLayout
      title="Automation center"
      subtitle="Scheduling recommendations, documentation checks, and management insights"
      actions={
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-harbor px-4 py-2.5 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh insights
        </button>
      }
    >
      <div className="space-y-6">
        {error && <p className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>}
        {success && <p className="rounded-xl bg-harbor-light px-4 py-3 text-sm text-harbor-dark">{success}</p>}
        {loading && !insights && <p className="text-sm text-mist">Analyzing clinic operations...</p>}

        {insights && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Stat icon={Users} label="Active clients" value={insights.stats.total_clients} />
              <Stat icon={CalendarClock} label="Sessions · 30 days" value={insights.stats.upcoming_30_days} />
              <Stat icon={AlertTriangle} label="Needs scheduling" value={insights.stats.unscheduled_clients} alert />
              <Stat icon={FileWarning} label="Missing notes" value={insights.stats.overdue_notes} alert={insights.stats.overdue_notes > 0} />
              <Stat icon={Sparkles} label="Assisted notes" value={insights.stats.assisted_notes_30_days} />
            </section>

            <section className="rounded-2xl bg-gradient-to-r from-harbor to-harbor-dark p-6 text-white shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Lightbulb size={20} className="text-sunrise-light" />
                <h2 className="font-display text-xl font-semibold">Recommended actions</h2>
              </div>
              {insights.recommendations.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <CheckCircle2 size={17} />
                  No urgent operational issues detected.
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {insights.recommendations.map((recommendation, index) => (
                    <div key={`${recommendation.type}-${index}`} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${recommendation.priority === "high" ? "bg-sunrise" : "bg-amber"}`} />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                            {recommendation.priority} priority · {recommendation.type}
                          </p>
                          <p className="mt-1 text-sm text-white/90">{recommendation.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                      <WandSparkles size={18} className="text-sunrise" />
                      Smart scheduling queue
                    </h2>
                    <p className="text-xs text-mist">Clients without a future appointment</p>
                  </div>
                  <div className="flex rounded-lg bg-chalk p-1">
                    {[
                      ["any", "Any"],
                      ["morning", "AM"],
                      ["afternoon", "PM"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => changePeriod(value)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${preferredPeriod === value ? "bg-white text-harbor-dark shadow-sm" : "text-mist"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {insights.unscheduled_clients.length === 0 ? (
                  <p className="rounded-xl bg-harbor-light px-4 py-6 text-center text-sm text-harbor-dark">
                    Every client has an upcoming appointment.
                  </p>
                ) : (
                  <div className="divide-y divide-mist-light">
                    {insights.unscheduled_clients.map((client) => (
                      <div key={client.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{client.name}</p>
                          <p className="truncate text-xs text-mist">{client.service_type} · {client.therapist_name || "Unassigned"}</p>
                        </div>
                        <button
                          onClick={() => findSuggestions(client)}
                          disabled={loadingSuggestions && selectedClient?.id === client.id}
                          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-harbor-light px-3 py-2 text-xs font-semibold text-harbor-dark hover:bg-harbor hover:text-white disabled:opacity-50"
                        >
                          {loadingSuggestions && selectedClient?.id === client.id ? <Loader2 size={13} className="animate-spin" /> : <CalendarCheck size={13} />}
                          Find slots
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
                <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink">
                  <BarChart3 size={18} className="text-harbor" />
                  Therapist load
                </h2>
                <p className="mb-4 text-xs text-mist">Upcoming sessions over the next 14 days</p>
                <div className="space-y-4">
                  {insights.therapist_load.map((therapist) => (
                    <div key={therapist.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-semibold text-ink">{therapist.name}</span>
                        <span className="font-mono text-mist">{therapist.upcoming_sessions}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-mist-light">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(therapist.upcoming_sessions / maxLoad) * 100}%`,
                            backgroundColor: therapist.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {selectedClient && (
              <section className="rounded-2xl border-2 border-harbor/20 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-harbor">Ranked schedule recommendations</p>
                    <h2 className="font-display text-xl font-semibold text-ink">{selectedClient.name}</h2>
                  </div>
                  <button onClick={() => { setSelectedClient(null); setSuggestions([]); }} className="text-xs font-semibold text-mist hover:text-ink">
                    Close
                  </button>
                </div>
                {loadingSuggestions ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-chalk py-8 text-sm text-mist">
                    <Loader2 size={16} className="animate-spin" />
                    Scoring valid times...
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="rounded-xl bg-chalk px-4 py-7 text-center text-sm text-mist">No valid times were found in the next 21 days.</p>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {suggestions.slice(0, 6).map((suggestion, index) => (
                      <article key={suggestion.start_time} className="rounded-xl border border-mist-light p-4">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-base font-semibold text-ink">
                              {format(parseISO(suggestion.start_time), "EEE, MMM d")}
                            </p>
                            <p className="flex items-center gap-1 text-sm font-semibold text-harbor-dark">
                              <Clock3 size={13} />
                              {format(parseISO(suggestion.start_time), "h:mm a")}
                            </p>
                          </div>
                          <span className="rounded-full bg-harbor-light px-2 py-1 text-[10px] font-bold text-harbor-dark">#{index + 1}</span>
                        </div>
                        <ul className="mb-3 space-y-1 text-[11px] text-mist">
                          {suggestion.reasons.map((reason) => (
                            <li key={reason} className="flex gap-1.5">
                              <CheckCircle2 size={11} className="mt-0.5 flex-shrink-0 text-harbor" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => bookSuggestion(suggestion)}
                          disabled={Boolean(bookingKey)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sunrise px-3 py-2 text-xs font-semibold text-white hover:brightness-105 disabled:opacity-50"
                        >
                          {bookingKey === suggestion.start_time && <Loader2 size={13} className="animate-spin" />}
                          Approve and book
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <IssueList
                icon={FileWarning}
                title="Missing session notes"
                empty="No past sessions are missing notes."
                items={insights.overdue_notes.map((item) => ({
                  key: item.appointment_id,
                  title: item.client_name,
                  detail: `${item.therapist_name} · ${format(parseISO(item.end_time), "MMM d, yyyy")}`,
                }))}
              />
              <IssueList
                icon={AlertTriangle}
                title="Progress review flags"
                empty="No goals currently need algorithmic review."
                items={insights.progress_flags.map((item) => ({
                  key: item.goal_id,
                  title: item.client_name,
                  detail: `${item.goal_title} · ${item.reason}`,
                }))}
              />
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-mist-light bg-white/60 p-4 text-sm text-mist">
              <Bot size={19} className="mt-0.5 flex-shrink-0 text-harbor" />
              <p>
                Automation recommends and summarizes; it does not silently change treatment plans or schedules.
                Every booking requires an administrator, and every clinical note requires a therapist approval.
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({ icon: Icon, label, value, alert = false }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${alert && value > 0 ? "bg-sunrise-light text-sunrise" : "bg-harbor-light text-harbor-dark"}`}>
        <Icon size={18} />
      </span>
      <div>
        <p className="font-display text-xl font-semibold leading-none text-ink">{value}</p>
        <p className="mt-1 text-[11px] text-mist">{label}</p>
      </div>
    </div>
  );
}

function IssueList({ icon: Icon, title, empty, items }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Icon size={18} className="text-sunrise" />
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl bg-chalk px-4 py-5 text-center text-sm text-mist">{empty}</p>
      ) : (
        <div className="divide-y divide-mist-light">
          {items.slice(0, 8).map((item) => (
            <div key={item.key} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs text-mist">{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
