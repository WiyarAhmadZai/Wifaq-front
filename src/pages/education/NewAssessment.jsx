import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { assessmentFormData, createAssessment, ASSESSMENT_TYPES } from "../../api/gradebook";
import { Hero, Spinner } from "./lessonPlanUi";
import { PAPER, TEAL, DimensionPicker } from "./gradebookUi";

/** Create a standalone assessment; on success jump straight to the marking screen. */
export default function NewAssessment() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    title: "",
    assessment_type: "monthly_exam",
    school_class_id: params.get("class") || "",
    subject_id: params.get("subject") || "",
    primary_dimension: "intellectual",
    score_max: 10,
    assessment_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    assessmentFormData()
      .then((r) => {
        const p = r.data?.pairs || [];
        setPairs(p);
        if (!form.school_class_id && p.length) {
          setForm((f) => ({ ...f, school_class_id: p[0].school_class_id, subject_id: p[0].subject_id }));
        }
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pairKey = (p) => `${p.school_class_id}:${p.subject_id}`;

  async function submit() {
    setErr("");
    if (!form.title.trim()) return setErr("Give the assessment a title.");
    if (!form.school_class_id || !form.subject_id) return setErr("Pick a class and subject.");
    setSaving(true);
    try {
      const r = await createAssessment(form);
      navigate(`/education/gradebook/mark?assessment=${r.data?.data?.id}`);
    } catch (e) {
      setErr(e.response?.data?.message || "Could not create the assessment.");
      setSaving(false);
    }
  }

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="New assessment" subtitle="Quiz · exam · project · activity" />
      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {err && <div className="rounded-lg bg-red-50 text-red-700 text-xs font-bold px-3 py-2">{err}</div>}

        <Field label="Class · subject">
          <select value={`${form.school_class_id}:${form.subject_id}`}
            onChange={(e) => { const p = pairs.find((x) => pairKey(x) === e.target.value); if (p) { set("school_class_id", p.school_class_id); set("subject_id", p.subject_id); } }}
            className="w-full text-sm border rounded-lg px-2 py-2 bg-white" style={{ borderColor: "#dbe8e8" }}>
            {pairs.map((p) => <option key={pairKey(p)} value={pairKey(p)}>{p.class_name} · {p.subject_name}</option>)}
          </select>
        </Field>

        <Field label="Type">
          <div className="flex flex-wrap gap-1.5">
            {ASSESSMENT_TYPES.filter((t) => t.value !== "homework").map((t) => (
              <button key={t.value} type="button" onClick={() => set("assessment_type", t.value)}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                style={form.assessment_type === t.value ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: TEAL, borderColor: "#dbe8e8" }}>
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Title">
          <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200}
            className="w-full text-sm border rounded-lg px-2 py-2" style={{ borderColor: "#dbe8e8" }} placeholder="e.g. Sawr exam · Ch 3 & 4" />
        </Field>

        <Field label="Primary dimension">
          <DimensionPicker value={form.primary_dimension} onChange={(d) => set("primary_dimension", d)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Total marks">
            <input type="number" min="0.5" step="0.5" value={form.score_max} onChange={(e) => set("score_max", e.target.value)}
              className="w-full text-sm border rounded-lg px-2 py-2 text-center" style={{ borderColor: "#dbe8e8" }} />
          </Field>
          <Field label="Date">
            <input type="date" value={form.assessment_date} onChange={(e) => set("assessment_date", e.target.value)}
              className="w-full text-sm border rounded-lg px-2 py-2" style={{ borderColor: "#dbe8e8" }} />
          </Field>
        </div>

        <button onClick={submit} disabled={saving}
          className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: TEAL }}>
          {saving ? "Creating…" : "Create & start grading →"}
        </button>
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
