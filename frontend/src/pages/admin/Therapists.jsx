import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, KeyRound, Mail, Phone, Plus, Search, Users } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import TherapistModal from "../../components/TherapistModal";

export default function Therapists() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(null); // null | { initial }
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/therapists", { params: { all: 1 } });
      setTherapists(data);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't load therapists.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return therapists.filter(
      (t) =>
        (showInactive || t.active) &&
        (!q || t.name.toLowerCase().includes(q) || t.specialty.toLowerCase().includes(q))
    );
  }, [therapists, query, showInactive]);

  const activeCount = therapists.filter((t) => t.active).length;

  async function toggleActive(t) {
    setBusyId(t.id);
    setError("");
    try {
      await api.put(`/therapists/${t.id}`, { active: !t.active });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't update this therapist.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardLayout
      title="Therapists"
      subtitle={`${activeCount} active ${activeCount === 1 ? "therapist" : "therapists"}`}
      actions={
        <button
          onClick={() => setModal({ initial: null })}
          className="flex items-center gap-2 rounded-lg bg-sunrise px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
        >
          <Plus size={16} />
          Add therapist
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-mist-light">
          <Search size={16} className="text-mist" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or specialty…"
            className="w-full text-sm outline-none"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-mist">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 accent-harbor"
          />
          Show deactivated
        </label>
      </div>

      {error && <p className="mb-4 rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>}
      {loading && <p className="text-sm text-mist">Loading…</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((t) => (
          <article
            key={t.id}
            className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light ${
              t.active ? "" : "opacity-60"
            }`}
          >
            <span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: t.color }} />
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-display text-base font-semibold text-white"
                style={{ backgroundColor: t.color }}
              >
                {initials(t.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-mist">{t.specialty}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  t.active ? "bg-harbor-light text-harbor-dark" : "bg-chalk text-mist"
                }`}
              >
                {t.active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat icon={Users} label="Children" value={t.caseload} />
              <Stat icon={CalendarClock} label="Upcoming sessions" value={t.upcoming_sessions} />
            </div>

            <ul className="mt-4 space-y-1.5 text-xs text-mist">
              <li className="flex items-center gap-2">
                <Phone size={13} /> {t.phone || "No mobile number"}
              </li>
              <li className="flex items-center gap-2 truncate">
                <Mail size={13} /> {t.email || "No email"}
              </li>
              <li className="flex items-center gap-2">
                <KeyRound size={13} />
                {t.has_login ? (
                  <span>
                    Can log in as <span className="font-mono text-ink">{t.login_email}</span>
                  </span>
                ) : (
                  <span className="text-amber">No login account</span>
                )}
              </li>
            </ul>

            <div className="mt-4 flex gap-2 border-t border-mist-light pt-3">
              <button
                onClick={() => setModal({ initial: t })}
                className="rounded-lg border border-mist-light px-3 py-1.5 text-xs font-semibold text-ink hover:bg-chalk"
              >
                Edit
              </button>
              <button
                onClick={() => toggleActive(t)}
                disabled={busyId === t.id}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  t.active
                    ? "border border-coral-red/30 text-coral-red hover:bg-coral-red-light"
                    : "bg-harbor text-white hover:bg-harbor-dark"
                }`}
              >
                {t.active ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {!loading && visible.length === 0 && (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-mist ring-1 ring-mist-light">
          No therapists match that search.
        </p>
      )}

      {modal && (
        <TherapistModal
          initial={modal.initial}
          usedColors={therapists.map((t) => t.color.toLowerCase())}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </DashboardLayout>
  );
}

function initials(name) {
  const words = name.replace(/^(Therapist|Coach|Teacher)\s+/i, "").split(/\s+/).filter(Boolean);
  return (words[0]?.[0] || "") + (words[words.length - 1]?.[0] || "");
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-chalk px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-mist">
        <Icon size={12} /> {label}
      </p>
      <p className="mt-0.5 font-mono text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
