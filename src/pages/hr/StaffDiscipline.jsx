import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { get, post } from "../../api/axios";
import { PageHeader, EmptyState, Spinner, Pill } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";
import { useAuth } from "../../admin/context/AuthContext";

/**
 * Discipline & correction — the 5-stage process. The next measure is applied
 * automatically (one stage up); a stage below dismissal may be repeated in an
 * exceptional case; management may apply any stage directly. Staff without
 * disciplinary.view see — and acknowledge — only their own record.
 */
const STAGE_TONE = { 1: "blue", 2: "teal", 3: "amber", 4: "purple", 5: "red" };
const STAGES = {
  1: "Verbal reminder",
  2: "Written notification",
  3: "Written warning",
  4: "Suspension / forced unpaid leave",
  5: "Dismissal",
};
const CATEGORIES = {
  late_coming: "Repeated late-coming",
  task_delivery: "Not meeting task delivery / performance",
  coordination: "Failing to coordinate and communicate",
  behaviour: "Organisational behaviour",
  poor_performance: "Poor performance",
  rule_breach: "Rules or instructions not followed",
  essential_rule: "Essential rule / higher-level mismanagement",
  other: "Other",
};
const errorOf = (e) => e.response?.data?.message || Object.values(e.response?.data?.errors || {})[0]?.[0] || "Something went wrong.";
const staffName = (s) => s?.application?.full_name || s?.employee_id || "—";

export default function StaffDiscipline() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("disciplinary.view");
  const canCreate = hasPermission("disciplinary.create");
  const [filter, setFilter] = useState({ staff_id: "", stage: "", status: "active" });
  const [staff, setStaff] = useState([]);
  const [applying, setApplying] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (canView || canCreate) get("/hr/staff/list?per_page=1000").then((r) => setStaff(r.data?.data || [])).catch(() => {});
  }, [canView, canCreate]);

  return (
    <div className="px-4 py-5 space-y-4">
      <PageHeader title="Discipline & Correction"
        subtitle={canView ? "The 5-stage process — applied in order, saved to each staff member's record" : "Your disciplinary record"}
        icon="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
        actions={canCreate ? <button onClick={() => setApplying(true)} className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700">+ Apply measure</button> : null} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {Object.entries(STAGES).map(([n, label]) => (
          <div key={n} className="bg-white rounded-xl border border-gray-100 px-3 py-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">{n}</span>
            <span className="text-[11px] font-semibold text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      {canView && (
        <div className="flex flex-wrap gap-2">
          <div className="w-64"><Select2 size="sm" value={filter.staff_id} onChange={(v) => setFilter({ ...filter, staff_id: v })}
            options={[{ value: "", label: "All staff" }, ...staff.map((s) => ({ value: s.id, label: staffName(s) }))]} /></div>
          <div className="w-56"><Select2 size="sm" value={filter.stage} onChange={(v) => setFilter({ ...filter, stage: v })}
            options={[{ value: "", label: "All stages" }, ...Object.entries(STAGES).map(([n, l]) => ({ value: n, label: `${n}. ${l}` }))]} /></div>
          <div className="w-40"><Select2 size="sm" value={filter.status} onChange={(v) => setFilter({ ...filter, status: v })}
            options={[{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "revoked", label: "Revoked" }]} /></div>
        </div>
      )}

      <DisciplineList params={filter} reload={reload} showStaff={canView} />

      {applying && <ApplyModal staff={staff} onClose={() => setApplying(false)} onSaved={() => { setApplying(false); setReload((n) => n + 1); }} />}
    </div>
  );
}

