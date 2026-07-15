import { useEffect, useState, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import ChatThread from "../../components/ChatThread";

export default function TherapistMessages() {
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadThreads = useCallback(async () => {
    const { data } = await api.get("/messages/threads");
    setThreads(data);
    setLoading(false);
    setSelected((current) => current ?? data[0]?.client_id ?? null);
  }, []);

  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, 6000);
    return () => clearInterval(id);
  }, [loadThreads]);

  const fetchThread = useCallback(async () => {
    const { data } = await api.get(`/messages/clients/${selected}`);
    return data;
  }, [selected]);

  const sendMessage = useCallback(
    async (body) => {
      const { data } = await api.post(`/messages/clients/${selected}`, { body });
      return data;
    },
    [selected]
  );

  return (
    <DashboardLayout title="Messages" subtitle="Chat with the families on your caseload">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="h-fit overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-light">
          {loading && <p className="p-4 text-sm text-mist">Loading…</p>}
          {!loading && threads.length === 0 && (
            <p className="p-4 text-sm text-mist">No clients assigned yet.</p>
          )}
          {threads.map((t) => (
            <button
              key={t.client_id}
              onClick={() => setSelected(t.client_id)}
              className={`flex w-full flex-col gap-0.5 border-b border-mist-light px-4 py-3 text-left transition last:border-b-0 hover:bg-chalk ${
                selected === t.client_id ? "bg-harbor-light" : ""
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-ink">{t.client_name}</span>
                {t.unread > 0 && (
                  <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-sunrise px-1.5 text-[10px] font-bold text-white">
                    {t.unread}
                  </span>
                )}
              </span>
              <span className="truncate text-xs text-mist">{t.last_message || "No messages yet"}</span>
            </button>
          ))}
        </div>

        {selected ? (
          <ChatThread
            key={selected}
            role="therapist"
            fetchThread={fetchThread}
            sendMessage={sendMessage}
            emptyLabel="No messages yet — send a note to this family."
          />
        ) : (
          !loading && (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-10 text-sm text-mist shadow-sm ring-1 ring-mist-light">
              <MessageCircle size={18} />
              Select a family to start chatting.
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
