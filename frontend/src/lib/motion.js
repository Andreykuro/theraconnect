// Anime.js animations run via JS/inline styles, so the CSS
// `prefers-reduced-motion` media query (used elsewhere in index.css) can't
// touch them. Components that animate check this first and skip straight to
// the end state for anyone who has motion reduction turned on at the OS level.
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
