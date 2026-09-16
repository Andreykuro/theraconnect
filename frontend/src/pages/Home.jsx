import { Link } from "react-router-dom";
import {
  MessageCircle,
  PuzzleIcon,
  Activity,
  BookOpen,
  Users,
  Sparkles,
  Baby,
  MapPin,
  Clock,
  Phone,
  ArrowRight,
  Blocks,
  ShieldCheck,
} from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import BrandLogo from "../components/BrandLogo";
import HeroArt from "../components/HeroArt";
import Reveal from "../components/Reveal";
import useHeroIntro from "../hooks/useHeroIntro";

const SERVICE_TONES = {
  purple: { blob: "bg-harbor-light", icon: "text-harbor-dark" },
  sky: { blob: "bg-therafun-sky-light", icon: "text-therafun-sky-dark" },
  orange: { blob: "bg-sunrise-light", icon: "text-sunrise" },
  lime: { blob: "bg-therafun-lime-light", icon: "text-therafun-lime-dark" },
};

const SERVICES = [
  {
    icon: MessageCircle,
    title: "Speech Therapy",
    desc: "One-on-one sessions building articulation, language, and confident communication — our founding program and the heart of TheraFun.",
    featured: true,
    tone: "purple",
  },
  {
    icon: PuzzleIcon,
    title: "Occupational Therapy",
    desc: "Fine motor and sensory skills for everyday independence.",
    tone: "sky",
  },
  {
    icon: Activity,
    title: "Physical Therapy",
    desc: "Movement, strength, and coordination support for growing bodies.",
    tone: "orange",
  },
  {
    icon: BookOpen,
    title: "Special Education Tutorial",
    desc: "Individualized learning plans tailored to each child's pace.",
    tone: "lime",
  },
  {
    icon: Users,
    title: "Playgroup Classes",
    desc: "Guided peer play that builds social and communication skills.",
    tone: "purple",
  },
  {
    icon: Sparkles,
    title: "Early Intervention",
    desc: "Targeted support during the years development moves fastest.",
    tone: "sky",
  },
  {
    icon: Baby,
    title: "Childcare Services",
    desc: "A safe, nurturing space for children while families are away.",
    tone: "orange",
  },
];

