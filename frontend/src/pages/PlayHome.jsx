import { Link } from "react-router-dom";
import {
  Users,
  Baby,
  Palette,
  Music,
  Sun,
  Star,
  MapPin,
  Clock,
  Phone,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
} from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import BrandLogo from "../components/BrandLogo";
import Reveal from "../components/Reveal";
import useHeroIntro from "../hooks/useHeroIntro";

const SERVICE_TONES = {
  purple: "bg-harbor-light text-harbor-dark",
  sky: "bg-therafun-sky-light text-therafun-sky-dark",
  orange: "bg-sunrise-light text-sunrise",
  lime: "bg-therafun-lime-light text-therafun-lime-dark",
};

const SERVICES = [
  {
    icon: Users,
    title: "Playgroup Classes",
    desc: "Guided peer play that builds friendships, sharing, and communication skills.",
    featured: true,
    tone: "purple",
  },
  {
    icon: Baby,
    title: "Daycare / Childcare",
    desc: "A safe, nurturing space with caring staff on hand while families are away.",
    tone: "orange",
  },
  {
    icon: Palette,
    title: "Creative Play & Arts",
    desc: "Painting, crafts, and imaginative play that build fine motor skills and expression.",
    tone: "lime",
  },
  {
    icon: Music,
    title: "Music & Movement",
    desc: "Songs, dancing, and rhythm games that build coordination and confidence.",
    tone: "sky",
  },
  {
    icon: Sun,
    title: "Outdoor & Active Play",
    desc: "Supervised outdoor time for fresh air, energy, and gross motor development.",
    tone: "orange",
  },
  {
    icon: Star,
    title: "School Readiness",
    desc: "Early routines, letters, numbers, and social skills for that first classroom.",
    tone: "purple",
  },
];

export default function PlayHome() {
  const heroRef = useHeroIntro();

  return (
    <div id="top" className="min-h-screen bg-chalk">
      <PublicNavbar />

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden px-6 pb-20 pt-36 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-gradient-to-b from-therafun-lime-light via-chalk to-chalk" />
        <div className="pointer-events-none absolute left-[8%] top-32 -z-10 h-36 w-36 rounded-full bg-sunrise/20 blur-2xl" />
        <div className="pointer-events-none absolute right-[7%] top-44 -z-10 h-44 w-44 rounded-full bg-therafun-sky/20 blur-2xl" />
        <div className="pointer-events-none absolute right-[24%] top-24 -z-10 h-24 w-24 rounded-full bg-therafun-lime/20 blur-xl" />

        <Link
          to="/"
          className="mx-auto mb-6 flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-mist shadow-sm ring-1 ring-mist-light transition hover:text-harbor"
        >
          <ArrowLeft size={13} />
          Looking for speech therapy instead?
        </Link>

        <div className="hero-logo mx-auto mb-6 w-fit">
          <BrandLogo eager className="animate-float h-40 w-auto drop-shadow-sm sm:h-48" />
        </div>

        <p className="hero-heading mb-3 text-xs font-bold uppercase tracking-widest text-therafun-sky-dark">
          TheraFun Play
        </p>
        <h1 className="hero-heading mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Where every day is <span className="text-therafun-sky-dark">playtime.</span>
        </h1>

        <p className="hero-sub mx-auto mt-5 max-w-xl text-base text-mist sm:text-lg">
          TheraFun Play is our joyful daycare and playgroup program in Balanga City, Bataan —
          where kids build friendships and everyday skills through guided play, separate from our
          therapy services but backed by the same trusted team since 2011.
        </p>

        <div className="hero-cta mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/enroll"
            className="flex items-center gap-2 rounded-full bg-sunrise px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
          >
            Enroll for playgroup
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-harbor/20 bg-white px-6 py-3 text-sm font-semibold text-harbor-dark transition hover:bg-harbor-light"
          >
            Parent login
          </Link>
          <a
            href="#about"
            className="rounded-full border border-mist-light bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-harbor-light"
          >
            Learn more
          </a>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto mb-12 max-w-xl text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sunrise">
              What we offer
            </p>
            <h2 className="font-display text-3xl font-semibold text-ink">
              Play that helps every child grow
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <Reveal
                key={s.title}
                delay={i * 70}
                className={`rounded-2xl p-6 shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-md ${
                  s.featured
                    ? "bg-therafun-sky text-white ring-therafun-sky"
                    : "bg-white text-ink ring-mist-light"
                }`}
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${
                    s.featured ? "bg-white/15 text-white" : SERVICE_TONES[s.tone]
                  }`}
                >
                  <s.icon size={20} />
                </div>
                <h3 className="mb-1 font-display text-lg font-semibold">{s.title}</h3>
                <p className={`text-sm ${s.featured ? "text-white/85" : "text-mist"}`}>{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sunrise">
              About TheraFun Play
            </p>
            <h2 className="mb-4 font-display text-3xl font-semibold text-ink">
              A joyful space to play, connect, and grow
            </h2>
            <p className="mb-4 text-mist">
              TheraFun Play launched alongside our Intervention Centre in Balanga City in 2011,
              built for families who simply want a caring, structured space for their child to
              play and socialize — no therapy referral needed.
            </p>
            <p className="mb-6 text-mist">
              Our playgroup and daycare staff use the same warm, individualized approach as our
              therapy programs, so if a need for extra support ever comes up, our team is right
              there to help guide the next step.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Stat value="2011" label="Founded" />
              <Stat value="40+" label="Kids weekly" />
              <Stat value="3" label="Play programs" />
            </div>
          </Reveal>

          <Reveal className="relative flex items-center justify-center" delay={100}>
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-therafun-lime-light" />
            <BrandLogo className="h-56 w-auto sm:h-64" />
          </Reveal>
        </div>
      </section>

      {/* Contact / footer */}
      <section id="contact" className="px-6 py-16">
        <Reveal className="mx-auto grid max-w-6xl grid-cols-1 gap-6 rounded-3xl bg-therafun-sky p-10 text-white sm:grid-cols-3">
          <div>
            <h3 className="mb-4 font-display text-xl font-semibold">Visit or reach us</h3>
            <p className="text-sm text-white/80">
              Ready to bring your child in for playgroup or daycare? Our front desk is happy to help.
            </p>
          </div>
          <ContactLine icon={MapPin} text="Balanga City, Bataan, Philippines" />
          <div className="space-y-3">
            <ContactLine icon={Clock} text="Mon–Sat, 8:00 AM – 5:00 PM" />
            <ContactLine icon={Phone} text="Contact the front desk to book by phone" />
          </div>
        </Reveal>

        <Link
          to="/"
          className="mx-auto mt-8 flex w-fit items-center gap-1.5 text-sm font-semibold text-mist transition hover:text-harbor"
        >
          <MessageCircle size={14} />
          Looking for our speech therapy programs? Visit the main TheraConnect site
        </Link>

        <p className="mt-4 text-center text-xs text-mist">
          © {new Date().getFullYear()} TheraFun Play · part of TheraFun Intervention Centre
        </p>
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="font-display text-2xl font-semibold text-therafun-sky-dark">{value}</p>
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
