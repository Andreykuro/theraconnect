import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  HeartHandshake,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  UserRound,
  X,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const fieldClass =
  "w-full rounded-xl border border-mist-light bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-mist/70 focus:border-harbor focus:ring-2 focus:ring-harbor/10";

const initialForm = {
  guardian_name: "",
  guardian_phone: "",
  email: "",
  password: "",
  confirm_password: "",
  patient_name: "",
  birthdate: "",
  service_type: "",
  therapist_id: "",
  notes: "",
};

export default function Enrollment() {
  const { user, enroll } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [options, setOptions] = useState({ treatment_types: [], therapists: [] });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get("/enrollment/options")
      .then(({ data }) => {
        if (!active) return;
        setOptions(data);
        const firstTreatment = data.treatment_types[0] || "";
        const firstTherapist = data.therapists.find(
          (therapist) => therapist.specialty === firstTreatment
        );
        setForm((current) => ({
          ...current,
          service_type: firstTreatment,
          therapist_id: firstTherapist ? String(firstTherapist.id) : "",
        }));
      })
      .catch(() => setError("We couldn't load the available treatments. Please refresh the page."))
      .finally(() => active && setLoadingOptions(false));
    return () => {
      active = false;
    };
  }, []);

  const availableTherapists = useMemo(
    () => options.therapists.filter((therapist) => therapist.specialty === form.service_type),
    [options.therapists, form.service_type]
  );

  if (user) {
    return <Navigate to={user.role === "parent" ? "/parent/enrollment" : `/${user.role}`} replace />;
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

  function chooseTreatment(serviceType) {
    const firstTherapist = options.therapists.find(
      (therapist) => therapist.specialty === serviceType
    );
    setForm((current) => ({
      ...current,
      service_type: serviceType,
      therapist_id: firstTherapist ? String(firstTherapist.id) : "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await enroll({
        guardian_name: form.guardian_name,
        guardian_phone: form.guardian_phone,
        email: form.email,
        password: form.password,
        patient_name: form.patient_name,
        birthdate: form.birthdate,
        service_type: form.service_type,
        therapist_id: Number(form.therapist_id),
        notes: form.notes,
      });

      if (attachmentFiles.length > 0) {
        try {
          const formData = new FormData();
          formData.append("label", "Doctor's note / Diagnosis");
          attachmentFiles.forEach((file) => formData.append("files", file));
          await api.post("/enrollment/me/attachments", formData);
        } catch {
          // The account and patient record were already created successfully -
          // attachments can always be added later from the parent portal, so a
          // failed upload here shouldn't block enrollment from completing.
        }
      }

      navigate("/parent/enrollment", { replace: true, state: { justEnrolled: true } });
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || "We couldn't complete the enrollment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-chalk px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
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

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-mist-light lg:grid lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="relative overflow-hidden bg-harbor p-8 text-white sm:p-10">
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
              Create your parent account, share the patient's basic information, and choose the
              treatment and therapist that best fit your family's needs.
            </p>

            <div className="mt-9 space-y-4">
              <Benefit icon={MessageSquareText} text="SMS appointment reminders to your mobile number" />
              <Benefit icon={HeartHandshake} text="Treatment and therapist selected during enrollment" />
              <Benefit icon={LockKeyhole} text="Password protected parent portal access" />
            </div>
          </aside>

          <main className="p-6 sm:p-9 lg:p-10">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-widest text-sunrise">New patient</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
                Enrollment information
              </h2>
              <p className="mt-1 text-sm text-mist">All required fields are marked with an asterisk.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <FormSection icon={UserRound} number="1" title="Patient information">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Patient's full name" required>
                    <input
                      required
                      value={form.patient_name}
                      onChange={(event) => update("patient_name", event.target.value)}
                      className={fieldClass}
                      placeholder="Juan Dela Cruz"
                    />
                  </Field>
                  <Field label="Birthdate" required>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      value={form.birthdate}
                      onChange={(event) => update("birthdate", event.target.value)}
                      className={fieldClass}
                    />
                  </Field>
                </div>
                <Field label="Anything the therapist should know?" hint="Optional">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={form.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    className={`${fieldClass} resize-none`}
                    placeholder="Development goals, concerns, previous therapy, or relevant notes"
                  />
                </Field>
                <Field label="Doctor's note or diagnosis" hint="Optional · images only">
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
              </FormSection>

              <FormSection icon={HeartHandshake} number="2" title="Treatment and therapist">
                {loadingOptions ? (
                  <div className="flex items-center gap-2 rounded-xl bg-chalk px-4 py-5 text-sm text-mist">
                    <Loader2 size={17} className="animate-spin" />
                    Loading available care options...
                  </div>
                ) : (
                  <>
                    <Field label="Type of treatment" required>
                      <select
                        required
                        value={form.service_type}
                        onChange={(event) => chooseTreatment(event.target.value)}
                        className={fieldClass}
                      >
                        {options.treatment_types.map((treatment) => (
                          <option key={treatment} value={treatment}>
                            {treatment}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mist">
                        Choose your therapist <span className="text-coral-red">*</span>
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {availableTherapists.map((therapist) => {
                          const selected = String(therapist.id) === String(form.therapist_id);
                          return (
                            <button
                              key={therapist.id}
                              type="button"
                              onClick={() => update("therapist_id", String(therapist.id))}
                              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                                selected
                                  ? "border-harbor bg-harbor-light ring-2 ring-harbor/10"
                                  : "border-mist-light hover:border-harbor/40 hover:bg-chalk"
                              }`}
                            >
                              <span
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                                style={{ backgroundColor: therapist.color || "#146B6B" }}
                              >
                                {therapist.name.charAt(0)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-ink">
                                  {therapist.name}
                                </span>
                                <span className="block truncate text-xs text-mist">
                                  {therapist.specialty}
                                </span>
                              </span>
                              {selected && <Check size={17} className="flex-shrink-0 text-harbor" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </FormSection>

              <FormSection icon={LockKeyhole} number="3" title="Parent contact and credentials">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Parent or guardian name" required>
                    <input
                      required
                      value={form.guardian_name}
                      onChange={(event) => update("guardian_name", event.target.value)}
                      className={fieldClass}
                      placeholder="Maria Dela Cruz"
                    />
                  </Field>
                  <Field label="Mobile number" hint="For SMS reminders" required>
                    <input
                      type="tel"
                      required
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
                    required
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
                      required
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
                      required
                      minLength={8}
                      maxLength={72}
                      value={form.confirm_password}
                      onChange={(event) => update("confirm_password", event.target.value)}
                      className={fieldClass}
                      autoComplete="new-password"
                    />
                  </Field>
                </div>
              </FormSection>

              {error && (
                <p role="alert" className="rounded-xl bg-coral-red-light px-4 py-3 text-sm text-coral-red">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || loadingOptions || !form.therapist_id}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sunrise px-5 py-3 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 size={17} className="animate-spin" />}
                {submitting ? "Creating enrollment..." : "Complete enrollment"}
              </button>
              <p className="text-center text-xs leading-5 text-mist">
                Your password is securely hashed. Contact details are used for clinic communication
                and appointment notifications.
              </p>
            </form>
          </main>
        </div>
      </div>
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

function FormSection({ icon: Icon, number, title, children }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3 border-b border-mist-light pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-harbor-light text-harbor-dark">
          <Icon size={16} />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-mist">Step {number}</p>
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
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
