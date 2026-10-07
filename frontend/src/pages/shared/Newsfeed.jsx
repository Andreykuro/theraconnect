import { useCallback, useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import NewsPost from "../../components/NewsPost";

const FILTERS = [
  { value: "", label: "All posts" },
  { value: "general", label: "News" },
  { value: "holiday", label: "Holidays" },
  { value: "promo", label: "Promos" },
];

// Clinic newsfeed for parents and therapists (read-only). The admin posts
// from the Announcements page.
export default function Newsfeed() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/announcements", { params: filter ? { category: filter } : {} });
      setPosts(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't load the newsfeed.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout title="Newsfeed" subtitle="Updates, events, and photos from TheraFun">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f.value ? "bg-harbor text-white" : "bg-white text-mist ring-1 ring-mist-light hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && <p className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">{error}</p>}
        {loading && <p className="text-sm text-mist">Loading…</p>}

        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-14 text-center text-mist ring-1 ring-mist-light">
            <Newspaper size={24} />
            <p className="text-sm">No posts yet. Clinic updates will show up here.</p>
          </div>
        )}

        {posts.map((post) => (
          <NewsPost key={post.id} post={post} />
        ))}
      </div>
    </DashboardLayout>
  );
}
