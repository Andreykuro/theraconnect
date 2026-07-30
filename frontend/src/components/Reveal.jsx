import { useEffect, useRef } from "react";

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function Reveal({ as: Tag = "div", className = "", children, style }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={style}>
      {children}
    </Tag>
  );
}
