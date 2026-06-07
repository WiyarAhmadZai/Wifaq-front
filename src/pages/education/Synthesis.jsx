import { useState, useEffect, useCallback } from "react";
import { get, post, put } from "../../api/axios";
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

const statusTone = { draft: "bg-gray-100 text-gray-600", submitted: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700" };

export default function Synthesis() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ student_id: "", period: "" });
  const [editing, setEditing] = useState(null); // full synthesis object
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get("/student-syntheses");
      setList(r.data?.data || []);
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
    if (!newForm.student_id || !newForm.period.trim()) { Swal.fire("Missing", "Pick a student and a period (e.g. Q2 1405).", "warning"); return; }
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
    try { const r = await post(`/student-syntheses/${editing.id}/auto-draft`); setEditing(r.data?.data); Swal.fire({ icon: "success", title: "Draft generated", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" }); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };
  const submit = async () => {
    if (!(await save(true))) return;
    setSaving(true);
    try { const r = await post(`/student-syntheses/${editing.id}/submit`); setEditing(r.data?.data); load(); Swal.fire({ icon: "success", title: "Submitted for review", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" }); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };
  const approve = async () => {
    setSaving(true);
    try { const r = await post(`/student-syntheses/${editing.id}/approve`); setEditing(r.data?.data); load(); Swal.fire({ icon: "success", title: "Approved", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" }); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  // ───────────────────── editor view ─────────────────────
  if (editing) {
    const ro = !editing.editable;
    return (
      <div className="min-h-screen bg-gray-50/60">
        <div className="bg-teal-600 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditing(null); load(); }} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">{editing.student} · {editing.period}</h1>
              <p className="text-[11px] text-teal-100">Mentor synthesis · {editing.instructor_name}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${statusTone[editing.status]}`}>{editing.status}</span>
        </div>

        <div className="px-4 py-5 max-w-3xl mx-auto space-y-4 pb-28">
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
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-3 flex justify-end gap-2 z-20">
          {editing.editable && <button onClick={autoDraft} disabled={saving} className="px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl disabled:opacity-50">⚡ Auto-draft</button>}
          {editing.editable && <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl disabled:opacity-50">Save draft</button>}
          {editing.editable && editing.status !== "submitted" && <button onClick={submit} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">Submit for review</button>}
          {editing.can_approve && <button onClick={approve} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50">Approve</button>}
        </div>
      </div>
    );
  }

  // ───────────────────── list view ─────────────────────
  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-white">Mentor Synthesis</h1>
          <p className="text-xs text-teal-100 mt-0.5">Quarterly descriptive report — draft, submit, approve</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="px-3 py-1.5 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50">+ New synthesis</button>
      </div>

      <div className="px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No syntheses yet.</div>
        ) : (
          <div className="space-y-2">
            {list.map((s) => (
              <button key={s.id} onClick={() => openEditor(s.id)} className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800">{s.student} · <span className="text-gray-500 font-normal">{s.period}</span></p>
                  <p className="text-[11px] text-gray-500">{s.mentor}{s.overall_trend ? ` · ${s.overall_trend}` : ""}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize flex-shrink-0 ${statusTone[s.status]}`}>{s.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {newOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setNewOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-teal-600"><h3 className="text-sm font-bold text-white">New synthesis</h3></div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Student</label>
                <Select2 value={newForm.student_id} onChange={(v) => setNewForm((f) => ({ ...f, student_id: v }))} options={students.map((s) => ({ value: s.id, label: s.name + (s.class ? ` · ${s.class}` : "") }))} placeholder="Select a student…" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Period</label>
                <input value={newForm.period} onChange={(e) => setNewForm((f) => ({ ...f, period: e.target.value }))} placeholder="e.g. Q2 1405" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setNewOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={createNew} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">{saving ? "…" : "Open"}</button>
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
