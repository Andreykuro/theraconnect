import { useState } from "react";
import { X, Paperclip } from "lucide-react";
import api from "../lib/api";
import useModalEntrance from "../hooks/useModalEntrance";

const CATEGORIES = [
  "Speech Therapy",
  "Occupational Therapy",
  "Physical Therapy",
  "Special Education tutorial",
  "Playgroup",
  "Early Intervention",
];

export default function ClassworkModal({ client, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [category, setCategory] = useState(client.service_type || CATEGORIES[0]);
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { backdropRef, panelRef } = useModalEntrance();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Give this activity a name.");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("instructions", instructions.trim());
      formData.append("category", category);
      if (dueDate) formData.append("due_date", dueDate);
      if (file) formData.append("file", file);

      await api.post(`/classwork/clients/${client.id}`, formData);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't assign this. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div ref={panelRef} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Assign classwork</h2>
            <p className="text-sm text-mist">For {client.name} · the parent will see this in their portal</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-mist hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Activity name">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Practice /s/ sounds - 10 words"
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            />
          </Field>

          <Field label="Instructions for the parent" hint="Optional">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="What to do, how many times, and what to send back. e.g. Say each word 3 times, then upload a photo of the finished sheet."
              className="w-full resize-none rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Therapy type">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Submit by" hint="Optional">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
              />
            </Field>
          </div>

          <Field label="Worksheet or guide for the parent" hint="Optional · image or PDF">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-mist-light px-3 py-2.5 text-sm text-mist transition hover:border-harbor hover:text-harbor">
              <Paperclip size={15} />
              {file ? file.name : "Attach a worksheet"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
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
              {saving ? "Assigning…" : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-mist">
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal text-mist/75">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