/** The record itself — on this page and in the staff profile. */
export function DisciplineList({ params = {}, reload = 0, showStaff = true }) {
  const { user, hasPermission } = useAuth();
  const [rows, setRows] = useState(null);
  const [tick, setTick] = useState(0);

  // Keyed on the values, not the object, so a parent's inline {staff_id} doesn't refetch every render.
  const query = JSON.stringify(params);
  const load = useCallback(() => {
    const clean = Object.fromEntries(Object.entries(JSON.parse(query)).filter(([, v]) => v !== "" && v !== null && v !== undefined));
    get("/hr/disciplinary", { cache: false, params: { per_page: 200, ...clean } })
      .then((r) => setRows(r.data?.data || []))
      .catch(() => setRows([]));
  }, [query]);
  useEffect(() => { load(); }, [load, reload, tick]);

  const revoke = async (row) => {
    const r = await Swal.fire({ title: "Revoke this measure?", text: "It stays on record but no longer counts toward the next stage.",
      input: "textarea", inputPlaceholder: "Reason", showCancelButton: true, confirmButtonText: "Revoke",
      inputValidator: (v) => (!v?.trim() ? "A reason is required." : undefined) });
    if (!r.isConfirmed) return;
    try { await post(`/hr/disciplinary/${row.id}/revoke`, { revoke_reason: r.value }); setTick((n) => n + 1); }
    catch (e) { Swal.fire("Error", errorOf(e), "error"); }
  };

  const acknowledge = async (row) => {
    const r = await Swal.fire({ title: "Acknowledge", text: "Confirm you have read this measure. You may add your response.",
      input: "textarea", inputPlaceholder: "Your response (optional)", showCancelButton: true, confirmButtonText: "Acknowledge" });
    if (!r.isConfirmed) return;
    try { await post(`/hr/disciplinary/${row.id}/acknowledge`, { staff_response: r.value || null }); setTick((n) => n + 1); }
    catch (e) { Swal.fire("Error", errorOf(e), "error"); }
  };

  if (rows === null) return <Spinner />;
  if (rows.length === 0) return <EmptyState title="No disciplinary measures" description="Nothing has been recorded." />;

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const own = user && Number(row.staff?.user_id) === Number(user.id);
        return (
          <div key={row.id} className={`bg-white rounded-xl border p-4 ${row.status === "revoked" ? "border-gray-200 opacity-60" : "border-gray-100"}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Pill tone={STAGE_TONE[row.stage]}>{row.stage}. {STAGES[row.stage] || row.stage_label}</Pill>
                  {row.mode === "repeat" && <Pill tone="yellow">Repeated (exception)</Pill>}
                  {row.mode === "direct" && <Pill tone="red">Applied directly by management</Pill>}
                  {row.status === "revoked" && <Pill>Revoked</Pill>}
                </div>
                {showStaff && <div className="text-sm font-bold text-gray-800" data-no-i18n>{staffName(row.staff)}</div>}
                <div className="text-xs font-semibold text-gray-600">{CATEGORIES[row.category] || row.category_label}</div>
                <p className="text-sm text-gray-700 whitespace-pre-line" dir="auto">{row.description}</p>
                {row.exception_reason && <p className="text-xs text-amber-700" dir="auto">Reason for exception: {row.exception_reason}</p>}
                {row.stage === 4 && row.suspension_start && (
                  <p className="text-xs text-purple-700">Unpaid from {row.suspension_start} to {row.suspension_end}</p>
                )}
                {row.status === "revoked" && row.revoke_reason && <p className="text-xs text-gray-500" dir="auto">Revoked: {row.revoke_reason}</p>}
                {row.acknowledged_at && (
                  <p className="text-xs text-emerald-700" dir="auto">✓ Acknowledged {row.acknowledged_at.slice(0, 10)}{row.staff_response ? ` — “${row.staff_response}”` : ""}</p>
                )}
              </div>
              <div className="text-right text-[11px] text-gray-500 space-y-1 shrink-0">
                <div>{row.action_date}{row.incident_date ? ` · incident ${row.incident_date}` : ""}</div>
                {row.issuer?.name && <div data-no-i18n>by {row.issuer.name}</div>}
                <div className="flex gap-1.5 justify-end">
                  {own && !row.acknowledged_at && row.status === "active" && (
                    <button onClick={() => acknowledge(row)} className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-[11px] font-semibold">Acknowledge</button>
                  )}
                  {hasPermission("disciplinary.revoke") && row.status === "active" && (
                    <button onClick={() => revoke(row)} className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">Revoke</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplyModal({ staff, onClose, onSaved }) {
  const { hasPermission } = useAuth();
  const canDirect = hasPermission("disciplinary.direct");
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ staff_id: "", mode: "auto", stage: "", category: "late_coming", description: "",
    exception_reason: "", incident_date: "", action_date: today, suspension_start: "", suspension_end: "" });
  const [where, setWhere] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!form.staff_id) return undefined;
    let alive = true;
    get(`/hr/disciplinary/next/${form.staff_id}`, { cache: false }).then((r) => alive && setWhere(r.data?.data || null)).catch(() => {});
    return () => { alive = false; };
  }, [form.staff_id]);

  const current = form.staff_id ? where?.current_stage ?? 0 : 0;
  const stage = form.mode === "auto" ? where?.next_stage : form.mode === "repeat" ? (current >= 1 && current <= 4 ? current : null) : Number(form.stage) || null;

  const submit = async () => {
    setBusy(true);
    try {
      await post("/hr/disciplinary", { ...form, stage: form.mode === "direct" ? form.stage : null });
      Swal.fire({ icon: "success", title: "Measure applied", timer: 1400, showConfirmButton: false });
      onSaved();
    } catch (e) { Swal.fire("Error", errorOf(e), "error"); } finally { setBusy(false); }
  };

  const field = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm";
  const label = "block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1";

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800">Apply a disciplinary measure</h3>

        <div><span className={label}>Staff member</span>
          <Select2 value={form.staff_id} onChange={(v) => set("staff_id", v)} placeholder="Search staff…"
            options={staff.map((s) => ({ value: s.id, label: staffName(s) }))} /></div>

        {form.staff_id && where && (
          <div className="text-xs bg-gray-50 rounded-lg px-3 py-2">
            Current stage: <b>{current ? `${current}. ${STAGES[current]}` : "none"}</b>
            {" · "}Next (automatic): <b>{where.next_stage ? `${where.next_stage}. ${STAGES[where.next_stage]}` : "already dismissed"}</b>
          </div>
        )}

        <div><span className={label}>How</span>
          <div className="flex flex-wrap gap-1.5">
            {[["auto", "Next stage (automatic)"], ["repeat", "Repeat current stage (exceptional)"], ...(canDirect ? [["direct", "Apply directly (management)"]] : [])].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set("mode", v)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${form.mode === v ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200"}`}>{l}</button>
            ))}
          </div>
        </div>

        {form.mode === "direct" && (
          <div><span className={label}>Stage</span>
            <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={field}>
              <option value="">— choose —</option>
              {Object.entries(STAGES).map(([n, l]) => <option key={n} value={n}>{n}. {l}</option>)}
            </select></div>
        )}
        {form.mode !== "auto" && (
          <div><span className={label}>Reason for the exception *</span>
            <textarea rows={2} value={form.exception_reason} onChange={(e) => set("exception_reason", e.target.value)} className={field} dir="auto" /></div>
        )}

        <div><span className={label}>Reason category</span>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={field}>
            {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
        <div><span className={label}>What happened *</span>
          <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={field} dir="auto" /></div>

        <div className="grid grid-cols-2 gap-3">
          <div><span className={label}>Incident date</span><input type="date" value={form.incident_date} onChange={(e) => set("incident_date", e.target.value)} className={field} /></div>
          <div><span className={label}>Action date *</span><input type="date" value={form.action_date} onChange={(e) => set("action_date", e.target.value)} className={field} /></div>
        </div>

        {stage === 4 && (
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>Unpaid leave from *</span><input type="date" value={form.suspension_start} onChange={(e) => set("suspension_start", e.target.value)} className={field} /></div>
            <div><span className={label}>Unpaid leave to *</span><input type="date" value={form.suspension_end} onChange={(e) => set("suspension_end", e.target.value)} className={field} /></div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-gray-500">{stage ? <>Will apply: <b>{stage}. {STAGES[stage]}</b></> : ""}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
            <button onClick={submit} disabled={busy || !form.staff_id || !stage} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-teal-600 disabled:opacity-50">{busy ? "Saving…" : "Apply"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
