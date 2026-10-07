import { useState } from "react";
import { Link } from "react-router-dom";
import {
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isPast,
  isToday,
  isTomorrow,
  parseISO,
} from "date-fns";
import {
  CalendarCheck2,
  CalendarX2,
  CheckCircle2,
  Clock3,
  Hourglass,
  Loader2,
  MessageCircle,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

// Shared appointment card for the parent and therapist portals.
//   viewer="parent"    -> shows the therapist; pending sessions get the attendance panel
//   viewer="therapist" -> shows the child and guardian; past sessions can be marked done
export default function SessionCard({ appt, viewer = "parent", onConfirm, onCantAttend, onComplete }) {
  const start = parseISO(appt.start_time);
  const end = parseISO(appt.end_time);
  const minutes = differenceInMinutes(end, start);
  const past = isPast(end);
  const started = isPast(start);
  const needsParent = viewer === "parent" && appt.status === "pending" && !started && onConfirm;

  return (
    <article
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:shadow-md ${
        needsParent ? "ring-amber/50" : "ring-mist-light"
      } ${appt.status === "cancelled" ? "opacity-70" : ""}`}
    >
      <div className="flex gap-4 p-4 sm:p-5">
        <DateTile date={start} color={appt.therapist_color} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold leading-snug text-ink">{appt.service_type}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mist">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={14} />
                  {format(start, "h:mm")} – {format(end, "h:mm a")}
                </span>
                <span className="text-mist-light">•</span>
                <span>{minutes >= 60 ? `${+(minutes / 60).toFixed(1)} hr` : `${minutes} min`}</span>
                <RelativeDay date={start} past={past} />
              </p>
            </div>
            <StatusBadge status={appt.status} viewer={viewer === "parent" ? "parent" : "staff"} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {viewer === "parent" ? (
              <Person
                color={appt.therapist_color}
                initials={initials(appt.therapist_name)}
                name={appt.therapist_name}
                sub={appt.therapist_specialty || "Therapist"}
              />
            ) : (
              <>
                <Person
                  color={appt.therapist_color}
                  initials={initials(appt.client_name)}
                  name={appt.client_name}
                  sub={appt.guardian_name ? `Guardian: ${appt.guardian_name}` : "Child"}
                />
                {viewer === "admin" && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-mist">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: appt.therapist_color }} />
                    {appt.therapist_name}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer
        appt={appt}
        viewer={viewer}
        past={past}
        started={started}
        onConfirm={onConfirm}
        onCantAttend={onCantAttend}
        onComplete={onComplete}
      />
    </article>
  );
}

function Footer({ appt, viewer, past, started, onConfirm, onCantAttend, onComplete }) {
  const [busy, setBusy] = useState(null); // "confirm" | "cant" | "complete"
  const [error, setError] = useState("");
  const [askReason, setAskReason] = useState(false);
  const [reason, setReason] = useState("");
  const child = appt.client_name?.split(" ")[0] || "your child";
  const start = parseISO(appt.start_time);

  async function run(kind, fn) {
    setBusy(kind);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  const errorLine = error && (
    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-coral-red">
      <TriangleAlert size={12} />
      {error}
    </p>
  );

  // ----- Parent -----
  if (viewer === "parent") {
    if (started && !past && appt.status !== "cancelled") {
      return (
        <FooterNote icon={Clock3} tone="sky">
          This session is happening now.
        </FooterNote>
      );
    }
    if (appt.status === "pending" && !started && onConfirm) {
      return (
        <div className="border-t border-amber/30 bg-amber-light/50 px-4 py-3.5 sm:px-5">
          {!askReason ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CalendarCheck2 size={18} className="mt-0.5 flex-shrink-0 text-[#8a5a00]" />
                <div>
                  <p className="text-sm font-semibold text-ink">Will {child} attend this session?</p>
                  <p className="text-xs text-mist">Please confirm so the clinic can keep this time for you.</p>
                </div>
              </div>
              <div className="flex gap-2">
                {onCantAttend && (
                  <button
                    onClick={() => setAskReason(true)}
                    disabled={Boolean(busy)}
                    className="rounded-lg border border-mist-light bg-white px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-chalk disabled:opacity-50"
                  >
                    Can't make it
                  </button>
                )}
                <button
                  onClick={() => run("confirm", () => onConfirm(appt))}
                  disabled={Boolean(busy)}
                  className="flex items-center gap-1.5 rounded-lg bg-harbor px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-harbor-dark disabled:opacity-60"
                >
                  {busy === "confirm" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Yes, we'll attend
                </button>
              </div>
            </div>
          ) : (
            <CantAttendForm
              reason={reason}
              setReason={setReason}
              busy={busy === "cant"}
              onBack={() => setAskReason(false)}
              onSend={() => run("cant", () => onCantAttend(appt, reason))}
            />
          )}
          {errorLine}
        </div>
      );
    }
    if (appt.status === "confirmed" && !started) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-mist-light bg-harbor-light/40 px-4 py-2.5 sm:px-5">
          <p className="flex items-center gap-2 text-xs font-semibold text-harbor-dark">
            <CheckCircle2 size={14} />
            Attendance confirmed · see you {isToday(start) ? "today" : format(start, "EEEE")} at {format(start, "h:mm a")}
          </p>
          {onCantAttend && !askReason && (
            <button onClick={() => setAskReason(true)} className="text-xs font-semibold text-mist hover:text-coral-red">
              Can't make it?
            </button>
          )}
          {askReason && (
            <div className="w-full pt-1">
              <CantAttendForm
                reason={reason}
                setReason={setReason}
                busy={busy === "cant"}
                onBack={() => setAskReason(false)}
                onSend={() => run("cant", () => onCantAttend(appt, reason))}
              />
            </div>
          )}
          {errorLine}
        </div>
      );
    }
    if (appt.status === "requested") {
      return (
        <FooterNote icon={Hourglass} tone="sky">
          Request sent. The clinic will review it and text you once it's approved.
        </FooterNote>
      );
    }
    return null;
  }

  // ----- Therapist / admin -----
  if ((appt.status === "pending" || appt.status === "confirmed") && past && onComplete) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-mist-light bg-chalk px-4 py-2.5 sm:px-5">
        <p className="flex items-center gap-2 text-xs text-mist">
          <TriangleAlert size={14} className="text-amber" />
          This session has ended. Mark it as done once it took place.
        </p>
        <button
          onClick={() => run("complete", () => onComplete(appt))}
          disabled={Boolean(busy)}
          className="flex items-center gap-1.5 rounded-lg bg-harbor px-3 py-1.5 text-xs font-semibold text-white hover:bg-harbor-dark disabled:opacity-60"
        >
          {busy === "complete" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          Mark as done
        </button>
        {errorLine}
      </div>
    );
  }
  if (appt.status === "pending" && !past) {
    return (
      <FooterNote icon={Hourglass} tone="amber">
        Waiting for the parent to confirm attendance.
      </FooterNote>
    );
  }
  if (appt.status === "confirmed" && !past) {
    return (
      <FooterNote icon={CheckCircle2} tone="harbor">
        Parent confirmed attendance.
      </FooterNote>
    );
  }
  if (appt.status === "cancelled" && appt.notes?.includes("Parent can't attend")) {
    return (
      <FooterNote icon={CalendarX2} tone="coral">
        {appt.notes.split("\n").find((line) => line.startsWith("Parent can't attend"))}
      </FooterNote>
    );
  }
  return null;
}

function CantAttendForm({ reason, setReason, busy, onBack, onSend }) {
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <CalendarX2 size={16} className="text-coral-red" />
        Let the clinic know you can't attend
      </p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
        placeholder="Reason (optional), e.g. Child has a fever"
        className="w-full rounded-lg border border-mist-light bg-white px-3 py-2 text-sm outline-none focus:border-harbor"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/parent/messages" className="inline-flex items-center gap-1.5 text-xs font-semibold text-harbor hover:text-harbor-dark">
          <MessageCircle size={13} />
          Want to reschedule? Message the clinic
        </Link>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            disabled={busy}
            className="rounded-lg border border-mist-light bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-chalk"
          >
            Back
          </button>
          <button
            onClick={onSend}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-coral-red px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Cancel this session
          </button>
        </div>
      </div>
    </div>
  );
}

const TONES = {
  amber: "bg-amber-light/40 text-[#8a5a00]",
  harbor: "bg-harbor-light/40 text-harbor-dark",
  sky: "bg-therafun-sky-light/60 text-therafun-sky-dark",
  coral: "bg-coral-red-light/60 text-coral-red",
};

function FooterNote({ icon: Icon, tone, children }) {
  return (
    <p className={`flex items-center gap-2 border-t border-mist-light px-4 py-2.5 text-xs font-semibold sm:px-5 ${TONES[tone]}`}>
      <Icon size={14} className="flex-shrink-0" />
      {children}
    </p>
  );
}

function DateTile({ date, color }) {
  return (
    <div className="flex w-[60px] flex-shrink-0 flex-col overflow-hidden rounded-xl text-center ring-1 ring-mist-light">
      <span
        className="py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: color || "var(--color-harbor)" }}
      >
        {format(date, "MMM")}
      </span>
      <span className="pt-1 font-display text-2xl font-semibold leading-none text-ink">{format(date, "d")}</span>
      <span className="pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-mist">{format(date, "EEE")}</span>
    </div>
  );
}

function RelativeDay({ date, past }) {
  let label = null;
  let cls = "bg-chalk text-mist";
  if (isToday(date)) {
    label = past ? "Earlier today" : "Today";
    cls = "bg-sunrise-light text-sunrise";
  } else if (isTomorrow(date)) {
    label = "Tomorrow";
    cls = "bg-harbor-light text-harbor-dark";
  } else if (!past) {
    const days = differenceInCalendarDays(date, new Date());
    if (days <= 7) label = `In ${days} days`;
  }
  if (!label) return null;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function Person({ color, initials: text, name, sub }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ backgroundColor: color || "var(--color-harbor)" }}
      >
        {text || <UserRound size={14} />}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-semibold text-ink">{name}</span>
        <span className="block truncate text-xs text-mist">{sub}</span>
      </span>
    </span>
  );
}

function initials(name = "") {
  const words = name.replace(/^(Therapist|Coach|Teacher)\s+/i, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return ((words[0][0] || "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}
