import { useEffect, useRef } from "react";
import { createScope, createTimeline, stagger, spring } from "animejs";
import { prefersReducedMotion } from "../lib/motion";

// Choreographed page-load entrance shared by both public homepages (Home
// and TheraFun Play). Attach the returned ref to the hero <section>, and
// mark its children with these classes:
//   .hero-logo     the brand mark
//   .hero-heading  the <h1>
//   .hero-sub      the subtext paragraph
//   .hero-cta      the button row wrapper (each direct child gets staggered)
export default function useHeroIntro() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    if (!root.current) return;
    if (prefersReducedMotion()) return;

    scope.current = createScope({ root }).add(() => {
      createTimeline()
        .add(
          ".hero-logo",
          {
            scale: [0.6, 1],
            opacity: [0, 1],
            ease: spring({ bounce: 0.45, duration: 900 }),
          },
          0
        )
        .add(
          ".hero-heading",
          { opacity: [0, 1], translateY: [20, 0], duration: 600, ease: "outExpo" },
          300
        )
        .add(
          ".hero-sub",
          { opacity: [0, 1], translateY: [16, 0], duration: 600, ease: "outExpo" },
          450
        )
        .add(
          ".hero-cta > *",
          {
            opacity: [0, 1],
            translateY: [14, 0],
            duration: 500,
            delay: stagger(90),
            ease: "outExpo",
          },
          600
        );
    });

    return () => scope.current?.revert();
  }, []);

  return root;
}
