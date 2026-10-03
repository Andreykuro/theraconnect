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
  Database,
  Download,
  FileDown,
  FileWarning,
  HardDrive,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  WandSparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";

const CHART_COLORS = ["#6F2C91", "#B84E00", "#59BCE8", "#F5A623", "#C8E72A", "#B93D4A"];

const TABS = [
  { key: "operations", label: "Operations" },
  { key: "growth", label: "Growth & stats" },
  { key: "maintenance", label: "Maintenance" },
];

export default function Automation() {
  const [tab, setTab] = useState("operations");
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [preferredPeriod, setPreferredPeriod] = useState("any");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [bookingKey, setBookingKey] = useState("");
  const [success, setSuccess] = useState("");

  // --- Growth & stats tab ---
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [downloadingReport, setDownloadingReport] = useState("");

  // --- Maintenance tab ---
  const [maintenance, setMaintenance] = useState(null);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState("");
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

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

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError("");
    try {
      const { data } = await api.get("/automation/business-stats");
      setStats(data);
    } catch (requestError) {
      setStatsError(requestError.response?.data?.error || "Couldn't load growth statistics.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadMaintenance = useCallback(async () => {
    setLoadingMaintenance(true);
    setMaintenanceError("");
    try {
      const { data } = await api.get("/maintenance/status");
      setMaintenance(data);
    } catch (requestError) {
      setMaintenanceError(requestError.response?.data?.error || "Couldn't load maintenance status.");
    } finally {
      setLoadingMaintenance(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab === "growth" && !stats) loadStats();
    if (tab === "maintenance" && !maintenance) loadMaintenance();
  }, [tab, stats, maintenance, loadStats, loadMaintenance]);

  // Downloads a server-generated file through an authenticated axios request
  // (a plain <a href> can't carry the Bearer token the API requires).
  async function downloadBlob(url, filename) {
    const { data } = await api.get(url, { responseType: "blob" });
    const blobUrl = window.URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  }

  async function downloadReport(period) {
    setDownloadingReport(period);
    try {
      await downloadBlob(
        `/reports/summary.pdf?period=${period}`,
        `theraconnect-${period}-report-${format(new Date(), "yyyy-MM-dd")}.pdf`
      );
    } catch (requestError) {
      setStatsError(requestError.response?.data?.error || "Couldn't generate that report.");
    } finally {
      setDownloadingReport("");
    }
  }

  async function downloadBackup() {
    setDownloadingBackup(true);
    try {
      await downloadBlob(
        "/maintenance/backup",
        `theraconnect-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.sqlite`
      );
    } catch (requestError) {
      setMaintenanceError(requestError.response?.data?.error || "Couldn't download the backup.");
    } finally {
      setDownloadingBackup(false);
    }
  }

  async function runCleanup() {
    setCleaningUp(true);
    setMaintenanceError("");
    try {
      const { data } = await api.post("/maintenance/cleanup", { older_than_days: 90 });
      setSuccess(
        `Removed ${data.removed_notifications_log} old notification log${data.removed_notifications_log === 1 ? "" : "s"} and ${data.removed_ai_audit_logs} old AI audit log${data.removed_ai_audit_logs === 1 ? "" : "s"}.`
      );
      await loadMaintenance();
    } catch (requestError) {
      setMaintenanceError(requestError.response?.data?.error || "Couldn't run cleanup.");
    } finally {
      setCleaningUp(false);
    }
  }

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
        tab === "operations" ? (
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-harbor px-4 py-2.5 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh insights
          </button>
        ) : tab === "growth" ? (
          <button
            onClick={loadStats}
            disabled={loadingStats}
            className="flex items-center gap-2 rounded-lg bg-harbor px-4 py-2.5 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
          >
            <RefreshCw size={16} className={loadingStats ? "animate-spin" : ""} />
            Refresh stats
          </button>
        ) : (
          <button
            onClick={loadMaintenance}
            disabled={loadingMaintenance}
            className="flex items-center gap-2 rounded-lg bg-harbor px-4 py-2.5 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
          >
            <RefreshCw size={16} className={loadingMaintenance ? "animate-spin" : ""} />
            Refresh status
          </button>
        )
      }
    >
      <div className="space-y-6">
        <div className="flex rounded-xl bg-chalk p-1 sm:inline-flex">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === t.key ? "bg-white text-harbor-dark shadow-sm" : "text-mist hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {success && <p className="rounded-xl bg-harbor-light px-4 py-3 text-sm text-harbor-dark">{success}</p>}

        {tab === "operations" && error && (
          <p className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>
        )}
        {tab === "operations" && loading && !insights && (
          <p className="text-sm text-mist">Analyzing clinic operations...</p>
        )}

        {tab === "operations" && insights && (
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

        {tab === "growth" && (
          <GrowthTab
            stats={stats}
            loading={loadingStats}
            error={statsError}
            downloadingReport={downloadingReport}
            onDownloadReport={downloadReport}
          />
        )}

        {tab === "maintenance" && (
          <MaintenanceTab
            status={maintenance}
            loading={loadingMaintenance}
            error={maintenanceError}
            downloadingBackup={downloadingBackup}
            cleaningUp={cleaningUp}
            onDownloadBackup={downloadBackup}
            onCleanup={runCleanup}
          />
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

function GrowthTab({ stats, loading, error, downloadingReport, onDownloadReport }) {
  if (loading && !stats) {
    return <p className="text-sm text-mist">Crunching enrollment and session numbers...</p>;
  }
  if (error && !stats) {
    return <p className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>;
  }
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>}

      <section className="rounded-2xl bg-gradient-to-r from-harbor to-harbor-dark p-6 text-white shadow-sm">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/55">Downloadable summary</p>
            <h2 className="font-display text-xl font-semibold">Daily &amp; weekly report (PDF)</h2>
            <p className="mt-1 text-sm text-white/80">
              A branded PDF snapshot of sessions, enrollments, and growth - ready to print or share.
            </p>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <button
              onClick={() => onDownloadReport("daily")}
              disabled={Boolean(downloadingReport)}
              className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/25 disabled:opacity-50"
            >
              {downloadingReport === "daily" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              Daily PDF
            </button>
            <button
              onClick={() => onDownloadReport("weekly")}
              disabled={Boolean(downloadingReport)}
              className="flex items-center gap-2 rounded-lg bg-sunrise px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              {downloadingReport === "weekly" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              Weekly PDF
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Total clients" value={stats.totals.total_clients} />
        <Stat icon={CalendarClock} label="Total sessions" value={stats.totals.total_sessions} />
        <Stat
          icon={TrendingUp}
          label="Enrollment growth (MoM)"
          value={`${stats.enrollment_growth_rate_pct > 0 ? "+" : ""}${stats.enrollment_growth_rate_pct}%`}
        />
        <Stat
          icon={CheckCircle2}
          label="Attendance rate"
          value={stats.attendance_rate_pct === null ? "N/A" : `${stats.attendance_rate_pct}%`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Enrollment growth" subtitle="New patients enrolled per month">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.enrollment_growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#746F7C" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#746F7C" />
              <Tooltip />
              <Line type="monotone" dataKey="new_enrollments" name="New enrollments" stroke="#6F2C91" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sessions booked" subtitle="Non-cancelled sessions by week, last 8 weeks">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.sessions_booked_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#746F7C" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#746F7C" />
              <Tooltip />
              <Bar dataKey="sessions" name="Sessions" fill="#59BCE8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Clients by treatment type" subtitle="Active mix of services offered">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats.clients_by_service}
                dataKey="count"
                nameKey="service_type"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {stats.clients_by_service.map((entry, index) => (
                  <Cell key={entry.service_type} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} client${value === 1 ? "" : "s"}`, name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sessions by status" subtitle="All-time booking outcomes">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats.sessions_by_status}
                dataKey="count"
                nameKey="status"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {stats.sessions_by_status.map((entry, index) => (
                  <Cell key={entry.status} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} session${value === 1 ? "" : "s"}`, name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <BarChart3 size={18} className="text-harbor" />
          Therapist utilization
        </h2>
        <p className="mb-4 text-xs text-mist">Active (non-cancelled) sessions per therapist, all time</p>
        <ResponsiveContainer width="100%" height={Math.max(160, stats.therapist_utilization.length * 42)}>
          <BarChart data={stats.therapist_utilization} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#746F7C" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#746F7C" width={140} />
            <Tooltip />
            <Bar dataKey="session_count" name="Sessions" radius={[0, 4, 4, 0]}>
              {stats.therapist_utilization.map((entry) => (
                <Cell key={entry.id} fill={entry.color || "#6F2C91"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Users size={18} className="text-sunrise" />
          Registration funnel
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.clients_by_status.map((row) => (
            <div key={row.status} className="rounded-xl bg-chalk p-4">
              <p className="font-display text-2xl font-semibold text-ink">{row.count}</p>
              <p className="mt-1 text-xs capitalize text-mist">
                {row.status} · {row.percentage}%
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      <p className="mb-2 text-xs text-mist">{subtitle}</p>
      {children}
    </section>
  );
}

function MaintenanceTab({ status, loading, error, downloadingBackup, cleaningUp, onDownloadBackup, onCleanup }) {
  if (loading && !status) {
    return <p className="text-sm text-mist">Checking database health...</p>;
  }
  if (error && !status) {
    return <p className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>;
  }
  if (!status) return null;

  const sizeMb = (status.database.size_bytes / (1024 * 1024)).toFixed(2);
  const cleanupTotal =
    status.cleanup_candidates.notifications_log_older_than_90_days +
    status.cleanup_candidates.ai_audit_logs_older_than_90_days;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat icon={HardDrive} label="Database size" value={`${sizeMb} MB`} />
        <Stat
          icon={Database}
          label="Total records"
          value={Object.values(status.record_counts).reduce((sum, n) => sum + n, 0)}
        />
        <Stat
          icon={AlertTriangle}
          label="Clients never scheduled"
          value={status.health_flags.active_clients_never_scheduled}
          alert={status.health_flags.active_clients_never_scheduled > 0}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <HardDrive size={18} className="text-harbor" />
            Database backup
          </h2>
          <p className="mb-4 text-xs text-mist">
            {status.database.last_modified
              ? `Last written ${format(parseISO(status.database.last_modified), "MMM d, yyyy 'at' h:mm a")}`
              : "No database file found yet."}
          </p>
          <button
            onClick={onDownloadBackup}
            disabled={downloadingBackup}
            className="flex items-center gap-2 rounded-lg bg-harbor px-4 py-2.5 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
          >
            {downloadingBackup ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download full backup (.sqlite)
          </button>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Trash2 size={18} className="text-sunrise" />
            Housekeeping
          </h2>
          <p className="mb-4 text-xs text-mist">
            {cleanupTotal > 0
              ? `${cleanupTotal} log row${cleanupTotal === 1 ? "" : "s"} older than 90 days can be cleared. Clinical records are never touched.`
              : "No old log rows to clear right now. Clinical records are never touched."}
          </p>
          <button
            onClick={onCleanup}
            disabled={cleaningUp || cleanupTotal === 0}
            className="flex items-center gap-2 rounded-lg bg-sunrise px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {cleaningUp ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Clear logs older than 90 days
          </button>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Database size={18} className="text-harbor" />
          Record counts
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(status.record_counts).map(([table, count]) => (
            <div key={table} className="flex items-center justify-between border-b border-mist-light/60 py-1.5 text-sm">
              <span className="capitalize text-mist">{table.replace(/_/g, " ")}</span>
              <span className="font-semibold text-ink">{count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
