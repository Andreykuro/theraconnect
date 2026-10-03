import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Ban,
  Check,
  Copy,
  ImagePlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { format, parseISO, isToday, isYesterday, isSameDay, differenceInMinutes } from "date-fns";
import api from "../lib/api";

const POLL_MS = 4000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const GROUP_WINDOW_MIN = 5;

// Photos are behind auth, so <img src="/api/..."> can't load them directly
// (no Bearer token). Fetch once as a blob and reuse the object URL.
const imageCache = new Map();

function toDate(s) {
  return parseISO(s.replace(" ", "T"));
}

function dayLabel(d) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export default function ChatThread({ role, fetchThread, sendMessage, onEditMessage, onUnsendMessage, emptyLabel }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const textRef = useRef(null);
  const prevCount = useRef(0);
  const forceScroll = useRef(true);
  const pinned = useRef(true); // is the reader at (or near) the newest message?

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

  // Only follow new messages if the reader is already near the bottom (or
  // just sent one) - polling shouldn't yank them away from older messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > prevCount.current;
    if (forceScroll.current || (grew && pinned.current)) {
      el.scrollTo({ top: el.scrollHeight, behavior: forceScroll.current ? "auto" : "smooth" });
      if (messages.length > 0) forceScroll.current = false;
    }
    prevCount.current = messages.length;
  }, [messages]);

  // A photo finishing loading makes the thread taller - stay pinned to the bottom
  const handleImageLoad = useCallback(() => {
    const el = scrollRef.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, []);

  // Close the ⋯ menu on outside click / Escape
  useEffect(() => {
    if (menuId == null) return;
    const close = (e) => {
      if (e.type === "keydown" && e.key !== "Escape") return;
      if (e.type === "mousedown" && e.target.closest?.("[data-msg-menu]")) return;
      setMenuId(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuId]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  // Auto-grow the composer up to ~5 lines
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  function pickFile(f) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Only photos can be attached.");
    if (f.size > MAX_IMAGE_BYTES) return setError("That photo is too large (max 8MB).");
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSend(e) {
    e?.preventDefault();
    const body = input.trim();
    if ((!body && !file) || sending) return;
    setSending(true);
    try {
      const message = await sendMessage(body, file);
      // Show the photo instantly from the local copy instead of re-downloading it
      if (file && message.has_image) imageCache.set(message.id, URL.createObjectURL(file));
      forceScroll.current = true;
      setMessages((m) => [...m, message]);
      setInput("");
      clearFile();
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Message didn't send. Please try again.");
    } finally {
      setSending(false);
      textRef.current?.focus();
    }
  }

  async function handleEditSave(messageId, newBody, hasImage) {
    const trimmed = newBody.trim();
    if (!trimmed && !hasImage) return;
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
    setMenuId(null);
    if (!confirm("Unsend this message? It will be removed for everyone in this conversation.")) return;
    try {
      const updated = await onUnsendMessage(messageId);
      imageCache.delete(messageId);
      setMessages((m) => m.map((msg) => (msg.id === messageId ? updated : msg)));
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't unsend that message.");
    }
  }

  async function handleCopy(text) {
    setMenuId(null);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Couldn't copy - your browser blocked clipboard access.");
    }
  }

  // The last message I sent that the other side has read gets a "Seen" tag
  const lastMineIdx = messages.reduce((acc, m, i) => (m.sender_role === role && !m.deleted_at ? i : acc), -1);

  return (
    <div className="flex h-[72vh] flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-mist-light">
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
        }}
        className="flex-1 overflow-y-auto bg-chalk px-3 py-5 sm:px-5"
        style={{
          backgroundImage: "radial-gradient(var(--color-mist-light) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {loading && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-mist">
            <Loader2 size={16} className="animate-spin" /> Loading conversation…
          </p>
        )}
        {!loading && messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-xs rounded-2xl bg-white px-5 py-4 text-center text-sm text-mist shadow-sm">
            {emptyLabel}
          </div>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const d = toDate(m.created_at);
          const newDay = !prev || !isSameDay(toDate(prev.created_at), d);
          const sameAsPrev =
            prev && !newDay && prev.sender_id === m.sender_id &&
            differenceInMinutes(d, toDate(prev.created_at)) < GROUP_WINDOW_MIN;
          const sameAsNext =
            next && next.sender_id === m.sender_id && isSameDay(toDate(next.created_at), d) &&
            differenceInMinutes(toDate(next.created_at), d) < GROUP_WINDOW_MIN;

          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-4 flex items-center justify-center">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-mist shadow-sm ring-1 ring-mist-light">
                    {dayLabel(d)}
                  </span>
                </div>
              )}
              <Bubble
                message={m}
                mine={m.sender_role === role}
                firstInGroup={!sameAsPrev}
                lastInGroup={!sameAsNext}
                seen={i === lastMineIdx && Boolean(m.read_at)}
                editable={Boolean(onEditMessage)}
                unsendable={Boolean(onUnsendMessage)}
                isEditing={editingId === m.id}
                menuOpen={menuId === m.id}
                onToggleMenu={() => setMenuId((cur) => (cur === m.id ? null : m.id))}
                onStartEdit={() => {
                  setMenuId(null);
                  setEditingId(m.id);
                }}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={(body) => handleEditSave(m.id, body, m.has_image)}
                onUnsend={() => handleUnsend(m.id)}
                onCopy={() => handleCopy(m.body)}
                onOpenImage={setLightbox}
                onImageLoad={handleImageLoad}
                scrollRef={scrollRef}
              />
            </div>
          );
        })}
      </div>

      {error && (
        <p className="flex items-center justify-between gap-2 border-t border-coral-red/20 bg-coral-red-light px-4 py-2 text-xs text-coral-red">
          {error}
          <button type="button" onClick={() => setError("")} aria-label="Dismiss" className="rounded-full p-1 hover:bg-white/60">
            <X size={12} />
          </button>
        </p>
      )}

      <form onSubmit={handleSend} className="border-t border-mist-light bg-white p-3">
        {preview && (
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-chalk p-2 ring-1 ring-mist-light">
            <img src={preview} alt="Selected photo" className="h-16 w-16 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{file?.name}</p>
              <p className="text-xs text-mist">{(file.size / 1024 / 1024).toFixed(1)} MB · add a caption or just send</p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              aria-label="Remove photo"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-mist transition hover:bg-white hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach a photo"
            title="Attach a photo"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-harbor transition hover:bg-harbor-light"
          >
            <ImagePlus size={20} />
          </button>
          <textarea
            ref={textRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onPaste={(e) => {
              const img = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
              if (img) {
                e.preventDefault();
                pickFile(img);
              }
            }}
            placeholder="Type a message…"
            aria-label="Message"
            className="max-h-[140px] min-h-11 flex-1 resize-none rounded-3xl bg-chalk px-4 py-2.5 text-sm leading-6 text-ink outline-none ring-1 ring-mist-light transition placeholder:text-mist focus:bg-white focus:ring-2 focus:ring-harbor/40"
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !file)}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-harbor to-harbor-dark text-white shadow-[0_6px_16px_-6px_rgba(111,44,145,0.7)] transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
            aria-label="Send"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
          </button>
        </div>
        <p className="mt-1.5 hidden pl-14 text-[11px] text-mist sm:block">
          Enter to send · Shift+Enter for a new line · paste a photo to attach it
        </p>
      </form>

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// Speech-bubble tail - a curved "horn" hugging the bubble's bottom corner
function Tail({ mine }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 18"
      className={`absolute bottom-0 h-[18px] w-3 ${mine ? "-right-[7px] text-harbor-dark" : "-left-[7px] -scale-x-100 text-white"}`}
    >
      <path d="M0 0 C0.5 9 4 14.5 12 18 H0 Z" fill="currentColor" />
    </svg>
  );
}

