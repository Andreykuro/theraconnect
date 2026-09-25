import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function SessionCard({ appt, onConfirm, onCancel, onEdit, showChild = true }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const start = parseISO(appt.start_time);
  const end = parseISO(appt.end_time);
  // "Kailangan ng aksyon" lang kung may confirm handler talaga tayo (parent
  // view) at pending pa - wag ma-highlight sa admin/therapist na read-only.
  const needsAttention = Boolean(onConfirm) && appt.status === "pending";

  async function handleConfirmClick() {
    setConfirming(true);
    setConfirmError("");
    try {
      await onConfirm(appt);
      // Wag mag-setConfirming(false) dito sa success path - normally
      // mag-re-render na ang parent na may bagong status (di na 'pending'),
      // kaya mawawala na rin ang button na 'to. Kung sakaling hindi
      // nag-re-render agad ang parent, may fallback pa rin sa finally.
    } catch (err) {
      setConfirmError(err.response?.data?.error || "Couldn't confirm just now. Please try again.");
      setConfirming(false);
    }
  }

  return (
    <div
      className={`session-card flex gap-4 rounded-xl bg-white p-4 pl-6 shadow-sm ring-1 transition ${
        needsAttention ? "border-l-4 border-l-sunrise pl-5 ring-sunrise/30" : "ring-mist-light"
      }`}
    >
      <div className="flex w-16 flex-shrink-0 flex-col items-center justify-center border-r border-dashed border-mist-light pr-4 font-mono text-harbor-dark">
        <span className="text-[11px] uppercase tracking-wide text-mist">
          {format(start, "EEE")}
        </span>
        <span className="text-lg font-semibold leading-none">{format(start, "d")}</span>
        <span className="text-[10px] text-mist">{format(start, "MMM")}</span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-base font-semibold text-ink">
              {appt.service_type}
            </p>
            {showChild && (
              <p className="text-sm text-mist">
                {appt.client_name} · with {appt.therapist_name}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1">
            <StatusBadge status={appt.status} />
            {needsAttention && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-sunrise">
                Action needed
              </span>
            )}
          </div>
        </div>

        <p className="font-mono text-xs text-mist">
          {format(start, "h:mm a")} – {format(end, "h:mm a")}
        </p>

        {(onConfirm || onCancel || onEdit) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {onConfirm && appt.status === "pending" && (
              <button
                onClick={handleConfirmClick}
                disabled={confirming}
                className="flex items-center gap-1.5 rounded-lg bg-harbor px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-harbor-dark disabled:cursor-wait disabled:opacity-70"
              >
                {confirming ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Confirming…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    Confirm attendance
                  </>
                )}
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(appt)}
                className="rounded-lg border border-mist-light px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-chalk"
              >
                Edit
              </button>
            )}
            {onCancel && appt.status !== "cancelled" && (
              <button
                onClick={() => onCancel(appt)}
                className="rounded-lg border border-coral-red/30 px-3 py-1.5 text-xs font-semibold text-coral-red transition hover:bg-coral-red-light"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {confirmError && (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-coral-red">
            <TriangleAlert size={12} />
            {confirmError}
          </p>
        )}
      </div>
    </div>
  );
}
