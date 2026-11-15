import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post } from "../../api/axios";
import Select2 from "../../components/hr/Select2";
import { handleValidationErrors } from "../../utils/formErrors";
import { MESSAGE_TEMPLATES, CALL_STEPS, NEVER_DO } from "./callGuide";
import {
  METHODS, DIRECTIONS, CATEGORIES, OUTCOMES, CONTACT_PERSON,
  optionsOf, TEAL, MUTED,
} from "./parentCommsUi";

/**
 * Record / correct one parent communication.
 *
 * Hand-written rather than CrudFormPage because this form needs three things
 * that the generic one does not do: the student list narrows to the chosen
 * family, the phone field pre-fills from whichever parent was contacted, and
 * attachments ride along as multipart. Everything else — section layout, the
 * back arrow, cancel/submit bottom-right — follows the project's form pattern.
 *
 * Status is NOT in this form. Follow-up state is changed from the list or the
 * follow-up board, which is where the project keeps every status control.
 */

const Section = ({ title, hint, children }) => (
  <div className="border-t border-gray-100 pt-5 mt-5 first:border-0 first:pt-0 first:mt-0">
    <h2 className="text-sm font-bold mb-1" style={{ color: TEAL }}>{title}</h2>
    {hint && <p className="text-[11px] mb-3" style={{ color: MUTED }}>{hint}</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({ label, required, error, full, children }) => (
  <div className={full ? "md:col-span-2" : ""}>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {error && <p className="text-[11px] text-rose-600 mt-1">{Array.isArray(error) ? error[0] : error}</p>}
  </div>
);

const inputCls =
  "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500";

export default function ParentCommunicationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [options, setOptions] = useState({ families: [], students: [], classes: [], departments: [], staff: [] });
  const [form, setForm] = useState({
    family_id: searchParams.get("family_id") || "",
    student_id: "",
    school_class_id: "",
    contact_person: "father",
    phone_used: "",
    contacted_at: new Date().toISOString().slice(0, 16),
    method: "phone",
    direction: "school",
    category: "informational",
    outcome: "reached",
    subject: "",
    message_conveyed: "",
    parent_response: "",
    parent_concerns: "",
    follow_up_actions: "",
    notes: "",
    follow_up_required: false,
    follow_up_date: "",
    follow_up_assigned_to: "",
    department_id: "",
    escalated: false,
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [optionsError, setOptionsError] = useState("");

  /**
   * Pull the pickers.
   *
   * `cache: false` on purpose. The shared axios layer keeps GET responses in
   * localStorage across reloads, which is right for a list the user is paging
   * through and wrong here: a create form that shows a snapshot of the family
   * roster from an earlier session is worse than one that waits. It also means
   * a bad response can never be pinned in storage and re-served after the
   * cause is fixed — which is exactly how an empty Family dropdown survives a
   * page refresh.
   */
  const loadOptions = useCallback(async () => {
    setOptionsError("");
    try {
      const res = await get("/parent-communications/form-data", { cache: false });
      const payload = res.data?.data || {};
      setOptions(payload);
      if (!(payload.families || []).length) {
        setOptionsError("The server returned no families. Check that families are registered.");
      }
    } catch (error) {
      // Say what actually went wrong. "Could not load the form options" sends
      // the reader looking in the wrong place when the real answer is a 403.
      const status = error.response?.status;
      const detail = error.response?.data?.message || error.message || "Unknown error";
      setOptionsError(status ? `${status}: ${detail}` : detail);
      Swal.fire("Could not load the form options", detail, "error");
    }
  }, []);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await get(`/parent-communications/show/${id}`);
        const d = res.data?.data || {};
        setForm((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.keys(prev).map((k) => [k, d[k] ?? (typeof prev[k] === "boolean" ? false : "")]),
          ),
          // datetime-local wants "YYYY-MM-DDTHH:mm", not the API's space form.
          contacted_at: d.contacted_at ? String(d.contacted_at).replace(" ", "T").slice(0, 16) : "",
          follow_up_date: d.follow_up_date ? String(d.follow_up_date).slice(0, 10) : "",
          follow_up_required: Boolean(d.follow_up_required),
          escalated: Boolean(d.escalated),
        }));
      } catch {
        Swal.fire("Error", "Could not load this record.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  /** Only this family's children — picking another family's child is never right. */
  const studentOptions = useMemo(() => {
    const all = options.students || [];
    const scoped = form.family_id
      ? all.filter((s) => String(s.family_id) === String(form.family_id))
      : all;
    return scoped.map((s) => ({ value: s.id, label: s.label }));
  }, [options.students, form.family_id]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  /** Choosing a family (or switching which parent answered) fills the phone. */
  const onFamilyChange = (familyId) => {
    const fam = (options.families || []).find((f) => String(f.id) === String(familyId));
    set({
      family_id: familyId || "",
      student_id: "",
      phone_used: fam ? (form.contact_person === "mother" ? fam.mother_phone : fam.father_phone) || "" : "",
    });
  };

  const onContactPersonChange = (person) => {
    const fam = (options.families || []).find((f) => String(f.id) === String(form.family_id));
    set({
      contact_person: person,
      phone_used: fam ? (person === "mother" ? fam.mother_phone : fam.father_phone) || form.phone_used : form.phone_used,
    });
  };

  const onStudentChange = (studentId) => {
    const stu = (options.students || []).find((s) => String(s.id) === String(studentId));
    set({ student_id: studentId || "", school_class_id: stu?.school_class_id || form.school_class_id });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});

    // Multipart, because attachments ride along with the record. Booleans go
    // as 1/0 — a FormData value is always a string, and "false" is truthy.
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") return;
      fd.append(k, typeof v === "boolean" ? (v ? 1 : 0) : v);
    });
    if (!form.follow_up_required) fd.set("follow_up_required", 0);
    if (!form.escalated) fd.set("escalated", 0);
    files.forEach((f) => fd.append("attachments[]", f));

    try {
      const url = isEdit ? `/parent-communications/edit/${id}` : "/parent-communications/store";
      await post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      Swal.fire({
        icon: "success",
        title: isEdit ? "Communication updated" : "Communication recorded",
        timer: 1600,
        showConfirmButton: false,
      });
      navigate("/parent-communications");
    } catch (error) {
      // handleValidationErrors reads the RESPONSE (status + data.errors), not
      // the axios error wrapper.
      handleValidationErrors(error.response, setErrors);
      if (!error.response?.data?.errors) {
        Swal.fire("Error", error.response?.data?.message || "Could not save the record.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-10 text-center text-sm" style={{ color: MUTED }}>Loading…</div>;
  }

  return (
    <div className="px-4 py-5">
      <div className="flex items-center gap-3 mb-5">
        <button type="button" onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50" title="Back">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-800">
            {isEdit ? "Edit Communication" : "Record a Communication"}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            Fill this in right after the call or meeting, while the details are fresh.
          </p>
        </div>
      </div>

      {/* The protocol, one click away while the call is still live. Collapsed by
          default so it never pushes the form off screen. */}
      <details className="mb-4 bg-white border border-gray-100 rounded-2xl p-4">
        <summary className="text-sm font-bold cursor-pointer" style={{ color: TEAL }}>
          Call script &amp; protocol — رهنمود تماس تلیفونی
        </summary>
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: MUTED }}>
              ساختار مکالمه
            </div>
            <ol className="space-y-1.5">
              {CALL_STEPS.map((st) => (
                <li key={st.step} className="text-[12px]">
                  <bdi dir="auto" className="font-semibold">{st.step}. {st.title}</bdi>
                  <bdi dir="auto" className="block text-[11px] mt-0.5" style={{ color: MUTED }}>{st.script}</bdi>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "#B0546E" }}>
              هرگز
            </div>
            <ul className="space-y-1.5">
              {NEVER_DO.map((n, i) => (
                <li key={i} className="text-[12px] flex gap-1.5">
                  <span style={{ color: "#B0546E" }}>✕</span>
                  <bdi dir="auto">{n}</bdi>
                </li>
              ))}
            </ul>
            <Link to="/parent-communications/call-guide"
              className="inline-block mt-3 text-[11px] font-semibold underline" style={{ color: TEAL }}>
              Open the full call guide
            </Link>
          </div>
        </div>
      </details>

      <form onSubmit={submit} className="bg-white border border-gray-100 rounded-2xl p-5">
        <Section title="Who was contacted" hint="A family-level contact (a meeting invitation, a fee reminder) needs no child.">
          <Field label="Family" required error={errors.family_id}>
            <Select2
              value={form.family_id}
              onChange={onFamilyChange}
              options={(options.families || []).map((f) => ({ value: f.id, label: f.label }))}
              placeholder={
                (options.families || []).length
                  ? `Search ${options.families.length} families…`
                  : "Loading families…"
              }
              error={!!errors.family_id}
            />
            {optionsError && (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[11px] text-rose-600">{optionsError}</span>
                <button type="button" onClick={loadOptions}
                  className="text-[11px] font-semibold underline" style={{ color: TEAL }}>
                  Retry
                </button>
              </div>
            )}
          </Field>
          <Field label="Student (optional)" error={errors.student_id}>
            <Select2
              value={form.student_id}
              onChange={onStudentChange}
              options={studentOptions}
              placeholder={form.family_id ? "Pick a child…" : "Choose a family first"}
              disabled={!form.family_id}
            />
          </Field>
          <Field label="Who answered" error={errors.contact_person}>
            <select className={inputCls} value={form.contact_person}
              onChange={(e) => onContactPersonChange(e.target.value)}>
              {optionsOf(CONTACT_PERSON).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Phone used" error={errors.phone_used}>
            <input className={inputCls} value={form.phone_used}
              onChange={(e) => set({ phone_used: e.target.value })}
              placeholder="Pre-filled from the family record" />
          </Field>
        </Section>

        <Section title="When and how" hint="The date the contact happened — not necessarily today.">
          <Field label="Date & time" required error={errors.contacted_at}>
            <input type="datetime-local" className={inputCls} value={form.contacted_at}
              onChange={(e) => set({ contacted_at: e.target.value })} />
          </Field>
          <Field label="Method" required error={errors.method}>
            <select className={inputCls} value={form.method} onChange={(e) => set({ method: e.target.value })}>
              {optionsOf(METHODS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Initiated by" error={errors.direction}>
            <select className={inputCls} value={form.direction} onChange={(e) => set({ direction: e.target.value })}>
              {optionsOf(DIRECTIONS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Purpose" error={errors.category}>
            <select className={inputCls} value={form.category} onChange={(e) => set({ category: e.target.value })}>
              {optionsOf(CATEGORIES).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — target {CATEGORIES[o.value].target}%
                </option>
              ))}
            </select>
          </Field>
          <Field label="Outcome" error={errors.outcome}>
            <select className={inputCls} value={form.outcome} onChange={(e) => set({ outcome: e.target.value })}>
              {optionsOf(OUTCOMES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Department" error={errors.department_id}>
            <Select2
              value={form.department_id}
              onChange={(v) => set({ department_id: v || "" })}
              options={(options.departments || []).map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Which department this belongs to…"
            />
          </Field>
        </Section>

        <Section title="What was said" hint="Be specific. “Discussed the low science score and the study resources available” beats “talked about grades”.">
          {/* The agreed openings, from ضمیمه الف and the winter phone script.
              Starting from the school's own wording beats a blank box, and it
              is why two officers describing the same call read the same. */}
          <div className="md:col-span-2">
            <div className="text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>
              Start from a template
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MESSAGE_TEMPLATES.map((tpl) => (
                <button key={tpl.key} type="button"
                  onClick={() => set({ subject: tpl.subject, message_conveyed: tpl.message, category: tpl.category })}
                  className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border hover:bg-teal-50"
                  style={{ borderColor: "#D0E0E0", color: TEAL }}>
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Subject" required error={errors.subject} full>
            <input className={inputCls} dir="auto" value={form.subject}
              onChange={(e) => set({ subject: e.target.value })}
              placeholder="e.g. غیرحاضری سه روزه بدون اطلاع" />
          </Field>
          <Field label="What was conveyed to the parents" required error={errors.message_conveyed} full>
            <textarea rows={4} dir="auto" className={inputCls} value={form.message_conveyed}
              onChange={(e) => set({ message_conveyed: e.target.value })} />
          </Field>
          <Field label="What was received from the parents" error={errors.parent_response} full>
            <textarea rows={3} dir="auto" className={inputCls} value={form.parent_response}
              onChange={(e) => set({ parent_response: e.target.value })} />
          </Field>
          <Field label="Parent concerns or questions" error={errors.parent_concerns} full>
            <textarea rows={3} dir="auto" className={inputCls} value={form.parent_concerns}
              onChange={(e) => set({ parent_concerns: e.target.value })} />
          </Field>
          <Field label="Additional notes" error={errors.notes} full>
            <textarea rows={2} dir="auto" className={inputCls} value={form.notes}
              onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </Section>

        <Section title="Follow-up" hint="Anything promised to a parent belongs here, with a date and an owner.">
          <Field label="Does this need following up?" full>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4 accent-teal-600"
                checked={form.follow_up_required}
                onChange={(e) => set({ follow_up_required: e.target.checked })} />
              Yes — a follow-up is required
            </label>
          </Field>
          {form.follow_up_required && (
            <>
              <Field label="Follow-up date" error={errors.follow_up_date}>
                <input type="date" className={inputCls} value={form.follow_up_date}
                  onChange={(e) => set({ follow_up_date: e.target.value })} />
              </Field>
              <Field label="Responsible staff" error={errors.follow_up_assigned_to}>
                <Select2
                  value={form.follow_up_assigned_to}
                  onChange={(v) => set({ follow_up_assigned_to: v || "" })}
                  options={(options.staff || []).map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Who will do it…"
                />
              </Field>
              <Field label="Follow-up action" error={errors.follow_up_actions} full>
                <textarea rows={2} dir="auto" className={inputCls} value={form.follow_up_actions}
                  onChange={(e) => set({ follow_up_actions: e.target.value })}
                  placeholder="What needs to be done, by when, by whom" />
              </Field>
            </>
          )}
          <Field label="Flag for leadership" full>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4 accent-rose-600"
                checked={form.escalated}
                onChange={(e) => set({ escalated: e.target.checked })} />
              Escalate — leadership should see this one
            </label>
          </Field>
        </Section>

        <Section title="Attachments" hint="A note sent home, a medical certificate, a signed form. Up to 10 MB each.">
          <Field label="Add files" full error={errors["attachments.0"]}>
            <input type="file" multiple className={inputCls}
              onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && (
              <p className="text-[11px] mt-1" style={{ color: MUTED }}>
                {files.length} file(s) will be attached on save.
              </p>
            )}
          </Field>
        </Section>

        <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-gray-100">
          <button type="button" onClick={() => navigate("/parent-communications")}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Record communication"}
          </button>
        </div>
      </form>
    </div>
  );
}
