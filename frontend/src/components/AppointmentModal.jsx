import { useState, useEffect } from "react";
import { X } from "lucide-react";
import api from "../lib/api";
import useModalEntrance from "../hooks/useModalEntrance";

const SERVICES = [
  "Speech Therapy",
  "Occupational Therapy",
  "Physical Therapy",
  "Special Education tutorial",
  "Playgroup",
  "Early Intervention",
];

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppointmentModal({ clients, therapists, initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    client_id: initial?.client_id || "",
    therapist_id: initial?.therapist_id || "",
    service_type: initial?.service_type || SERVICES[0],
    start_time: toLocalInput(initial?.start_time),
    end_time: toLocalInput(initial?.end_time),
    notes: initial?.notes || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { backdropRef, panelRef } = useModalEntrance();

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.client_id || !form.therapist_id || !form.start_time || !form.end_time) {
      setError("Please fill in client, therapist, and both times.");
      return;
    }

    const payload = {
      client_id: Number(form.client_id),
      therapist_id: Number(form.therapist_id),
      service_type: form.service_type,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      notes: form.notes,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/appointments/${initial.id}`, payload);
      } else {
        await api.post("/appointments", payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelSession() {
    if (!confirm("Cancel this session? The guardian will need a new confirmation.")) return;
    setCancelling(true);
    try {
      await api.delete(`/appointments/${initial.id}`);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't cancel this session. Please try again.");
      setCancelling(false);
    }
  }

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div ref={panelRef} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">
            {isEdit ? "Edit session" : "Schedule a session"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-mist hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
              Client
            </label>
            <select
              value={form.client_id}
              onChange={(e) => update("client_id", e.target.value)}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
              Therapist
            </label>
            <select
              value={form.therapist_id}
              onChange={(e) => update("therapist_id", e.target.value)}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            >
              <option value="">Select a therapist…</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.specialty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
              Service type
            </label>
            <select
              value={form.service_type}
              onChange={(e) => update("service_type", e.target.value)}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
                Starts
              </label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => update("start_time", e.target.value)}
                className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
                Ends
              </label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => update("end_time", e.target.value)}
                className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
              Notes (optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-coral-red-light px-3 py-2 text-sm text-coral-red">{error}</p>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            {isEdit && initial.status !== "cancelled" ? (
              <button
                type="button"
                onClick={handleCancelSession}
                disabled={cancelling}
                className="rounded-lg border border-coral-red/30 px-4 py-2 text-sm font-semibold text-coral-red hover:bg-coral-red-light disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Cancel session"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-mist-light px-4 py-2 text-sm font-semibold text-ink hover:bg-chalk"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-harbor px-4 py-2 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
              >
                {saving ? "Saving…" : isEdit ? "Save changes" : "Schedule session"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
