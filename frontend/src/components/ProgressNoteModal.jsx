import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Bot, CheckCircle2, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import api from "../lib/api";

const fieldClass =
  "w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor";

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function ProgressNoteModal({ client, goals, appointments, onClose, onSaved }) {
  const [rawNotes, setRawNotes] = useState("");
  const [draft, setDraft] = useState({
    subjective: "",
    intervention: "",
    assessment: "",
    plan: "",
    parent_summary: "",
  });
  const [measurements, setMeasurements] = useState(() =>
    Object.fromEntries(goals.map((goal) => [goal.id, { value: "", assistance_level: "", observation: "" }]))
  );
  const [appointmentId, setAppointmentId] = useState("");
  const [sessionDate, setSessionDate] = useState(localDateTimeValue());
  const [assisting, setAssisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assisted, setAssisted] = useState(null);
  const [error, setError] = useState("");

  const relevantAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => Number(appointment.client_id) === Number(client.id))
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
        .slice(0, 20),
    [appointments, client.id]
  );

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateMeasurement(goalId, field, value) {
    setMeasurements((current) => ({
      ...current,
      [goalId]: { ...current[goalId], [field]: value },
    }));
  }

  async function createAssistedDraft() {
    setAssisting(true);
    setError("");
    try {
      const { data } = await api.post("/progress/notes/assist", {
        client_id: client.id,
        raw_notes: rawNotes,
      });
      setDraft({
        subjective: data.draft.subjective || "",
        intervention: data.draft.intervention || "",
        assessment: data.draft.assessment || "",
        plan: data.draft.plan || "",
        parent_summary: data.draft.parent_summary || "",
      });
      setMeasurements((current) => {
        const next = { ...current };
        for (const suggestion of data.draft.suggested_measurements || []) {
          if (!next[suggestion.goal_id]) continue;
          next[suggestion.goal_id] = {
            ...next[suggestion.goal_id],
            value: String(suggestion.value),
            observation: suggestion.observation || "",
          };
        }
        return next;
      });
      setAssisted({ provider: data.provider, status: data.status });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Couldn't create the assisted draft.");
    } finally {
      setAssisting(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/progress/notes", {
        client_id: client.id,
        appointment_id: appointmentId ? Number(appointmentId) : null,
        session_date: new Date(sessionDate).toISOString(),
        raw_notes: rawNotes,
        source: assisted ? "assisted" : "manual",
        ...draft,
        measurements: goals.map((goal) => ({
          goal_id: goal.id,
          ...measurements[goal.id],
        })),
      });
      onSaved();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Couldn't save this session note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-5">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-mist-light bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-harbor" />
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Session note</h2>
              <p className="text-xs text-mist">{client.name} · review and approve before saving</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-mist hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={save} className="space-y-7 p-6">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold text-ink">Quick therapist entry</h3>
                <p className="text-xs text-mist">Enter observations, activities, prompting, and measurable outcomes.</p>
              </div>
              <button
                type="button"
                disabled={assisting || rawNotes.trim().length < 10}
                onClick={createAssistedDraft}
                className="flex items-center gap-2 rounded-lg bg-harbor px-3.5 py-2 text-xs font-semibold text-white hover:bg-harbor-dark disabled:opacity-40"
              >
                {assisting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Create assisted draft
              </button>
            </div>
            <textarea
              rows={4}
              maxLength={5000}
              value={rawNotes}
              onChange={(event) => setRawNotes(event.target.value)}
              className={`${fieldClass} resize-y`}
              placeholder="Practiced /s/ sounds using picture cards. 14/20 independently, needed verbal prompts near the end..."
            />
            <div className="mt-2 flex items-start gap-2 text-xs text-mist">
              <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-harbor" />
              <span>
                Patient name and contact details are redacted before any configured external note service.
                No external service is enabled by default.
              </span>
            </div>
            {assisted && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-harbor-light px-3 py-2 text-xs text-harbor-dark">
                <Bot size={14} />
                Draft generated using{" "}
                {assisted.provider.startsWith("openai:")
                  ? "the OpenAI assistant"
                  : assisted.provider.startsWith("local")
                    ? "the local assistant"
                    : "the configured assistant"}
                .
                Every field remains editable and requires your approval.
              </div>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Session date and time">
              <input
                type="datetime-local"
                required
                value={sessionDate}
                onChange={(event) => setSessionDate(event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Linked appointment" optional>
              <select value={appointmentId} onChange={(event) => setAppointmentId(event.target.value)} className={fieldClass}>
                <option value="">No linked appointment</option>
                {relevantAppointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {format(parseISO(appointment.start_time), "MMM d, yyyy · h:mm a")} · {appointment.status}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          <section>
            <h3 className="mb-3 font-display text-base font-semibold text-ink">Structured clinical note</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Subjective / context" optional>
                <textarea
                  rows={3}
                  value={draft.subjective}
                  onChange={(event) => updateDraft("subjective", event.target.value)}
                  className={`${fieldClass} resize-y`}
                />
              </Field>
              <Field label="Intervention / activities">
                <textarea
                  rows={3}
                  required
                  value={draft.intervention}
                  onChange={(event) => updateDraft("intervention", event.target.value)}
                  className={`${fieldClass} resize-y`}
                />
              </Field>
              <Field label="Assessment / response">
                <textarea
                  rows={3}
                  required
                  value={draft.assessment}
                  onChange={(event) => updateDraft("assessment", event.target.value)}
                  className={`${fieldClass} resize-y`}
                />
              </Field>
              <Field label="Plan for next session" optional>
                <textarea
                  rows={3}
                  value={draft.plan}
                  onChange={(event) => updateDraft("plan", event.target.value)}
                  className={`${fieldClass} resize-y`}
                />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="mb-1 font-display text-base font-semibold text-ink">Goal measurements</h3>
            <p className="mb-3 text-xs text-mist">Leave a measurement empty when that goal was not assessed in this session.</p>
            {goals.length === 0 ? (
              <p className="rounded-xl bg-chalk px-4 py-5 text-sm text-mist">Add a treatment goal to begin automated scoring.</p>
            ) : (
              <div className="space-y-3">
                {goals.map((goal) => (
                  <div key={goal.id} className="rounded-xl border border-mist-light p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{goal.title}</p>
                      <p className="text-xs text-mist">
                        Baseline {goal.baseline} → target {goal.target} {goal.unit}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[0.65fr_1fr_1.5fr]">
                      <Field label={`Value (${goal.unit})`}>
                        <input
                          type="number"
                          step="any"
                          value={measurements[goal.id]?.value || ""}
                          onChange={(event) => updateMeasurement(goal.id, "value", event.target.value)}
                          className={fieldClass}
                        />
                      </Field>
                      <Field label="Assistance" optional>
                        <select
                          value={measurements[goal.id]?.assistance_level || ""}
                          onChange={(event) => updateMeasurement(goal.id, "assistance_level", event.target.value)}
                          className={fieldClass}
                        >
                          <option value="">Not recorded</option>
                          <option value="independent">Independent</option>
                          <option value="minimal">Minimal assistance</option>
                          <option value="moderate">Moderate assistance</option>
                          <option value="maximum">Maximum assistance</option>
                        </select>
                      </Field>
                      <Field label="Observation" optional>
                        <input
                          value={measurements[goal.id]?.observation || ""}
                          onChange={(event) => updateMeasurement(goal.id, "observation", event.target.value)}
                          className={fieldClass}
                          placeholder="Prompting, activity, or context"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-sunrise-light/60 p-4">
            <Field label="Parent-friendly session update">
              <textarea
                rows={3}
                required
                value={draft.parent_summary}
                onChange={(event) => updateDraft("parent_summary", event.target.value)}
                className={`${fieldClass} resize-y`}
                placeholder="Use clear, supportive language without diagnostic claims."
              />
            </Field>
            <p className="mt-2 text-xs text-mist">Parents see this summary, not the internal clinical assessment.</p>
          </section>

          {error && <p className="rounded-lg bg-coral-red-light px-3 py-2 text-sm text-coral-red">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-mist-light pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-mist hover:bg-chalk">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-sunrise px-5 py-2.5 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Approve and save note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, optional, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
        {label} {optional && <span className="normal-case tracking-normal">(optional)</span>}
      </span>
      {children}
    </label>
  );
}
