import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Stethoscope, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@theraconnect.ph", password: "admin123" },
  { label: "Therapist", email: "anna@theraconnect.ph", password: "therapist123" },
  { label: "Parent", email: "parent1@theraconnect.ph", password: "parent123" },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
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

  function fillDemo(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-chalk px-4">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-6 flex items-center gap-1.5 text-sm font-medium text-mist transition hover:text-harbor"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-harbor text-white">
            <Stethoscope size={22} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">TheraConnect</h1>
          <p className="text-sm text-mist">TheraFun Intervention Centre · Balanga City, Bataan</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-mist-light">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
                placeholder="you@theraconnect.ph"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-coral-red-light px-3 py-2 text-sm text-coral-red">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-harbor py-2.5 text-sm font-semibold text-white transition hover:bg-harbor-dark disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-mist-light bg-white/60 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist">
            Demo accounts (thesis defense)
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.label}
                type="button"
                onClick={() => fillDemo(acc)}
                className="rounded-lg bg-chalk px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-mist-light transition hover:bg-harbor-light"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
