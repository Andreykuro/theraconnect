import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Check, FileImage, Loader2, ShieldCheck, X } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";

export default function Registrations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await api.get("/registrations");
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout
      title="Registrations"
      subtitle={`${rows.length} self-service ${rows.length === 1 ? "registration" : "registrations"} awaiting review`}
    >
      <div className="mx-auto max-w-4xl space-y-4">
        {loading && <p className="text-sm text-mist">Loading…</p>}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-14 text-center text-mist ring-1 ring-mist-light">
            <ShieldCheck size={22} />
            <p className="text-sm">Nothing waiting on you right now — all caught up.</p>
          </div>
        )}

        {rows.map((row) => (
          <RegistrationCard key={row.id} row={row} onDone={load} />
        ))}
      </div>
    </DashboardLayout>
  );
}

function RegistrationCard({ row, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function approve() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/registrations/${row.id}/approve`);
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't approve this registration.");
      setBusy(false);
    }
  }

  async function reject(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post(`/registrations/${row.id}/reject`, { reason });
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't reject this registration.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-mist-light">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-mist">
            {row.service_type} · requested {format(parseISO(row.created_at.replace(" ", "T")), "MMM d, yyyy")}
          </p>
          <h3 className="font-display text-lg font-semibold text-ink">{row.name}</h3>
          <p className="text-sm text-mist">
            {row.birthdate && `Born ${format(parseISO(row.birthdate), "MMMM d, yyyy")} · `}
            Guardian: {row.guardian_name} · {row.guardian_phone}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-chalk p-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-mist">Doctor's diagnosis</p>
        <p className="text-sm text-ink">{row.diagnosis}</p>
      </div>

      {row.notes && (
        <div className="mt-3 rounded-xl bg-chalk p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-mist">Additional notes</p>
          <p className="text-sm text-ink">{row.notes}</p>
        </div>
      )}

      {row.attachments.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mist">Attached photos</p>
          <div className="flex flex-wrap gap-2">
            {row.attachments.map((file) => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="group relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-mist-light transition hover:ring-harbor"
              >
                <img src={file.url} alt={file.original_name} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {row.attachments.length === 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-mist">
          <FileImage size={13} />
          No supporting photos were attached.
        </p>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-coral-red">{error}</p>}

      {!rejecting && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={approve}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-harbor px-4 py-2 text-sm font-semibold text-white transition hover:bg-harbor-dark disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Approve &amp; auto-assign therapist
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-coral-red/30 px-4 py-2 text-sm font-semibold text-coral-red transition hover:bg-coral-red-light disabled:opacity-50"
          >
            <X size={14} />
            Reject
          </button>
        </div>
      )}

      {rejecting && (
        <form onSubmit={reject} className="mt-5 space-y-2 border-t border-mist-light pt-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-mist">
            Reason for the family
          </label>
          <textarea
            required
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full resize-none rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            placeholder="e.g. The diagnosis note isn't specific enough - please ask your doctor for a formal report"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-coral-red px-4 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50"
            >
              {busy ? "Rejecting…" : "Confirm rejection"}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="rounded-lg border border-mist-light px-4 py-2 text-sm font-semibold text-ink hover:bg-chalk"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
