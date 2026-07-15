import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ClipboardPlus, FileText, Plus, Search, Sparkles, Target, UserRound } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import GoalModal from "../../components/GoalModal";
import ProgressGoalCard from "../../components/ProgressGoalCard";
import ProgressNoteModal from "../../components/ProgressNoteModal";

export default function TherapistProgress() {
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [goalModal, setGoalModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [error, setError] = useState("");

  const loadRoster = useCallback(async () => {
    const [clientsResponse, appointmentsResponse] = await Promise.all([
      api.get("/clients"),
      api.get("/appointments"),
    ]);
    setClients(clientsResponse.data);
    setAppointments(appointmentsResponse.data);
    setSelectedId((current) => current || clientsResponse.data[0]?.id || null);
  }, []);

  const loadProgress = useCallback(async (clientId) => {
    if (!clientId) {
      setProgress(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/progress/clients/${clientId}`);
      setProgress(data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Couldn't load progress information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoster().catch(() => {
      setError("Couldn't load your client roster.");
      setLoading(false);
    });
  }, [loadRoster]);

  useEffect(() => {
    loadProgress(selectedId);
  }, [selectedId, loadProgress]);

  const selectedClient = clients.find((client) => Number(client.id) === Number(selectedId));
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  function refreshAfterSave() {
    setGoalModal(false);
    setNoteModal(false);
    loadProgress(selectedId);
  }

  return (
    <DashboardLayout
      title="Progress and notes"
      subtitle="Therapist-approved goals, measurements, and family updates"
      actions={
        selectedClient && (
          <div className="flex gap-2">
            <button
              onClick={() => setGoalModal(true)}
              className="flex items-center gap-2 rounded-lg border border-harbor/25 bg-white px-3.5 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-harbor-light"
            >
              <Plus size={16} />
              Add goal
            </button>
            <button
              onClick={() => setNoteModal(true)}
              className="flex items-center gap-2 rounded-lg bg-sunrise px-3.5 py-2.5 text-sm font-semibold text-white hover:brightness-105"
            >
              <ClipboardPlus size={16} />
              New session note
            </button>
          </div>
        )
      }
    >
      <div className="grid min-h-[calc(100vh-9rem)] gap-5 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-mist-light">
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-chalk px-3 py-2">
            <Search size={15} className="text-mist" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a patient"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-mist">
            Assigned patients
          </p>
          <div className="space-y-1">
            {filteredClients.map((client) => {
              const active = Number(client.id) === Number(selectedId);
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedId(client.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    active ? "bg-harbor-light text-harbor-dark" : "hover:bg-chalk"
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? "bg-harbor text-white" : "bg-chalk text-mist"}`}>
                    <UserRound size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{client.name}</span>
                    <span className="block truncate text-xs text-mist">{client.service_type}</span>
                  </span>
                </button>
              );
            })}
            {!loading && filteredClients.length === 0 && (
              <p className="px-3 py-5 text-center text-xs text-mist">No assigned patients found.</p>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {error && <p className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>}
          {loading && <p className="text-sm text-mist">Loading progress...</p>}

          {!loading && progress && (
            <>
              <section className="flex flex-col gap-5 rounded-2xl bg-harbor p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60">Patient progress</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">{progress.client.name}</h2>
                  <p className="mt-1 text-sm text-white/75">
                    {progress.client.service_type} · {progress.client.guardian_name}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-6 py-4 text-center ring-1 ring-white/15">
                  <p className="font-mono text-3xl font-semibold">
                    {progress.overall_progress === null ? "—" : `${Math.round(progress.overall_progress)}%`}
                  </p>
                  <p className="text-xs text-white/70">Overall measured progress</p>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                    <Target size={18} className="text-sunrise" />
                    Treatment goals
                  </h2>
                  <span className="text-xs text-mist">{progress.goals.length} goal{progress.goals.length === 1 ? "" : "s"}</span>
                </div>
                {progress.goals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-mist-light bg-white/60 px-5 py-8 text-center">
                    <Target size={24} className="mx-auto mb-2 text-mist" />
                    <p className="text-sm font-semibold text-ink">No treatment goals yet</p>
                    <p className="mt-1 text-xs text-mist">Add a measurable baseline and target to start automated tracking.</p>
                    <button onClick={() => setGoalModal(true)} className="mt-4 rounded-lg bg-harbor px-4 py-2 text-xs font-semibold text-white">
                      Add first goal
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {progress.goals.map((goal) => (
                      <ProgressGoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                    <FileText size={18} className="text-harbor" />
                    Approved session notes
                  </h2>
                  <button onClick={() => setNoteModal(true)} className="flex items-center gap-1.5 text-xs font-semibold text-harbor hover:text-harbor-dark">
                    <Sparkles size={14} />
                    Add note
                  </button>
                </div>
                {progress.notes.length === 0 ? (
                  <p className="rounded-2xl bg-white px-4 py-7 text-center text-sm text-mist ring-1 ring-mist-light">
                    No session notes recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {progress.notes.map((note) => (
                      <article key={note.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-display text-base font-semibold text-ink">
                              {format(parseISO(note.session_date), "MMMM d, yyyy")}
                            </p>
                            <p className="text-xs text-mist">
                              Approved by {note.approved_by_name || "therapist"} · {note.source === "assisted" ? "assisted draft reviewed" : "manual note"}
                            </p>
                          </div>
                          {note.appointment_id && <span className="rounded-full bg-chalk px-2 py-1 text-[10px] font-semibold text-mist">Appointment #{note.appointment_id}</span>}
                        </div>
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          <NotePart label="Intervention" value={note.intervention} />
                          <NotePart label="Assessment" value={note.assessment} />
                          {note.plan && <NotePart label="Next plan" value={note.plan} />}
                          <NotePart label="Parent update" value={note.parent_summary} highlighted />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {goalModal && selectedClient && (
        <GoalModal client={selectedClient} onClose={() => setGoalModal(false)} onSaved={refreshAfterSave} />
      )}
      {noteModal && selectedClient && progress && (
        <ProgressNoteModal
          client={selectedClient}
          goals={progress.goals.filter((goal) => goal.status === "active")}
          appointments={appointments}
          onClose={() => setNoteModal(false)}
          onSaved={refreshAfterSave}
        />
      )}
    </DashboardLayout>
  );
}

function NotePart({ label, value, highlighted = false }) {
  return (
    <div className={`rounded-xl p-3 ${highlighted ? "bg-sunrise-light/60" : "bg-chalk"}`}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-mist">{label}</p>
      <p className="text-sm leading-5 text-ink">{value}</p>
    </div>
  );
}
