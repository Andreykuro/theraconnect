import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { animate, stagger, spring } from "animejs";
import BrandLogo from "./BrandLogo";
import { prefersReducedMotion } from "../lib/motion";

// Isang listahan lang para sa desktop nav at sa mobile menu para hindi nagkakaiba
const LINKS = [
  { href: "#top", label: "Home" },
  { href: "#services", label: "Services" },
  { href: "#about", label: "About Us" },
  { href: "#contact", label: "Contact" },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const backdropRef = useRef(null);
  const panelRef = useRef(null);
  const linksRef = useRef(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Kapag lumaki ang screen papuntang desktop, wala nang hamburger menu - isara na
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    function onChange(e) {
      if (e.matches) setOpen(false);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!backdropRef.current || !panelRef.current) return;

    if (prefersReducedMotion()) {
      backdropRef.current.style.opacity = open ? "1" : "0";
      panelRef.current.style.transform = open ? "translateX(0%)" : "translateX(100%)";
      return;
    }

    if (open) {
      animate(backdropRef.current, { opacity: [0, 1], duration: 250, ease: "outQuad" });
      animate(panelRef.current, {
        translateX: ["100%", "0%"],
        ease: spring({ bounce: 0.2, duration: 550 }),
      });
      if (linksRef.current) {
        animate(linksRef.current.children, {
          opacity: [0, 1],
          translateX: [16, 0],
          delay: stagger(50, { start: 150 }),
          duration: 400,
          ease: "outQuad",
        });
      }
    } else {
      animate(backdropRef.current, { opacity: [1, 0], duration: 200, ease: "inQuad" });
      animate(panelRef.current, { translateX: ["0%", "100%"], duration: 300, ease: "inQuad" });
    }
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled ? "bg-white/90 shadow-sm backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-3" aria-label="TheraFun Intervention Centre home">
            <BrandLogo eager className="h-12 w-auto sm:h-14" />
            <span className="hidden rounded-full bg-harbor-light px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-harbor lg:inline">
              TheraConnect
            </span>
          </a>

          <nav className="hidden items-center gap-6 md:flex lg:gap-8">
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
            <Link
              to="/enroll"
              className="hidden rounded-full bg-sunrise px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110 sm:inline-flex"
            >
              Enroll
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-harbor px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-harbor-dark"
            >
              Login
            </Link>
            {/* Mobile lang 'to - sa desktop nasa nav bar na lahat ng links */}
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-chalk md:hidden"
              aria-label="Open menu"
              aria-expanded={open}
            >
              <Menu size={18} />
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Off-canvas menu */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          ref={backdropRef}
          className="absolute inset-0 bg-ink/50"
          style={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        />
        <div
          ref={panelRef}
          className="absolute right-0 top-0 flex h-full w-full max-w-xs flex-col bg-white p-6 shadow-xl"
          style={{ transform: "translateX(100%)" }}
        >
          <div className="mb-8 flex items-center justify-between">
            <BrandLogo eager className="h-16 w-auto" />
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-mist hover:text-ink">
              <X size={22} />
            </button>
          </div>

          <nav ref={linksRef} className="flex flex-col gap-1">
            {LINKS.map((l) => (
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
