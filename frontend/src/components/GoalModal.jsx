import { useState } from "react";
import { Info, Loader2, Target, X } from "lucide-react";
import api from "../lib/api";
import useModalEntrance from "../hooks/useModalEntrance";
import { ASSISTANCE_SCALE, METRICS, metricFor, progressFor, withUnit } from "../lib/goalMetrics";

const fieldClass =
  "w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor";

export default function GoalModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    metric_type: "accuracy",
    baseline: "",
    target: "",
    unit: "%",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { backdropRef, panelRef } = useModalEntrance();

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function changeMetric(metricType) {
    const metric = metricFor(metricType);
    setForm((current) => ({ ...current, metric_type: metricType, unit: metric.unit, baseline: "", target: "" }));
  }

  const metric = metricFor(form.metric_type);
  const hasNumbers = form.baseline !== "" && form.target !== "" && Number(form.baseline) !== Number(form.target);
  // Lower target than start = the number should go DOWN (e.g. fewer tantrums).
  const direction = hasNumbers && Number(form.target) < Number(form.baseline) ? "decrease" : "increase";
  const halfway = hasNumbers ? (Number(form.baseline) + Number(form.target)) / 2 : null;

  async function submit(event) {
    event.preventDefault();
    if (Number(form.baseline) === Number(form.target)) {
      setError("The target must be different from the starting level.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post(`/progress/clients/${client.id}/goals`, {
        ...form,
        direction,
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
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-5">
      <div ref={panelRef} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
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
              placeholder="e.g. Says the /s/ sound correctly in words"
            />
          </Field>
          <Field label="Description" optional>
            <textarea
              rows={2}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              className={`${fieldClass} resize-none`}
              placeholder="e.g. During picture-card naming, with no more than one reminder"
            />
          </Field>
          <Field label="How will you measure it?">
            <select
              value={form.metric_type}
              onChange={(event) => changeMetric(event.target.value)}
              className={fieldClass}
            >
              {METRICS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-chalk px-2.5 py-2 text-xs normal-case text-mist">
              <Info size={13} className="mt-0.5 flex-shrink-0 text-harbor" />
              {metric.explain}
            </span>
          </Field>

          <Field label="Unit" hint="what the number is counted in">
            {metric.lockedUnit ? (
              <input value={form.unit} readOnly className={`${fieldClass} bg-chalk text-mist`} />
            ) : (
              <select value={form.unit} onChange={(event) => update("unit", event.target.value)} className={fieldClass}>
                {metric.unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting level" hint="where the child is now">
              <LevelInput
                metric={metric}
                value={form.baseline}
                onChange={(value) => update("baseline", value)}
                placeholder={`e.g. ${metric.example.baseline}`}
              />
            </Field>
            <Field label="Target" hint="where you want them to be">
              <LevelInput
                metric={metric}
                value={form.target}
                onChange={(value) => update("target", value)}
                placeholder={`e.g. ${metric.example.target}`}
              />
            </Field>
          </div>

          {hasNumbers && (
            <p className="rounded-lg bg-harbor-light px-3 py-2 text-xs text-harbor-dark">
              {direction === "increase" ? "Going up" : "Going down"} from{" "}
              <b>{withUnit(form.baseline, form.unit)}</b> to <b>{withUnit(form.target, form.unit)}</b> counts as progress.
              A result of {withUnit(halfway, form.unit)} would show as{" "}
              <b>{progressFor(form.baseline, form.target, halfway)}%</b> progress.
            </p>
          )}

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

function LevelInput({ metric, value, onChange, placeholder }) {
  if (metric.value === "assistance") {
    return (
      <select required value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        <option value="">Choose a level</option>
        {ASSISTANCE_SCALE.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </select>
    );
  }
  const isRating = metric.value === "rating";
  return (
    <input
      type="number"
      step="any"
      min={isRating ? 1 : 0}
      max={isRating ? 5 : metric.unit === "%" ? 100 : undefined}
      required
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
      placeholder={placeholder}
    />
  );
}

function Field({ label, optional, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
        {label} {optional && <span className="normal-case tracking-normal">(optional)</span>}
        {hint && <span className="block font-normal normal-case tracking-normal">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
