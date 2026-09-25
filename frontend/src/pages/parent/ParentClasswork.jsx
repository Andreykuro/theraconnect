import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ClipboardList, Paperclip, Image as ImageIcon, Upload, Sparkles } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import { StarRow } from "../../components/StarRating";

const STATUS_STYLE = {
  assigned: "bg-amber-light text-amber",
  submitted: "bg-therafun-sky-light text-therafun-sky-dark",
  graded: "bg-harbor-light text-harbor-dark",
};
const STATUS_LABEL = {
  assigned: "To do",
  submitted: "Turned in",
  graded: "Graded",
};

export default function ParentClasswork() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await api.get("/classwork/me");
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const todo = items.filter((i) => i.status === "assigned");
  const done = items.filter((i) => i.status !== "assigned");

  return (
    <DashboardLayout title="Classwork" subtitle="Home exercises assigned by your child's therapist">
      {loading && <p className="text-sm text-mist">Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-14 text-center text-mist ring-1 ring-mist-light">
          <ClipboardList size={22} />
          <p className="text-sm">No classwork assigned yet — check back after your next session.</p>
        </div>
      )}

      {!loading && todo.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">To do</h2>
          <div className="space-y-3">
            {todo.map((item) => (
              <ClassworkCard key={item.id} item={item} onSubmitted={load} />
            ))}
          </div>
        </div>
      )}

      {!loading && done.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Turned in</h2>
          <div className="space-y-3">
            {done.map((item) => (
              <ClassworkCard key={item.id} item={item} onSubmitted={load} />
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function ClassworkCard({ item, onSubmitted }) {
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const formData = new FormData();
      if (note.trim()) formData.append("note", note.trim());
      if (file) formData.append("file", file);
      await api.post(`/classwork/me/${item.id}/submit`, formData);
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't submit this. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-mist">
            {item.category} · {item.therapist_name}
          </p>
          <h3 className="font-display text-base font-semibold text-ink">{item.title}</h3>
          {item.due_date && (
            <p className="mt-0.5 text-xs text-mist">Due {format(parseISO(item.due_date), "MMM d, yyyy")}</p>
          )}
        </div>
        <span className={`stamp flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[item.status]}`}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      {item.instructions && <p className="mt-3 text-sm text-mist">{item.instructions}</p>}

      {item.attachment_url && (
        <a
          href={item.attachment_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-harbor hover:text-harbor-dark"
        >
          <Paperclip size={13} />
          {item.attachment_name}
        </a>
      )}

      {item.status === "assigned" && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-sunrise px-3.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-105"
        >
          <Upload size={13} />
          Mark as done
        </button>
      )}

      {item.status === "assigned" && showForm && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-mist-light pt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="How did it go? (optional)"
            className="w-full resize-none rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-mist-light px-3 py-2 text-xs text-mist transition hover:border-harbor hover:text-harbor">
            <Paperclip size={14} />
            {file ? file.name : "Attach a photo of the completed work (optional)"}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          {error && <p className="text-xs text-coral-red">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-harbor px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
            >
              {saving ? "Submitting…" : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-mist-light px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-chalk"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {(item.status === "submitted" || item.status === "graded") && (
        <div className="mt-4 rounded-xl bg-chalk p-3">
          {item.submission_note && <p className="text-sm text-ink">"{item.submission_note}"</p>}
          {item.submission_url && (
            <a
              href={item.submission_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-harbor hover:text-harbor-dark"
            >
              <ImageIcon size={13} />
              {item.submission_name}
            </a>
          )}
        </div>
      )}

      {item.status === "graded" && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-harbor-light p-3">
          <Sparkles size={15} className="mt-0.5 flex-shrink-0 text-harbor-dark" />
          <div>
            <StarRow value={item.star_rating} />
            {item.feedback && (
              <p className="mt-1.5 text-sm text-ink">
                <span className="font-semibold text-harbor-dark">Remarks: </span>
                {item.feedback}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
