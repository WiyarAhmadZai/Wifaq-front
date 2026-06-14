import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  createPlan, updatePlan, getPlan, submitPlan, getPlanOptions, listPlans,
  PLAN_TYPES, SHAMSI_MONTHS, DIMENSIONS, KR_TYPES,
} from "../../api/planning";
import { getChartOfAccounts } from "../../api/financial";
import { get } from "../../api/axios";
import { PageHeader, Section, DateField, Spinner } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";
import { Balance4D } from "./planUtils";
import * as XLSX from "xlsx";
import { buildPlanFromRows } from "../../utils/planImport";

const ICON = "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2";

const input = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500";
const cell = "w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-500";
const label = "block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1";

const TASK_TYPES = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];
const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// Only Expense leaf accounts are valid budget categories for a PR line.
const isExpenseLeaf = (c) => c?.is_active !== false && c?.type === "Expense" && (c?.level ?? 1) >= 3;

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(n || 0).toLocaleString();

// Stable local ids so a purchase request can reference an event/meeting on the
// page before any of them have been saved.
let _uid = 0;
const uid = () => `r${++_uid}`;

const blankKr = () => ({ statement: "", kr_type: "percentage", baseline: "", target: "", unit: "", current_value: "", confidence_score: "" });
const blankObjective = () => ({ statement: "", primary_4d_dimension: "cognitive", key_results: [blankKr()] });
const blankEvent = () => ({ uid: uid(), title: "", description: "", start_date: "", end_date: "", location: "", responsible_staff_id: "" });
const blankMeeting = () => ({ uid: uid(), title: "", description: "", meeting_date: "", start_time: "09:00", end_time: "10:00", location: "", meeting_type: "routine", participant_staff_ids: [] });
const blankTask = () => ({ uid: uid(), title: "", task_type: "normal", assigned_staff_id: "", start_date: "", deadline: "", notes: "" });
const blankPrItem = () => ({ item_name: "", description: "", quantity: 1, unit: "piece", estimated_unit_price: 0, chart_account_id: null, stock_id: null });
const blankPurchase = () => ({ uid: uid(), request_date: today(), priority: "medium", purpose: "", notes: "", link: "", items: [blankPrItem()] });

