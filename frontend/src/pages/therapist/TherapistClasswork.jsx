import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ClipboardList, Plus, Paperclip, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import ClassworkModal from "../../components/ClassworkModal";
import { StarRow, StarPicker } from "../../components/StarRating";

const STATUS_STYLE = {
  assigned: "bg-amber-light text-amber",
  submitted: "bg-therafun-sky-light text-therafun-sky-dark",
  graded: "bg-harbor-light text-harbor-dark",
};

export default function TherapistClasswork() {
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingWork, setLoadingWork] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [grading, setGrading] = useState(null); // classwork id currently being graded

  const loadClients = useCallback(async () => {
    const { data } = await api.get("/clients");
    setClients(data);
    setLoadingClients(false);
    setSelected((current) => current ?? data[0]?.id ?? null);
  }, []);

  const loadWork = useCallback(async (clientId) => {
    if (!clientId) return;
    setLoadingWork(true);
    const { data } = await api.get(`/classwork/clients/${clientId}`);
    setItems(data);
    setLoadingWork(false);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadWork(selected);
  }, [selected, loadWork]);

  const selectedClient = clients.find((c) => c.id === selected);

  return (
    <DashboardLayout
      title="Classwork"
      subtitle="Home exercises for the families on your caseload"
      actions={
        selectedClient && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-sunrise px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
          >
            <Plus size={16} />
            Assign classwork
          </button>
        )
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <div className="h-fit overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-light">
          {loadingClients && <p className="p-4 text-sm text-mist">Loading…</p>}
          {!loadingClients && clients.length === 0 && (
            <p className="p-4 text-sm text-mist">No clients assigned yet.</p>
          )}
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`block w-full border-b border-mist-light px-4 py-3 text-left text-sm font-semibold text-ink transition last:border-b-0 hover:bg-chalk ${
                selected === c.id ? "bg-harbor-light" : ""
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {!selectedClient && !loadingClients && (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-10 text-sm text-mist shadow-sm ring-1 ring-mist-light">
              <ClipboardList size={18} />
              Select a family to view or assign classwork.
            </div>
          )}

          {selectedClient && loadingWork && <p className="text-sm text-mist">Loading…</p>}

          {selectedClient && !loadingWork && items.length === 0 && (
            <div className="rounded-2xl bg-white p-10 text-center text-sm text-mist shadow-sm ring-1 ring-mist-light">
              Nothing assigned to {selectedClient.name} yet.
            </div>
          )}

          {selectedClient &&
            !loadingWork &&
            items.map((item) => (
              <ClassworkRow
                key={item.id}
                item={item}
                grading={grading === item.id}
                onStartGrade={() => setGrading(item.id)}
                onCancelGrade={() => setGrading(null)}
                onGraded={() => {
                  setGrading(null);
                  loadWork(selected);
                }}
              />
            ))}
        </div>
      </div>

      {showModal && selectedClient && (
        <ClassworkModal
          client={selectedClient}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadWork(selected);
          }}
        />
      )}
    </DashboardLayout>
  );
}

function ClassworkRow({ item, grading, onStartGrade, onCancelGrade, onGraded }) {
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitGrade(e) {
    e.preventDefault();
    if (!stars) {
      setError("Please pick a star rating.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.post(`/classwork/${item.id}/grade`, {
        star_rating: stars,
        feedback,
      });
      onGraded();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't save this grade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-mist">{item.category}</p>
          <h3 className="font-display text-base font-semibold text-ink">{item.title}</h3>
          {item.due_date && (
            <p className="mt-0.5 text-xs text-mist">Due {format(parseISO(item.due_date), "MMM d, yyyy")}</p>
          )}
        </div>
        <span className={`stamp flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[item.status]}`}>
          {item.status}
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

      {(item.status === "submitted" || item.status === "graded") && (
        <div className="mt-4 rounded-xl bg-chalk p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink">
            <CheckCircle2 size={13} className="text-harbor" />
            Submitted {format(parseISO(item.submitted_at.replace(" ", "T")), "MMM d, h:mm a")}
          </p>
          {item.submission_note && <p className="text-sm text-mist">{item.submission_note}</p>}
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
        <div className="mt-3 rounded-xl bg-harbor-light p-3">
          <StarRow value={item.star_rating} />
          {item.feedback && <p className="mt-1 text-sm text-ink">{item.feedback}</p>}
        </div>
      )}

      {item.status === "submitted" && !grading && (
        <button
          onClick={onStartGrade}
          className="mt-3 rounded-lg bg-harbor px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-harbor-dark"
        >
          Grade this
        </button>
      )}

      {item.status === "submitted" && grading && (
        <form onSubmit={submitGrade} className="mt-3 space-y-2 border-t border-mist-light pt-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">Star rating</label>
            <StarPicker value={stars} onChange={setStars} />
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            placeholder="Remarks for the family (optional)"
            className="w-full resize-none rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
          />
          {error && <p className="text-xs text-coral-red">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-harbor px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save grade"}
            </button>
            <button
              type="button"
              onClick={onCancelGrade}
              className="rounded-lg border border-mist-light px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-chalk"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
