// One status pill for every appointment view (parent, therapist, admin).
// The wording changes a little depending on who is looking.
const STYLES = {
  requested: "bg-therafun-sky-light text-therafun-sky-dark",
  pending: "bg-amber-light text-[#8a5a00]",
  confirmed: "bg-harbor-light text-harbor-dark",
  cancelled: "bg-coral-red-light text-coral-red",
  completed: "bg-therafun-lime-light text-therafun-lime-dark",
};

const DOTS = {
  requested: "bg-therafun-sky",
  pending: "bg-amber",
  confirmed: "bg-harbor",
  cancelled: "bg-coral-red",
  completed: "bg-therafun-lime-dark",
};

const LABELS = {
  parent: {
    requested: "Waiting for clinic",
    pending: "Please confirm",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Done",
  },
  staff: {
    requested: "Request",
    pending: "Awaiting parent",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
  },
};

function statusLabel(status, viewer = "staff") {
  return (LABELS[viewer === "parent" ? "parent" : "staff"][status]) || status;
}

export default function StatusBadge({ status, viewer = "staff" }) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        STYLES[status] || STYLES.pending
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[status] || DOTS.pending}`} />
      {statusLabel(status, viewer)}
    </span>
  );
}
