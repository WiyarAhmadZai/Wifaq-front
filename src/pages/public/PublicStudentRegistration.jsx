import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post } from "../../api/axios";
import { CHILD_DETAIL_SECTIONS, FAMILY_CORE_FIELDS, FAMILY_DETAIL_SECTIONS } from "./publicRegistrationFields";

const emptyChild = () => ({
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  school_class_id: "",
  details: { enrollment_type: "new" },
});

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const today = new Date().toISOString().slice(0, 10);

/** One input driven by a field definition from publicRegistrationFields. */
function Field({ field, value, onChange }) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-teal-700" />
        {field.label}
      </label>
    );
  }
  const common = { value: value ?? "", onChange: (e) => onChange(e.target.value), required: field.required, className: inputClass };
  return (
    <label className={`block text-sm font-medium text-slate-700 ${field.wide ? "md:col-span-full" : ""}`}>
      {field.label}{field.required && <span className="text-rose-600"> *</span>}
      {field.type === "select" ? (
        <select {...common}>
          <option value="">Select</option>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : field.type === "textarea" ? (
        <textarea rows={2} {...common} />
      ) : (
        <input type={field.type || "text"} min={field.type === "number" ? 1 : undefined} dir={field.type === "tel" ? "ltr" : undefined} {...common} />
      )}
    </label>
  );
}

function Section({ title, hint, children, defaultOpen = true }) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-slate-200 bg-slate-50/60">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-slate-700">
        <span>{title}{hint && <span className="ml-2 text-xs font-normal text-slate-500">{hint}</span>}</span>
        <span className="text-slate-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="grid gap-4 px-4 pb-4 md:grid-cols-3">{children}</div>
    </details>
  );
}

