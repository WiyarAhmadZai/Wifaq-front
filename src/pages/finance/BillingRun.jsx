import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  previewBillingRun,
  commitBillingRun,
  getSchoolClasses,
} from "../../api/financial";

/**
 * Billing Run screen — replaces the old "Generate Monthly" flow.
 * Implements the auto-draft + review UX agreed in FEE_MODULE_REDESIGN_PLAN.md.
 *
 * Flow:
 *   1. Pick period + scope + include flags → "Run Preview"
 *   2. Review rows; expand any row to see its draft lines
 *   3. Inline-edit a row's line amounts if needed (kept in `edits` state)
 *   4. "Generate N Invoices" → commit → land on success summary
 */

const STATUS_META = {
  ready:             { icon: "✓", label: "Ready",          tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  blocked:           { icon: "⚠", label: "Blocked",        tone: "bg-amber-50 text-amber-700 border-amber-200" },
  excluded:          { icon: "⊘", label: "Excluded",       tone: "bg-gray-100 text-gray-500 border-gray-300" },
  already_invoiced:  { icon: "ⓘ", label: "Already invoiced", tone: "bg-blue-50 text-blue-700 border-blue-200" },
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmtMoney = (n) => Number(n || 0).toLocaleString();

export default function BillingRun() {
  const navigate = useNavigate();

  // ------------------------------------------------- Form (run input) state
  const now = new Date();
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 10);
    return d.toISOString().slice(0, 10);
  });
  const [scopeType, setScopeType] = useState("all");
  const [scopeClassId, setScopeClassId] = useState("");
  const [includeRecurring, setIncludeRecurring] = useState(true);
  const [includePending, setIncludePending] = useState(true);

  const [classes, setClasses] = useState([]);
  useEffect(() => {
    getSchoolClasses()
      .then((res) => setClasses(res.data?.data || []))
      .catch(() => setClasses([]));
  }, []);

  // Auto-run a preview for the current month on first mount so the page is
  // immediately useful — admin lands on it and sees a draft for everyone.
  // Only fires once; user changes to scope/period require explicit "Run preview".
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { handlePreview(); }, []);

  // ----------------------------------------------------- Preview / commit
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState(null);   // { ready_count, ..., rows[] }
  const [filter, setFilter] = useState("all");    // all | ready | issues
  const [expanded, setExpanded] = useState({});   // { studentId: true }
  const [edits, setEdits] = useState({});         // { studentId: { line_overrides: { feeItemId: { amount, description } }, skip } }
  const [committedRun, setCommittedRun] = useState(null);

  const buildInput = () => ({
    period_year: Number(periodYear),
    period_month: Number(periodMonth),
    due_date: dueDate,
    scope_type: scopeType,
    scope_payload:
      scopeType === "class"
        ? { class_id: Number(scopeClassId) || 0 }
        : {},
    include_recurring: includeRecurring,
    include_pending_charges: includePending,
  });

  const handlePreview = async () => {
    if (scopeType === "class" && !scopeClassId) {
      Swal.fire("Pick a class", "Class scope requires a class selection.", "warning");
      return;
    }
    setPreviewing(true);
    setCommittedRun(null);
    setEdits({});
    setExpanded({});
    try {
      const res = await previewBillingRun(buildInput());
      setPreview(res.data?.data || null);
    } catch (err) {
      Swal.fire("Preview failed", err.response?.data?.message || "Unknown error", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || preview.ready_count === 0) return;
    const confirm = await Swal.fire({
      title: `Generate ${preview.ready_count} invoices?`,
      text: `Total: ${fmtMoney(preview.total_amount)}. This will post journal entries and cannot be undone without per-invoice regenerate.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Generate",
      confirmButtonColor: "#0d9488",
    });
    if (!confirm.isConfirmed) return;

    setCommitting(true);
    try {
      // Synthesize line_overrides for any row where prorate=true. We halve
      // ONLY the TUITION and TRANSPORT line amounts; discount and one-off
      // charges (uniform, admission, exam, late fee) stay full.
      const proratedEdits = synthesizeProrateOverrides(preview, edits);
      const res = await commitBillingRun({ ...buildInput(), per_student_edits: proratedEdits });
      setCommittedRun(res.data?.data || null);
      Swal.fire("Done", res.data?.message || "Invoices generated.", "success");
    } catch (err) {
      Swal.fire("Commit failed", err.response?.data?.message || "Unknown error", "error");
    } finally {
      setCommitting(false);
    }
  };

  // ----------------------------------------------------- Inline edit helpers
  const setLineOverride = (studentId, feeItemId, amount) => {
    setEdits((prev) => {
      const e = { ...(prev[studentId] || {}) };
      const overrides = { ...(e.line_overrides || {}) };
      overrides[feeItemId] = { ...(overrides[feeItemId] || {}), amount: amount === "" ? null : Number(amount) };
      e.line_overrides = overrides;
      return { ...prev, [studentId]: e };
    });
  };

  const setSkip = (studentId, skip) => {
    setEdits((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), skip } }));
  };

  // Per-row prorate toggle. When true, the row's TUITION and TRANSPORT line
  // amounts are halved (mid-month registration). Other items (discount,
  // uniform, admission, exam, late fee) are NOT halved.
  const setProrate = (studentId, prorate) => {
    setEdits((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), prorate } }));
  };

  // --------------------------------------------- Filtered + edited row view
  const visibleRows = useMemo(() => {
    if (!preview?.rows) return [];
    if (filter === "ready") return preview.rows.filter((r) => r.status === "ready");
    if (filter === "issues") return preview.rows.filter((r) => r.status !== "ready");
    return preview.rows;
  }, [preview, filter]);

  // Compute the running total taking edits AND prorate flags into account.
  const editedTotal = useMemo(() => {
    if (!preview?.rows) return 0;
    return preview.rows.reduce((sum, row) => {
      if (row.status !== "ready") return sum;
      const edit = edits[row.student_id];
      if (edit?.skip) return sum;
      const { total } = bucketLineAmounts(row.lines, edit?.line_overrides || {}, !!edit?.prorate);
      return sum + total;
    }, 0);
  }, [preview, edits]);

  const editedReadyCount = useMemo(() => {
    if (!preview?.rows) return 0;
    return preview.rows.filter((r) => r.status === "ready" && !edits[r.student_id]?.skip).length;
  }, [preview, edits]);

  // ===================================================================== UI
  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Generate Monthly Invoices</h2>
          <p className="text-xs text-gray-500">
            One click bills every active student for the selected month. Amounts come from the class fee plan when set,
            otherwise from each student's record (base fee, transport, discount).
          </p>
        </div>
        <button
          onClick={() => navigate("/finance/fee-invoices")}
          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-teal-300 hover:text-teal-700 text-xs font-medium"
        >
          ← Back to invoices
        </button>
      </div>

      {/* ---------- Run input form ---------- */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
          <Field label="Period — Year">
            <input
              type="number"
              value={periodYear}
              onChange={(e) => setPeriodYear(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
            />
          </Field>
          <Field label="Period — Month">
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Due Date">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
            />
          </Field>
          <Field label="Scope">
            <div className="flex items-center gap-2">
              <select
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value)}
                className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">All students</option>
                <option value="class">Class…</option>
              </select>
              {scopeType === "class" && (
                <select
                  value={scopeClassId}
                  onChange={(e) => setScopeClassId(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">— pick —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name || `Class #${c.id}`}</option>
                  ))}
                </select>
              )}
            </div>
          </Field>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <Checkbox checked={includeRecurring} onChange={setIncludeRecurring} label="Recurring (Tuition, Transport)" />
          <Checkbox checked={includePending} onChange={setIncludePending} label="Pending charges (Uniform, Admission, Late fees)" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium disabled:opacity-50"
          >
            {previewing ? "Loading preview…" : "Run preview"}
          </button>
          {preview && (
            <span className="text-[11px] text-gray-500">
              Preview is unsaved. Edit any row, then commit to generate invoices.
            </span>
          )}
        </div>
      </div>

      {/* ---------- Preview / results ---------- */}
      {preview && !committedRun && (
        <PreviewPanel
          preview={preview}
          filter={filter}
          setFilter={setFilter}
          rows={visibleRows}
          expanded={expanded}
          setExpanded={setExpanded}
          edits={edits}
          setLineOverride={setLineOverride}
          setSkip={setSkip}
          setProrate={setProrate}
          editedReadyCount={editedReadyCount}
          editedTotal={editedTotal}
          committing={committing}
          onCommit={handleCommit}
        />
      )}

      {committedRun && (
        <CommittedPanel run={committedRun} onClose={() => { setCommittedRun(null); setPreview(null); }} />
      )}
    </div>
  );
}

