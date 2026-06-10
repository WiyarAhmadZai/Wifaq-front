import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  createPlan, updatePlan, getPlan, submitPlan, getPlanOptions, listPlans,
  PLAN_TYPES, DIMENSIONS, KR_TYPES, SHAMSI_MONTHS,
} from "../../api/planning";
import { PageHeader, Section, DateField, Spinner } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";
import { Balance4D } from "./planUtils";

const ICON = "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2";
const STEPS = ["Set up", "Goals", "Review"];

const blankKr = () => ({ statement: "", kr_type: "percentage", baseline: "", target: "", unit: "", current_value: "", confidence_score: "" });
const blankObjective = () => ({ statement: "", primary_4d_dimension: "cognitive", key_results: [blankKr()] });
const blankItem = () => ({ title: "", description: "", driver: "", assigned_staff_id: "", due_date: "", budget_amount: "" });

const input = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500";
const label = "block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1";

export default function PlanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", type: "annual", parent_id: "",
    period_year: "1405", period_month: "", period_week: "",
    start_date: "", end_date: "", department_id: "", narrative: "",
  });
  const [objectives, setObjectives] = useState([blankObjective()]);
  const [items, setItems] = useState([blankItem()]);

  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [parentPlans, setParentPlans] = useState([]);

  useEffect(() => {
    getPlanOptions()
      .then((r) => {
        const d = r.data?.data || {};
        setDepartments(d.departments || []);
        setStaff(d.staff || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const parentType = form.type === "monthly" ? "annual" : form.type === "weekly" ? "monthly" : null;
    if (!parentType) { setParentPlans([]); return; }
    listPlans({ type: parentType })
      .then((r) => setParentPlans(r.data?.data || r.data || []))
      .catch(() => setParentPlans([]));
  }, [form.type]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await getPlan(id);
        const p = res.data?.data || res.data;
        setForm({
          title: p.title || "", type: p.type || "annual", parent_id: p.parent_id || "",
          period_year: p.period_year || "", period_month: p.period_month || "", period_week: p.period_week || "",
          start_date: p.start_date?.slice(0, 10) || "", end_date: p.end_date?.slice(0, 10) || "",
          department_id: p.department_id || "", narrative: p.narrative || "",
        });
        setObjectives((p.objectives || []).length
          ? p.objectives.map((o) => ({
              statement: o.statement, primary_4d_dimension: o.primary_4d_dimension,
              key_results: (o.key_results || []).length
                ? o.key_results.map((k) => ({
                    statement: k.statement, kr_type: k.kr_type || "percentage",
                    baseline: k.baseline ?? "", target: k.target ?? "", unit: k.unit || "",
                    current_value: k.current_value ?? "", confidence_score: k.confidence_score ?? "",
                  }))
                : [blankKr()],
            }))
          : [blankObjective()]);
        setItems((p.items || []).length
          ? p.items.map((it) => ({
              title: it.title, description: it.description || "", driver: it.driver || "",
              assigned_staff_id: it.assigned_staff_id || "", due_date: it.due_date?.slice(0, 10) || "",
              budget_amount: it.budget_amount ?? "",
            }))
          : [blankItem()]);
      } catch {
        Swal.fire("Error", "Could not load this plan.", "error");
        navigate("/planning/plans");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updObjective = (oi, patch) => setObjectives((o) => o.map((x, i) => (i === oi ? { ...x, ...patch } : x)));
  const updKr = (oi, ki, patch) =>
    setObjectives((o) => o.map((x, i) => i === oi
      ? { ...x, key_results: x.key_results.map((k, j) => (j === ki ? { ...k, ...patch } : k)) }
      : x));

  const balanceCounts = objectives.reduce((acc, o) => {
    if (o.statement.trim()) acc[o.primary_4d_dimension] = (acc[o.primary_4d_dimension] || 0) + 1;
    return acc;
  }, {});

  const num = (v) => (v === "" || v === null ? null : Number(v));

  const buildPayload = () => ({
    ...form,
    parent_id: form.parent_id || null,
    department_id: form.department_id || null,
    period_year: num(form.period_year),
    period_month: num(form.period_month),
    period_week: num(form.period_week),
    objectives: objectives
      .filter((o) => o.statement.trim())
      .map((o) => ({
        statement: o.statement,
        primary_4d_dimension: o.primary_4d_dimension,
        key_results: o.key_results.filter((k) => k.statement.trim()).map((k) => ({
          statement: k.statement, kr_type: k.kr_type,
          baseline: num(k.baseline), target: num(k.target), unit: k.unit,
          current_value: num(k.current_value),
          confidence_score: k.confidence_score === "" ? null : Number(k.confidence_score),
        })),
      })),
    items: items.filter((it) => it.title.trim()).map((it) => ({
      title: it.title, description: it.description, driver: it.driver,
      assigned_staff_id: it.assigned_staff_id || null,
      due_date: it.due_date || null, budget_amount: num(it.budget_amount),
    })),
  });

  const save = async ({ submit }) => {
    setSaving(true);
    try {
      const payload = buildPayload();
      let planId = id;
      if (isEdit) await updatePlan(id, payload);
      else planId = (await createPlan(payload)).data?.data?.id;

      let warning = null;
      if (submit && planId) warning = (await submitPlan(planId)).data?.warning;

      await Swal.fire({
        icon: warning ? "warning" : "success",
        title: submit ? "Sent for approval" : "Saved",
        text: warning || undefined,
        timer: warning ? undefined : 1400,
        showConfirmButton: Boolean(warning),
      });
      navigate(planId ? `/planning/plans/show/${planId}` : "/planning/plans");
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not save the plan.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;

  return (
    <div className="px-4 py-5">
      <PageHeader
        title={isEdit ? "Edit Plan" : "New Plan"}
        subtitle="3 steps · Set up → Goals → Review"
        icon={ICON}
        actions={<button onClick={() => navigate("/planning/plans")} className="px-3 py-2 bg-white/15 text-white text-xs font-semibold rounded-xl hover:bg-white/25">Cancel</button>}
      />

      {/* Steps */}
      <div className="flex items-center gap-2 mb-5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <button onClick={() => setStep(i)} className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition ${i === step ? "bg-teal-600 text-white" : i < step ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${i === step ? "bg-white text-teal-700" : i < step ? "bg-emerald-500 text-white" : "bg-gray-300 text-white"}`}>{i < step ? "✓" : i + 1}</span>
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < step ? "bg-emerald-400" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div>
          {/* STEP 1 — SET UP */}
          {step === 0 && (
            <Section title="Set up the plan" subtitle="When it runs and who it's for" icon={ICON}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={label}>Title</label>
                  <input className={input} value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Leave empty to fill in automatically" />
                </div>
                <div>
                  <label className={label}>Plan type</label>
                  <select className={input} value={form.type} onChange={(e) => setField("type", e.target.value)}>
                    {PLAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Year</label>
                  <input type="number" className={input} value={form.period_year} onChange={(e) => setField("period_year", e.target.value)} placeholder="1405" />
                </div>
                {form.type !== "annual" && (
                  <div>
                    <label className={label}>Month</label>
                    <select className={input} value={form.period_month} onChange={(e) => setField("period_month", e.target.value)}>
                      <option value="">—</option>
                      {SHAMSI_MONTHS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                )}
                {form.type === "weekly" && (
                  <div>
                    <label className={label}>Week</label>
                    <input type="number" min="1" max="5" className={input} value={form.period_week} onChange={(e) => setField("period_week", e.target.value)} placeholder="1–5" />
                  </div>
                )}
                {form.type !== "annual" && (
                  <div className="sm:col-span-2">
                    <label className={label}>Part of bigger plan</label>
                    <Select2 value={form.parent_id} onChange={(v) => setField("parent_id", v)}
                      options={parentPlans.map((p) => ({ value: p.id, label: `${p.title}${p.period_year ? ` · ${p.period_year}` : ""}` }))}
                      placeholder={`Pick the ${form.type === "monthly" ? "yearly" : "monthly"} plan…`} />
                  </div>
                )}
                <div>
                  <label className={label}>Start date</label>
                  <DateField name="start_date" value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label}>End date</label>
                  <DateField name="end_date" value={form.end_date} onChange={(e) => setField("end_date", e.target.value)} className={input} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Department</label>
                  <Select2 value={form.department_id} onChange={(v) => setField("department_id", v)}
                    options={departments.map((d) => ({ value: d.id, label: d.name }))} placeholder="Search department…" />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>What is this plan about?</label>
                  <textarea className={input} rows={3} value={form.narrative} onChange={(e) => setField("narrative", e.target.value)} placeholder="A short note about what you want to do this period" />
                </div>
              </div>
            </Section>
          )}

          {/* STEP 2 — GOALS */}
          {step === 1 && (
            <>
              <Section title="Goals" subtitle="Add 2–5 goals. Each goal needs at least one way to measure success." icon="M9 12l2 2 4-4"
                action={<button onClick={() => setObjectives((o) => [...o, blankObjective()])} className="text-xs font-semibold text-teal-600 hover:text-teal-800">+ Add goal</button>}>
                <div className="space-y-4">
                  {objectives.map((o, oi) => (
                    <div key={oi} className="rounded-xl border border-gray-150 bg-gray-50/60 p-4">
                      <label className={label}>Goal {oi + 1}</label>
                      <div className="flex gap-2 items-start mb-3">
                        <input className={input} value={o.statement} onChange={(e) => updObjective(oi, { statement: e.target.value })} placeholder="What do you want to achieve?" />
                        <div className="min-w-[140px]">
                          <select className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs" value={o.primary_4d_dimension} onChange={(e) => updObjective(oi, { primary_4d_dimension: e.target.value })} title="Focus area">
                            {DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                        </div>
                        {objectives.length > 1 && <button onClick={() => setObjectives((x) => x.filter((_, i) => i !== oi))} className="text-red-500 text-xs font-semibold px-2 py-2">✕</button>}
                      </div>
                      <label className={label}>How will you measure it?</label>
                      <div className="space-y-2">
                        {o.key_results.map((k, ki) => (
                          <div key={ki} className="bg-white rounded-lg border border-gray-150 p-2.5">
                            <div className="flex gap-2 items-center">
                              <input className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs" value={k.statement} onChange={(e) => updKr(oi, ki, { statement: e.target.value })} placeholder="e.g. 85% of students finish the worksheet" />
                              {o.key_results.length > 1 && <button onClick={() => updObjective(oi, { key_results: o.key_results.filter((_, j) => j !== ki) })} className="text-red-400 text-xs px-1">✕</button>}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                              <Field lbl="Measured in">
                                <select className="w-full px-2 py-1 border border-gray-200 rounded text-[11px]" value={k.kr_type} onChange={(e) => updKr(oi, ki, { kr_type: e.target.value })}>
                                  {KR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                              </Field>
                              <Field lbl="Unit"><input className="w-full px-2 py-1 border border-gray-200 rounded text-[11px]" value={k.unit} onChange={(e) => updKr(oi, ki, { unit: e.target.value })} placeholder="%, AFN, sessions" /></Field>
                              <Field lbl="Start value"><input className="w-full px-2 py-1 border border-gray-200 rounded text-[11px]" value={k.baseline} onChange={(e) => updKr(oi, ki, { baseline: e.target.value })} placeholder="0" /></Field>
                              <Field lbl="Goal value"><input className="w-full px-2 py-1 border border-gray-200 rounded text-[11px]" value={k.target} onChange={(e) => updKr(oi, ki, { target: e.target.value })} placeholder="85" /></Field>
                              <Field lbl="Now"><input className="w-full px-2 py-1 border border-gray-200 rounded text-[11px]" value={k.current_value} onChange={(e) => updKr(oi, ki, { current_value: e.target.value })} placeholder="optional" /></Field>
                              <Field lbl="How sure (0–1)"><input type="number" step="0.1" min="0" max="1" className="w-full px-2 py-1 border border-gray-200 rounded text-[11px]" value={k.confidence_score} onChange={(e) => updKr(oi, ki, { confidence_score: e.target.value })} placeholder="0.7" /></Field>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => updObjective(oi, { key_results: [...o.key_results, blankKr()] })} className="text-[11px] font-semibold text-teal-600 hover:text-teal-800">+ Add measure</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Things to do" subtitle="Each one becomes a task when approved. Add a date for a calendar event, or an amount for a budget request." icon="M4 6h16M4 12h16M4 18h7"
                action={<button onClick={() => setItems((it) => [...it, blankItem()])} className="text-xs font-semibold text-teal-600 hover:text-teal-800">+ Add task</button>}>
                <div className="space-y-2">
                  {items.map((it, ii) => (
                    <div key={ii} className="rounded-xl border border-gray-150 bg-gray-50/60 p-3">
                      <div className="flex gap-2 items-center">
                        <input className={input} value={it.title} onChange={(e) => setItems((x) => x.map((y, i) => i === ii ? { ...y, title: e.target.value } : y))} placeholder="What needs to be done?" />
                        {items.length > 1 && <button onClick={() => setItems((x) => x.filter((_, i) => i !== ii))} className="text-red-500 text-xs font-semibold px-2">✕</button>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        <Field lbl="Who does it">
                          <Select2 size="sm" value={it.assigned_staff_id} onChange={(v) => setItems((x) => x.map((y, i) => i === ii ? { ...y, assigned_staff_id: v } : y))}
                            options={staff.map((s) => ({ value: s.id, label: s.name }))} placeholder="Choose person…" />
                        </Field>
                        <Field lbl="Due date">
                          <DateField name={`due_${ii}`} value={it.due_date} onChange={(e) => setItems((x) => x.map((y, i) => i === ii ? { ...y, due_date: e.target.value } : y))} className="w-full px-2 py-1.5 border border-gray-200 rounded text-[11px]" />
                        </Field>
                        <Field lbl="In charge"><input className="w-full px-2 py-1.5 border border-gray-200 rounded text-[11px]" value={it.driver} onChange={(e) => setItems((x) => x.map((y, i) => i === ii ? { ...y, driver: e.target.value } : y))} placeholder="name" /></Field>
                        <Field lbl="Budget (AFN)"><input type="number" min="0" className="w-full px-2 py-1.5 border border-gray-200 rounded text-[11px]" value={it.budget_amount} onChange={(e) => setItems((x) => x.map((y, i) => i === ii ? { ...y, budget_amount: e.target.value } : y))} placeholder="optional" /></Field>
                      </div>
                      <input className="w-full px-2 py-1.5 border border-gray-200 rounded text-[11px] mt-2" value={it.description} onChange={(e) => setItems((x) => x.map((y, i) => i === ii ? { ...y, description: e.target.value } : y))} placeholder="Notes (optional)" />
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* STEP 3 — REVIEW */}
          {step === 2 && (
            <Section title="Review" subtitle="Check everything before you save" icon="M5 13l4 4L19 7">
              <div className="space-y-3 text-sm">
                <Row k="Title">{form.title || "(filled in automatically)"}</Row>
                <Row k="Type / time">{form.type} · {form.period_year || "—"}{form.period_month ? ` · ${SHAMSI_MONTHS[form.period_month]}` : ""}{form.period_week ? ` · week ${form.period_week}` : ""}</Row>
                <Row k="Goals">{objectives.filter((o) => o.statement.trim()).length}</Row>
                <Row k="Measures">{objectives.reduce((a, o) => a + o.key_results.filter((k) => k.statement.trim()).length, 0)}</Row>
                <Row k="Things to do">{items.filter((it) => it.title.trim()).length}</Row>
                <Row k="With a budget">{items.filter((it) => it.budget_amount && Number(it.budget_amount) > 0).length}</Row>
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-2">
                <button onClick={() => save({ submit: false })} disabled={saving} className="px-4 py-2.5 bg-white border border-teal-200 text-teal-700 text-sm font-semibold rounded-xl hover:bg-teal-50 disabled:opacity-50">{saving ? "Saving…" : "Save as draft"}</button>
                <button onClick={() => save({ submit: true })} disabled={saving} className="px-4 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Save & send for approval"}</button>
              </div>
            </Section>
          )}

          <div className="flex justify-between items-center mt-3">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl disabled:opacity-40">← Back</button>
            <span className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700">Next →</button>
            ) : <span className="w-24" />}
          </div>
        </div>

        <div className="space-y-4">
          <Section title="Balance check" subtitle="Try to cover all four areas" icon="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z">
            <Balance4D counts={balanceCounts} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Field({ lbl, children }) {
  return (
    <div>
      <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{lbl}</span>
      {children}
    </div>
  );
}

function Row({ k, children }) {
  return (
    <div className="flex justify-between items-center gap-2 border-b border-gray-100 pb-2 last:border-0">
      <span className="text-gray-500">{k}</span>
      <span className="font-semibold text-gray-800 capitalize text-right">{children}</span>
    </div>
  );
}
