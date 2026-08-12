import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { animate, spring } from "animejs";
import api from "../lib/api";
import { prefersReducedMotion } from "../lib/motion";

export default function Chatbot() {
  const [open, setOpen] = useState(false); // logical intent (button icon, aria state)
  const [mounted, setMounted] = useState(false); // whether the panel is actually in the DOM
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! Ask me about clinic hours, services, rescheduling, or your therapist." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const panelRef = useRef(null);
  const bubbleRef = useRef(null);
  const prevCount = useRef(messages.length);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Panel entrance, played each time it mounts.
  useEffect(() => {
    if (!mounted || !panelRef.current || prefersReducedMotion()) return;
    animate(panelRef.current, {
      opacity: [0, 1],
      scale: [0.9, 1],
      translateY: [12, 0],
      ease: spring({ bounce: 0.35, duration: 500 }),
    });
  }, [mounted]);

  // Animate only the newest message bubble sliding in, not the whole list.
  useEffect(() => {
    if (messages.length > prevCount.current && scrollRef.current && !prefersReducedMotion()) {
      const last = scrollRef.current.lastElementChild;
      if (last) {
        animate(last, {
          opacity: [0, 1],
          translateY: [10, 0],
          scale: [0.96, 1],
          duration: 350,
          ease: "outQuad",
        });
      }
    }
    prevCount.current = messages.length;
  }, [messages]);

  function toggle() {
    if (bubbleRef.current && !prefersReducedMotion()) {
      animate(bubbleRef.current, {
        scale: [0.85, 1],
        ease: spring({ bounce: 0.55, duration: 500 }),
      });
    }

    if (open) {
      closeChat();
    } else {
      setMounted(true);
      setOpen(true);
    }
  }

  function closeChat() {
    setOpen(false);
    if (prefersReducedMotion() || !panelRef.current) {
      setMounted(false);
      return;
    }
    animate(panelRef.current, {
      opacity: [1, 0],
      scale: [1, 0.9],
      translateY: [0, 12],
      duration: 180,
      ease: "inQuad",
      onComplete: () => setMounted(false),
    });
  }

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const { data } = await api.post("/chatbot/ask", { message: text });
      setMessages((m) => [...m, { from: "bot", text: data.answer }]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Sorry, I couldn't reach the clinic assistant. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {mounted && (
        <div
          ref={panelRef}
          className="mb-3 flex h-96 w-80 origin-bottom-right flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-mist-light"
        >
          <div className="flex items-center justify-between bg-harbor px-4 py-3 text-white">
            <div>
              <p className="font-display text-sm font-semibold">Clinic Assistant</p>
              <p className="text-[11px] opacity-80">Usually answers instantly</p>
            </div>
            <button onClick={closeChat} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.from === "user"
                    ? "ml-auto bg-harbor text-white"
                    : "bg-chalk text-ink ring-1 ring-mist-light"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-mist-light p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question…"
              className="flex-1 rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            />
            <button
              type="submit"
              disabled={sending}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-harbor text-white transition hover:bg-harbor-dark disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        ref={bubbleRef}
        onClick={toggle}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-sunrise text-white shadow-lg transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-harbor-dark focus-visible:ring-offset-2"
        aria-label="Toggle clinic assistant"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
