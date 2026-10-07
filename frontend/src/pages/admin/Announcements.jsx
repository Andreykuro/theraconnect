import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Megaphone, Pin, Send, X } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import NewsPost from "../../components/NewsPost";

const MAX_PHOTOS = 6;
const EMPTY = { title: "", body: "", category: "general", audience: "all", pinned: false, send_email: true };

export default function Announcements() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState([]); // [{ file, preview }]
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState(null); // { tone, text }
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    const { data } = await api.get("/announcements");
    setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Free the preview URLs when photos are removed or the page closes.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addPhotos(event) {
    const picked = Array.from(event.target.files || []).filter((f) => f.type.startsWith("image/"));
    event.target.value = "";
    setPhotos((current) => {
      const room = MAX_PHOTOS - current.length;
      if (picked.length > room) setNotice({ tone: "error", text: `You can add up to ${MAX_PHOTOS} photos per post.` });
      return [...current, ...picked.slice(0, Math.max(room, 0)).map((file) => ({ file, preview: URL.createObjectURL(file) }))];
    });
  }

  function removePhoto(index) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, i) => i !== index);
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.body.trim() && photos.length === 0) {
      setNotice({ tone: "error", text: "Write something or add a photo first." });
      return;
    }
    setPosting(true);
    setNotice(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, String(value)));
      photos.forEach((p) => fd.append("images", p.file));
      await api.post("/announcements", fd);
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setForm(EMPTY);
      setNotice({
        tone: "ok",
        text:
          form.send_email && form.audience !== "therapists"
            ? "Posted to the newsfeed and emailed to guardians."
            : "Posted to the newsfeed.",
      });
      load();
    } catch (err) {
      setNotice({ tone: "error", text: err.response?.data?.error || "Couldn't post this. Please try again." });
    } finally {
      setPosting(false);
    }
  }

  async function togglePin(post) {
    await api.put(`/announcements/${post.id}`, { pinned: !post.pinned });
    load();
  }

  async function remove(post) {
    if (!window.confirm("Delete this post and its photos? This can't be undone.")) return;
    await api.delete(`/announcements/${post.id}`);
    load();
  }

  const selectClass =
    "rounded-lg border border-mist-light bg-white px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-harbor";

  return (
    <DashboardLayout title="Announcements" subtitle="Post clinic news and photos to the parent and therapist newsfeed">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Composer */}
        <form onSubmit={submit} className="rounded-2xl bg-white shadow-sm ring-1 ring-mist-light">
          <div className="flex gap-3 px-4 pt-4 sm:px-5">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-mist-light">
              <img src="/therafun-logo.png" alt="" className="h-9 w-9 object-contain" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                maxLength={150}
                placeholder="Headline (optional)"
                className="w-full border-none bg-transparent font-display text-lg font-semibold text-ink outline-none placeholder:text-mist/60"
              />
              <textarea
                value={form.body}
                onChange={(e) => update("body", e.target.value)}
                rows={3}
                maxLength={5000}
                placeholder="What's new at TheraFun?"
                className="w-full resize-none border-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-mist/70"
              />
            </div>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 px-4 pb-1 sm:grid-cols-6 sm:px-5">
              {photos.map((p, i) => (
                <div key={p.preview} className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-mist-light">
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 rounded-full bg-ink/70 p-0.5 text-white hover:bg-ink"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-mist-light px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photos.length >= MAX_PHOTOS}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-therafun-lime-dark hover:bg-therafun-lime-light disabled:opacity-40"
            >
              <ImagePlus size={16} />
              Photos {photos.length > 0 && `(${photos.length}/${MAX_PHOTOS})`}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />

            <select value={form.category} onChange={(e) => update("category", e.target.value)} className={selectClass}>
              <option value="general">News</option>
              <option value="holiday">Holiday</option>
              <option value="promo">Promo</option>
            </select>
            <select value={form.audience} onChange={(e) => update("audience", e.target.value)} className={selectClass}>
              <option value="all">Everyone</option>
              <option value="parents">Parents only</option>
              <option value="therapists">Therapists only</option>
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-mist hover:bg-chalk">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => update("pinned", e.target.checked)}
                className="h-3.5 w-3.5 accent-harbor"
              />
              <Pin size={13} /> Pin
            </label>
            {form.audience !== "therapists" && (
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-mist hover:bg-chalk">
                <input
                  type="checkbox"
                  checked={form.send_email}
                  onChange={(e) => update("send_email", e.target.checked)}
                  className="h-3.5 w-3.5 accent-harbor"
                />
                Email guardians
              </label>
            )}
            <button
              type="submit"
              disabled={posting}
              className="ml-auto flex items-center gap-2 rounded-lg bg-harbor px-4 py-2 text-sm font-semibold text-white transition hover:bg-harbor-dark disabled:opacity-50"
            >
              {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>

        {notice && (
          <p
            className={`rounded-xl px-4 py-2.5 text-sm ${
              notice.tone === "ok" ? "bg-harbor-light text-harbor-dark" : "bg-coral-red-light text-coral-red"
            }`}
          >
            {notice.text}
          </p>
        )}

        {/* Feed */}
        {loading && <p className="text-sm text-mist">Loading…</p>}
        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-12 text-center text-mist ring-1 ring-mist-light">
            <Megaphone size={22} />
            <p className="text-sm">No posts yet. Share the first update above.</p>
          </div>
        )}
        {posts.map((post) => (
          <NewsPost key={post.id} post={post} showAudience onPin={togglePin} onDelete={remove} />
        ))}
      </div>
    </DashboardLayout>
  );
}
