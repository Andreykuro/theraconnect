import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  CalendarDays,
  ClipboardList,
  Home,
  LogOut,
  Megaphone,
  MessageCircle,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";

const NAV = {
  admin: [
    { to: "/admin", label: "Schedule", icon: CalendarDays, end: true },
    { to: "/admin/clients", label: "Clients", icon: Users },
    { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { to: "/admin/notifications", label: "Notification log", icon: Bell },
    { to: "/admin/automation", label: "Automation center", icon: BrainCircuit },
  ],
  therapist: [
    { to: "/therapist", label: "My schedule", icon: CalendarDays, end: true },
    { to: "/therapist/progress", label: "Progress & notes", icon: BarChart3 },
    { to: "/therapist/classwork", label: "Classwork", icon: ClipboardList },
    { to: "/therapist/messages", label: "Messages", icon: MessageCircle },
  ],
  parent: [
    { to: "/parent", label: "Home", icon: Home, end: true },
    { to: "/parent/appointments", label: "Appointments", icon: CalendarDays },
    { to: "/parent/progress", label: "Child progress", icon: BarChart3 },
    { to: "/parent/classwork", label: "Classwork", icon: ClipboardList },
    { to: "/parent/messages", label: "Messages", icon: MessageCircle },
    { to: "/parent/enrollment", label: "Enrollment", icon: ClipboardList },
  ],
};

export default function Sidebar({ onNavigate, onClose }) {
  const { user, logout } = useAuth();
  const items = NAV[user.role] || [];

  return (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col border-r border-mist-light bg-white lg:w-64">
      <div className="border-b border-mist-light px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <BrandLogo eager className="h-[78px] w-auto max-w-[182px]" />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-mist transition hover:bg-harbor-light hover:text-harbor lg:hidden"
            >
              <X size={19} />
            </button>
          )}
        </div>
        <div className="-mt-1 flex items-center justify-between rounded-xl bg-harbor-light px-3 py-2">
          <div>
            <p className="text-xs font-bold text-harbor-dark">TheraConnect portal</p>
            <p className="text-[10px] text-mist">Care management workspace</p>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-harbor shadow-sm">
            {user.role}
          </span>
        </div>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-harbor text-white shadow-sm"
                  : "text-mist hover:bg-harbor-light hover:text-harbor-dark"
              }`
            }
          >
            <Icon size={18} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-mist-light bg-chalk/70 px-4 py-4">
        <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
        <p className="mb-3 text-xs text-mist">Signed in securely</p>
        <button
          onClick={() => {
            logout();
            onClose?.();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-mist transition hover:bg-coral-red-light hover:text-coral-red"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}
