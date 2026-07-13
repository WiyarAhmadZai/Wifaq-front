import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assessmentFormData, assignHomework } from "../../api/gradebook";
import { peekCache } from "../../api/axios";
import { Page, Header, Card, Field, Select, Input, Textarea, Btn, Banner, EmptyState, Spinner, Loading, LoadingRow, ICON } from "./gradebookUi";

/** Directly assign homework to one of the teacher's class+subjects. */
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
    const __cached = peekCache("/gradebook/assessments/form-data");
    if (__cached) {
      const p = __cached?.pairs || []; setPairs(p);
      if (p.length) setForm((f) => ({ ...f, school_class_id: p[0].school_class_id, subject_id: p[0].subject_id }));
      setLoading(false);
    }
    assessmentFormData().then((r) => {
      const p = r.data?.pairs || []; setPairs(p);
      if (p.length) setForm((f) => ({ ...f, school_class_id: p[0].school_class_id, subject_id: p[0].subject_id }));
    }).finally(() => setLoading(false));
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
    } catch (e) { setErr(e.response?.data?.message || "Could not assign homework."); setSaving(false); }
  }

  if (loading) return <Loading />;

  return (
    <Page size="form">
      <Header icon={ICON.clipboard} title="Assign homework" subtitle="To a class you teach" onBack={() => navigate(-1)} />
      {msg && <Banner onClose={() => setMsg("")}>{msg}</Banner>}
      {err && <Banner kind="error" onClose={() => setErr("")}>{err}</Banner>}

      {pairs.length === 0 ? (
        <EmptyState icon={ICON.clipboard} title="No class assigned to you" description="An administrator assigns teachers to classes in Class Management → Grade Subjects. Once you teach a class, it appears here." />
      ) : (
        <Card className="space-y-4">
          <Field label="Class · subject (only ones you teach)">
            <Select value={`${form.school_class_id}:${form.subject_id}`} onChange={(e) => { const p = pairs.find((x) => pairKey(x) === e.target.value); if (p) { set("school_class_id", p.school_class_id); set("subject_id", p.subject_id); } }}>
              {pairs.map((p) => <option key={pairKey(p)} value={pairKey(p)}>{p.class_name} · {p.subject_name}</option>)}
            </Select>
          </Field>
          <Field label="Homework instructions">
            <Textarea value={form.homework_text} onChange={(e) => set("homework_text", e.target.value)} maxLength={2000} rows={4} placeholder="e.g. Page 48, exercises 1–10 — adding and subtracting fractions." />
          </Field>
          <Field label="Due date"><Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} /></Field>
          <Btn tone="primary" size="lg" full onClick={submit} disabled={saving}>{saving ? "Assigning…" : "Assign to class →"}</Btn>
          <p className="text-[11px] text-center text-gray-400">Every active student in the class gets it. Review &amp; grade them from the Homework queue.</p>
        </Card>
      )}
    </Page>
  );
}
