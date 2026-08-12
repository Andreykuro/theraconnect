import { useState } from "react";
import { X } from "lucide-react";
import api from "../lib/api";
import useModalEntrance from "../hooks/useModalEntrance";

export default function ClientModal({ therapists, initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    name: initial?.name || "",
    birthdate: initial?.birthdate || "",
    service_type: initial?.service_type || "Speech Therapy",
    guardian_name: initial?.guardian_name || "",
    guardian_phone: initial?.guardian_phone || "",
    guardian_email: initial?.guardian_email || "",
    therapist_id: initial?.therapist_id || "",
    notes: initial?.notes || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { backdropRef, panelRef } = useModalEntrance();

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.guardian_name || !form.guardian_phone) {
      setError("Child's name, guardian name, and guardian phone are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, therapist_id: form.therapist_id ? Number(form.therapist_id) : null };
      if (isEdit) {
        await api.put(`/clients/${initial.id}`, payload);
      } else {
        await api.post("/clients", payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div ref={panelRef} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">
            {isEdit ? "Edit client" : "Add client"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-mist hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Child's name">
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Birthdate">
              <input
                type="date"
                value={form.birthdate}
                onChange={(e) => update("birthdate", e.target.value)}
                className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
              />
            </Field>
            <Field label="Primary service">
              <select
                value={form.service_type}
                onChange={(e) => update("service_type", e.target.value)}
                className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
              >
                <option>Speech Therapy</option>
                <option>Occupational Therapy</option>
                <option>Physical Therapy</option>
                <option>Special Education tutorial</option>
                <option>Early Intervention</option>
              </select>
            </Field>
          </div>

          <Field label="Assigned therapist">
            <select
              value={form.therapist_id}
              onChange={(e) => update("therapist_id", e.target.value)}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            >
              <option value="">Unassigned</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.specialty}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Guardian name">
            <input
              value={form.guardian_name}
              onChange={(e) => update("guardian_name", e.target.value)}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Guardian phone">
              <input
                value={form.guardian_phone}
                onChange={(e) => update("guardian_phone", e.target.value)}
                placeholder="09XXXXXXXXX"
                className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
              />
            </Field>
            <Field label="Guardian email">
              <input
                type="email"
                value={form.guardian_email}
                onChange={(e) => update("guardian_email", e.target.value)}
                className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
              />
            </Field>
          </div>

          <Field label="Notes (optional)">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-coral-red-light px-3 py-2 text-sm text-coral-red">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-mist-light px-4 py-2 text-sm font-semibold text-ink hover:bg-chalk"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-harbor px-4 py-2 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">{label}</label>
      {children}
    </div>
  );
}
