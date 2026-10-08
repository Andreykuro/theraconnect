import { useEffect, useState, useCallback } from "react";
import { MessageCircle, Search } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import ChatThread from "../../components/ChatThread";

function toFormData(body, file) {
  const fd = new FormData();
  fd.append("body", body || "");
  fd.append("image", file);
  return fd;
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

// "3:45 PM" today, "Mon" this week, otherwise "Oct 2".
function shortTime(value) {
  const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (now - d < 6 * 864e5) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function TherapistMessages() {
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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

  const visibleThreads = threads.filter((t) =>
    t.client_name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const fetchThread = useCallback(async () => {
    const { data } = await api.get(`/messages/clients/${selected}`);
    window.dispatchEvent(new Event("tc:messages-read")); // refresh the sidebar badge
    return data;
  }, [selected]);

  const sendMessage = useCallback(
    async (body, file) => {
      // Photo -> multipart form; text only -> plain JSON like before
      const payload = file ? toFormData(body, file) : { body };
      const { data } = await api.post(`/messages/clients/${selected}`, payload);
      return data;
    },
    [selected]
  );

  const editMessage = useCallback(async (messageId, body) => {
    const { data } = await api.patch(`/messages/${messageId}`, { body });
    return data;
  }, []);

  const unsendMessage = useCallback(async (messageId) => {
    const { data } = await api.delete(`/messages/${messageId}`);
    return data;
  }, []);

  return (
    <DashboardLayout hideChatbot title="Messages" subtitle="Chat with the families on your caseload">
      <div className="grid h-[calc(100dvh-8.5rem)] min-h-[540px] grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-mist-light">
          <div className="border-b border-mist-light p-3">
            <div className="flex items-center gap-2 rounded-full bg-chalk px-3 py-2 ring-1 ring-mist-light">
              <Search size={15} className="text-mist" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search families"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loading && <p className="p-4 text-sm text-mist">Loading…</p>}
            {!loading && threads.length === 0 && <p className="p-4 text-sm text-mist">No clients assigned yet.</p>}
            {visibleThreads.map((t) => {
              const active = selected === t.client_id;
              return (
                <button
                  key={t.client_id}
                  onClick={() => setSelected(t.client_id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    active ? "bg-harbor-light" : "hover:bg-chalk"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      active ? "bg-harbor text-white" : "bg-harbor-light text-harbor-dark"
                    }`}
                  >
                    {initials(t.client_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${t.unread > 0 ? "font-bold" : "font-semibold"} text-ink`}>
                        {t.client_name}
                      </span>
                      {t.last_at && (
                        <span className="flex-shrink-0 text-[11px] text-mist">{shortTime(t.last_at)}</span>
                      )}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-xs ${t.unread > 0 ? "font-semibold text-ink" : "text-mist"}`}>
                        {t.last_message ? `${t.last_sender === "therapist" ? "You: " : ""}${t.last_message}` : "No messages yet"}
                      </span>
                      {t.unread > 0 && (
                        <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-coral-red px-1.5 text-[10px] font-bold text-white">
                          {t.unread > 9 ? "9+" : t.unread}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-mist/80">{t.service_type}</span>
                  </span>
                </button>
              );
            })}
            {!loading && threads.length > 0 && visibleThreads.length === 0 && (
              <p className="p-4 text-sm text-mist">No family matches that search.</p>
            )}
          </div>
        </aside>

        {selected ? (
          <ChatThread
            key={selected}
            role="therapist"
            fetchThread={fetchThread}
            sendMessage={sendMessage}
            onEditMessage={editMessage}
            onUnsendMessage={unsendMessage}
            emptyLabel="No messages yet — send a note to this family."
            detailsClass="hidden 2xl:flex"
          />
        ) : (
          !loading && (
            <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-10 text-sm text-mist shadow-sm ring-1 ring-mist-light">
              <MessageCircle size={18} />
              Select a family to start chatting.
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
