import { useState, useEffect, useCallback } from "react";
import { get, post, put, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import Select2 from "../../components/hr/Select2";

const SIGNIFICANT_CHANGES = [
  "Significant educational progress", "Ethical/personal growth", "Improved social relationships",
  "Strengthened practical skills", "Improved concentration and discipline", "New behavioral problem",
  "New educational challenge", "Change in family situation", "Not a significant change",
];
const CHARACTER_TRAITS = [
  "Truthfulness and honesty", "Politeness and respect for elders", "Responsibility", "Patience and self-control",
  "Courage (telling the truth)", "Discipline", "Adherence to prayer", "Interest in Quran and spirituality",
  "Sympathy for others", "Forgiveness",
];
const SOCIAL_POSITIONS = [
  "Natural Leader — others follow", "Active Member — participates in everything", "Quiet Member — participates but doesn't initiate",
  "Introvert — prefers to be alone", "Limited but deep friendships", "Intergroup — gets along with everyone",
];
const PRACTICAL_SKILLS = [
  "Writing (handwriting, booklet quality)", "Drawing and art", "Manual skills / making", "Sports and movement",
  "Completing class tasks", "Homework (doing & bringing)", "Independent work without assistance", "Creative projects",
];
const COMMUNICATION_TYPES = ["In-person meeting", "Phone call", "WhatsApp message/text", "Sent written report", "No communication"];
const RESPONSE_PREV = ["Completely implemented suggestions", "Implemented some suggestions", "Heard but didn't implement", "Little communication", "First time receiving a report"];
const OVERALL_TREND = ["Significant progress", "Incremental progress", "Stable", "Slight regression", "Serious regression — requires intervention", "New student — first report"];

const DIMS = [
  { key: "dim_intellectual", title: "Intellectual — learning, understanding, thinking", levelLow: "Needs serious attention", multi: null },
  { key: "dim_character", title: "Character — morality, self-control, spirituality", levelLow: "Needs serious attention", multi: { field: "traits", label: "Prominent traits this period", options: CHARACTER_TRAITS } },
  { key: "dim_social", title: "Social — communication, collaboration, presence", levelLow: "Needs serious attention", single: { field: "position", label: "Social position in class", options: SOCIAL_POSITIONS } },
  { key: "dim_practical", title: "Practical — skills, completion", levelLow: "Needs serious attention", multi: { field: "skills", label: "Skills with progress or weakness", options: PRACTICAL_SKILLS } },
];

// Plain-language meaning for each status — used everywhere so the same word
// always reads the same way to mentors and to approvers.
const STATUS_META = {
  draft:     { label: "Draft",                tone: "bg-gray-100 text-gray-600",       dot: "bg-gray-400",    blurb: "Not sent yet — still being written." },
  submitted: { label: "Waiting for approval", tone: "bg-amber-100 text-amber-700",     dot: "bg-amber-500",   blurb: "Sent to the Deputy of Formation to review." },
  approved:  { label: "Approved",             tone: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", blurb: "Finalized and locked — no more changes." },
};
const STEPS = [["draft", "Write draft"], ["submitted", "Submitted for approval"], ["approved", "Approved"]];

const fmt = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

function Rating({ value, onChange, disabled, low = "Very Poor", high = "Excellent" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400">{low}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} disabled={disabled} onClick={() => onChange(value === n ? null : n)}
          className={`w-8 h-8 rounded-lg text-xs font-bold border ${value === n ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-200 text-gray-500"} disabled:opacity-60`}>{n}</button>
      ))}
      <span className="text-[10px] text-gray-400">{high}</span>
    </div>
  );
}
function Chips({ options, selected, onToggle, disabled, single }) {
  const sel = single ? (v) => selected === v : (v) => (selected || []).includes(v);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} disabled={disabled} onClick={() => onToggle(o)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${sel(o) ? "bg-teal-50 border-teal-300 text-teal-700" : "bg-white border-gray-200 text-gray-600"} disabled:opacity-60`}>{o}</button>
      ))}
    </div>
  );
}
const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-[11px] font-semibold text-gray-700 mb-1">{label}</label>
    {hint && <p className="text-[10px] text-gray-400 mb-1.5">{hint}</p>}
    {children}
  </div>
);
const Ta = (props) => <textarea rows={2} {...props} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none disabled:bg-gray-50" />;

function StatusPill({ status, className = "" }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.tone} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
    </span>
  );
}

function Stepper({ status }) {
  const idx = STEPS.findIndex(([k]) => k === status);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STEPS.map(([k, label], i) => {
        const done = i < idx, cur = i === idx;
        return (
          <div key={k} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cur ? "bg-white text-teal-700" : done ? "bg-white/25 text-white" : "bg-white/10 text-teal-100"}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${cur || done ? "bg-teal-600 text-white" : "bg-white/30 text-white"}`}>{done ? "✓" : i + 1}</span>
              {label}
            </div>
            {i < STEPS.length - 1 && <span className="text-white/40 text-[10px]">→</span>}
          </div>
        );
      })}
    </div>
  );
}

