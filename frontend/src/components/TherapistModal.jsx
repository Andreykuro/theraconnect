import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, UserRoundPlus, X } from "lucide-react";
import api from "../lib/api";
import useModalEntrance from "../hooks/useModalEntrance";

const fieldClass =
  "w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none transition focus:border-harbor focus:ring-2 focus:ring-harbor/10";

const SPECIALTIES = [
  "Speech Therapy",
  "Occupational Therapy",
  "Physical Therapy",
  "Special Education tutorial",
  "Early Intervention",
  "Playgroup Classes",
];

// Calendar colours - each therapist gets their own so sessions are easy to tell apart.
const COLORS = ["#6F2C91", "#146B6B", "#FF7A59", "#3B7DDB", "#59BCE8", "#C2410C", "#15803D", "#BE185D", "#7C3AED", "#A16207"];

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function TherapistModal({ initial, usedColors = [], onClose, onSaved }) {
  const isEdit = Boolean(initial?.id);
  const firstFreeColor = COLORS.find((c) => !usedColors.includes(c.toLowerCase())) || COLORS[0];
  const [form, setForm] = useState({
    name: initial?.name || "",
    specialty: initial?.specialty || SPECIALTIES[0],
    phone: initial?.phone || "",
    email: initial?.email || "",
    color: initial?.color || firstFreeColor,
    create_login: !isEdit,
    password: isEdit ? "" : randomPassword(),
  });
  const [showPassword, setShowPassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null); // login details to show once after saving
  const { backdropRef, panelRef } = useModalEntrance();

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Please enter the therapist's full name.");
    if (form.create_login && !form.email.trim()) return setError("An email is needed so the therapist can log in.");
    if (form.create_login && form.password.length < 8) return setError("Password must be at least 8 characters.");
    setSaving(true);
    try {
      if (isEdit) {
        const { name, specialty, phone, email, color } = form;
        await api.put(`/therapists/${initial.id}`, { name, specialty, phone, email, color });
        onSaved();
      } else {
        const { data } = await api.post("/therapists", form);
        if (form.create_login) {
          setCreated({ name: data.name, email: data.login_email, password: form.password });
        } else {
          onSaved();
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't save this therapist.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-5">
      <div ref={panelRef} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-harbor-light text-harbor">
              <UserRoundPlus size={19} />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">
                {created ? "Therapist added" : isEdit ? "Edit therapist" : "Add therapist"}
              </h2>
              <p className="text-xs text-mist">
                {created ? "Share these login details with the therapist." : "Profile, calendar colour, and login account"}
              </p>
            </div>
          </div>
          <button onClick={created ? onSaved : onClose} aria-label="Close" className="text-mist hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-harbor-light/60 p-4 text-sm">
              <p className="mb-3 font-semibold text-ink">{created.name}</p>
              <dl className="grid grid-cols-[90px_1fr] gap-y-2">
                <dt className="text-mist">Login page</dt>
                <dd className="font-medium text-ink">Therapist</dd>
                <dt className="text-mist">Email</dt>
                <dd className="font-mono text-ink">{created.email}</dd>
                <dt className="text-mist">Password</dt>
                <dd className="font-mono text-ink">{created.password}</dd>
              </dl>
            </div>
            <p className="text-xs text-mist">
              This password is shown only once. Copy it now and ask the therapist to keep it private.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(`Email: ${created.email}\nPassword: ${created.password}`)}
                className="rounded-lg border border-mist-light px-4 py-2 text-sm font-semibold text-ink hover:bg-chalk"
              >
                Copy details
              </button>
              <button
                type="button"
                onClick={onSaved}
                className="rounded-lg bg-harbor px-4 py-2 text-sm font-semibold text-white hover:bg-harbor-dark"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Full name">
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={fieldClass}
                placeholder="e.g. Therapist Maria Santos"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Specialty">
                <input
                  list="therapist-specialties"
                  value={form.specialty}
                  onChange={(e) => update("specialty", e.target.value)}
                  className={fieldClass}
                />
                <datalist id="therapist-specialties">
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
              <Field label="Mobile number">
                <input
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className={fieldClass}
                  placeholder="09XX XXX XXXX"
                />
              </Field>
            </div>

            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={fieldClass}
                placeholder="name@theraconnect.ph"
              />
            </Field>

            <Field label="Calendar colour">
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update("color", c)}
                    aria-label={`Colour ${c}`}
                    className={`h-8 w-8 rounded-full ring-offset-2 transition ${
                      form.color.toLowerCase() === c.toLowerCase() ? "ring-2 ring-ink" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>

            {!isEdit && (
              <div className="rounded-xl border border-mist-light p-4">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={form.create_login}
                    onChange={(e) => update("create_login", e.target.checked)}
                    className="h-4 w-4 accent-harbor"
                  />
                  <KeyRound size={15} className="text-harbor" />
                  Create a login account
                </label>
                <p className="mt-1 pl-6 text-xs text-mist">The therapist signs in with the email above and this password.</p>
                {form.create_login && (
                  <div className="mt-3 flex gap-2 pl-6">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => update("password", e.target.value)}
                        className={`${fieldClass} pr-9 font-mono`}
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist hover:text-ink"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => update("password", randomPassword())}
                      className="rounded-lg border border-mist-light px-3 text-xs font-semibold text-ink hover:bg-chalk"
                    >
                      Generate
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && <p className="rounded-lg bg-coral-red-light px-3 py-2 text-sm text-coral-red">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-mist-light px-4 py-2 text-sm font-semibold text-ink hover:bg-chalk"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-harbor px-4 py-2 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-50"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {isEdit ? "Save changes" : "Add therapist"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">{label}</label>
      {children}
    </div>
  );
}