// -------------------------------------------------------- Subcomponents

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-1">{label}</label>
      {children}
    </div>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <span className="text-gray-700">{label}</span>
    </label>
  );
}

function PreviewPanel({
  preview, filter, setFilter, rows, expanded, setExpanded,
  edits, setLineOverride, setSkip, setProrate,
  editedReadyCount, editedTotal, committing, onCommit,
}) {
  const issuesCount = preview.blocked_count + preview.excluded_count + preview.already_invoiced_count;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Issues banner */}
      {issuesCount > 0 && (
        <div className="px-4 py-2 border-b border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-center justify-between">
          <span>⚠ {issuesCount} student{issuesCount === 1 ? "" : "s"} need attention before commit.</span>
          <button
            onClick={() => setFilter("issues")}
            className="text-amber-800 underline hover:text-amber-900"
          >
            View issues only
          </button>
        </div>
      )}

      {/* Preview header */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="text-xs text-gray-700">
          <strong>{editedReadyCount}</strong> ready · {issuesCount} with issues · Total{" "}
          <span className="font-bold text-teal-700">{fmtMoney(editedTotal)} AFN</span>
        </div>
        <div className="flex items-center gap-1">
          {[
            ["all", `All (${preview.rows.length})`],
            ["ready", `Ready (${preview.ready_count})`],
            ["issues", `Issues (${issuesCount})`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                filter === key
                  ? "bg-teal-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-teal-50">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Student</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Class</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Base</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Discount</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Transport</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Uniform</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Other</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Total</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Status</th>
              <th className="w-14 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const meta = STATUS_META[row.status] || STATUS_META.blocked;
              const isOpen = !!expanded[row.student_id];
              const edit = edits[row.student_id] || {};
              const skipped = !!edit.skip;

              return (
                <PreviewRow
                  key={row.student_id}
                  row={row}
                  meta={meta}
                  isOpen={isOpen}
                  skipped={skipped}
                  edit={edit}
                  toggle={() => setExpanded((p) => ({ ...p, [row.student_id]: !p[row.student_id] }))}
                  setLineOverride={(itemId, amt) => setLineOverride(row.student_id, itemId, amt)}
                  setSkip={(s) => setSkip(row.student_id, s)}
                  setProrate={(p) => setProrate(row.student_id, p)}
                />
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={11} className="text-center py-8 text-xs text-gray-400">No students match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Commit footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="text-xs text-gray-600">
          Run total <span className="font-bold text-teal-700">{fmtMoney(editedTotal)} AFN</span>
        </div>
        <button
          onClick={onCommit}
          disabled={committing || editedReadyCount === 0}
          className="px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium disabled:opacity-50"
        >
          {committing ? "Generating…" : `Generate ${editedReadyCount} invoice${editedReadyCount === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}

// Codes that get halved when a row is prorated (mid-month registration).
// DISCOUNT is included because in the existing data model it's computed as
//   discount_amount = base_fee × discount_percent
// so when the base fee halves, the discount must halve with it. Otherwise a
// student with a 100% discount would end up with a *negative* total (the
// school would owe them money). One-off charges (uniform, admission, exam,
// late fee) are time-independent and stay at full amount.
const PRORATABLE_CODES = new Set(["TUITION", "TRANSPORT", "DISCOUNT"]);

/**
 * Group line amounts by fee_item.code so the row table can show
 * Base / Discount / Transport / Uniform / Other in their own columns.
 * Multiple lines with the same code (e.g. two DISCOUNT lines) are summed.
 * Edits in `overrides` are applied so the displayed amount is the
 * *committed* amount, not the original draft. When `prorate` is true,
 * TUITION and TRANSPORT amounts are halved (mid-month registration).
 */
function bucketLineAmounts(lines, overrides, prorate = false) {
  const buckets = { TUITION: 0, DISCOUNT: 0, TRANSPORT: 0, UNIFORM: 0, OTHER: 0 };
  const present = { TUITION: false, DISCOUNT: false, TRANSPORT: false, UNIFORM: false, OTHER: false };
  for (const line of lines || []) {
    const o = overrides?.[line.fee_item_id];
    let amt = o && o.amount !== null && o.amount !== undefined ? Number(o.amount) : Number(line.amount);
    const code = (line.fee_item?.code || "").toUpperCase();
    if (prorate && PRORATABLE_CODES.has(code)) amt = amt / 2;
    if (code in buckets) {
      buckets[code] += amt;
      present[code] = true;
    } else {
      buckets.OTHER += amt;
      present.OTHER = true;
    }
  }
  const total = buckets.TUITION + buckets.DISCOUNT + buckets.TRANSPORT + buckets.UNIFORM + buckets.OTHER;
  return { buckets, present, total };
}

/**
 * Convert per-row `prorate: true` flags into concrete `line_overrides` so the
 * backend's existing applyEdits() logic produces the same halved amounts.
 * Returns a NEW edits object — does not mutate input.
 */
function synthesizeProrateOverrides(preview, edits) {
  const out = {};
  for (const row of preview?.rows || []) {
    const e = edits[row.student_id];
    if (!e) continue;
    if (!e.prorate) {
      out[row.student_id] = e;
      continue;
    }
    const lineOverrides = { ...(e.line_overrides || {}) };
    for (const line of row.lines || []) {
      const code = (line.fee_item?.code || "").toUpperCase();
      if (!PRORATABLE_CODES.has(code)) continue;
      const existing = lineOverrides[line.fee_item_id];
      const baseAmt = existing && existing.amount !== null && existing.amount !== undefined
        ? Number(existing.amount)
        : Number(line.amount);
      lineOverrides[line.fee_item_id] = {
        ...(existing || {}),
        amount: Number((baseAmt / 2).toFixed(2)),
        description: existing?.description || `${line.fee_item?.name || code} (½ — prorated)`,
      };
    }
    out[row.student_id] = { ...e, line_overrides: lineOverrides };
  }
  return out;
}

function MoneyCell({ amount, present, signClass = "" }) {
  if (!present) return <td className="px-3 py-2 text-xs text-right text-gray-300">—</td>;
  return (
    <td className={`px-3 py-2 text-xs text-right font-medium ${signClass}`}>
      {fmtMoney(amount)}
    </td>
  );
}

function PreviewRow({ row, meta, isOpen, skipped, edit, toggle, setLineOverride, setSkip, setProrate }) {
  const navigate = useNavigate();
  const overrides = edit.line_overrides || {};
  const prorated = !!edit.prorate;
  const { buckets, present, total } = bucketLineAmounts(row.lines, overrides, prorated);
  const ready = row.status === "ready";
  // Render breakdown columns for both `ready` and `already_invoiced` rows so
  // the cashier can see what each student's bill consists of, regardless of
  // whether this run will create the invoice or it already exists.
  const hasBreakdown = (row.lines || []).length > 0;

  return (
    <>
      <tr className={`hover:bg-gray-50 ${skipped ? "opacity-50" : ""}`}>
        <td className="px-2 py-2 text-center">
          {hasBreakdown && (
            <button onClick={toggle} className="text-gray-400 hover:text-teal-700" aria-label="expand">
              {isOpen ? "▼" : "▶"}
            </button>
          )}
        </td>
        <td className="px-3 py-2 text-xs font-medium text-gray-800">{row.student_name}</td>
        <td className="px-3 py-2 text-xs text-gray-600">{row.school_class_name || "—"}</td>

        {hasBreakdown ? (
          <>
            <MoneyCell amount={buckets.TUITION}   present={present.TUITION} />
            <MoneyCell amount={buckets.DISCOUNT}  present={present.DISCOUNT} signClass="text-emerald-600" />
            <MoneyCell amount={buckets.TRANSPORT} present={present.TRANSPORT} />
            <MoneyCell amount={buckets.UNIFORM}   present={present.UNIFORM} />
            <MoneyCell amount={buckets.OTHER}     present={present.OTHER} />
            <td className="px-3 py-2 text-xs font-bold text-gray-800 text-right">{fmtMoney(total)}</td>
          </>
        ) : (
          <td colSpan={6} className="px-3 py-2 text-xs text-gray-500">
            {row.issues?.[0] || meta.label}
          </td>
        )}

        <td className="px-3 py-2">
          <div className="flex flex-col items-start gap-0.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.tone}`}>
              {meta.icon} {meta.label}
            </span>
            {prorated && ready && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                ½ PRORATED
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            {ready && (
              <button
                onClick={() => setProrate(!prorated)}
                className={`text-[10px] px-2 py-0.5 rounded ${
                  prorated
                    ? "bg-orange-50 text-orange-700 hover:bg-orange-100 ring-1 ring-orange-200"
                    : "text-gray-500 hover:text-orange-700 hover:bg-orange-50"
                }`}
                title="Halve TUITION and TRANSPORT for this student (mid-month registration). Discount and one-off charges stay full."
              >
                ½ Prorate
              </button>
            )}
            {ready && (
              <button
                onClick={() => setSkip(!skipped)}
                className={`text-[10px] px-2 py-0.5 rounded ${
                  skipped
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                {skipped ? "Include" : "Skip"}
              </button>
            )}
            {row.status === "already_invoiced" && row.existing_invoice_id && (
              <button
                onClick={() => navigate(`/finance/fee-invoices/show/${row.existing_invoice_id}`)}
                className="text-[10px] px-2 py-0.5 rounded text-blue-600 hover:bg-blue-50"
                title="Open the existing invoice"
              >
                View
              </button>
            )}
          </div>
        </td>
      </tr>
      {isOpen && hasBreakdown && (
        <tr className="bg-gray-50/60">
          <td></td>
          <td colSpan={10} className="px-3 py-2">
            <div className="space-y-1">
              {(row.lines || []).map((line) => {
                const o = overrides[line.fee_item_id];
                const value = o && o.amount !== null && o.amount !== undefined ? o.amount : line.amount;
                return (
                  <div key={`${row.student_id}-${line.fee_item_id}-${line.source}`} className="flex items-center gap-3 text-xs">
                    <div className="w-48 text-gray-700">{line.description || line.fee_item?.name}</div>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => ready && setLineOverride(line.fee_item_id, e.target.value)}
                      readOnly={!ready}
                      step="0.01"
                      className={`w-32 px-2 py-1 border rounded-lg text-xs text-right focus:ring-1 ${
                        ready
                          ? "border-gray-200 focus:ring-teal-500"
                          : "border-gray-100 bg-gray-100 text-gray-500 cursor-not-allowed"
                      }`}
                    />
                    <SourceBadge source={line.source} pendingId={line.pending_charge_id} />
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SourceBadge({ source, pendingId }) {
  const map = {
    class_plan:       { label: "from class plan",     tone: "text-gray-500" },
    existing_invoice: { label: "on posted invoice",   tone: "text-gray-500" },
    profile_override: { label: "student override",    tone: "text-blue-600" },
    profile_add:      { label: "student add",         tone: "text-blue-600" },
    pending_charge:   { label: `pending charge #${pendingId || "?"}`, tone: "text-amber-700" },
    manual:           { label: "manual",              tone: "text-purple-600" },
  };
  const m = map[source] || { label: source, tone: "text-gray-500" };
  return <span className={`text-[10px] ${m.tone}`}>{m.label}</span>;
}

function CommittedPanel({ run, onClose }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-emerald-800">
            ✓ {run.invoices_created} invoices generated for {MONTHS[(run.period_month || 1) - 1]} {run.period_year}
          </h3>
          <p className="text-xs text-emerald-700">
            Run total: <strong>{fmtMoney(run.total_amount)} AFN</strong>. Status: {run.status}.
          </p>
        </div>
        <button onClick={onClose} className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 text-xs font-medium">
          Run another
        </button>
      </div>
      {Array.isArray(run.invoices) && run.invoices.length > 0 && (
        <div className="mt-3 max-h-64 overflow-auto bg-white border border-emerald-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-emerald-100/50">
              <tr>
                <th className="px-3 py-1.5 text-left font-semibold text-emerald-800">Invoice #</th>
                <th className="px-3 py-1.5 text-left font-semibold text-emerald-800">Student</th>
                <th className="px-3 py-1.5 text-right font-semibold text-emerald-800">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100">
              {run.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-3 py-1.5 text-teal-700 font-medium">{inv.invoice_number}</td>
                  <td className="px-3 py-1.5 text-gray-700">Student #{inv.student_id}</td>
                  <td className="px-3 py-1.5 text-right text-gray-800 font-semibold">{fmtMoney(inv.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
