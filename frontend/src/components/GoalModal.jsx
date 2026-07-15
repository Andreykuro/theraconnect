import { useState } from "react";
import { Loader2, Target, X } from "lucide-react";
import api from "../lib/api";

const fieldClass =
  "w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor";

const METRICS = [
  { value: "accuracy", label: "Accuracy / success rate", unit: "%" },
  { value: "frequency", label: "Frequency / count", unit: "times" },
  { value: "duration", label: "Duration", unit: "seconds" },
  { value: "rating", label: "Rating scale", unit: "score" },
  { value: "assistance", label: "Assistance score", unit: "level" },
];

export default function GoalModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    metric_type: "accuracy",
    baseline: "",
    target: "",
    direction: "increase",
    unit: "%",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function changeMetric(metricType) {
    const metric = METRICS.find((item) => item.value === metricType);
    setForm((current) => ({ ...current, metric_type: metricType, unit: metric?.unit || "score" }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post(`/progress/clients/${client.id}/goals`, {
        ...form,
        baseline: Number(form.baseline),
        target: Number(form.target),
      });
      onSaved();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Couldn't save this goal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-sunrise" />
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Add treatment goal</h2>
              <p className="text-xs text-mist">{client.name}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-mist hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Goal title">
            <input
              required
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              className={fieldClass}
              placeholder="Produce /s/ sound independently"
            />
          </Field>
          <Field label="Description" optional>
            <textarea
              rows={2}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              className={`${fieldClass} resize-none`}
              placeholder="Describe the conditions and level of prompting"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Measurement">
              <select
                value={form.metric_type}
                onChange={(event) => changeMetric(event.target.value)}
                className={fieldClass}
              >
                {METRICS.map((metric) => (
                  <option key={metric.value} value={metric.value}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unit">
              <input
                required
                value={form.unit}
                onChange={(event) => update("unit", event.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Baseline">
              <input
                type="number"
                step="any"
                required
                value={form.baseline}
                onChange={(event) => update("baseline", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Target">
              <input
                type="number"
                step="any"
                required
                value={form.target}
                onChange={(event) => update("target", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Direction">
              <select
                value={form.direction}
                onChange={(event) => update("direction", event.target.value)}
                className={fieldClass}
              >
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </select>
            </Field>
          </div>

          {error && <p className="rounded-lg bg-coral-red-light px-3 py-2 text-sm text-coral-red">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-mist hover:bg-chalk">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-harbor px-4 py-2 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Save goal
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