const BANNER_TONE = {
  teal: "bg-teal-50 border-teal-200 text-teal-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
};

export default function Synthesis() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isApprover, setIsApprover] = useState(false);
  const [students, setStudents] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ student_id: "", period: "" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | draft | submitted | approved
  const [editing, setEditing] = useState(null); // full synthesis object
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const __cached = peekCache("/student-syntheses");
    if (__cached) { setList(__cached?.data || []); setIsApprover(Boolean(__cached?.can_approve)); setLoading(false); }
    try {
      const r = await get("/student-syntheses");
      setList(r.data?.data || []);
      setIsApprover(Boolean(r.data?.can_approve));
    } catch { setList([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { get("/student-syntheses/students").then((r) => setStudents(r.data?.data || [])).catch(() => setStudents([])); }, []);

  const openEditor = async (id) => {
    try { const r = await get(`/student-syntheses/${id}`); setEditing(r.data?.data); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed to open", "error"); }
  };

  const createNew = async () => {
    if (!newForm.student_id || !newForm.period.trim()) { Swal.fire("Almost there", "Choose a student and type the reporting period (e.g. Q2 1405).", "info"); return; }
    setSaving(true);
    try {
      const r = await post("/student-syntheses", newForm);
      setNewOpen(false); setNewForm({ student_id: "", period: "" });
      setEditing(r.data?.data); load();
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  // ---- editor helpers ----
  const setField = (k, v) => setEditing((e) => ({ ...e, [k]: v }));
  const setDim = (dimKey, field, v) => setEditing((e) => ({ ...e, [dimKey]: { ...(e[dimKey] || {}), [field]: v } }));
  const setFam = (field, v) => setEditing((e) => ({ ...e, family_block: { ...(e.family_block || {}), [field]: v } }));
  const toggleArr = (arr, v) => (arr || []).includes(v) ? arr.filter((x) => x !== v) : [...(arr || []), v];

  const payload = () => ({
    opening_paragraph: editing.opening_paragraph, overall_progress: editing.overall_progress,
    significant_changes: editing.significant_changes, most_important_statement: editing.most_important_statement,
    dim_intellectual: editing.dim_intellectual, dim_character: editing.dim_character,
    dim_social: editing.dim_social, dim_practical: editing.dim_practical, family_block: editing.family_block,
    priority_school: editing.priority_school, priority_family: editing.priority_family, priority_student: editing.priority_student,
    overall_trend: editing.overall_trend, anything_else: editing.anything_else,
  });

  const save = async (silent) => {
    setSaving(true);
    try {
      const r = await put(`/student-syntheses/${editing.id}`, payload());
      setEditing(r.data?.data);
      if (!silent) Swal.fire({ icon: "success", title: "Saved", timer: 1100, showConfirmButton: false, toast: true, position: "top-end" });
      return true;
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); return false; }
    finally { setSaving(false); }
  };
  const autoDraft = async () => {
    setSaving(true);
    try { const r = await post(`/student-syntheses/${editing.id}/auto-draft`); setEditing(r.data?.data); Swal.fire({ icon: "success", title: "Filled from observations", text: "Review it and put it in your own words.", timer: 1800, showConfirmButton: false, toast: true, position: "top-end" }); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };
  const submit = async () => {
    const ok = await Swal.fire({
      icon: "question", title: "Submit for approval?",
      text: "The Deputy of Formation will be notified to review it. You can still edit while you wait.",
      showCancelButton: true, confirmButtonText: "Yes, submit", confirmButtonColor: "#0d9488",
    });
    if (!ok.isConfirmed) return;
    if (!(await save(true))) return;
    setSaving(true);
    try { const r = await post(`/student-syntheses/${editing.id}/submit`); setEditing(r.data?.data); load(); Swal.fire({ icon: "success", title: "Submitted for review", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" }); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };
  const approve = async () => {
    const ok = await Swal.fire({
      icon: "warning", title: "Approve & lock this report?",
      text: "Once approved it becomes final and can no longer be edited.",
      showCancelButton: true, confirmButtonText: "Yes, approve", confirmButtonColor: "#059669",
    });
    if (!ok.isConfirmed) return;
    setSaving(true);
    try { const r = await post(`/student-syntheses/${editing.id}/approve`); setEditing(r.data?.data); load(); Swal.fire({ icon: "success", title: "Approved", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" }); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const openReport = async () => {
    try {
      const r = await get(`/student-syntheses/${editing.id}/report`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "text/html" }));
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { Swal.fire("Error", "Could not open the report.", "error"); }
  };
  const downloadPdf = async () => {
    try {
      const r = await get(`/student-syntheses/${editing.id}/report?format=pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `report-${(editing.student || "student").replace(/\s+/g, "-")}-${editing.period}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { Swal.fire("Error", "Could not generate the PDF.", "error"); }
  };

  // ───────────────────── editor view ─────────────────────
  if (editing) {
    const ro = !editing.editable;
    const needsEdit = editing.editable && !editing.mentor_edited; // backend blocks submit until a real edit

    // "What to do now" — changes by the viewer's role and the report's status.
    const guide = (() => {
      if (editing.status === "approved")
        return { c: "emerald", t: "This report is approved and locked", d: `Approved${editing.approved_at ? ` on ${fmt(editing.approved_at)}` : ""}${editing.approved_by ? ` by ${editing.approved_by}` : ""}. It is final and can no longer be changed.` };
      if (editing.can_approve)
        return { c: "amber", t: "Ready for your review", d: "Read through the report below. Click “Approve & lock” to finalize it — or edit anything that needs fixing first." };
      if (editing.status === "submitted")
        return { c: "amber", t: "Submitted — waiting for approval", d: `Sent${editing.submitted_at ? ` on ${fmt(editing.submitted_at)}` : ""} to the Deputy of Formation. You can still make changes while you wait.` };
      return { c: "teal", t: "Draft — only you can see this", d: "Fill in the sections below. Tip: start with “Auto-fill from observations”, then put it in your own words. When ready, click “Submit for approval”." };
    })();

    return (
      <div className="min-h-screen bg-gray-50/60">
        <div className="bg-teal-600 px-5 py-4 sticky top-0 z-10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => { setEditing(null); load(); }} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white truncate">{editing.student} · {editing.period}</h1>
                <p className="text-[11px] text-teal-100 truncate">Student report · Mentor: {editing.instructor_name || editing.mentor}</p>
              </div>
            </div>
            <StatusPill status={editing.status} className="flex-shrink-0 ring-2 ring-white/40" />
          </div>
          <Stepper status={editing.status} />
        </div>

        <div className="px-4 py-5 max-w-3xl mx-auto space-y-4 pb-28">
          {/* What to do now */}
          <div className={`rounded-2xl border px-4 py-3 ${BANNER_TONE[guide.c]}`}>
            <p className="text-xs font-bold">{guide.t}</p>
            <p className="text-[11px] mt-0.5 leading-relaxed">{guide.d}</p>
          </div>

          {!ro && (
            <p className="text-[11px] text-gray-400 px-1">
              Fields marked <span className="font-semibold text-gray-500">*</span> make the report complete. You can save anytime — nothing is sent until you submit.
            </p>
          )}

          {/* Opening */}
          <Section title="Opening">
            <Field label="Describe this student in one paragraph *" hint="Reported directly as the 'Opening Speech'.">
              <Ta value={editing.opening_paragraph || ""} disabled={ro} onChange={(e) => setField("opening_paragraph", e.target.value)} rows={4} />
            </Field>
            <Field label="Overall progress this period *">
              <Rating value={editing.overall_progress} disabled={ro} onChange={(v) => setField("overall_progress", v)} />
            </Field>
            <Field label="Significant changes seen this period">
              <Chips options={SIGNIFICANT_CHANGES} selected={editing.significant_changes} disabled={ro} onToggle={(o) => setField("significant_changes", toggleArr(editing.significant_changes, o))} />
            </Field>
            <Field label="The most important statement about this student *" hint="If you could say one thing to the parents — what would it be?">
              <Ta value={editing.most_important_statement || ""} disabled={ro} onChange={(e) => setField("most_important_statement", e.target.value)} />
            </Field>
          </Section>

          {/* 4 dimensions */}
          {DIMS.map((d) => {
            const block = editing[d.key] || {};
            return (
              <Section key={d.key} title={d.title}>
                <Field label="Level this period *"><Rating value={block.level} disabled={ro} low={d.levelLow} onChange={(v) => setDim(d.key, "level", v)} /></Field>
                {d.multi && (
                  <Field label={d.multi.label}><Chips options={d.multi.options} selected={block[d.multi.field]} disabled={ro} onToggle={(o) => setDim(d.key, d.multi.field, toggleArr(block[d.multi.field], o))} /></Field>
                )}
                {d.single && (
                  <Field label={d.single.label}><Chips options={d.single.options} selected={block[d.single.field]} single disabled={ro} onToggle={(o) => setDim(d.key, d.single.field, block[d.single.field] === o ? "" : o)} /></Field>
                )}
                <Field label="Current image *" hint="Where is the student strong? Best subject / friendships / how they work?"><Ta value={block.current_image || ""} disabled={ro} onChange={(e) => setDim(d.key, "current_image", e.target.value)} /></Field>
                <Field label="✦ Shining moment this period" hint='If you don’t remember one, write: "To be recorded in future reports"'><Ta value={block.shining_moment || ""} disabled={ro} onChange={(e) => setDim(d.key, "shining_moment", e.target.value)} /></Field>
                <Field label="→ Focus next period *"><Ta value={block.next_focus || ""} disabled={ro} onChange={(e) => setDim(d.key, "next_focus", e.target.value)} /></Field>
                <Field label="⌂ Family suggestion *" hint="Specific and practical."><Ta value={block.family_suggestion || ""} disabled={ro} onChange={(e) => setDim(d.key, "family_suggestion", e.target.value)} /></Field>
              </Section>
            );
          })}

          {/* Family — school only */}
          <Section title="Family — collaboration & communication" badge="School team only — not shown to family">
            <Field label="Level of family collaboration *"><Rating value={editing.family_block?.collaboration_level} disabled={ro} low="Did not collaborate" high="Excellent" onChange={(v) => setFam("collaboration_level", v)} /></Field>
            <Field label="Communication this period"><Chips options={COMMUNICATION_TYPES} selected={editing.family_block?.communication_types} disabled={ro} onToggle={(o) => setFam("communication_types", toggleArr(editing.family_block?.communication_types, o))} /></Field>
            <Field label="Family's response to previous reports *"><Chips options={RESPONSE_PREV} selected={editing.family_block?.response_to_previous} single disabled={ro} onToggle={(o) => setFam("response_to_previous", editing.family_block?.response_to_previous === o ? "" : o)} /></Field>
            <Field label="Family positives this period"><Ta value={editing.family_block?.family_positives || ""} disabled={ro} onChange={(e) => setFam("family_positives", e.target.value)} /></Field>
            <Field label="What we ask of the family next period *" hint="Specific, respectful, practical — appears in the report."><Ta value={editing.family_block?.family_ask_next || ""} disabled={ro} onChange={(e) => setFam("family_ask_next", e.target.value)} /></Field>
            <Field label="Health concern / family issue (confidential)"><Ta value={editing.family_block?.health_concern || ""} disabled={ro} onChange={(e) => setFam("health_concern", e.target.value)} /></Field>
          </Section>

          {/* Priorities + overall */}
          <Section title="Priorities for next period">
            <Field label="Priority 1 — from the school *"><Ta value={editing.priority_school || ""} disabled={ro} onChange={(e) => setField("priority_school", e.target.value)} /></Field>
            <Field label="Priority 2 — from the family *"><Ta value={editing.priority_family || ""} disabled={ro} onChange={(e) => setField("priority_family", e.target.value)} /></Field>
            <Field label="Priority 3 — personal growth of the student *"><Ta value={editing.priority_student || ""} disabled={ro} onChange={(e) => setField("priority_student", e.target.value)} /></Field>
            <Field label="Overall, this student is… *">
              <Chips options={OVERALL_TREND} selected={editing.overall_trend} single disabled={ro} onToggle={(o) => setField("overall_trend", editing.overall_trend === o ? "" : o)} />
            </Field>
            <Field label="Anything else important for the report?"><Ta value={editing.anything_else || ""} disabled={ro} onChange={(e) => setField("anything_else", e.target.value)} /></Field>
          </Section>
        </div>

        {/* Sticky action bar */}
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-3 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500 hidden sm:block">
              {ro
                ? "This report is locked — view only."
                : needsEdit
                ? "Edit at least one field, then you can submit."
                : editing.status === "submitted"
                ? "Submitted. Edit if needed, or wait for approval."
                : "Save as you go. Submit when the report is ready."}
            </p>
            <div className="flex justify-end gap-2 flex-1 sm:flex-none">
              <button onClick={openReport} title="Open the printable report (Save as PDF from the browser)" className="px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl">🖨 Print</button>
              <button onClick={downloadPdf} title="Download a professional PDF report" className="px-3 py-2 text-xs font-semibold text-white rounded-xl" style={{ background: "#0D5C63" }}>⬇ PDF</button>
              {editing.editable && <button onClick={autoDraft} disabled={saving} title="Pull recent daily observations into the draft to get started" className="px-3 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl disabled:opacity-50">⚡ Auto-fill from observations</button>}
              {editing.editable && <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl disabled:opacity-50">Save</button>}
              {editing.editable && editing.status !== "submitted" && <button onClick={submit} disabled={saving || needsEdit} title={needsEdit ? "Make at least one edit before submitting" : "Send to the Deputy of Formation for approval"} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">Submit for approval</button>}
              {editing.can_approve && <button onClick={approve} disabled={saving} title="Finalize and lock this report" className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50">✓ Approve &amp; lock</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────── list view ─────────────────────
  const q = query.trim().toLowerCase();
  const filtered = list.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (!q) return true;
    return [s.student, s.period, s.mentor, s.overall_trend].some((v) => (v || "").toLowerCase().includes(q));
  });
  const groups = [
    { key: "submitted", title: "Waiting for approval", items: filtered.filter((s) => s.status === "submitted") },
    { key: "draft", title: "Drafts in progress", items: filtered.filter((s) => s.status === "draft") },
    { key: "approved", title: "Approved", items: filtered.filter((s) => s.status === "approved") },
  ];
  const myActionKey = isApprover ? "submitted" : "draft";
  const todoCount = list.filter((s) => s.status === myActionKey).length;
  const statusCount = (k) => list.filter((s) => s.status === k).length;

  const rowCta = (status) =>
    status === "approved" ? "View →"
    : status === "submitted" ? (isApprover ? "Review & approve →" : "View / edit →")
    : "Continue writing →";

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white">Student Reports (Mentor Synthesis)</h1>
          <p className="text-xs text-teal-100 mt-0.5">
            Mentors write a report each term → the Deputy of Formation approves it → it is finalized.
          </p>
        </div>
        <button onClick={() => setNewOpen(true)} className="px-3 py-1.5 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50 flex-shrink-0">+ New report</button>
      </div>

      <div className="px-4 py-5 max-w-3xl mx-auto space-y-5">
        {/* What needs my attention */}
        {!loading && list.length > 0 && (
          <div className={`rounded-2xl border px-4 py-3 ${todoCount > 0 ? BANNER_TONE.amber : BANNER_TONE.teal}`}>
            <p className="text-xs font-bold">
              {todoCount > 0
                ? isApprover
                  ? `${todoCount} report${todoCount > 1 ? "s" : ""} waiting for your review`
                  : `${todoCount} draft${todoCount > 1 ? "s" : ""} to finish and submit`
                : "You're all caught up"}
            </p>
            <p className="text-[11px] mt-0.5">
              {todoCount > 0
                ? isApprover ? "Open each one below, read it, and approve or send it back with edits."
                  : "Open a draft below to keep writing, then submit it for approval."
                : "Nothing needs your action right now."}
            </p>
          </div>
        )}

        {/* Filters */}
        {!loading && list.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by student, term, mentor…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {[["all", "All"], ["submitted", "Waiting"], ["draft", "Drafts"], ["approved", "Approved"]].map(([k, label]) => {
                const active = statusFilter === k;
                const n = k === "all" ? list.length : statusCount(k);
                return (
                  <button key={k} onClick={() => setStatusFilter(k)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${active ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
                    {label} <span className={active ? "text-teal-100" : "text-gray-400"}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-sm font-semibold text-gray-700">No reports yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Click below to write your first student report for this term.</p>
            <button onClick={() => setNewOpen(true)} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700">+ New report</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-sm font-semibold text-gray-700">No reports match your filters</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Try a different search or status.</p>
            <button onClick={() => { setQuery(""); setStatusFilter("all"); }} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200">Clear filters</button>
          </div>
        ) : (
          groups.filter((g) => g.items.length > 0).map((g) => {
            const m = STATUS_META[g.key];
            const mine = g.key === myActionKey;
            return (
              <div key={g.key}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                  <h2 className="text-xs font-bold text-gray-700">{g.title}</h2>
                  <span className="text-[10px] font-semibold text-gray-400">{g.items.length}</span>
                  {mine && <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">Needs you</span>}
                  <span className="text-[10px] text-gray-400 hidden sm:inline">· {m.blurb}</span>
                </div>
                <div className="space-y-2">
                  {g.items.map((s) => (
                    <button key={s.id} onClick={() => openEditor(s.id)}
                      className={`w-full text-left bg-white rounded-2xl border shadow-sm p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow ${mine ? "border-amber-200" : "border-gray-100"}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800">{s.student} · <span className="text-gray-500 font-normal">{s.period}</span></p>
                        <p className="text-[11px] text-gray-500">{s.mentor}{s.overall_trend ? ` · ${s.overall_trend}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusPill status={s.status} />
                        <span className="text-[11px] font-semibold text-teal-600 hidden sm:inline">{rowCta(s.status)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {newOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setNewOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-teal-600">
              <h3 className="text-sm font-bold text-white">New student report</h3>
              <p className="text-[11px] text-teal-100 mt-0.5">Pick the student and the term — we'll open a blank report you can fill in and save as you go.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Student</label>
                <Select2 value={newForm.student_id} onChange={(v) => setNewForm((f) => ({ ...f, student_id: v }))} options={students.map((s) => ({ value: s.id, label: s.name + (s.class ? ` · ${s.class}` : "") }))} placeholder="Search and select a student…" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Reporting period (term)</label>
                <input value={newForm.period} onChange={(e) => setNewForm((f) => ({ ...f, period: e.target.value }))} placeholder="e.g. Q2 1405" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-gray-400">Quick fill:</span>
                  {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                    <button key={q} type="button"
                      onClick={() => setNewForm((f) => ({ ...f, period: `${q} ${(f.period.match(/\d{3,4}/) || [""])[0]}`.trim() }))}
                      className="px-2 py-0.5 text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100">{q}</button>
                  ))}
                  <span className="text-[10px] text-gray-400">then add the year</span>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setNewOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={createNew} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">{saving ? "…" : "Start writing"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, badge, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-800">{title}</h3>
        {badge && <p className="text-[10px] text-amber-700 mt-0.5">{badge}</p>}
      </div>
      <div className="p-5 space-y-3.5">{children}</div>
    </div>
  );
}
