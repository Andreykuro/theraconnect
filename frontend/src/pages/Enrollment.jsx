import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  HeartHandshake,
  ImagePlus,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const fieldClass =
  "w-full rounded-xl border border-mist-light bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-mist/70 focus:border-harbor focus:ring-2 focus:ring-harbor/10";

const MIN_AGE_YEARS = 2;

// Google-Forms-style na multi-page na wizard - isang bahagi lang ng form ang
// makikita sa isang pagkakataon, may progress dots sa taas, at Next/Back sa
// pagitan ng mga page.
const STEPS = [
  { key: "patient", label: "Patient", icon: UserRound },
  { key: "treatment", label: "Treatment", icon: HeartHandshake },
  { key: "guardian", label: "Guardian", icon: LockKeyhole },
  { key: "review", label: "Review", icon: ShieldCheck },
];

const initialForm = {
  guardian_name: "",
  guardian_phone: "",
  email: "",
  password: "",
  confirm_password: "",
  patient_name: "",
  birthdate: "",
  diagnosis: "",
  service_type: "",
  notes: "",
};

// Pinakabagong araw na puwedeng piliin sa birthdate para awtomatikong
// naka-block na sa mismong date picker ang mga batang wala pang 2 years old.
function maxBirthdateForMinAge() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE_YEARS);
  return d.toISOString().slice(0, 10);
}

