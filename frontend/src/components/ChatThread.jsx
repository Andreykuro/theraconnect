import { useState, useEffect, useRef, useCallback } from "react";
import { Check, Pencil, Send, Loader2, Trash2, X } from "lucide-react";
import { format, parseISO, isToday } from "date-fns";

const POLL_MS = 4000;

export default function ChatThread({ role, fetchThread, sendMessage, onEditMessage, onUnsendMessage, emptyLabel }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
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

  async function handleEditSave(messageId, newBody) {
    const trimmed = newBody.trim();
    if (!trimmed) return;
    try {
      const updated = await onEditMessage(messageId, trimmed);
      setMessages((m) => m.map((msg) => (msg.id === messageId ? updated : msg)));
      setEditingId(null);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't save that edit.");
    }
  }

  async function handleUnsend(messageId) {
    if (!confirm("Unsend this message? It will be removed for everyone in this conversation.")) return;
    try {
      const updated = await onUnsendMessage(messageId);
      setMessages((m) => m.map((msg) => (msg.id === messageId ? updated : msg)));
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't unsend that message.");
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
          <Bubble
            key={m.id}
            message={m}
            mine={m.sender_role === role}
            editable={Boolean(onEditMessage)}
            unsendable={Boolean(onUnsendMessage)}
            isEditing={editingId === m.id}
            onStartEdit={() => setEditingId(m.id)}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={(body) => handleEditSave(m.id, body)}
            onUnsend={() => handleUnsend(m.id)}
          />
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

function Bubble({
  message,
  mine,
  editable,
  unsendable,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onUnsend,
}) {
  const [draft, setDraft] = useState(message.body);
  const created = parseISO(message.created_at.replace(" ", "T"));
  const time = format(created, isToday(created) ? "h:mm a" : "MMM d, h:mm a");
  const isDeleted = Boolean(message.deleted_at);

  useEffect(() => {
    setDraft(message.body);
  }, [message.body]);

  if (isDeleted) {
    return (
      <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
        <div className="max-w-[75%] rounded-2xl bg-chalk px-3.5 py-2 text-sm italic text-mist ring-1 ring-mist-light">
          {mine ? "You unsent a message" : `${message.sender_name} unsent a message`}
        </div>
        <span className="mt-1 px-1 text-[10px] text-mist">{time}</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col items-end">
        <div className="w-full max-w-[75%] rounded-2xl bg-white p-2 ring-2 ring-harbor">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="w-full resize-none border-0 bg-transparent text-sm text-ink outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSaveEdit(draft);
              }
              if (e.key === "Escape") onCancelEdit();
            }}
          />
          <div className="mt-1 flex justify-end gap-1">
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label="Cancel edit"
              className="flex h-7 w-7 items-center justify-center rounded-full text-mist hover:bg-chalk"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={() => onSaveEdit(draft)}
              aria-label="Save edit"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-harbor text-white hover:bg-harbor-dark"
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div className={`flex items-center gap-1.5 ${mine ? "flex-row-reverse" : "flex-row"}`}>
        <div
          className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
            mine ? "bg-harbor text-white" : "bg-chalk text-ink ring-1 ring-mist-light"
          }`}
        >
          {message.body}
        </div>
        {mine && (editable || unsendable) && (
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {editable && (
              <button
                type="button"
                onClick={onStartEdit}
                aria-label="Edit message"
                className="flex h-6 w-6 items-center justify-center rounded-full text-mist hover:bg-chalk hover:text-ink"
              >
                <Pencil size={12} />
              </button>
            )}
            {unsendable && (
              <button
                type="button"
                onClick={onUnsend}
                aria-label="Unsend message"
                className="flex h-6 w-6 items-center justify-center rounded-full text-mist hover:bg-coral-red-light hover:text-coral-red"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      <span className="mt-1 px-1 text-[10px] text-mist">
        {mine ? "You" : message.sender_name} · {time}
        {message.edited_at && " · edited"}
      </span>
    </div>
  );
}
