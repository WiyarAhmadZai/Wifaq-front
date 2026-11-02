import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStaffForm, saveStaffForm } from "../../api/onboarding";
import { toastSuccess, toastError } from "../../utils/toast";
import { useI18n } from "../../i18n/I18nContext";

/**
 * The staff profile form — the third onboarding step, the staff-side twin of
 * the student family questionnaire. A new colleague fills it after the
 * orientation guide and the quiz.
 *
 * It renders entirely from the schema the server sends (sections → fields), so
 * the question set lives in one place on the backend (App\Support\StaffProfileForm)
 * and this page never hard-codes a question. Answers are a flat object keyed by
 * field key; a debounced auto-save keeps a draft so nothing is lost between
 * sections, exactly like the شناسنامه.
 */
export default function StaffProfileForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [schema, setSchema] = useState(null);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);

  // Load the schema + any saved answers once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getStaffForm();
        if (!alive) return;
        const d = res.data?.data || {};
        setSchema(d.sections ? d : null);
        setAnswers(d.answers || {});
        setStatus(d.status || null);
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || "Could not load the profile form.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const set = useCallback((key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const required = useMemo(() => schema?.required || [], [schema]);
  const missing = useMemo(() => required.filter((k) => !isAnswered(k, answers, schema)), [required, answers, schema]);
  const completion = required.length
    ? Math.round(((required.length - missing.length) / required.length) * 100)
    : 100;

  // Debounced draft auto-save: any change settles into a save shortly after,
  // so leaving the page mid-form loses nothing. Skips the first render.
  const first = useRef(true);
  useEffect(() => {
    if (loading || !schema) return;
    if (first.current) { first.current = false; return; }
    if (!dirty) return;
    const tmr = setTimeout(async () => {
      setSaving(true);
      try {
        await saveStaffForm(answers, false);
        setSavedAt(new Date());
        setDirty(false);
      } catch {
        /* A failed autosave is silent; the manual Save gives the error. */
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => clearTimeout(tmr);
  }, [answers, dirty, loading, schema]);

  const saveDraft = async () => {
    setSaving(true);
    try {
      await saveStaffForm(answers, false);
      setSavedAt(new Date());
      setDirty(false);
      toastSuccess(t("Draft saved"));
    } catch (e) {
      toastError(e?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (missing.length) {
      toastError(t("Please answer every required question before submitting."));
      const el = document.getElementById(`field-${missing[0]}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    try {
      await saveStaffForm(answers, true);
      toastSuccess(t("Profile form submitted"));
      navigate("/onboarding");
    } catch (e) {
      toastError(e?.response?.data?.message || "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-9 w-9 border-4 border-teal-100 border-t-teal-600" />
      </div>
    );
  }
  if (error) return <p className="p-6 text-sm text-red-600">{error}</p>;
  if (!schema) return <p className="p-6 text-sm text-gray-600">{t("No profile form is configured yet.")}</p>;

  const submitted = status?.submitted;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5 pb-28">
      <header>
        <Link to="/onboarding" className="text-xs font-semibold text-teal-700 hover:underline">← {t("Back to onboarding")}</Link>
        <h1 className="mt-1 text-lg font-bold text-gray-900">{t("Staff Profile Form")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t("A few minutes now saves a lot of back-and-forth later. Your answers are saved as you go.")}
        </p>
        {submitted && (
          <p className="mt-2 inline-block rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            {t("Submitted")} · {new Date(submitted).toLocaleDateString?.() || status?.submitted_at}
          </p>
        )}
      </header>

      {/* Completion strip */}
      <div className="rounded-xl border border-gray-200 bg-white p-3.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
          <span>{t("Required questions")}</span>
          <span>{completion}%</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-teal-600 transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
      </div>

      {schema.sections.map((section) => (
        <section key={section.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">{section.title}</h2>
          </div>
          <div className="p-5 space-y-4">
            {section.fields.map((field) => (
              <FieldRenderer key={field.key} field={field} answers={answers} set={set} />
            ))}
          </div>
        </section>
      ))}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <span className="text-[11px] text-gray-500 flex-1">
            {saving
              ? t("Saving…")
              : savedAt
              ? `${t("Draft saved")} · ${savedAt.toLocaleTimeString()}`
              : dirty
              ? t("Unsaved changes")
              : t("All changes saved")}
          </span>
          <button type="button" onClick={saveDraft} disabled={saving} className={secondaryBtn}>
            {t("Save draft")}
          </button>
          <button type="button" onClick={submit} disabled={saving} className={primaryBtn}>
            {submitted ? t("Update & resubmit") : t("Submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Field renderers, one per schema type ─────────────────────────────── */

function FieldRenderer({ field, answers, set }) {
  const value = answers[field.key];
  const label = (
    <label className="block text-[13px] font-semibold text-gray-700 mb-1">
      {field.label}
      {field.required && <span className="text-red-500 ms-1">*</span>}
    </label>
  );

  return (
    <div id={`field-${field.key}`}>
      {label}
      {field.hint && <p className="text-[11px] text-gray-500 mb-1.5">{field.hint}</p>}
      {renderControl(field, value, (v) => set(field.key, v))}
    </div>
  );
}

function renderControl(field, value, onChange) {
  const common = { className: inp, value: value ?? "" };
  switch (field.type) {
    case "textarea":
      return <textarea rows={3} {...common} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <select className={inp} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {Object.entries(field.options || {}).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-wrap gap-2">
          {Object.entries(field.options || {}).map(([v, l]) => (
            <Choice key={v} active={value === v} onClick={() => onChange(v)}>{l}</Choice>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span className="text-sm text-gray-700">{field.label}</span>
        </label>
      );
    case "multiselect": {
      const list = Array.isArray(value) ? value : [];
      const toggle = (v) => onChange(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
      return (
        <div className="flex flex-wrap gap-2">
          {Object.entries(field.options || {}).map(([v, l]) => (
            <Choice key={v} active={list.includes(v)} onClick={() => toggle(v)}>{l}</Choice>
          ))}
        </div>
      );
    }
    case "group":
      return <GroupField field={field} rows={Array.isArray(value) ? value : []} onChange={onChange} />;
    case "number":
      return <input type="number" {...common} onChange={(e) => onChange(e.target.value)} />;
    case "date":
      return <input type="date" {...common} onChange={(e) => onChange(e.target.value)} />;
    case "tel":
      return <input type="tel" {...common} onChange={(e) => onChange(e.target.value)} />;
    case "email":
      return <input type="email" {...common} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input type="text" {...common} onChange={(e) => onChange(e.target.value)} />;
  }
}

function GroupField({ field, rows, onChange }) {
  const subFields = field.fields || [];
  const blankRow = () => Object.fromEntries(subFields.map((f) => [f.key, ""]));
  const update = (i, key, val) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const addRow = () => onChange([...rows, blankRow()]);

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
          <div className="grid sm:grid-cols-2 gap-2.5">
            {subFields.map((f) => (
              <div key={f.key}>
                <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">{f.label}</label>
                {renderControl({ ...f, type: f.type === "group" ? "text" : f.type }, row[f.key], (v) => update(i, f.key, v))}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => removeRow(i)} className="mt-2 text-[11px] font-semibold text-red-500 hover:underline">
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-dashed border-teal-400 text-teal-700 hover:bg-teal-50">
        + {field.label ? "Add" : "Add"}
      </button>
    </div>
  );
}

function Choice({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
        active ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
      }`}>
      {children}
    </button>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors";
const primaryBtn = "px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50";
const secondaryBtn = "px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50";

/** Mirror of the backend isAnswered() so the client's required-check agrees. */
function isAnswered(key, answers, schema) {
  const field = flattenFields(schema).find((f) => f.key === key);
  if (!field) return false;
  const value = answers[key];
  switch (field.type) {
    case "checkbox": return !!value;
    case "multiselect":
    case "group": return Array.isArray(value) && value.length > 0;
    case "number": return value !== null && value !== undefined && value !== "";
    default: return typeof value === "string" && value.trim() !== "";
  }
}

function flattenFields(schema) {
  if (!schema?.sections) return [];
  return schema.sections.flatMap((s) => s.fields);
}
