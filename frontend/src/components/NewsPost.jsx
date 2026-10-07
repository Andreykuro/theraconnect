import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ChevronLeft, ChevronRight, Globe2, Pin, PinOff, Trash2, Users, X } from "lucide-react";

const CATEGORY = {
  general: { label: "News", className: "bg-harbor-light text-harbor-dark" },
  holiday: { label: "Holiday", className: "bg-sunrise-light text-sunrise" },
  promo: { label: "Promo", className: "bg-therafun-lime-light text-therafun-lime-dark" },
};

const AUDIENCE = {
  all: { label: "Everyone", icon: Globe2 },
  parents: { label: "Parents only", icon: Users },
  therapists: { label: "Therapists only", icon: Users },
};

// SQLite stores UTC as "YYYY-MM-DD HH:MM:SS".
function postDate(value) {
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

// One newsfeed post, Facebook style. Admin controls appear when onPin/onDelete are passed.
export default function NewsPost({ post, onPin, onDelete, showAudience = false }) {
  const [expanded, setExpanded] = useState(false);
  const [viewer, setViewer] = useState(null); // index of the photo open in the lightbox
  const created = postDate(post.created_at);
  const long = (post.body || "").length > 320;
  const text = long && !expanded ? `${post.body.slice(0, 300).trimEnd()}…` : post.body;
  const category = CATEGORY[post.category] || CATEGORY.general;
  const audience = AUDIENCE[post.audience] || AUDIENCE.all;

  return (
    <article
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${post.pinned ? "ring-sunrise/40" : "ring-mist-light"}`}
    >
      <header className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-mist-light">
          <img src="/therafun-logo.png" alt="" className="h-9 w-9 object-contain" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">TheraFun Intervention Centre</p>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-mist">
            <time dateTime={created.toISOString()} title={format(created, "MMMM d, yyyy · h:mm a")}>
              {formatDistanceToNowStrict(created, { addSuffix: true })}
            </time>
            {showAudience && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <audience.icon size={12} />
                  {audience.label}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {post.pinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sunrise-light px-2 py-0.5 text-[11px] font-semibold text-sunrise">
              <Pin size={11} /> Pinned
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${category.className}`}>{category.label}</span>
        </div>
      </header>

      <div className="px-4 pb-3 pt-3 sm:px-5">
        {post.title && <h3 className="font-display text-lg font-semibold leading-snug text-ink">{post.title}</h3>}
        {post.body && (
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-ink/85">
            {text}
            {long && (
              <button onClick={() => setExpanded((v) => !v)} className="ml-1 font-semibold text-harbor hover:text-harbor-dark">
                {expanded ? "See less" : "See more"}
              </button>
            )}
          </p>
        )}
      </div>

      {post.images?.length > 0 && <PhotoGrid images={post.images} onOpen={setViewer} />}

      {(onPin || onDelete) && (
        <footer className="flex items-center gap-1 border-t border-mist-light px-3 py-2">
          {onPin && (
            <button
              onClick={() => onPin(post)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-mist hover:bg-chalk hover:text-ink"
            >
              {post.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              {post.pinned ? "Unpin" : "Pin to top"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(post)}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-mist hover:bg-coral-red-light hover:text-coral-red"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </footer>
      )}

      {viewer !== null && (
        <Lightbox images={post.images} start={viewer} onClose={() => setViewer(null)} />
      )}
    </article>
  );
}

// 1 photo: full width. 2: side by side. 3: one big + two. 4+: 2x2 with "+N".
function PhotoGrid({ images, onOpen }) {
  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;
  const layout =
    shown.length === 1
      ? "grid-cols-1"
      : shown.length === 2
        ? "grid-cols-2"
        : shown.length === 3
          ? "grid-cols-2 grid-rows-2"
          : "grid-cols-2 grid-rows-2";

  return (
    <div className={`grid gap-0.5 bg-mist-light ${layout} ${shown.length === 1 ? "" : "aspect-[4/3] sm:aspect-[16/10]"}`}>
      {shown.map((img, i) => (
        <button
          key={img.id}
          onClick={() => onOpen(i)}
          className={`group relative overflow-hidden bg-chalk ${shown.length === 3 && i === 0 ? "row-span-2" : ""}`}
          aria-label={`Open photo ${i + 1}`}
        >
          <img
            src={img.url}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] ${
              shown.length === 1 ? "max-h-[480px]" : ""
            }`}
          />
          {extra > 0 && i === shown.length - 1 && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/55 font-display text-3xl font-semibold text-white">
              +{extra}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function Lightbox({ images, start, onClose }) {
  const [index, setIndex] = useState(start);
  const go = useCallback((step) => setIndex((i) => (i + step + images.length) % images.length), [images.length]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 p-4" onClick={onClose}>
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
        <X size={22} />
      </button>
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Previous photo"
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Next photo"
            className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}
      <img
        src={images[index].url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-full rounded-lg object-contain shadow-2xl"
      />
      {images.length > 1 && (
        <span className="absolute bottom-5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
          {index + 1} / {images.length}
        </span>
      )}
    </div>,
    document.body
  );
}
