const STYLES = {
  pending: "bg-amber-light text-amber border border-amber/30",
  confirmed: "bg-harbor-light text-harbor-dark border border-harbor/30",
  cancelled: "bg-coral-red-light text-coral-red border border-coral-red/30",
  completed: "bg-mist-light text-mist border border-mist/30",
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.pending;
  return (
    <span
      className={`stamp inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${style}`}
    >
      {status}
    </span>
  );
}
