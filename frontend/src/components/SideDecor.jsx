import { PuzzleIcon, Sparkles, Star } from "lucide-react";


const GUTTER =
  "pointer-events-none absolute inset-y-0 z-0 hidden w-[calc(50%-48rem)] min-[1650px]:block";

const BUBBLE_TONES = {
  sky: { bubble: "bg-therafun-sky-light text-therafun-sky-dark", tail: "bg-therafun-sky-light" },
  purple: { bubble: "bg-harbor-light text-harbor-dark", tail: "bg-harbor-light" },
};

// Speech bubble
function SoundBubble({ text, tone, tail, className = "", floatDelay = "0s" }) {
  const t = BUBBLE_TONES[tone];
  return (
    <div className={`absolute ${className}`}>
      <div className="animate-float" style={{ animationDelay: floatDelay }}>
        <div
          className={`relative rounded-2xl px-4 py-2 font-display text-2xl font-semibold shadow-sm ${t.bubble}`}
        >
          {text}
          <span className={`absolute -bottom-1.5 h-3.5 w-3.5 rotate-45 rounded-[3px] ${t.tail} ${tail}`} />
        </div>
      </div>
    </div>
  );
}

export default function SideDecor() {
  return (
    <>
      {/* Kaliwang gilid */}
      <div aria-hidden="true" className={`${GUTTER} left-0`}>
        <SoundBubble text="ba" tone="sky" tail="left-4" className="left-[24%] top-[26%]" floatDelay="-1s" />

        <div className="absolute left-[46%] top-[55%] -rotate-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-therafun-lime-light font-display text-3xl font-bold text-therafun-lime-dark shadow-sm">
            A
          </div>
        </div>

        <Star className="absolute left-[30%] top-[80%] fill-therafun-lime text-therafun-lime-dark" size={18} />
      </div>

      {/* Kanang gilid */}
      <div aria-hidden="true" className={`${GUTTER} right-0`}>
        <SoundBubble text="ma" tone="purple" tail="right-4" className="right-[24%] top-[34%]" floatDelay="-3s" />

        <div className="blob-2 absolute right-[40%] top-[62%] flex h-16 w-16 items-center justify-center bg-sunrise-light">
          <PuzzleIcon size={26} className="rotate-12 text-sunrise" />
        </div>

        <Sparkles className="absolute right-[52%] top-[14%] text-amber" size={22} strokeWidth={1.75} />
      </div>
    </>
  );
}