export default function PlanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", type: "annual", parent_id: "",
    period_year: "1405", period_month: "", period_week: "",
    start_date: "", end_date: "", department_id: "", narrative: "",
  });

  const [objectives, setObjectives] = useState([blankObjective()]);
  const [events, setEvents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [parentPlans, setParentPlans] = useState([]);
  const [chart, setChart] = useState([]);
  const [stockRows, setStockRows] = useState([]);

  // Avoid clobbering edit-loaded items if options resolve after the plan.
  const loadedRef = useRef(false);
  const fileRef = useRef(null);

  useEffect(() => {
    getPlanOptions()
      .then((r) => {
        const d = r.data?.data || {};
        setDepartments(d.departments || []);
        setStaff(d.staff || []);
      })
      .catch(() => {});
    getChartOfAccounts()
      .then((r) => setChart(r.data?.data || []))
      .catch(() => setChart([]));
    get("/purchase/stock")
      .then((r) => setStockRows(r.data?.data?.data || r.data?.data || []))
      .catch(() => setStockRows([]));
  }, []);

  useEffect(() => {
    const parentType = form.type === "monthly" ? "annual" : form.type === "weekly" ? "monthly" : null;
    if (!parentType) { setParentPlans([]); return; }
    listPlans({ type: parentType })
      .then((r) => setParentPlans(r.data?.data || r.data || []))
      .catch(() => setParentPlans([]));
  }, [form.type]);

  useEffect(() => {
    if (!isEdit || loadedRef.current) return;
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
        hydrateItems(p.items || []);
        loadedRef.current = true;
      } catch {
        Swal.fire("Error", "Could not load this plan.", "error");
        navigate("/planning/plans");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Map saved plan_items (grouped by kind) back into the section state.
  const hydrateItems = (items) => {
    const sorted = [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const posToUid = {}; // position → row uid (for resolving purchase links)
    const ev = [], me = [], ta = [], pu = [];

    for (const it of sorted) {
      const m = it.meta || {};
      if (it.kind === "event") {
        const u = uid();
        posToUid[it.position] = u;
        ev.push({ uid: u, title: it.title || "", description: it.description || "", start_date: (m.start_date || "").slice(0, 10), end_date: (m.end_date || "").slice(0, 10), location: m.location || "", responsible_staff_id: m.responsible_staff_id || "" });
      } else if (it.kind === "meeting") {
        const u = uid();
        posToUid[it.position] = u;
        me.push({ uid: u, title: it.title || "", description: it.description || "", meeting_date: (m.meeting_date || "").slice(0, 10), start_time: (m.start_time || "09:00").slice(0, 5), end_time: (m.end_time || "10:00").slice(0, 5), location: m.location || "", meeting_type: m.meeting_type || "routine", participant_staff_ids: m.participant_staff_ids || [] });
      } else if (it.kind === "task") {
        ta.push({ uid: uid(), title: it.title || "", task_type: m.task_type || "normal", assigned_staff_id: it.assigned_staff_id || "", start_date: (m.start_date || "").slice(0, 10), deadline: it.due_date?.slice(0, 10) || "", notes: it.description || "" });
      }
    }
    // Second pass for purchases so event/meeting links resolve to row uids.
    for (const it of sorted) {
      if (it.kind !== "purchase") continue;
      const m = it.meta || {};
      let link = "";
      if (m.link_kind && m.link_position != null && posToUid[m.link_position]) {
        link = `${m.link_kind}:${posToUid[m.link_position]}`;
      }
      pu.push({
        uid: uid(),
        request_date: (m.request_date || today()).slice(0, 10),
        priority: m.priority || "medium",
        purpose: m.purpose || it.title || "",
        notes: m.notes || "",
        link,
        items: (m.items || []).length ? m.items.map((x) => ({ ...blankPrItem(), ...x })) : [blankPrItem()],
      });
    }
    setEvents(ev); setMeetings(me); setTasks(ta); setPurchases(pu);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const staffOptions = useMemo(() => staff.map((s) => ({ value: s.id, label: s.name })), [staff]);
  const expenseAccounts = useMemo(
    () => (chart || []).filter(isExpenseLeaf).sort((a, b) => String(a.code).localeCompare(String(b.code))),
    [chart]
  );
  // What a purchase can be "for": any event or meeting being created here.
  const linkOptions = useMemo(() => [
    ...events.filter((e) => e.title.trim()).map((e) => ({ value: `event:${e.uid}`, label: `Event · ${e.title}` })),
    ...meetings.filter((m) => m.title.trim()).map((m) => ({ value: `meeting:${m.uid}`, label: `Meeting · ${m.title}` })),
  ], [events, meetings]);

  // ── Goal helpers ────────────────────────────────────────────────────────
  const updObjective = (oi, patch) => setObjectives((o) => o.map((x, i) => (i === oi ? { ...x, ...patch } : x)));
  const updKr = (oi, ki, patch) =>
    setObjectives((o) => o.map((x, i) => i === oi
      ? { ...x, key_results: x.key_results.map((k, j) => (j === ki ? { ...k, ...patch } : k)) }
      : x));
  const balanceCounts = objectives.reduce((acc, o) => {
    if (o.statement.trim()) acc[o.primary_4d_dimension] = (acc[o.primary_4d_dimension] || 0) + 1;
    return acc;
  }, {});

  // ── Import from CSV / Excel ───────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
      const res = buildPlanFromRows(rows, { staff, uid });
      const { summary: s } = res;
      if (!s.goals && !s.events && !s.meetings && !s.tasks && !s.purchases) {
        Swal.fire("Nothing imported", "No valid rows found. Check the 'type' column and headers against the template.", "warning");
        return;
      }
      setObjectives((prev) => {
        const merged = [...prev.filter((o) => o.statement.trim()), ...res.objectives];
        return merged.length ? merged : [blankObjective()];
      });
      setEvents((prev) => [...prev, ...res.events]);
      setMeetings((prev) => [...prev, ...res.meetings]);
      setTasks((prev) => [...prev, ...res.tasks]);
      setPurchases((prev) => [...prev, ...res.purchases]);
      Swal.fire({
        icon: res.errors.length ? "warning" : "success",
        title: "Imported from file",
        html: `Added <b>${s.goals}</b> goal(s), <b>${s.events}</b> event(s), <b>${s.meetings}</b> meeting(s), <b>${s.tasks}</b> task(s), <b>${s.purchases}</b> purchase request(s). Review and save.`
          + (res.errors.length ? `<br><br><span style="color:#b45309">Skipped ${res.errors.length} row(s):</span><br><span style="font-size:11px">${res.errors.slice(0, 8).join("<br>")}</span>` : ""),
      });
    } catch {
      Swal.fire("Could not read file", "Make sure it is a valid .csv or .xlsx with a header row matching the template.", "error");
    }
  };

  // ── Row helpers ─────────────────────────────────────────────────────────
  const patchEvent   = (i, p) => setEvents((a) => a.map((r, idx) => idx === i ? { ...r, ...p } : r));
  const patchMeeting = (i, p) => setMeetings((a) => a.map((r, idx) => idx === i ? { ...r, ...p } : r));
  const patchTask    = (i, p) => setTasks((a) => a.map((r, idx) => idx === i ? { ...r, ...p } : r));
  const patchPurchase = (i, p) => setPurchases((a) => a.map((r, idx) => idx === i ? { ...r, ...p } : r));
  const patchPrItem = (pi, ii, p) =>
    setPurchases((a) => a.map((r, idx) => idx === pi
      ? { ...r, items: r.items.map((it, j) => (j === ii ? { ...it, ...p } : it)) }
      : r));

  const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

  // ── Payload ───────────────────────────────────────────────────────────────
  const buildPayload = () => {
    const items = [];
    const posByUid = {};

    events.filter((e) => e.title.trim()).forEach((e) => {
      posByUid[e.uid] = items.length;
      items.push({
        kind: "event",
        title: e.title,
        description: e.description || null,
        due_date: e.start_date || null,
        meta: {
          start_date: e.start_date || null,
          end_date: e.end_date || null,
          location: e.location || null,
          responsible_staff_id: e.responsible_staff_id || null,
        },
      });
    });

    meetings.filter((m) => m.title.trim()).forEach((m) => {
      posByUid[m.uid] = items.length;
      items.push({
        kind: "meeting",
        title: m.title,
        description: m.description || null,
        due_date: m.meeting_date || null,
        meta: {
          meeting_date: m.meeting_date || null,
          start_time: m.start_time || null,
          end_time: m.end_time || null,
          location: m.location || null,
          meeting_type: m.meeting_type || "routine",
          participant_staff_ids: m.participant_staff_ids || [],
        },
      });
    });

    tasks.filter((t) => t.title.trim()).forEach((t) => {
      posByUid[t.uid] = items.length;
      items.push({
        kind: "task",
        title: t.title,
        description: t.notes || null,
        assigned_staff_id: t.assigned_staff_id || null,
        due_date: t.deadline || null,
        meta: { task_type: t.task_type || "normal", start_date: t.start_date || null },
      });
    });

    purchases.forEach((p) => {
      const lines = p.items
        .map((it) => ({
          item_name: it.item_name,
          description: it.description || null,
          quantity: num(it.quantity) || 0,
          unit: it.unit || "piece",
          estimated_unit_price: num(it.estimated_unit_price) || 0,
          chart_account_id: it.chart_account_id || null,
          stock_id: it.stock_id ? Number(it.stock_id) : null,
        }))
        .filter((it) => it.item_name.trim() && it.quantity > 0);
      if (!p.purpose.trim() || lines.length === 0) return;

      let link_kind = null, link_position = null;
      if (p.link) {
        const [k, u] = p.link.split(":");
        if (posByUid[u] != null) { link_kind = k; link_position = posByUid[u]; }
      }
      items.push({
        kind: "purchase",
        title: p.purpose,
        meta: {
          request_date: p.request_date || today(),
          priority: p.priority || "medium",
          purpose: p.purpose,
          notes: p.notes || null,
          link_kind, link_position,
          items: lines,
        },
      });
    });

    return {
      title: form.title,
      type: form.type,
      parent_id: form.parent_id || null,
      department_id: form.department_id || null,
      narrative: form.narrative || null,
      period_year: num(form.period_year),
      period_month: num(form.period_month),
      period_week: num(form.period_week),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
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
      items,
    };
  };

  const save = async ({ submit }) => {
    const payload = buildPayload();
    if (payload.items.length === 0 && payload.objectives.length === 0) {
      Swal.fire("Nothing to save", "Add at least one goal, event, meeting, task, or purchase request.", "warning");
      return;
    }
    setSaving(true);
    try {
      let planId = id;
      if (isEdit) await updatePlan(id, payload);
      else planId = (await createPlan(payload)).data?.data?.id;

      let warning = null;
      if (submit && planId) warning = (await submitPlan(planId)).data?.warning;

      await Swal.fire({
        icon: warning ? "warning" : "success",
        title: submit ? "Sent for approval" : "Saved",
        text: warning || (submit ? "On approval, the items become real Events, Meetings, Tasks and Purchase Requests." : undefined),
        timer: warning ? undefined : 1600,
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
    <div className="px-4 py-5 max-w-6xl mx-auto">
      <PageHeader
        title={isEdit ? "Edit Plan" : "New Plan"}
        subtitle="Add events, meetings, staff tasks and purchase requests — they become real records when the plan is approved."
        icon={ICON}
        actions={<button onClick={() => navigate("/planning/plans")} className="px-3 py-2 bg-white/15 text-white text-xs font-semibold rounded-xl hover:bg-white/25">Cancel</button>}
      />

      <div className="space-y-4">
        {/* IMPORT FROM FILE */}
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex flex-wrap items-center gap-2">
          <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs font-bold text-teal-800">Generate a plan from a file</p>
            <p className="text-[11px] text-teal-600">Upload a CSV or Excel file to fill goals, events, meetings, tasks and purchase requests in bulk. Imported rows are added below for you to review before saving.</p>
          </div>
          <a href="/plan-import-template.xlsx" download className="px-3 py-2 bg-white border border-teal-200 text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-50">Template (Excel)</a>
          <a href="/plan-import-template.csv" download className="px-3 py-2 bg-white border border-teal-200 text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-50">Template (CSV)</a>
          <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700">Upload CSV / Excel</button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
        </div>

        {/* PLAN BASICS */}
        <Section title="Plan basics" subtitle="When it runs and who it's for" icon={ICON}>
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
              <textarea className={input} rows={2} value={form.narrative} onChange={(e) => setField("narrative", e.target.value)} placeholder="A short note about what you want to do this period" />
            </div>
          </div>
        </Section>

        {/* GOALS */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <Section title="Goals" subtitle="Add 2–5 goals. Each needs a focus area and at least one way to measure success." icon="M9 12l2 2 4-4"
            action={<AddBtn onClick={() => setObjectives((o) => [...o, blankObjective()])}>+ Add goal</AddBtn>}>
            <div className="space-y-4">
              {objectives.map((o, oi) => (
                <div key={oi} className="rounded-xl border border-gray-150 bg-gray-50/60 p-4">
                  <label className={label}>Goal {oi + 1}</label>
                  <div className="flex gap-2 items-start mb-3">
                    <input className={input} value={o.statement} onChange={(e) => updObjective(oi, { statement: e.target.value })} placeholder="What do you want to achieve?" />
                    <div className="min-w-[150px]">
                      <select className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs" value={o.primary_4d_dimension} onChange={(e) => updObjective(oi, { primary_4d_dimension: e.target.value })} title="Focus area (4D)">
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

          <div>
            <Section title="4D coverage" subtitle="Try to cover all four areas" icon="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z">
              <Balance4D counts={balanceCounts} />
            </Section>
          </div>
        </div>

        {/* EVENTS */}
        <Section title="Events" subtitle="Each becomes an Event on the calendar when approved." icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          action={<AddBtn onClick={() => setEvents((a) => [...a, blankEvent()])}>+ Add event</AddBtn>}>
          {events.length === 0 ? <Empty>No events yet.</Empty> : (
            <div className="space-y-3">
              {events.map((e, i) => (
                <RowCard key={e.uid} onRemove={() => setEvents((a) => a.filter((_, idx) => idx !== i))}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2"><input className={input} value={e.title} onChange={(ev) => patchEvent(i, { title: ev.target.value })} placeholder="Event name *" /></div>
                    <Field lbl="Start date"><DateField name={`ev_s_${e.uid}`} value={e.start_date} onChange={(ev) => patchEvent(i, { start_date: ev.target.value })} className={cell} /></Field>
                    <Field lbl="End date"><DateField name={`ev_e_${e.uid}`} value={e.end_date} onChange={(ev) => patchEvent(i, { end_date: ev.target.value })} className={cell} /></Field>
                    <Field lbl="Location"><input className={cell} value={e.location} onChange={(ev) => patchEvent(i, { location: ev.target.value })} placeholder="Where" /></Field>
                    <Field lbl="In charge"><Select2 size="sm" value={e.responsible_staff_id} onChange={(v) => patchEvent(i, { responsible_staff_id: v })} options={staffOptions} placeholder="Choose person…" /></Field>
                    <div className="sm:col-span-2"><input className={cell} value={e.description} onChange={(ev) => patchEvent(i, { description: ev.target.value })} placeholder="Notes (optional)" /></div>
                  </div>
                </RowCard>
              ))}
            </div>
          )}
        </Section>

        {/* MEETINGS */}
        <Section title="Meetings" subtitle="Each becomes a Meeting (with participants invited) when approved." icon="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z"
          action={<AddBtn onClick={() => setMeetings((a) => [...a, blankMeeting()])}>+ Add meeting</AddBtn>}>
          {meetings.length === 0 ? <Empty>No meetings yet.</Empty> : (
            <div className="space-y-3">
              {meetings.map((m, i) => (
                <RowCard key={m.uid} onRemove={() => setMeetings((a) => a.filter((_, idx) => idx !== i))}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2"><input className={input} value={m.title} onChange={(ev) => patchMeeting(i, { title: ev.target.value })} placeholder="Meeting title *" /></div>
                    <Field lbl="Date"><DateField name={`mt_d_${m.uid}`} value={m.meeting_date} onChange={(ev) => patchMeeting(i, { meeting_date: ev.target.value })} className={cell} /></Field>
                    <Field lbl="Type">
                      <select className={cell} value={m.meeting_type} onChange={(ev) => patchMeeting(i, { meeting_type: ev.target.value })}>
                        <option value="routine">Routine</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </Field>
                    <Field lbl="Start time"><input type="time" className={cell} value={m.start_time} onChange={(ev) => patchMeeting(i, { start_time: ev.target.value })} /></Field>
                    <Field lbl="End time"><input type="time" className={cell} value={m.end_time} onChange={(ev) => patchMeeting(i, { end_time: ev.target.value })} /></Field>
                    <Field lbl="Location"><input className={cell} value={m.location} onChange={(ev) => patchMeeting(i, { location: ev.target.value })} placeholder="Where" /></Field>
                    <Field lbl="Participants"><Select2 size="sm" isMulti value={m.participant_staff_ids} onChange={(v) => patchMeeting(i, { participant_staff_ids: v })} options={staffOptions} placeholder="Invite people…" /></Field>
                    <div className="sm:col-span-2"><input className={cell} value={m.description} onChange={(ev) => patchMeeting(i, { description: ev.target.value })} placeholder="Notes (optional)" /></div>
                  </div>
                </RowCard>
              ))}
            </div>
          )}
        </Section>

        {/* STAFF TASKS */}
        <Section title="Staff tasks" subtitle="Each becomes a Staff Task assigned to a person when approved." icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          action={<AddBtn onClick={() => setTasks((a) => [...a, blankTask()])}>+ Add task</AddBtn>}>
          {tasks.length === 0 ? <Empty>No tasks yet.</Empty> : (
            <div className="space-y-3">
              {tasks.map((t, i) => (
                <RowCard key={t.uid} onRemove={() => setTasks((a) => a.filter((_, idx) => idx !== i))}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2"><input className={input} value={t.title} onChange={(ev) => patchTask(i, { title: ev.target.value })} placeholder="What needs to be done? *" /></div>
                    <Field lbl="Who does it"><Select2 size="sm" value={t.assigned_staff_id} onChange={(v) => patchTask(i, { assigned_staff_id: v })} options={staffOptions} placeholder="Choose person…" /></Field>
                    <Field lbl="Priority">
                      <select className={cell} value={t.task_type} onChange={(ev) => patchTask(i, { task_type: ev.target.value })}>
                        {TASK_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                      </select>
                    </Field>
                    <Field lbl="Start date"><DateField name={`tk_s_${t.uid}`} value={t.start_date} onChange={(ev) => patchTask(i, { start_date: ev.target.value })} className={cell} /></Field>
                    <Field lbl="Deadline"><DateField name={`tk_d_${t.uid}`} value={t.deadline} onChange={(ev) => patchTask(i, { deadline: ev.target.value })} className={cell} /></Field>
                    <div className="sm:col-span-2"><input className={cell} value={t.notes} onChange={(ev) => patchTask(i, { notes: ev.target.value })} placeholder="Notes (optional)" /></div>
                  </div>
                </RowCard>
              ))}
            </div>
          )}
        </Section>

        {/* PURCHASE REQUESTS */}
        <Section title="Purchase requests" subtitle="Buy things for an event or meeting. Each becomes a draft Purchase Request when approved." icon="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          action={<AddBtn onClick={() => setPurchases((a) => [...a, blankPurchase()])}>+ Add request</AddBtn>}>
          {purchases.length === 0 ? <Empty>No purchase requests yet.</Empty> : (
            <div className="space-y-4">
              {purchases.map((p, pi) => {
                const total = p.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.estimated_unit_price) || 0), 0);
                return (
                  <RowCard key={p.uid} onRemove={() => setPurchases((a) => a.filter((_, idx) => idx !== pi))}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                      <div className="lg:col-span-2"><Field lbl="Purpose *"><input className={cell} value={p.purpose} onChange={(e) => patchPurchase(pi, { purpose: e.target.value })} maxLength={255} placeholder="What is this purchase for?" /></Field></div>
                      <Field lbl="Request date"><DateField name={`pr_d_${p.uid}`} value={p.request_date} onChange={(e) => patchPurchase(pi, { request_date: e.target.value })} className={cell} /></Field>
                      <Field lbl="Priority">
                        <select className={cell} value={p.priority} onChange={(e) => patchPurchase(pi, { priority: e.target.value })}>
                          {PRIORITIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                        </select>
                      </Field>
                      <div className="lg:col-span-2"><Field lbl="For (event / meeting)">
                        <Select2 size="sm" value={p.link} onChange={(v) => patchPurchase(pi, { link: v })} options={linkOptions} placeholder="Optional — link to an event or meeting above…" />
                      </Field></div>
                      <div className="lg:col-span-2"><Field lbl="Notes"><input className={cell} value={p.notes} onChange={(e) => patchPurchase(pi, { notes: e.target.value })} placeholder="Optional context for the approver" /></Field></div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
                          <tr>
                            <th className="text-left px-2 py-1.5">Item *</th>
                            <th className="text-left px-2 py-1.5">Description</th>
                            <th className="text-right px-2 py-1.5">Qty *</th>
                            <th className="text-left px-2 py-1.5">Unit</th>
                            <th className="text-right px-2 py-1.5">Unit price *</th>
                            <th className="text-left px-2 py-1.5">Category</th>
                            <th className="text-left px-2 py-1.5">Stock</th>
                            <th className="text-right px-2 py-1.5">Total</th>
                            <th className="px-2 py-1.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {p.items.map((it, ii) => {
                            const lineTotal = (Number(it.quantity) || 0) * (Number(it.estimated_unit_price) || 0);
                            return (
                              <tr key={ii}>
                                <td className="px-2 py-1.5"><input className={cell} value={it.item_name} onChange={(e) => patchPrItem(pi, ii, { item_name: e.target.value })} placeholder="e.g. A4 paper ream" /></td>
                                <td className="px-2 py-1.5"><input className={cell} value={it.description || ""} onChange={(e) => patchPrItem(pi, ii, { description: e.target.value })} placeholder="Optional" /></td>
                                <td className="px-2 py-1.5"><input type="number" step="0.01" min="0.01" value={it.quantity} onChange={(e) => patchPrItem(pi, ii, { quantity: e.target.value })} className={`${cell} w-20 text-right`} /></td>
                                <td className="px-2 py-1.5"><input value={it.unit} onChange={(e) => patchPrItem(pi, ii, { unit: e.target.value })} className={`${cell} w-20`} /></td>
                                <td className="px-2 py-1.5"><input type="number" step="0.01" min="0" value={it.estimated_unit_price} onChange={(e) => patchPrItem(pi, ii, { estimated_unit_price: e.target.value })} className={`${cell} w-24 text-right`} /></td>
                                <td className="px-2 py-1.5">
                                  <select value={it.chart_account_id || ""} onChange={(e) => patchPrItem(pi, ii, { chart_account_id: e.target.value || null })} className={cell}>
                                    <option value="">— category —</option>
                                    {expenseAccounts.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                                  </select>
                                </td>
                                <td className="px-2 py-1.5">
                                  <select value={it.stock_id || ""} onChange={(e) => patchPrItem(pi, ii, { stock_id: e.target.value || null })} className={cell}>
                                    <option value="">— not stocked —</option>
                                    {stockRows.map((s) => <option key={s.id} value={s.id}>{s.item_name} ({s.quantity} {s.unit})</option>)}
                                  </select>
                                </td>
                                <td className="px-2 py-1.5 text-right font-semibold text-gray-800 whitespace-nowrap">{fmt(lineTotal)}</td>
                                <td className="px-2 py-1.5 text-center">
                                  {p.items.length > 1 && (
                                    <button type="button" onClick={() => patchPurchase(pi, { items: p.items.filter((_, j) => j !== ii) })} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200 bg-gray-50">
                            <td colSpan={7} className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Estimated total</td>
                            <td className="px-2 py-2 text-right text-sm font-bold text-teal-700">{fmt(total)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <button type="button" onClick={() => patchPurchase(pi, { items: [...p.items, blankPrItem()] })} className="mt-2 text-[11px] font-semibold text-teal-600 hover:text-teal-800">+ Add item</button>
                  </RowCard>
                );
              })}
            </div>
          )}
        </Section>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button onClick={() => save({ submit: false })} disabled={saving} className="px-4 py-2.5 bg-white border border-teal-200 text-teal-700 text-sm font-semibold rounded-xl hover:bg-teal-50 disabled:opacity-50">{saving ? "Saving…" : "Save as draft"}</button>
          <button onClick={() => save({ submit: true })} disabled={saving} className="px-4 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Save & send for approval"}</button>
          <p className="text-[11px] text-gray-400 self-center sm:ml-2">On approval, everything is created in its own list — Events, Meetings, Tasks and Purchase Requests.</p>
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

function AddBtn({ onClick, children }) {
  return <button onClick={onClick} className="text-xs font-semibold text-teal-600 hover:text-teal-800">{children}</button>;
}

function Empty({ children }) {
  return <p className="text-sm text-gray-400 py-2">{children}</p>;
}

function RowCard({ children, onRemove }) {
  return (
    <div className="relative rounded-xl border border-gray-150 bg-gray-50/60 p-3">
      <button onClick={onRemove} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold px-1" title="Remove">✕</button>
      {children}
    </div>
  );
}
