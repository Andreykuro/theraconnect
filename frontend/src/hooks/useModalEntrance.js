import { useEffect, useRef } from "react";
import { animate, createScope, spring } from "animejs";
import { prefersReducedMotion } from "../lib/motion";

// Shared entrance animation for every modal in the app (they're all mounted
// fresh each time they open, via `{state && <XModal .../>}`, so a mount
// effect is all that's needed - no exit choreography to coordinate).
// Attach backdropRef to the outer fixed/inset-0 wrapper and panelRef to the
// inner white card.
export default function useModalEntrance() {
  const backdropRef = useRef(null);
  const panelRef = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    if (!backdropRef.current || !panelRef.current) return;

    if (prefersReducedMotion()) {
      backdropRef.current.style.opacity = "1";
      panelRef.current.style.opacity = "1";
      return;
    }

    backdropRef.current.style.opacity = "0";
    panelRef.current.style.opacity = "0";

    scope.current = createScope({ root: backdropRef }).add(() => {
      animate(backdropRef.current, { opacity: [0, 1], duration: 200, ease: "outQuad" });
      animate(panelRef.current, {
        opacity: [0, 1],
        scale: [0.94, 1],
        translateY: [16, 0],
        ease: spring({ bounce: 0.28, duration: 500 }),
      });
    });

    return () => scope.current?.revert();
  }, []);

  return { backdropRef, panelRef };
}
