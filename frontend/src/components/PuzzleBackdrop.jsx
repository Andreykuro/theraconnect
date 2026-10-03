import { useId } from "react";

// Kulay ng bawat piraso - galing sa puzzle-tree ng TheraFun logo
// (top = maliwanag na mukha, base = gitna, side = kapal/anino ng 3D)
const TONES = {
  purple: { top: "#B67FD6", base: "#7E3AA3", side: "#4A1D63" },
  sky: { top: "#9EDCF6", base: "#59BCE8", side: "#2479A3" },
  lime: { top: "#E4F58F", base: "#C8E72A", side: "#7E9614" },
  amber: { top: "#FFD27F", base: "#F5A623", side: "#B06F06" },
};

// Isang jigsaw piece: may tab sa taas at kanan, may butas sa baba
const PIECE_PATH =
  "M20 24 H40 C42 16 36 8 50 8 C64 8 58 16 60 24 H80 V40 C88 42 96 36 96 50 C96 64 88 58 80 60 V80 H60 C58 72 64 66 50 66 C36 66 42 72 40 80 H20 Z";

function Piece({ tone, size, rotate, className = "", blur = 0, opacity = 1, delay = "0s", duration = "9s" }) {
  const id = useId().replace(/:/g, "");
  const t = TONES[tone];

  return (
    <div
      className={`absolute ${className}`}
      style={{
        width: size,
        height: size,
        opacity,
        filter: `${blur ? `blur(${blur}px) ` : ""}drop-shadow(0 18px 22px rgba(45,41,56,0.18))`,
      }}
    >
      <div
        className="puzzle-float h-full w-full"
        style={{ "--r": `${rotate}deg`, animationDelay: delay, animationDuration: duration }}
      >
        <svg viewBox="0 0 104 104" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id={`face-${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={t.top} />
              <stop offset="60%" stopColor={t.base} />
              <stop offset="100%" stopColor={t.base} />
            </linearGradient>
            <radialGradient id={`gloss-${id}`} cx="0.32" cy="0.28" r="0.5">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Kapal ng piraso (extrusion) */}
          <path d={PIECE_PATH} fill={t.side} transform="translate(0 6)" />
          {/* Mukha */}
          <path d={PIECE_PATH} fill={`url(#face-${id})`} />
          {/* Kinang */}
          <path d={PIECE_PATH} fill={`url(#gloss-${id})`} />
          {/* Malambot na gilid na liwanag */}
          <path
            d={PIECE_PATH}
            fill="none"
            stroke="#fff"
            strokeOpacity="0.45"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

// Mga 3D puzzle piece sa likod ng hero - nakaayos sa gilid para hindi
// matakpan ang heading. Ang malalabo at maliliit = "malayo" (depth).
export function HeroPuzzles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Malapit - malalaki at malinaw */}
      <Piece tone="purple" size={150} rotate={-14} className="right-[3%] top-[12%] hidden lg:block" delay="-1s" />
      <Piece tone="sky" size={120} rotate={22} className="bottom-[16%] right-[40%] hidden lg:block" delay="-4s" duration="11s" />
      <Piece tone="lime" size={110} rotate={-30} className="bottom-[8%] right-[6%] hidden md:block" delay="-2.5s" />
      <Piece tone="amber" size={80} rotate={12} className="right-[44%] top-[34%] hidden xl:block" delay="-6s" duration="10s" />

      {/* Phone/tablet lang - nakapaligid sa hero art na nasa itaas */}
      <Piece tone="purple" size={64} rotate={-16} className="left-[3%] top-[27%] lg:hidden" delay="-2s" />
      <Piece tone="lime" size={56} rotate={20} className="right-[3%] top-[12%] lg:hidden" delay="-4.5s" duration="10s" />

      {/* Malayo - maliliit, malabo, mas mahina */}
      <Piece tone="sky" size={64} rotate={40} className="left-[38%] top-[14%]" blur={3} opacity={0.5} delay="-3s" />
      <Piece tone="purple" size={56} rotate={-8} className="bottom-[24%] right-[46%] hidden lg:block" blur={2} opacity={0.55} delay="-5s" duration="12s" />
      <Piece tone="amber" size={48} rotate={-25} className="right-[28%] top-[8%] hidden sm:block" blur={4} opacity={0.45} delay="-7s" />
      <Piece tone="lime" size={52} rotate={18} className="left-[46%] bottom-[10%] hidden md:block" blur={3} opacity={0.5} delay="-2s" duration="13s" />
    </div>
  );
}

// Maliit na kumpol sa paligid ng logo card sa About section
export function LogoPuzzles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <Piece tone="purple" size={96} rotate={-18} className="-left-6 -top-8" delay="-2s" />
      <Piece tone="sky" size={80} rotate={24} className="-right-4 top-6" delay="-5s" duration="10s" />
      <Piece tone="lime" size={72} rotate={-6} className="-bottom-8 left-10" delay="-3.5s" duration="11s" />
      <Piece tone="amber" size={64} rotate={32} className="-bottom-4 right-0" delay="-1s" />
    </div>
  );
}