function ChatImage({ messageId, onOpen, onLoad }) {
  const [src, setSrc] = useState(() => imageCache.get(messageId) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (src) return;
    let cancelled = false;
    api
      .get(`/messages/${messageId}/image`, { responseType: "blob" })
      .then(({ data }) => {
        const url = URL.createObjectURL(data);
        imageCache.set(messageId, url);
        if (!cancelled) setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [messageId, src]);

  if (failed) {
    return <div className="flex h-32 w-52 items-center justify-center rounded-xl bg-chalk text-xs text-mist">Photo unavailable</div>;
  }
  if (!src) {
    return (
      <div className="flex h-44 w-56 items-center justify-center rounded-xl bg-black/5">
        <Loader2 size={18} className="animate-spin opacity-60" />
      </div>
    );
  }
  return (
    <button type="button" onClick={() => onOpen(src)} className="block overflow-hidden rounded-xl" aria-label="View photo">
      <img src={src} alt="Shared photo" onLoad={onLoad} className="max-h-72 w-full max-w-[16rem] object-cover transition hover:scale-[1.02]" />
    </button>
  );
}

function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt="Shared photo, full size"
        className="max-h-[88vh] max-w-full rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

function Bubble({
  message,
  mine,
  firstInGroup,
  lastInGroup,
  seen,
  editable,
  unsendable,
  isEditing,
  menuOpen,
  onToggleMenu,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onUnsend,
  onCopy,
  onOpenImage,
  onImageLoad,
  scrollRef,
}) {
  const [draft, setDraft] = useState(message.body);
  const [openDown, setOpenDown] = useState(false);
  const menuRef = useRef(null);

  // Open the menu downward when the bubble is near the top of the thread,
  // otherwise it would be clipped by the scroll area.
  function toggleMenu() {
    if (!menuOpen && menuRef.current && scrollRef?.current) {
      const top = menuRef.current.getBoundingClientRect().top - scrollRef.current.getBoundingClientRect().top;
      setOpenDown(top < 170);
    }
    onToggleMenu();
  }
  const created = toDate(message.created_at);
  const time = format(created, "h:mm a");
  const isDeleted = Boolean(message.deleted_at);
  const hasText = Boolean(message.body);
  const hasMenu = !isDeleted && (hasText || (mine && (editable || unsendable)));

  useEffect(() => {
    setDraft(message.body);
  }, [message.body]);

  const spacing = firstInGroup ? "mt-4" : "mt-1";
  const row = `flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"} ${spacing}`;

  // Avatar column for the other person - only drawn on the last bubble of a group
  const avatar = !mine && (
    <div className="w-8 flex-shrink-0">
      {lastInGroup && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-therafun-sky-light text-[11px] font-bold text-therafun-sky-dark ring-2 ring-white">
          {initials(message.sender_name)}
        </div>
      )}
    </div>
  );

  if (isDeleted) {
    return (
      <div className={row}>
        {avatar}
        <div className="flex max-w-[78%] flex-col">
          <div className="flex items-center gap-1.5 rounded-[1.25rem] border border-dashed border-mist/40 bg-white/70 px-3.5 py-2 text-sm italic text-mist">
            <Ban size={13} />
            {mine ? "You unsent a message" : `${message.sender_name} unsent a message`}
          </div>
          {lastInGroup && <Meta mine={mine} time={time} />}
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={`flex justify-end ${spacing}`}>
        <div className="w-full max-w-[78%] rounded-[1.25rem] bg-white p-2.5 shadow-md ring-2 ring-harbor/50">
          <p className="mb-1 flex items-center gap-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-harbor">
            <Pencil size={11} /> Editing message
          </p>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder={message.has_image ? "Caption (optional)" : ""}
            className="w-full resize-none rounded-xl bg-chalk px-3 py-2 text-sm text-ink outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSaveEdit(draft);
              }
              if (e.key === "Escape") onCancelEdit();
            }}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label="Cancel edit"
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-mist transition hover:bg-chalk hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSaveEdit(draft)}
              aria-label="Save edit"
              className="flex items-center gap-1 rounded-full bg-harbor px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-harbor-dark"
            >
              <Check size={13} /> Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shape = mine
    ? `rounded-[1.25rem] ${lastInGroup ? "rounded-br-[6px]" : ""} ${!firstInGroup ? "rounded-tr-[8px]" : ""}`
    : `rounded-[1.25rem] ${lastInGroup ? "rounded-bl-[6px]" : ""} ${!firstInGroup ? "rounded-tl-[8px]" : ""}`;
  const skin = mine
    ? "bg-gradient-to-br from-harbor to-harbor-dark text-white"
    : "bg-white text-ink shadow-[0_1px_2px_rgba(45,41,56,0.08)]";

  return (
    <div className={row}>
      {avatar}
      <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
        {!mine && firstInGroup && (
          <span className="mb-1 px-1 text-[11px] font-semibold text-mist">{message.sender_name}</span>
        )}

        <div className={`group/bubble relative flex items-center gap-1 ${mine ? "flex-row-reverse" : "flex-row"}`}>
          <div className={`relative ${shape} ${skin} ${message.has_image ? "p-1" : "px-3.5 py-2"}`}>
            {message.has_image && <ChatImage messageId={message.id} onOpen={onOpenImage} onLoad={onImageLoad} />}
            {hasText && (
              <p
                className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                  message.has_image ? "px-2.5 pb-1.5 pt-2" : ""
                }`}
              >
                {message.body}
                {message.edited_at && (
                  <span className={`ml-1.5 text-[10.5px] ${mine ? "text-white/70" : "text-mist"}`}>(edited)</span>
                )}
              </p>
            )}
            {lastInGroup && <Tail mine={mine} />}
          </div>

          {hasMenu && (
            <div ref={menuRef} className="relative" data-msg-menu>
              <button
                type="button"
                onClick={toggleMenu}
                aria-label="Message options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-mist transition hover:bg-white hover:text-ink hover:shadow-sm focus-visible:opacity-100 ${
                  menuOpen ? "bg-white text-ink opacity-100 shadow-sm" : "opacity-50 group-hover/bubble:opacity-100"
                }`}
              >
                <MoreHorizontal size={16} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className={`absolute z-20 w-40 ${openDown ? "top-full mt-1" : "bottom-full mb-1"} overflow-hidden rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-mist-light ${
                    mine ? "right-0" : "left-0"
                  }`}
                >
                  {mine && editable && (
                    <MenuItem icon={Pencil} label="Edit" onClick={onStartEdit} />
                  )}
                  {hasText && <MenuItem icon={Copy} label="Copy text" onClick={onCopy} />}
                  {mine && unsendable && (
                    <MenuItem icon={Trash2} label="Unsend" danger onClick={onUnsend} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {lastInGroup && <Meta mine={mine} time={time} seen={seen} />}
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium transition ${
        danger ? "text-coral-red hover:bg-coral-red-light" : "text-ink hover:bg-chalk"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function Meta({ mine, time, seen }) {
  return (
    <span className={`mt-1 flex items-center gap-1 px-1 text-[10.5px] text-mist ${mine ? "justify-end" : ""}`}>
      {time}
      {mine && seen && (
        <span className="flex items-center gap-0.5 font-semibold text-harbor">
          · <Check size={11} strokeWidth={3} /> Seen
        </span>
      )}
    </span>
  );
}
