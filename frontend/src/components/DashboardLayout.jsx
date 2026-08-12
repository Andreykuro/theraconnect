import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { animate, createScope } from "animejs";
import Sidebar from "./Sidebar";
import Chatbot from "./Chatbot";
import { prefersReducedMotion } from "../lib/motion";

export default function DashboardLayout({ title, subtitle, actions, children }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const mainRef = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el || prefersReducedMotion()) return;

    scope.current = createScope({ root: el }).add(() => {
      animate(el, {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 420,
        ease: "outQuad",
      });
    });

    return () => scope.current?.revert();
    // Re-run this entrance every time the page's own content changes route -
    // DashboardLayout mounts fresh per page component, so this fires once
    // per navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-chalk">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {navigationOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
            onClick={() => setNavigationOpen(false)}
          />
          <div className="relative h-full shadow-2xl">
            <Sidebar
              onNavigate={() => setNavigationOpen(false)}
              onClose={() => setNavigationOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 flex flex-shrink-0 items-center justify-between gap-4 border-b border-harbor/10 bg-white/95 px-4 py-4 shadow-[0_1px_0_rgba(80,32,106,0.03)] backdrop-blur sm:px-6 lg:px-8 lg:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setNavigationOpen(true)}
              aria-label="Open navigation"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-harbor-light text-harbor transition hover:bg-harbor hover:text-white lg:hidden"
            >
              <Menu size={20} />
            </button>
            <span className="hidden h-10 w-1 rounded-full bg-sunrise sm:block" />
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-ink sm:text-2xl">{title}</h1>
              {subtitle && <p className="truncate text-xs text-mist sm:text-sm">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </header>
        <main ref={mainRef} className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</main>
      </div>
      <Chatbot />
    </div>
  );
}
