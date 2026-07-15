import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { format, parseISO, isToday } from "date-fns";

const POLL_MS = 4000;

export default function ChatThread({ role, fetchThread, sendMessage, emptyLabel }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await fetchThread();
        setMessages(data.messages);
        setError("");
      } catch (err) {
        setError(err.response?.data?.error || "Couldn't load messages.");
      } finally {
        setLoading(false);
      }
    },
    [fetchThread]
  );

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");
    try {
      const message = await sendMessage(body);
      setMessages((m) => [...m, message]);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Message didn't send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-light">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading && <p className="text-sm text-mist">Loading conversation…</p>}
        {!loading && messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-mist">{emptyLabel}</p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} message={m} mine={m.sender_role === role} />
        ))}
      </div>

      {error && (
        <p className="border-t border-mist-light bg-coral-red-light px-4 py-2 text-xs text-coral-red">
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-mist-light p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
        />
        <button
          type="submit"
          disabled={sending}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-harbor text-white transition hover:bg-harbor-dark disabled:opacity-50"
          aria-label="Send"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

function Bubble({ message, mine }) {
  const created = parseISO(message.created_at.replace(" ", "T"));
  const time = format(created, isToday(created) ? "h:mm a" : "MMM d, h:mm a");

  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
          mine ? "bg-harbor text-white" : "bg-chalk text-ink ring-1 ring-mist-light"
        }`}
      >
        {message.body}
      </div>
      <span className="mt-1 px-1 text-[10px] text-mist">
        {mine ? "You" : message.sender_name} · {time}
      </span>
    </div>
  );
}
