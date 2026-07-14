import { format, parseISO } from "date-fns";
import StatusBadge from "./StatusBadge";

export default function SessionCard({ appt, onConfirm, onCancel, onEdit, showChild = true }) {
  const start = parseISO(appt.start_time);
  const end = parseISO(appt.end_time);

  return (
    <div className="session-card flex gap-4 rounded-xl bg-white p-4 pl-6 shadow-sm ring-1 ring-mist-light">
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
          <StatusBadge status={appt.status} />
        </div>

        <p className="font-mono text-xs text-mist">
          {format(start, "h:mm a")} – {format(end, "h:mm a")}
        </p>

        {(onConfirm || onCancel || onEdit) && (
          <div className="mt-2 flex gap-2">
            {onConfirm && appt.status === "pending" && (
              <button
                onClick={() => onConfirm(appt)}
                className="rounded-lg bg-harbor px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-harbor-dark"
              >
                Confirm attendance
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
      </div>
    </div>
  );
}
