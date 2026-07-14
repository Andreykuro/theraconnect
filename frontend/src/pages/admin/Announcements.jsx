import { useEffect, useState, useCallback } from "react";
import { Megaphone, Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";

const CATEGORY_STYLE = {
  general: "bg-harbor-light text-harbor-dark",
  holiday: "bg-sunrise-light text-sunrise",
  promo: "bg-amber-light text-amber",
};

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", body: "", category: "general" });
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get("/announcements");
    setItems(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true);
    setNotice("");
    try {
      await api.post("/announcements", form);
      setForm({ title: "", body: "", category: "general" });
      setNotice("Posted, and emailed to every guardian on file.");
      load();
    } finally {
      setSending(false);
    }
  }

  return (
    <DashboardLayout title="Announcements" subtitle="Post clinic news, holidays, and promos to every guardian">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form
          onSubmit={handleSubmit}
          className="h-fit space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-light"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
              placeholder="e.g. Clinic closed for a holiday"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            >
              <option value="general">General</option>
              <option value="holiday">Holiday</option>
              <option value="promo">Promo</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">Message</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={5}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
              placeholder="Write the announcement guardians will receive by email…"
            />
          </div>
          {notice && (
            <p className="rounded-lg bg-harbor-light px-3 py-2 text-sm text-harbor-dark">{notice}</p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 rounded-lg bg-harbor px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-harbor-dark disabled:opacity-50"
          >
            <Send size={16} />
            {sending ? "Posting…" : "Post announcement"}
          </button>
        </form>

        <div className="space-y-3">
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-12 text-center text-mist ring-1 ring-mist-light">
              <Megaphone size={22} />
              <p className="text-sm">No announcements yet. Post the first one on the left.</p>
            </div>
          )}
          {items.map((a) => (
            <div key={a.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-light">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-ink">{a.title}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${CATEGORY_STYLE[a.category]}`}>
                  {a.category}
                </span>
              </div>
              <p className="text-sm text-mist">{a.body}</p>
              <p className="mt-2 font-mono text-[11px] text-mist/70">
                {format(parseISO(a.created_at.replace(" ", "T")), "MMM d, yyyy · h:mm a")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
