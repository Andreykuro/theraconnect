import { useEffect, useRef } from "react";
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
} from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";

const SERVICES = [
  {
    icon: MessageCircle,
    title: "Speech Therapy",
    desc: "One-on-one sessions building articulation, language, and confident communication.",
    featured: true,
  },
  {
    icon: PuzzleIcon,
    title: "Occupational Therapy",
    desc: "Fine motor and sensory skills for everyday independence.",
  },
  {
    icon: Activity,
    title: "Physical Therapy",
    desc: "Movement, strength, and coordination support for growing bodies.",
  },
  {
    icon: BookOpen,
    title: "Special Education Tutorial",
    desc: "Individualized learning plans tailored to each child's pace.",
  },
  {
    icon: Users,
    title: "Playgroup Classes",
    desc: "Guided peer play that builds social and communication skills.",
  },
  {
    icon: Sparkles,
    title: "Early Intervention",
    desc: "Targeted support during the years development moves fastest.",
  },
  {
    icon: Baby,
    title: "Childcare Services",
    desc: "A safe, nurturing space for children while families are away.",
  },
];

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

function Reveal({ as: Tag = "div", className = "", children, style }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={style}>
      {children}
    </Tag>
  );
}

export default function Home() {
  return (
    <div id="top" className="min-h-screen bg-chalk">
      <PublicNavbar />

      {/* Hero - logo emphasized front and center */}
      <section className="relative overflow-hidden px-6 pb-20 pt-36 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-gradient-to-b from-harbor-light/70 via-chalk to-chalk" />

        <img
          src="/therafun-logo.png"
          alt="TheraFun Intervention Centre logo"
          className="animate-float mx-auto mb-6 h-40 w-auto drop-shadow-sm sm:h-48"
        />

        <h1 className="animate-fade-in-up mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Every child deserves to be <span className="text-harbor">heard.</span>
        </h1>

        <p
          className="animate-fade-in-up mx-auto mt-5 max-w-xl text-base text-mist sm:text-lg"
          style={{ animationDelay: "120ms" }}
        >
          TheraFun Intervention Centre helps children build the speech and language skills to
          confidently connect with the people around them — through warm, individualized speech
          therapy in Balanga City, Bataan since 2011.
        </p>

        <div
          className="animate-fade-in-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: "220ms" }}
        >
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-full bg-sunrise px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            Book a session
            <ArrowRight size={16} />
          </Link>
          <a
            href="#about"
            className="rounded-full border border-mist-light bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-harbor-light"
          >
            Learn about our centre
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
              Support that grows with every child
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <Reveal
                key={s.title}
                style={{ animationDelay: `${i * 70}ms` }}
                className={`rounded-2xl p-6 shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-md ${
                  s.featured
                    ? "bg-harbor text-white ring-harbor"
                    : "bg-white text-ink ring-mist-light"
                }`}
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${
                    s.featured ? "bg-white/15" : "bg-harbor-light"
                  }`}
                >
                  <s.icon size={20} className={s.featured ? "text-white" : "text-harbor-dark"} />
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
              About us
            </p>
            <h2 className="mb-4 font-display text-3xl font-semibold text-ink">
              Fifteen years of helping children in Bataan find their voice
            </h2>
            <p className="mb-4 text-mist">
              TheraFun Intervention Centre was founded in Balanga City in 2011 to give local
              families access to dedicated speech-language pathology and developmental therapy,
              without needing to travel to Manila for care.
            </p>
            <p className="mb-6 text-mist">
              Today our therapists work with over a hundred children each week across speech,
              occupational, and physical therapy, special education tutorials, playgroup classes,
              and early intervention — every plan built around the child in front of us, not a
              one-size-fits-all script.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Stat value="2011" label="Founded" />
              <Stat value="100+" label="Children weekly" />
              <Stat value="6" label="Programs offered" />
            </div>
          </Reveal>

          <Reveal className="relative flex items-center justify-center" style={{ animationDelay: "100ms" }}>
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-harbor-light" />
            <img
              src="/therafun-logo.png"
              alt="TheraFun Intervention Centre"
              className="h-56 w-auto sm:h-64"
            />
          </Reveal>
        </div>
      </section>

      {/* Contact / footer */}
      <section id="contact" className="px-6 py-16">
        <Reveal className="mx-auto grid max-w-6xl grid-cols-1 gap-6 rounded-3xl bg-harbor p-10 text-white sm:grid-cols-3">
          <div>
            <h3 className="mb-4 font-display text-xl font-semibold">Visit or reach us</h3>
            <p className="text-sm text-white/80">
              Ready to schedule your child's first session? Our front desk is happy to help.
            </p>
          </div>
          <ContactLine icon={MapPin} text="Balanga City, Bataan, Philippines" />
          <div className="space-y-3">
            <ContactLine icon={Clock} text="Mon–Sat, 8:00 AM – 5:00 PM" />
            <ContactLine icon={Phone} text="Contact the front desk to book by phone" />
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
