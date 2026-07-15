import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@theraconnect.ph", password: "admin123" },
  { label: "Therapist", email: "anna@theraconnect.ph", password: "therapist123" },
  { label: "Parent", email: "parent1@theraconnect.ph", password: "parent123" },
];

const PORTAL_FEATURES = [
  { icon: CalendarDays, text: "Appointments and schedules in one clear view" },
  { icon: ChartNoAxesCombined, text: "Progress updates families can easily understand" },
  { icon: ShieldCheck, text: "Role-based access for parents, therapists, and staff" },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(`/${loggedInUser.role}`);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't log in. Please check your details.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(account) {
    setEmail(account.email);
    setPassword(account.password);
  }

  return (
    <div className="min-h-screen bg-chalk lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(32rem,1.1fr)]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-harbor lg:flex">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-therafun-sky/20" />
        <div className="absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-therafun-lime/15" />
        <div className="absolute right-16 top-20 h-28 w-28 rounded-full bg-amber/20" />

        <div className="relative z-10 flex w-full flex-col justify-between px-10 py-12 xl:px-14">
          <p className="w-fit rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/90">
            TheraConnect family portal
          </p>

          <div className="max-w-xl py-12">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-therafun-lime">
              Care, clearly connected
            </p>
            <h1 className="max-w-lg font-display text-4xl font-extrabold leading-tight text-white xl:text-5xl">
              Everything your care team needs, without the clutter.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/75">
              TheraConnect brings schedules, enrollment, progress, and communication together in
              one calm and organized workspace.
            </p>

            <div className="mt-9 space-y-4">
              {PORTAL_FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm font-medium text-white/90">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/12">
                    <Icon size={18} />
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/60">
            TheraFun Intervention Centre · Serving Bataan families since 2011
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-mist transition hover:text-harbor"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <section className="overflow-hidden rounded-3xl border border-mist-light bg-white shadow-[0_24px_70px_rgba(80,32,106,0.12)]">
            <div className="border-b border-mist-light bg-gradient-to-br from-white via-white to-harbor-light/65 px-7 pb-5 pt-4 text-center">
              <BrandLogo eager className="mx-auto h-28 w-auto max-w-full" />
              <p className="-mt-1 text-xs font-bold uppercase tracking-[0.16em] text-harbor">
                TheraConnect secure portal
              </p>
            </div>

            <div className="px-6 py-7 sm:px-8">
              <div className="mb-6">
                <h2 className="font-display text-2xl font-bold text-ink">Welcome back</h2>
                <p className="mt-1 text-sm leading-6 text-mist">
                  Sign in to manage care, appointments, and progress.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-mist">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-mist-light bg-chalk/60 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-mist/60 focus:border-harbor focus:bg-white focus:ring-4 focus:ring-harbor/10"
                    placeholder="you@theraconnect.ph"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-mist">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-mist-light bg-chalk/60 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-mist/60 focus:border-harbor focus:bg-white focus:ring-4 focus:ring-harbor/10"
                    placeholder="Enter your password"
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-xl bg-coral-red-light px-4 py-3 text-sm font-medium text-coral-red">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-harbor px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-harbor-dark focus-visible:ring-4 focus-visible:ring-harbor/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Signing in…" : "Sign in to TheraConnect"}
                </button>
              </form>

              <p className="mt-6 border-t border-mist-light pt-5 text-center text-sm text-mist">
                New parent?{" "}
                <Link to="/enroll" className="font-bold text-harbor hover:text-harbor-dark">
                  Enroll your child
                </Link>
              </p>
            </div>
          </section>

          <div className="mt-5 rounded-2xl border border-dashed border-harbor/20 bg-white/70 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mist">
              Demo accounts · thesis defense
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.label}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="rounded-lg bg-harbor-light px-3 py-2 text-xs font-bold text-harbor-dark transition hover:bg-harbor hover:text-white"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
