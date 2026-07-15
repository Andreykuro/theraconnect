import { AlertTriangle, CircleDashed, Minus, TrendingUp } from "lucide-react";

const TREND = {
  improving: { label: "Improving", icon: TrendingUp, className: "bg-harbor-light text-harbor-dark" },
  stable: { label: "Stable", icon: Minus, className: "bg-amber-light text-amber" },
  "needs-review": {
    label: "Review suggested",
    icon: AlertTriangle,
    className: "bg-coral-red-light text-coral-red",
  },
  "insufficient-data": {
    label: "Collecting data",
    icon: CircleDashed,
    className: "bg-chalk text-mist",
  },
};

export default function ProgressGoalCard({ goal, compact = false }) {
  const trend = TREND[goal.trend] || TREND["insufficient-data"];
  const TrendIcon = trend.icon;
  const progress = goal.progress_percent ?? 0;

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink">{goal.title}</p>
          {!compact && goal.description && <p className="mt-1 text-sm text-mist">{goal.description}</p>}
        </div>
        <span className={`flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${trend.className}`}>
          <TrendIcon size={12} />
          {trend.label}
        </span>
      </div>

      <div className="mb-2 flex items-end justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-mist">Goal progress</p>
        <p className="font-mono text-lg font-semibold text-harbor-dark">
          {goal.progress_percent === null ? "—" : `${Math.round(goal.progress_percent)}%`}
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-mist-light">
        <div
          className="h-full rounded-full bg-gradient-to-r from-harbor to-sunrise transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric label="Baseline" value={`${goal.baseline} ${goal.unit}`} />
        <Metric
          label="Current"
          value={goal.current_value === null ? "No data" : `${goal.current_value} ${goal.unit}`}
          emphasized
        />
        <Metric label="Target" value={`${goal.target} ${goal.unit}`} />
      </div>

      {!compact && goal.measurements?.length > 0 && (
        <p className="mt-3 border-t border-mist-light pt-3 text-xs text-mist">
          Based on {goal.measurements.length} recorded measurement{goal.measurements.length === 1 ? "" : "s"}.
          Scores are calculated from the therapist-approved baseline and target.
        </p>
      )}
    </article>
  );
}

function Metric({ label, value, emphasized = false }) {
  return (
    <div className="rounded-lg bg-chalk px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-mist">{label}</p>
      <p className={`mt-0.5 truncate text-xs font-semibold ${emphasized ? "text-harbor-dark" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
