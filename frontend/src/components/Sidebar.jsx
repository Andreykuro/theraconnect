import { NavLink } from "react-router-dom";
import { CalendarDays, Users, Megaphone, Bell, ClipboardList, Stethoscope, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = {
  admin: [
    { to: "/admin", label: "Schedule", icon: CalendarDays, end: true },
    { to: "/admin/clients", label: "Clients", icon: Users },
    { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { to: "/admin/notifications", label: "Notification log", icon: Bell },
  ],
  therapist: [{ to: "/therapist", label: "My schedule", icon: CalendarDays, end: true }],
  parent: [
    { to: "/parent", label: "My appointments", icon: CalendarDays, end: true },
    { to: "/parent/enrollment", label: "Enrollment", icon: ClipboardList },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const items = NAV[user.role] || [];

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-mist-light bg-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-harbor text-white">
          <Stethoscope size={18} />
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-none text-ink">TheraConnect</p>
          <p className="text-[11px] text-mist">TheraFun Intervention Centre</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-harbor-light text-harbor-dark"
                  : "text-mist hover:bg-chalk hover:text-ink"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-mist-light px-4 py-4">
        <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
        <p className="mb-3 text-xs capitalize text-mist">{user.role}</p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-mist transition hover:bg-chalk hover:text-coral-red"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}