export default function PublicStudentRegistration() {
  const { token } = useParams();
  const [formInfo, setFormInfo] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({
    father_name: "",
    mother_name: "",
    father_phone: "",
    mother_phone: "",
    whatsapp_number: "",
    details: {},
    children: [emptyChild()],
  });

  useEffect(() => {
    get(`/public/student-registration/${encodeURIComponent(token || "")}`)
      .then((response) => setFormInfo(response.data?.data || null))
      .catch((error) => setLoadError(error.response?.status === 404
        ? "This registration link is invalid or has been disabled."
        : "Unable to load the registration form. Please try again later."))
      .finally(() => setLoading(false));
  }, [token]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateDetail = (key, value) => setForm((current) => ({ ...current, details: { ...current.details, [key]: value } }));
  const updateChild = (index, key, value) => setForm((current) => ({
    ...current,
    children: current.children.map((child, i) => (i === index ? { ...child, [key]: value } : child)),
  }));
  const updateChildDetail = (index, key, value) => setForm((current) => ({
    ...current,
    children: current.children.map((child, i) => (i === index ? { ...child, details: { ...child.details, [key]: value } } : child)),
  }));
  const addChild = () => {
    if (form.children.length < 20) update("children", [...form.children, emptyChild()]);
  };
  const removeChild = (index) => update("children", form.children.filter((_, i) => i !== index));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await post(`/public/student-registration/${encodeURIComponent(token || "")}`, {
        ...form,
        children: form.children.map((child) => ({ ...child, details: { ...child.details, parental_consent: consent } })),
      });
      setDone(true);
    } catch (error) {
      const validationErrors = error.response?.data?.errors;
      const message = validationErrors
        ? Object.values(validationErrors).flat().join("\n")
        : error.response?.data?.message || "Could not submit the registration. Please try again.";
      Swal.fire("Registration not submitted", message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading registration form…</div>;
  if (loadError) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-lg rounded-2xl bg-white p-8 text-center shadow"><h1 className="text-xl font-bold text-slate-800">Registration unavailable</h1><p className="mt-3 text-slate-600">{loadError}</p></div></div>;
  if (done) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-lg rounded-2xl bg-white p-8 text-center shadow"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div><h1 className="mt-4 text-2xl font-bold text-slate-800">Registration received</h1><p className="mt-2 text-slate-600">Thank you. The school has received your family’s registration information and will contact you.</p></div></div>;

  const classes = formInfo?.classes || [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 via-slate-50 to-cyan-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 rounded-2xl bg-gradient-to-r from-teal-700 to-cyan-700 p-6 text-white shadow-lg">
          <p className="text-sm font-medium text-teal-100">{formInfo?.school}</p>
          <h1 className="mt-1 text-2xl font-bold">Student Registration</h1>
          <p className="mt-2 text-sm text-teal-50">Fill in your family’s details once, then add every child you want to register. Fields marked * are required.</p>
        </header>
        <form onSubmit={submit} className="space-y-8 rounded-2xl bg-white p-5 shadow-lg md:p-8">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">1. Family information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {FAMILY_CORE_FIELDS.map((field) => (
                <Field key={field.key} field={field} value={form[field.key]} onChange={(v) => update(field.key, v)} />
              ))}
            </div>
            {FAMILY_DETAIL_SECTIONS.map((section) => (
              <Section key={section.title} title={section.title} hint="optional">
                {section.fields.map((field) => (
                  <Field key={field.key} field={field} value={form.details[field.key]} onChange={(v) => updateDetail(field.key, v)} />
                ))}
              </Section>
            ))}
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-slate-800">2. Children</h2><p className="text-sm text-slate-500">Add every child from your family on this form.</p></div>
              <button type="button" onClick={addChild} disabled={form.children.length >= 20} className="rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50">+ Add child</button>
            </div>
            <div className="space-y-5">
              {form.children.map((child, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-teal-800">Child {index + 1}{child.first_name ? ` — ${child.first_name}` : ""}</h3>
                    {form.children.length > 1 && <button type="button" onClick={() => removeChild(index)} className="text-sm font-medium text-rose-600 hover:text-rose-700">Remove</button>}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field field={{ key: "first_name", label: "First name", required: true }} value={child.first_name} onChange={(v) => updateChild(index, "first_name", v)} />
                    <Field field={{ key: "last_name", label: "Last name", required: true }} value={child.last_name} onChange={(v) => updateChild(index, "last_name", v)} />
                    <label className="block text-sm font-medium text-slate-700">Date of birth <span className="text-rose-600">*</span>
                      <input type="date" required max={today} value={child.date_of_birth} onChange={(e) => updateChild(index, "date_of_birth", e.target.value)} className={inputClass} />
                    </label>
                    <Field field={{ key: "gender", label: "Gender", required: true, type: "select", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }] }} value={child.gender} onChange={(v) => updateChild(index, "gender", v)} />
                    <label className="block text-sm font-medium text-slate-700 md:col-span-2">Class applying for <span className="text-rose-600">*</span>
                      <select required value={child.school_class_id} onChange={(e) => updateChild(index, "school_class_id", e.target.value)} className={inputClass}>
                        <option value="">Select class</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.grade ? ` — ${c.grade}` : ""}</option>)}
                      </select>
                    </label>
                  </div>
                  {CHILD_DETAIL_SECTIONS.map((section, sectionIndex) => (
                    <Section key={section.title} title={section.title} hint={sectionIndex === 0 ? "" : "optional"} defaultOpen={sectionIndex === 0}>
                      {section.fields.map((field) => (
                        <Field key={field.key} field={field} value={child.details[field.key]} onChange={(v) => updateChildDetail(index, field.key, v)} />
                      ))}
                    </Section>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-700" />
            <span>I confirm that the information above is correct and I agree to the school’s admission rules. <span className="text-rose-600">*</span></span>
          </label>

          <button type="submit" disabled={submitting || !classes.length} className="w-full rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white shadow transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Submitting…" : "Submit family registration"}
          </button>
          {!classes.length && <p className="text-center text-sm text-amber-700">Registration is currently unavailable because no classes are open.</p>}
        </form>
      </div>
    </main>
  );
}
