import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../../api/axios";
import { toastSuccess, toastError } from "../../utils/toast";
import { TEAL, TEAL_LT, PAPER, Hero } from "./lessonPlanUi";

const DIMS = [
  { key: "intellectual", ar: "ذهنی", label: "Intellectual", color: "#14919B" },
  { key: "character", ar: "شخصیتی", label: "Character", color: "#C9A227" },
  { key: "social", ar: "اجتماعی", label: "Social", color: "#1A7A4C" },
  { key: "practical", ar: "عملی", label: "Practical", color: "#6B4FA0" },
];

const RATERS = [["student", "Student"], ["parent", "Parent"], ["mentor", "Mentor"]];
const CONTEXTS = [["intake", "Intake"], ["grade4", "Grade 4"], ["grade7", "Grade 7"], ["ad_hoc", "Ad-hoc"]];

const blankScores = () =>
  Object.fromEntries(DIMS.flatMap((d) => [[`${d.key}_score`, ""], [`${d.key}_note`, ""]]));

export default function QuickFourD() {
  const navigate = useNavigate();
  // student search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState(null);
  const boxRef = useRef(null);

  // form
  const [ratedBy, setRatedBy] = useState("student");
  const [context, setContext] = useState("intake");
  const [form, setForm] = useState(blankScores());
  const [evidence, setEvidence] = useState("");
  const [saving, setSaving] = useState(false);

  // debounced search
  useEffect(() => {
    if (student) return; // not searching once picked
    const q = query.trim();
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      get(`/student-management/student-profiles/search?q=${encodeURIComponent(q)}`)
        .then((r) => setResults(r.data?.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, student]);

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pick = (s) => { setStudent(s); setOpen(false); setQuery(""); setResults([]); };
  const clearStudent = () => { setStudent(null); setForm(blankScores()); setEvidence(""); };

  const hasAnyScore = DIMS.some((d) => form[`${d.key}_score`] !== "");

  const submit = async () => {
    if (!student) { toastError("Pick a student first."); return; }
    if (!hasAnyScore) { toastError("Enter at least one dimension score."); return; }
    setSaving(true);
    try {
      await post(`/student-management/students/${student.id}/profile/4d-rating`, {
        rated_by: ratedBy, context, evidence, ...form,
      });
      toastSuccess(`4D rating recorded for ${student.first_name}`);
      setForm(blankScores());
      setEvidence("");
    } catch (e) {
      toastError(e.response?.data?.message || Object.values(e.response?.data?.errors || {})[0]?.[0] || "Failed to record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Record 4D Self-Rating" subtitle="Quick entry · ارزیابی چهاربعدی — student, parent, or mentor" />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Student picker */}
        <div className="bg-white rounded-2xl border shadow-sm p-4" style={{ borderColor: "#dbe8e8" }}>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Student *</label>
          {student ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl" style={{ background: "#E8F6F6" }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black text-white flex-none" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>
                  {(student.first_name?.[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{student.first_name} {student.last_name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{student.student_id} · {student.school_class?.class_name || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-none">
                <button onClick={() => navigate(`/student-management/students/profile/${student.id}`)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white" style={{ background: TEAL }}>Full شناسنامه →</button>
                <button onClick={clearStudent} className="text-[11px] font-bold px-2 py-1.5 rounded-lg hover:bg-white" style={{ color: TEAL }}>Change</button>
              </div>
            </div>
          ) : (
            <div className="relative" ref={boxRef}>
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
                placeholder="Search by name or student ID…" className={`${inp} pl-9`} />
              {open && (query.trim() || searching) && (
                <div className="absolute z-20 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-64 overflow-y-auto" style={{ borderColor: "#dbe8e8" }}>
                  {searching ? <p className="p-3 text-center text-xs text-gray-400">Searching…</p>
                    : results.length === 0 ? <p className="p-3 text-center text-xs text-gray-400">No students found.</p>
                    : results.map((s) => (
                      <button key={s.id} onClick={() => pick(s)} className="w-full text-left px-3 py-2.5 hover:bg-teal-50 border-b last:border-0 flex items-center gap-2.5" style={{ borderColor: "#f0f4f4" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black text-white flex-none" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>
                          {(s.first_name?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                          <p className="text-[10px] text-gray-400">{s.student_id} · {s.school_class?.class_name || "—"}</p>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-4" style={{ borderColor: "#dbe8e8" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Seg label="Rated by" value={ratedBy} onChange={setRatedBy} options={RATERS} />
            <Seg label="Context" value={context} onChange={setContext} options={CONTEXTS} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DIMS.map((d) => (
              <div key={d.key} className="rounded-xl p-3 border" style={{ borderColor: d.color + "55", background: d.color + "0a" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" dir="rtl" style={{ color: d.color }}>{d.ar}</span>
                  <span className="text-[10px] text-gray-400">{d.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={10} step={0.1} value={form[`${d.key}_score`]} onChange={(e) => set(`${d.key}_score`, e.target.value)}
                    placeholder="0–10" className={`${inp} w-20 text-center`} />
                  <input value={form[`${d.key}_note`]} onChange={(e) => set(`${d.key}_note`, e.target.value)} placeholder="note (optional)" className={`${inp} flex-1`} dir="auto" />
                </div>
              </div>
            ))}
          </div>

          {(ratedBy === "parent" || ratedBy === "mentor") && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Evidence</label>
              <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={2} placeholder="Concrete example supporting the rating…" className={txt} dir="auto" />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-gray-400">{student ? `Recording for ${student.first_name}` : "Pick a student to begin"}</p>
            <button onClick={submit} disabled={saving || !student}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>
              {saving ? "Recording…" : "Record rating"}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          Pick a student, then open <span style={{ color: TEAL }}>Full شناسنامه</span> to record every other section (story, habits, family…).
        </p>
      </div>
    </div>
  );
}

const inp = "px-3 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300 w-full";
const txt = "w-full px-3 py-2.5 border rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-300";

function Seg({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
            style={value === v ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
