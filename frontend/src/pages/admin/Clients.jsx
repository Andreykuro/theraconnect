import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import ClientModal from "../../components/ClientModal";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [query, setQuery] = useState("");
  const [modalState, setModalState] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [clientsRes, therapistsRes] = await Promise.all([
      api.get("/clients"),
      api.get("/therapists"),
    ]);
    setClients(clientsRes.data);
    setTherapists(therapistsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.guardian_name.toLowerCase().includes(q) ||
        (c.therapist_name || "").toLowerCase().includes(q)
    );
  }, [clients, query]);

  return (
    <DashboardLayout
      title="Client roster"
      subtitle={`${clients.length} ${clients.length === 1 ? "client" : "clients"} on file`}
      actions={
        <button
          onClick={() => setModalState({ initial: null })}
          className="flex items-center gap-2 rounded-lg bg-sunrise px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
        >
          <Plus size={16} />
          Add client
        </button>
      }
    >
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-mist-light">
        <Search size={16} className="text-mist" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by child, guardian, or therapist…"
          className="w-full text-sm outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-light">
        <table className="w-full text-left text-sm">
          <thead className="bg-chalk text-xs uppercase tracking-wide text-mist">
            <tr>
              <th className="px-4 py-3 font-semibold">Child</th>
              <th className="px-4 py-3 font-semibold">Service</th>
              <th className="px-4 py-3 font-semibold">Therapist</th>
              <th className="px-4 py-3 font-semibold">Guardian</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-light">
            {!loading && filtered.map((c) => (
              <tr key={c.id} className="transition hover:bg-chalk">
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3 text-mist">{c.service_type}</td>
                <td className="px-4 py-3 text-mist">{c.therapist_name || "Unassigned"}</td>
                <td className="px-4 py-3 text-mist">{c.guardian_name}</td>
                <td className="px-4 py-3 font-mono text-xs text-mist">{c.guardian_phone}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setModalState({ initial: c })}
                    className="text-xs font-semibold text-harbor hover:text-harbor-dark"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-mist">
                  No clients match that search yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalState && (
        <ClientModal
          therapists={therapists}
          initial={modalState.initial}
          onClose={() => setModalState(null)}
          onSaved={() => {
            setModalState(null);
            load();
          }}
        />
      )}
    </DashboardLayout>
  );
}
