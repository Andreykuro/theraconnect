import { Sparkles, Star } from "lucide-react";
import BrandLogo from "./BrandLogo";

function SoundBars({ heights, color }) {
  return (
    <div className="flex items-end gap-1">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full"
          style={{ height: `${h}px`, backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// A composed "speech and play" scene: two speech-bubble chips carrying
// sound-wave bars (a literal nod to speech therapy) orbiting the brand mark,
// built from CSS blob shapes and plain divs rather than hand-drawn SVG art -
// safe to render correctly without a live preview, while still reading as a
// genuinely composed illustration rather than a centered logo on its own.
export default function HeroArt({ className = "" }) {
  return (
    <div className={`relative mx-auto aspect-square w-full max-w-md ${className}`}>
      <div className="blob-1 absolute inset-6 bg-harbor-light" />
      <div className="blob-2 absolute inset-12 bg-white shadow-xl ring-1 ring-mist-light" />

      <div className="absolute left-[6%] top-[10%] rounded-3xl bg-sunrise px-4 py-3.5 shadow-lg sm:left-[10%]">
        <SoundBars heights={[10, 18, 26, 15, 22, 12]} color="rgba(255,255,255,0.92)" />
        <span className="absolute -bottom-2 left-7 h-4 w-4 rotate-45 rounded-[3px] bg-sunrise" />
      </div>

      <div className="absolute bottom-[16%] right-[4%] rounded-2xl bg-therafun-sky px-3.5 py-3 shadow-lg sm:right-[8%]">
        <SoundBars heights={[8, 14, 9, 16]} color="rgba(255,255,255,0.92)" />
        <span className="absolute -bottom-1.5 right-7 h-3.5 w-3.5 rotate-45 rounded-[2px] bg-therafun-sky" />
      </div>

      <Sparkles className="absolute right-[14%] top-[4%] text-amber" size={22} strokeWidth={1.75} />
      <Star className="absolute bottom-[6%] left-[16%] fill-therafun-lime text-therafun-lime-dark" size={16} />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-[2rem] bg-white p-7 shadow-2xl ring-1 ring-mist-light sm:p-9">
          <BrandLogo eager className="h-20 w-auto sm:h-24" />
        </div>
      </div>
    </div>
  );
}
