import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assessmentFormData, assignHomework } from "../../api/gradebook";
import { Hero, Spinner } from "./lessonPlanUi";
import { PAPER, TEAL } from "./gradebookUi";

/** Directly assign homework to one of the teacher's class+subjects. (Homework
 *  also arrives automatically when a lesson plan with homework is delivered.) */
export default function AssignHomework() {
  const navigate = useNavigate();
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const in2days = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  const [form, setForm] = useState({ school_class_id: "", subject_id: "", homework_text: "", due_date: in2days });

  useEffect(() => {
    assessmentFormData()
      .then((r) => {
        const p = r.data?.pairs || [];
        setPairs(p);
        if (p.length) setForm((f) => ({ ...f, school_class_id: p[0].school_class_id, subject_id: p[0].subject_id }));
      })
      .finally(() => setLoading(false));
  }, []);

  const pairKey = (p) => `${p.school_class_id}:${p.subject_id}`;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setErr(""); setMsg("");
    if (!form.school_class_id) return setErr("Pick a class & subject you teach.");
    if (!form.homework_text.trim()) return setErr("Write the homework instructions.");
    setSaving(true);
    try {
      const r = await assignHomework(form);
      setMsg(r.data?.message || "Homework assigned.");
      setTimeout(() => navigate("/education/gradebook/homework"), 900);
    } catch (e) {
      setErr(e.response?.data?.message || "Could not assign homework.");
      setSaving(false);
    }
  }

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Assign homework" subtitle="To a class you teach" />
      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {err && <div className="rounded-lg bg-red-50 text-red-700 text-xs font-bold px-3 py-2">{err}</div>}
        {msg && <div className="rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-2">{msg}</div>}

        {pairs.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center text-xs text-gray-500" style={{ borderColor: "#dbe8e8" }}>
            You have no class &amp; subject assigned to you. An administrator assigns teachers to classes in <b>Class Management → Grade Subjects</b>. Once you teach a class, it appears here.
          </div>
        ) : (
          <>
            <Field label="Class · subject (only ones you teach)">
              <select value={`${form.school_class_id}:${form.subject_id}`}
                onChange={(e) => { const p = pairs.find((x) => pairKey(x) === e.target.value); if (p) { set("school_class_id", p.school_class_id); set("subject_id", p.subject_id); } }}
                className="w-full text-sm border rounded-lg px-2 py-2 bg-white" style={{ borderColor: "#dbe8e8" }}>
                {pairs.map((p) => <option key={pairKey(p)} value={pairKey(p)}>{p.class_name} · {p.subject_name}</option>)}
              </select>
            </Field>

            <Field label="Homework instructions">
              <textarea value={form.homework_text} onChange={(e) => set("homework_text", e.target.value)} maxLength={2000} rows={4}
                className="w-full text-sm border rounded-lg px-2 py-2" style={{ borderColor: "#dbe8e8" }}
                placeholder="e.g. Page 48, exercises 1–10 — adding and subtracting fractions." />
            </Field>

            <Field label="Due date">
              <input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)}
                className="w-full text-sm border rounded-lg px-2 py-2" style={{ borderColor: "#dbe8e8" }} />
            </Field>

            <button onClick={submit} disabled={saving}
              className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: TEAL }}>
              {saving ? "Assigning…" : "Assign to class →"}
            </button>
            <p className="text-[10px] text-center text-gray-400">Every active student in the class gets it. Review &amp; grade them from the Homework queue.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="rounded-xl border bg-white p-3" style={{ borderColor: "#dbe8e8" }}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">{label}</p>
      {children}
    </div>
  );
}