export default function Home() {
  const heroRef = useHeroIntro();

  return (
    <div id="top" className="min-h-screen overflow-x-hidden bg-chalk">
      <PublicNavbar />

      {/* Hero - asymmetric two-column, illustration carries visual weight
          instead of a centered logo-and-text stack */}
      <section ref={heroRef} className="relative overflow-hidden px-6 pb-16 pt-32 sm:pb-24 sm:pt-40">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-gradient-to-b from-harbor-light via-chalk to-chalk" />

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <p className="hero-heading mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-harbor-dark shadow-sm ring-1 ring-mist-light">
              <ShieldCheck size={14} />
              Balanga City, Bataan · since 2011
            </p>

            <h1 className="hero-heading font-display text-[2.75rem] font-semibold leading-[1.05] text-ink sm:text-6xl lg:text-[3.4rem]">
              Every child deserves to be <span className="italic text-harbor">heard.</span>
            </h1>

            <p className="hero-sub mx-auto mt-6 max-w-lg text-base text-mist sm:text-lg lg:mx-0">
              TheraFun Intervention Centre helps children build the speech and language skills to
              confidently connect with the people around them — through warm, individualized
              therapy the whole family can be part of.
            </p>

            <div className="hero-cta mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                to="/enroll"
                className="flex items-center gap-2 rounded-full bg-sunrise px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(255,122,89,0.6)] transition hover:brightness-110"
              >
                Enroll your child
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-harbor/20 bg-white px-6 py-3.5 text-sm font-semibold text-harbor-dark transition hover:bg-harbor-light"
              >
                Parent login
              </Link>
              <a
                href="#about"
                className="rounded-full px-6 py-3.5 text-sm font-semibold text-mist transition hover:text-ink"
              >
                Learn about our centre →
              </a>
            </div>
          </div>

          <div className="hero-logo order-1 lg:order-2">
            <HeroArt />
          </div>
        </div>
      </section>

      {/* Services - the founding program gets real visual weight instead of
          sitting in a uniform grid of identical cards */}
      <section id="services" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto mb-14 max-w-xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-sunrise">
              What we offer
            </p>
            <h2 className="font-display text-4xl font-semibold text-ink">
              Support that grows with every child
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {SERVICES.filter((s) => s.featured).map((s) => (
              <Reveal
                key={s.title}
                className="relative overflow-hidden rounded-[2rem] bg-harbor p-8 text-white shadow-lg lg:col-span-1 lg:row-span-2"
              >
                <div className="blob-3 absolute -right-10 -top-10 h-40 w-40 bg-white/10" />
                <div className="blob-1 absolute -bottom-14 -left-10 h-36 w-36 bg-white/10" />
                <div className="relative">
                  <div className="blob-2 mb-6 flex h-16 w-16 items-center justify-center bg-white/15">
                    <s.icon size={28} />
                  </div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">
                    Our founding program
                  </p>
                  <h3 className="mb-3 font-display text-2xl font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-white/85">{s.desc}</p>
                </div>
              </Reveal>
            ))}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-2">
              {SERVICES.filter((s) => !s.featured).map((s, i) => {
                const tone = SERVICE_TONES[s.tone];
                return (
                  <Reveal
                    key={s.title}
                    delay={i * 60}
                    className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-mist-light transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className={`blob-2 mb-4 flex h-11 w-11 items-center justify-center ${tone.blob}`}>
                      <s.icon size={18} className={tone.icon} />
                    </div>
                    <h3 className="mb-1 font-display text-lg font-semibold text-ink">{s.title}</h3>
                    <p className="text-sm text-mist">{s.desc}</p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* TheraFun Play promo */}
      <section className="px-6 py-4">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-therafun-sky via-therafun-sky to-therafun-lime">
          <div className="blob-1 absolute -right-8 -top-16 h-56 w-56 bg-white/10" />
          <div className="relative flex flex-col items-center gap-6 p-8 text-center sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:text-left">
            <div className="lg:max-w-lg">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/80">
                A different kind of program
              </p>
              <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                Just here for daycare or playgroup? Meet TheraFun Play.
              </h2>
              <p className="mt-3 text-sm text-white/90 sm:text-base">
                Our joyful, everyday space for childcare and guided playgroup classes — separate
                from our therapy programs, same trusted TheraFun team.
              </p>
            </div>
            <Link
              to="/play"
              className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-harbor-dark shadow-sm transition hover:brightness-95"
            >
              <Blocks size={18} />
              Explore TheraFun Play
              <ArrowRight size={16} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* About Us */}
      <section id="about" className="bg-white px-6 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-sunrise">About us</p>
            <h2 className="mb-5 font-display text-4xl font-semibold leading-tight text-ink">
              Fifteen years of helping children in Bataan find their voice
            </h2>
            <p className="mb-4 text-mist">
              TheraFun Intervention Centre was founded in Balanga City in 2011 to give local
              families access to dedicated speech-language pathology and developmental therapy,
              without needing to travel to Manila for care.
            </p>
            <p className="mb-8 text-mist">
              Today our therapists work with over a hundred children each week across speech,
              occupational, and physical therapy, special education tutorials, playgroup classes,
              and early intervention — every plan built around the child in front of us, not a
              one-size-fits-all script.
            </p>
            <div className="grid grid-cols-3 gap-4 border-t border-mist-light pt-6">
              <Stat value="2011" label="Founded" />
              <Stat value="100+" label="Children weekly" />
              <Stat value="6" label="Programs offered" />
            </div>
          </Reveal>

          <Reveal className="relative flex items-center justify-center" delay={100}>
            <div className="blob-2 absolute -inset-4 -z-10 bg-harbor-light" />
            <div className="blob-3 absolute -bottom-6 -right-6 -z-10 h-28 w-28 bg-therafun-sky-light" />
            <div className="rounded-[2rem] bg-white p-10 shadow-xl ring-1 ring-mist-light">
              <BrandLogo className="h-40 w-auto sm:h-48" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Contact / footer */}
      <section id="contact" className="px-6 py-16 sm:py-20">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-harbor p-10 text-white">
          <div className="blob-1 absolute -bottom-16 -left-10 h-52 w-52 bg-white/5" />
          <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <h3 className="mb-3 font-display text-xl font-semibold">Visit or reach us</h3>
              <p className="text-sm text-white/80">
                Ready to schedule your child's first session? Our front desk is happy to help.
              </p>
            </div>
            <ContactLine icon={MapPin} text="Balanga City, Bataan, Philippines" />
            <div className="space-y-3">
              <ContactLine icon={Clock} text="Mon–Sat, 8:00 AM – 5:00 PM" />
              <ContactLine icon={Phone} text="Contact the front desk to book by phone" />
            </div>
          </div>
        </Reveal>

        <p className="mt-8 text-center text-xs text-mist">
          © {new Date().getFullYear()} TheraFun Intervention Centre · TheraConnect
        </p>
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="font-display text-2xl font-semibold text-harbor-dark">{value}</p>
      <p className="text-xs text-mist">{label}</p>
    </div>
  );
}

function ContactLine({ icon: Icon, text }) {
  return (
    <div className="flex items-start gap-2 text-sm text-white/90">
      <Icon size={16} className="mt-0.5 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}
