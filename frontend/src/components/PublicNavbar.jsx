import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";

const LINKS = [
  { href: "#top", label: "Home" },
  { href: "#about", label: "About Us" },
];

const MENU_LINKS = [
  { href: "#top", label: "Home" },
  { href: "#services", label: "Services" },
  { href: "#about", label: "About Us" },
  { href: "#contact", label: "Contact" },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled ? "bg-white/90 shadow-sm backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="flex items-center gap-2">
            <img src="/therafun-logo.png" alt="TheraFun Intervention Centre" className="h-10 w-auto" />
            <span className="font-display text-lg font-semibold text-ink">TheraConnect</span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="group relative text-sm font-semibold uppercase tracking-wide text-ink/80 transition hover:text-harbor"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-sunrise transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-chalk"
              aria-label="Open menu"
            >
              <Menu size={18} />
              <span className="hidden sm:inline">Menu</span>
            </button>
            <Link
              to="/enroll"
              className="hidden rounded-full bg-sunrise px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 sm:inline-flex"
            >
              Enroll
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-harbor px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-harbor-dark"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Off-canvas menu */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
        <div
          className={`absolute right-0 top-0 flex h-full w-full max-w-xs flex-col bg-white p-6 shadow-xl transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-8 flex items-center justify-between">
            <img src="/therafun-logo.png" alt="TheraFun Intervention Centre" className="h-9 w-auto" />
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-mist hover:text-ink">
              <X size={22} />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {MENU_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-semibold text-ink transition hover:bg-chalk hover:text-harbor"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto">
            <Link
              to="/enroll"
              onClick={() => setOpen(false)}
              className="mb-2 flex items-center justify-center gap-2 rounded-full bg-sunrise px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Enroll your child
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full bg-harbor px-4 py-3 text-sm font-semibold text-white transition hover:bg-harbor-dark"
            >
              Login to your account
              <ArrowRight size={16} />
            </Link>
            <p className="mt-4 text-center text-xs text-mist">
              TheraFun Intervention Centre · Balanga City, Bataan
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
