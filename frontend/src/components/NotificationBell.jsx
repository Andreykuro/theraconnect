import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Bell,
  CalendarCheck,
  ClipboardList,
  Megaphone,
  MessageCircle,
  TrendingDown,
} from "lucide-react";
import api from "../lib/api";

// Bawat notification "type" (galing sa /dashboard/home) may sariling icon at
// badge color - kailangang literal ang class names dito (hindi ${}-built)
// para makita ito ng Tailwind sa build time.
const TYPE_ICON = {
  confirm: CalendarCheck,
  message: MessageCircle,
  progress: TrendingDown,
  announcement: Megaphone,
  documentation: ClipboardList,
  schedule: ClipboardList,
};

const BADGE_BG = {
  high: "bg-coral-red-light",
  medium: "bg-sunrise-light",
  low: "bg-mist-light",
};

const DOT_BG = {
  high: "bg-coral-red",
  medium: "bg-sunrise",
  low: "bg-mist",
};

// Gaano kadalas mag-refresh ang bell sa background (1 minuto) - sapat na para
// "buhay" ang panel nang hindi sinasabayan ng sobrang dalas na request.
const POLL_MS = 60000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/dashboard/home");
      setItems(data.notifications || []);
    } catch {
      // Tahimik lang mag-fail ang background refresh - wag i-abala ang user
      // ng error banner para lang sa notification bell.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function onClickOutside(event) {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const highCount = items.filter((item) => item.priority === "high").length;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-mist transition hover:bg-harbor-light hover:text-harbor"
      >
        <Bell size={19} />
        {items.length > 0 && (
          <span
            className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
              highCount > 0 ? "bg-coral-red" : "bg-sunrise"
            }`}
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-mist-light">
          <div className="border-b border-mist-light px-4 py-3">
            <p className="font-display text-sm font-bold text-ink">Notifications</p>
            <p className="text-xs text-mist">
              {items.length === 0
                ? "You're all caught up"
                : `${items.length} thing${items.length === 1 ? "" : "s"} need a look`}
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="px-4 py-6 text-center text-sm text-mist">Loading…</p>}
            {!loading && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-mist">Nothing new right now.</p>
            )}
            {items.map((item) => {
              const Icon = TYPE_ICON[item.type] || Bell;
              return (
                <NavLink
                  key={item.id}
                  to={item.link || "#"}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 border-b border-mist-light/70 px-4 py-3 text-left text-sm transition last:border-0 hover:bg-chalk"
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${BADGE_BG[item.priority]}`}
                  >
                    <Icon size={14} className="text-ink" />
                    <span className={`sr-only`}>{item.priority} priority</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-ink">{item.message}</span>
                    {item.created_at && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-mist">
                        <span className={`h-1.5 w-1.5 rounded-full ${DOT_BG[item.priority]}`} />
                        {formatDistanceToNowStrict(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
