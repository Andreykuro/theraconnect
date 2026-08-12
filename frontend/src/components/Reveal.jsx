import { useEffect, useRef } from "react";
import { animate, createScope, spring } from "animejs";
import { prefersReducedMotion } from "../lib/motion";

// Scroll-triggered entrance used across both public homepages. Detection
// stays on IntersectionObserver (fires once, cheap, well-supported); the
// motion itself runs through anime.js for a springier, less mechanical feel
// than a plain CSS transition.
export default function Reveal({ as: Tag = "div", className = "", children, style, delay = 0 }) {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.style.opacity = "1";
      return;
    }

    // Start hidden until the animation takes over, so there's no flash of
    // fully-visible content before the observer fires.
    el.style.opacity = "0";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        scope.current = createScope({ root: el }).add(() => {
          animate(el, {
            opacity: [0, 1],
            translateY: [28, 0],
            ease: spring({ bounce: 0.15, duration: 900 }),
            delay,
          });
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      scope.current?.revert();
    };
  }, [delay]);

  return (
    <Tag ref={root} className={className} style={style}>
      {children}
    </Tag>
  );
}
