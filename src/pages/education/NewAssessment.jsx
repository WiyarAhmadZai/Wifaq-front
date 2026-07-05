import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { assessmentFormData, createAssessment, ASSESSMENT_TYPES } from "../../api/gradebook";
import {
  Page, Header, Card, Field, Select, Input, Btn, Banner, DimensionPicker, EmptyState, Spinner, Loading, LoadingRow, ICON, TEAL,
} from "./gradebookUi";

/** Create a standalone assessment; on success jump straight to the marking screen. */
export default function NewAssessment() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    title: "", assessment_type: "monthly_exam",
    school_class_id: params.get("class") || "", subject_id: params.get("subject") || "",
    primary_dimension: "intellectual", score_max: 10, assessment_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    assessmentFormData().then((r) => {
      const p = r.data?.pairs || []; setPairs(p);
      if (!form.school_class_id && p.length) setForm((f) => ({ ...f, school_class_id: p[0].school_class_id, subject_id: p[0].subject_id }));
    }).finally(() => setLoading(false));
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
    } catch (e) { setErr(e.response?.data?.message || "Could not create the assessment."); setSaving(false); }
  }

  if (loading) return <Loading />;

  return (
    <Page size="form">
      <Header icon={ICON.check} title="New assessment" subtitle="Quiz · exam · project · activity" onBack={() => navigate(-1)} />
      {err && <Banner kind="error" onClose={() => setErr("")}>{err}</Banner>}

      {pairs.length === 0 ? (
        <EmptyState icon={ICON.check} title="No class assigned to you" description="An administrator links teachers to classes in Class Management → Grade Subjects." />
      ) : (
        <Card className="space-y-4">
          <Field label="Class · subject">
            <Select value={`${form.school_class_id}:${form.subject_id}`} onChange={(e) => { const p = pairs.find((x) => pairKey(x) === e.target.value); if (p) { set("school_class_id", p.school_class_id); set("subject_id", p.subject_id); } }}>
              {pairs.map((p) => <option key={pairKey(p)} value={pairKey(p)}>{p.class_name} · {p.subject_name}</option>)}
            </Select>
          </Field>
          <Field label="Type">
            <div className="flex flex-wrap gap-1.5">
              {ASSESSMENT_TYPES.filter((t) => t.value !== "homework").map((t) => (
                <button key={t.value} type="button" onClick={() => set("assessment_type", t.value)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all"
                  style={form.assessment_type === t.value ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: TEAL, borderColor: "#e5e7eb" }}>{t.label}</button>
              ))}
            </div>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="e.g. Sawr exam · Ch 3 & 4" /></Field>
          <Field label="Primary dimension"><DimensionPicker value={form.primary_dimension} onChange={(d) => set("primary_dimension", d)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total marks"><Input type="number" min="0.5" step="0.5" value={form.score_max} onChange={(e) => set("score_max", e.target.value)} /></Field>
            <Field label="Date"><Input type="date" value={form.assessment_date} onChange={(e) => set("assessment_date", e.target.value)} /></Field>
          </div>
          <Btn tone="primary" size="lg" full onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create & start grading →"}</Btn>
        </Card>
      )}
    </Page>
  );
}