function ageInYears(birthdate) {
  const [y, m, d] = birthdate.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  const hadBirthdayThisYear =
    now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

export default function Enrollment() {
  const { user, enroll } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [options, setOptions] = useState({ treatment_types: [] });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [stepError, setStepError] = useState("");
  // Kapag successful ang enroll(), agad nag-re-render ang component na 'to
  // dahil nag-iba na ang `user` sa context - kaya bago pa man tumakbo yung
  // navigate() sa handleSubmit, puwedeng maunahan ito ng guard sa baba.
  // Itong flag ang nagpapanatili ng "justEnrolled" context kahit alin man
  // sa dalawang redirect ang mangyari.
  const [justEnrolled, setJustEnrolled] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/enrollment/options")
      .then(({ data }) => {
        if (!active) return;
        setOptions(data);
        setForm((current) => ({
          ...current,
          service_type: current.service_type || data.treatment_types[0] || "",
        }));
      })
      .catch(() => setError("We couldn't load the available treatments. Please refresh the page."))
      .finally(() => active && setLoadingOptions(false));
    return () => {
      active = false;
    };
  }, []);

  const maxBirthdate = useMemo(() => maxBirthdateForMinAge(), []);

  if (user) {
    return (
      <Navigate
        to={user.role === "parent" ? "/parent" : `/${user.role}`}
        replace
        state={{ justEnrolled }}
      />
    );
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addFiles(event) {
    const selected = Array.from(event.target.files || []);
    setAttachmentFiles((current) => [...current, ...selected].slice(0, 5));
    event.target.value = "";
  }

  function removeFile(index) {
    setAttachmentFiles((current) => current.filter((_, i) => i !== index));
  }

  // Bawat page may sariling validation bago makalipat sa susunod - hindi
  // pababayaang makarating sa dulo ang parent na may kulang o maling laman.
  function validateStep(index) {
    if (index === 0) {
      if (!form.patient_name.trim()) return "Please enter the patient's full name.";
      if (!form.birthdate) return "Please enter the patient's birthdate.";
      if (new Date(form.birthdate) > new Date()) return "Birthdate can't be in the future.";
      if (ageInYears(form.birthdate) < MIN_AGE_YEARS) {
        return `The patient must be at least ${MIN_AGE_YEARS} years old to register.`;
      }
      if (!form.diagnosis.trim()) {
        return "A doctor's diagnosis is required so the clinic can confirm the right kind of care.";
      }
      return "";
    }
    if (index === 1) {
      if (!form.service_type) return "Please choose a type of treatment.";
      return "";
    }
    if (index === 2) {
      if (!form.guardian_name.trim()) return "Please enter the parent or guardian's name.";
      if (!form.guardian_phone.trim()) return "Please enter a mobile number.";
      if (!form.email.trim()) return "Please enter an email address.";
      if (form.password.length < 8) return "Password must be at least 8 characters.";
      if (form.password !== form.confirm_password) return "The passwords do not match.";
      return "";
    }
    return "";
  }

  function goNext() {
    const message = validateStep(step);
    if (message) {
      setStepError(message);
      return;
    }
    setStepError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      await enroll({
        guardian_name: form.guardian_name,
        guardian_phone: form.guardian_phone,
        email: form.email,
        password: form.password,
        patient_name: form.patient_name,
        birthdate: form.birthdate,
        diagnosis: form.diagnosis,
        service_type: form.service_type,
        notes: form.notes,
      });

      if (attachmentFiles.length > 0) {
        try {
          const formData = new FormData();
          formData.append("label", "Doctor's note / Diagnosis");
          attachmentFiles.forEach((file) => formData.append("files", file));
          await api.post("/enrollment/me/attachments", formData);
        } catch {
          // Account + patient record are already created - attachments can
          // always be added later from the parent portal.
        }
      }

      setJustEnrolled(true);
      // Hindi na kailangan ng manual navigate() dito - agad na mag-re-render
      // ang component dahil sa bagong `user` mula sa enroll(), at ang guard
      // sa itaas na ang bahalang mag-redirect papuntang /parent.
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || "We couldn't complete the enrollment. Please try again."
      );
      // Kung nag-fail sa credentials/guardian step, ibalik doon para makita
      // agad ng parent ang error kasama yung mismong fields.
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-chalk px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-semibold text-mist transition hover:text-harbor"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <Link to="/login" className="text-sm font-semibold text-harbor hover:text-harbor-dark">
            Already enrolled? Sign in
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-mist-light lg:grid lg:grid-cols-[0.62fr_1.38fr]">
          <aside className="relative hidden overflow-hidden bg-harbor p-8 text-white sm:p-10 lg:block">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/5" />
            <img
              src="/therafun-logo.png"
              alt="TheraFun Intervention Centre"
              className="relative mb-8 h-20 w-auto rounded-2xl bg-white/95 p-2"
            />
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/65">
              Parent enrollment
            </p>
            <h1 className="font-display text-3xl font-semibold leading-tight">
              Help us prepare the right care for your child.
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/80">
              A few quick pages, then our clinic reviews the diagnosis and matches your child with
              the right specialist.
            </p>

            <div className="mt-9 space-y-4">
              <Benefit icon={FileText} text="A doctor's diagnosis helps us match the right specialist" />
              <Benefit icon={Sparkles} text="We auto-assign a therapist once your registration is approved" />
              <Benefit icon={LockKeyhole} text="Password protected parent portal access" />
            </div>
          </aside>

          <main className="p-6 sm:p-9 lg:p-10">
            {/* Progress dots - kasing-simple ng Google Forms header */}
            <div className="mb-8">
              <div className="mb-2 flex items-center justify-between">
                {STEPS.map((s, i) => (
                  <div key={s.key} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                          i < step
                            ? "bg-harbor text-white"
                            : i === step
                              ? "bg-sunrise text-white"
                              : "bg-chalk text-mist ring-1 ring-mist-light"
                        }`}
                      >
                        {i < step ? <Check size={14} /> : i + 1}
                      </span>
                      <span
                        className={`hidden text-[10px] font-bold uppercase tracking-wide sm:block ${
                          i <= step ? "text-ink" : "text-mist"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span
                        className={`mx-2 h-0.5 flex-1 rounded-full transition ${
                          i < step ? "bg-harbor" : "bg-mist-light"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-sunrise">
                Page {step + 1} of {STEPS.length}
              </p>
            </div>

            <div className="min-h-[360px]">
              {step === 0 && (
                <StepPatient
                  form={form}
                  update={update}
                  maxBirthdate={maxBirthdate}
                  attachmentFiles={attachmentFiles}
                  addFiles={addFiles}
                  removeFile={removeFile}
                />
              )}
              {step === 1 && (
                <StepTreatment
                  form={form}
                  update={update}
                  options={options}
                  loadingOptions={loadingOptions}
                />
              )}
              {step === 2 && <StepGuardian form={form} update={update} />}
              {step === 3 && <StepReview form={form} attachmentFiles={attachmentFiles} />}
            </div>

            {(stepError || error) && (
              <p role="alert" className="mt-6 rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">
                {stepError || error}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-mist-light pt-6">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || submitting}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-mist transition hover:text-ink disabled:invisible"
              >
                <ArrowLeft size={15} />
                Back
              </button>

              {!isLastStep ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={loadingOptions}
                  className="flex items-center gap-2 rounded-xl bg-harbor px-6 py-3 text-sm font-bold text-white transition hover:bg-harbor-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-sunrise px-6 py-3 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <Loader2 size={17} className="animate-spin" />}
                  {submitting ? "Submitting…" : "Submit for review"}
                </button>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function StepHeading({ number, title, subtitle }) {
  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-mist">Step {number}</p>
      <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-mist">{subtitle}</p>}
    </div>
  );
}

function StepPatient({ form, update, maxBirthdate, attachmentFiles, addFiles, removeFile }) {
  return (
    <div>
      <StepHeading number="1" title="Tell us about the patient" subtitle="All fields here are required." />
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Patient's full name" required>
            <input
              value={form.patient_name}
              onChange={(event) => update("patient_name", event.target.value)}
              className={fieldClass}
              placeholder="Juan Dela Cruz"
            />
          </Field>
          <Field label="Birthdate" required hint={`Must be ${maxBirthdate ? "2+ years old" : ""}`}>
            <input
              type="date"
              max={maxBirthdate}
              value={form.birthdate}
              onChange={(event) => update("birthdate", event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>

        <Field
          label="Doctor's diagnosis"
          required
          hint="What a pediatrician/specialist noted"
        >
          <textarea
            rows={3}
            maxLength={2000}
            value={form.diagnosis}
            onChange={(event) => update("diagnosis", event.target.value)}
            className={`${fieldClass} resize-none`}
            placeholder="e.g. Speech and language delay diagnosed by Dr. Santos, developmental pediatrician, June 2026"
          />
          <p className="mt-1.5 text-[11px] font-normal normal-case tracking-normal text-mist">
            Our clinic reviews this before confirming the registration.
          </p>
        </Field>

        <Field label="Anything else the therapist should know?" hint="Optional">
          <textarea
            rows={2}
            maxLength={1000}
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            className={`${fieldClass} resize-none`}
            placeholder="Development goals, concerns, previous therapy"
          />
        </Field>

        <Field label="Photo of the diagnosis or doctor's note" hint="Optional · images only">
          <div className="flex flex-wrap gap-3">
            {attachmentFiles.map((file, index) => (
              <AttachmentThumb key={`${file.name}-${index}`} file={file} onRemove={() => removeFile(index)} />
            ))}
            {attachmentFiles.length < 5 && (
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-mist-light text-mist transition hover:border-harbor hover:text-harbor">
                <ImagePlus size={18} />
                <span className="text-[10px] font-semibold">Add</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={addFiles} />
              </label>
            )}
          </div>
          <p className="mt-1.5 text-[11px] font-normal normal-case tracking-normal text-mist">
            Up to 5 images, 8MB each. You can also add these later from your parent portal.
          </p>
        </Field>
      </div>
    </div>
  );
}

function StepTreatment({ form, update, options, loadingOptions }) {
  return (
    <div>
      <StepHeading
        number="2"
        title="What kind of care does your child need?"
        subtitle="We'll match a specific specialist for you once the clinic approves the registration."
      />
      {loadingOptions ? (
        <div className="flex items-center gap-2 rounded-xl bg-chalk px-4 py-5 text-sm text-mist">
          <Loader2 size={17} className="animate-spin" />
          Loading available treatments...
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.treatment_types.map((treatment) => {
            const selected = treatment === form.service_type;
            return (
              <button
                key={treatment}
                type="button"
                onClick={() => update("service_type", treatment)}
                className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-harbor bg-harbor-light ring-2 ring-harbor/10"
                    : "border-mist-light hover:border-harbor/40 hover:bg-chalk"
                }`}
              >
                <span className="text-sm font-semibold text-ink">{treatment}</span>
                {selected && <Check size={17} className="flex-shrink-0 text-harbor" />}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-5 flex items-start gap-3 rounded-xl bg-chalk p-4 text-sm text-mist">
        <Sparkles size={16} className="mt-0.5 flex-shrink-0 text-sunrise" />
        <p>
          After you submit, the clinic reviews the diagnosis and automatically assigns the
          best-available therapist for this treatment - you'll see who once it's approved.
        </p>
      </div>
    </div>
  );
}

function StepGuardian({ form, update }) {
  return (
    <div>
      <StepHeading number="3" title="Parent or guardian details" subtitle="Used for login and clinic communication." />
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Parent or guardian name" required>
            <input
              value={form.guardian_name}
              onChange={(event) => update("guardian_name", event.target.value)}
              className={fieldClass}
              placeholder="Maria Dela Cruz"
            />
          </Field>
          <Field label="Mobile number" hint="For SMS reminders" required>
            <input
              type="tel"
              value={form.guardian_phone}
              onChange={(event) => update("guardian_phone", event.target.value)}
              className={fieldClass}
              placeholder="09XX XXX XXXX"
            />
          </Field>
        </div>
        <Field label="Email address" hint="Login and clinic announcements" required>
          <input
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            className={fieldClass}
            placeholder="parent@example.com"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" hint="At least 8 characters" required>
            <input
              type="password"
              minLength={8}
              maxLength={72}
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              className={fieldClass}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm password" required>
            <input
              type="password"
              minLength={8}
              maxLength={72}
              value={form.confirm_password}
              onChange={(event) => update("confirm_password", event.target.value)}
              className={fieldClass}
              autoComplete="new-password"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function StepReview({ form, attachmentFiles }) {
  return (
    <div>
      <StepHeading number="4" title="Review before you submit" subtitle="Make sure everything looks right." />
      <div className="space-y-4">
        <ReviewSection title="Patient">
          <ReviewRow label="Name" value={form.patient_name} />
          <ReviewRow label="Birthdate" value={form.birthdate} />
          <ReviewRow label="Diagnosis" value={form.diagnosis} />
          <ReviewRow label="Photos attached" value={String(attachmentFiles.length)} />
        </ReviewSection>
        <ReviewSection title="Treatment">
          <ReviewRow label="Type" value={form.service_type} />
        </ReviewSection>
        <ReviewSection title="Guardian">
          <ReviewRow label="Name" value={form.guardian_name} />
          <ReviewRow label="Mobile" value={form.guardian_phone} />
          <ReviewRow label="Email" value={form.email} />
        </ReviewSection>
      </div>
      <p className="mt-5 text-center text-xs leading-5 text-mist">
        Your password is securely hashed. Submitting sends this registration for clinic review -
        you'll be able to sign in right away to check its status.
      </p>
    </div>
  );
}

function ReviewSection({ title, children }) {
  return (
    <div className="rounded-xl bg-chalk p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mist">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="flex-shrink-0 text-mist">{label}</span>
      <span className="text-right font-semibold text-ink">{value || "—"}</span>
    </div>
  );
}

function Benefit({ icon: Icon, text }) {
  return (
    <div className="flex items-start gap-3 text-sm text-white/85">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
        <Icon size={14} />
      </span>
      <span>{text}</span>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-mist">
        <span>
          {label} {required && <span className="text-coral-red">*</span>}
        </span>
        {hint && <span className="normal-case tracking-normal text-mist/75">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function AttachmentThumb({ file, onRemove }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-mist-light">
      {url && <img src={url} alt={file.name} className="h-full w-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition group-hover:opacity-100"
        aria-label={`Remove ${file.name}`}
      >
        <X size={12} />
      </button>
    </div>
  );
}
