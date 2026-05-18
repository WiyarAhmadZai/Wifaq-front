import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFeeInvoices, getFeeInvoiceMonths } from "../../api/financial";

/**
 * Class-level fee-collection report.
 *
 * For a chosen invoice month, shows one row per class with:
 *   • Students invoiced
 *   • Paid / Partial / Overdue / Pending counts
 *   • Total billed / Total collected / Outstanding
 *   • Collection rate %
 *
 * Clicking a class expands a student-level list so you can see exactly who
 * hasn't paid, with quick links to their invoices.
 */

const fmtMoney = (n) => Number(n || 0).toLocaleString();
const fmtPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

const STATUS = {
  paid:      { label: "Paid",     pill: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  partial:   { label: "Partial",  pill: "bg-blue-50 text-blue-700 ring-blue-200" },
  pending:   { label: "Pending",  pill: "bg-amber-50 text-amber-700 ring-amber-200" },
  overdue:   { label: "Overdue",  pill: "bg-red-50 text-red-700 ring-red-200" },
  waived:    { label: "Waived",   pill: "bg-purple-50 text-purple-700 ring-purple-200" },
  cancelled: { label: "Cancelled",pill: "bg-gray-100 text-gray-500 ring-gray-300" },
};

// Color the collection rate according to how good it is.
const rateColor = (pct) =>
  pct >= 90 ? "text-emerald-700" :
  pct >= 70 ? "text-teal-700" :
  pct >= 50 ? "text-amber-700" :
              "text-red-600";

export default function ClassCollectionReport() {
  const navigate = useNavigate();

  const [months, setMonths] = useState([]);          // available periods (YYYY-MM-01 strings)
  const [period, setPeriod] = useState("");          // selected period
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedClassId, setExpandedClassId] = useState(null);

  // Load the dropdown options once and pick the most recent by default.
  useEffect(() => {
    getFeeInvoiceMonths()
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setMonths(list);
        if (list.length > 0 && !period) setPeriod(list[0]);
      })
      .catch(() => setMonths([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload invoices whenever the period changes.
  useEffect(() => {
    if (!period) return;
    setLoading(true);
    const [y, m] = period.split("-").map(Number);
    getFeeInvoices({ year: y, month: m, per_page: 5000 })
      .then((res) => {
        const rows = res.data?.data?.data ?? res.data?.data ?? [];
        setInvoices(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [period]);

  // ─── Aggregate invoices by school_class ────────────────────────────────
  const classes = useMemo(() => {
    const buckets = new Map();
    for (const inv of invoices) {
      if (inv.voided_at) continue;
      const cls = inv.student?.school_class;
      const id = cls?.id ?? -1;
      const name = cls?.class_name ?? cls?.name ?? "Unassigned";
      if (!buckets.has(id)) {
        buckets.set(id, {
          id,
          name,
          students: new Set(),
          invoiceCount: 0,
          paid: 0, partial: 0, pending: 0, overdue: 0, other: 0,
          billed: 0, collected: 0,
          studentRows: [],   // per-student aggregation
        });
      }
      const b = buckets.get(id);
      b.invoiceCount += 1;
      b.students.add(inv.student_id);
      b.billed   += Number(inv.final_amount || 0);
      b.collected += Number(inv.amount_paid || 0);
      const s = inv.status;
      if (s === "paid")    b.paid++;
      else if (s === "partial") b.partial++;
      else if (s === "overdue") b.overdue++;
      else if (s === "pending") b.pending++;
      else b.other++;

      // Per-student bucket within the class
      const sid = inv.student_id;
      let row = b.studentRows.find((r) => r.student_id === sid);
      if (!row) {
        row = {
          student_id: sid,
          student: inv.student,
          invoices: [],
          billed: 0, collected: 0,
        };
        b.studentRows.push(row);
      }
      row.invoices.push(inv);
      row.billed   += Number(inv.final_amount || 0);
      row.collected += Number(inv.amount_paid || 0);
    }

    // Finalise buckets: convert students Set → count, derive collection rate.
    return [...buckets.values()].map((b) => {
      const studentCount = b.students.size;
      const balance = b.billed - b.collected;
      const rate = b.billed > 0 ? (b.collected / b.billed) * 100 : 0;
      // Sort students within the class: most-owed first.
      b.studentRows.sort((a, x) => (x.billed - x.collected) - (a.billed - a.collected));
      return { ...b, studentCount, balance, rate };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  // Class search filter
  const filteredClasses = useMemo(() => {
    if (!search.trim()) return classes;
    const q = search.trim().toLowerCase();
    return classes.filter((c) => c.name.toLowerCase().includes(q));
  }, [classes, search]);

  // School-wide totals
  const totals = useMemo(() => {
    const billed   = classes.reduce((s, c) => s + c.billed, 0);
    const collected = classes.reduce((s, c) => s + c.collected, 0);
    const studentCount = classes.reduce((s, c) => s + c.studentCount, 0);
    const paid     = classes.reduce((s, c) => s + c.paid, 0);
    const overdue  = classes.reduce((s, c) => s + c.overdue, 0);
    const rate = billed > 0 ? (collected / billed) * 100 : 0;
    return { billed, collected, balance: billed - collected, studentCount, paid, overdue, rate };
  }, [classes]);

  // ====================================================================== UI

  return (
    <div className="px-4 py-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Class Collection Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            For each class, who has paid for the selected month and who hasn't.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold text-gray-600 uppercase">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 min-w-[140px]"
          >
            {months.length === 0 && <option value="">(no periods)</option>}
            {months.map((m) => (
              <option key={m} value={m}>
                {new Date(m).toLocaleString("default", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* School-wide stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <Stat label="Students invoiced" value={String(totals.studentCount)} unit="" tone="text-gray-900" />
        <Stat label="Total billed"     value={fmtMoney(totals.billed)}     unit="AFN" tone="text-gray-800" />
        <Stat label="Collected"        value={fmtMoney(totals.collected)}  unit="AFN" tone="text-emerald-700" subtle="bg-emerald-50/50 ring-emerald-100" />
        <Stat label="Outstanding"      value={fmtMoney(totals.balance)}    unit="AFN" tone="text-red-700"     subtle="bg-red-50/50 ring-red-100" />
        <Stat label="Collection rate"  value={fmtPct(totals.rate)}         unit=""    tone={rateColor(totals.rate)} subtle="bg-teal-50/50 ring-teal-100" />
      </div>

      {/* Class table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">By class</h2>
          <div className="ml-auto relative w-56 max-w-full">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search class…"
              className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/60">
                <th className="w-8 px-2 py-2.5"></th>
                <th className="px-3 py-2.5">Class</th>
                <th className="px-3 py-2.5 text-right">Students</th>
                <th className="px-3 py-2.5 text-right">Paid</th>
                <th className="px-3 py-2.5 text-right">Partial</th>
                <th className="px-3 py-2.5 text-right">Pending</th>
                <th className="px-3 py-2.5 text-right">Overdue</th>
                <th className="px-3 py-2.5 text-right">Billed</th>
                <th className="px-3 py-2.5 text-right">Collected</th>
                <th className="px-3 py-2.5 text-right">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={10} className="text-center py-10 text-xs text-gray-500">Loading…</td></tr>
              )}
              {!loading && filteredClasses.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10">
                  <p className="text-sm text-gray-700 font-medium">No invoices for this period.</p>
                  <p className="text-xs text-gray-400 mt-1">Pick another month, or run a Billing Run for this period first.</p>
                </td></tr>
              )}
              {!loading && filteredClasses.map((c) => {
                const isOpen = expandedClassId === c.id;
                return (
                  <ClassRow
                    key={c.id}
                    cls={c}
                    isOpen={isOpen}
                    onToggle={() => setExpandedClassId(isOpen ? null : c.id)}
                    onOpenInvoice={(id) => navigate(`/finance/fee-invoices/show/${id}`)}
                    onOpenStudent={(sid) => navigate(`/finance/students/${sid}/payments`)}
                  />
                );
              })}
            </tbody>
            {!loading && filteredClasses.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td></td>
                  <td className="px-3 py-2 text-xs text-gray-700">School total</td>
                  <td className="px-3 py-2 text-xs text-right text-gray-800">{totals.studentCount}</td>
                  <td className="px-3 py-2 text-xs text-right text-emerald-700">{totals.paid}</td>
                  <td className="px-3 py-2 text-xs text-right text-gray-600">—</td>
                  <td className="px-3 py-2 text-xs text-right text-gray-600">—</td>
                  <td className="px-3 py-2 text-xs text-right text-red-600">{totals.overdue}</td>
                  <td className="px-3 py-2 text-xs text-right text-gray-800">{fmtMoney(totals.billed)}</td>
                  <td className="px-3 py-2 text-xs text-right text-emerald-700">{fmtMoney(totals.collected)}</td>
                  <td className={`px-3 py-2 text-xs text-right font-bold ${rateColor(totals.rate)}`}>{fmtPct(totals.rate)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ====================================================================== Stat

function Stat({ label, value, unit, tone, subtle }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-3.5 ring-1 ring-gray-100 ${subtle || ""}`}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${tone}`}>
        {value}
        {unit && <span className="text-[10px] font-normal text-gray-500 ml-1.5">{unit}</span>}
      </p>
    </div>
  );
}

// ====================================================================== Class row + drill-down

function ClassRow({ cls, isOpen, onToggle, onOpenInvoice, onOpenStudent }) {
  const rateCls = rateColor(cls.rate);
  return (
    <>
      <tr className="hover:bg-teal-50/30 cursor-pointer" onClick={onToggle}>
        <td className="w-8 px-2 py-2.5 text-center text-gray-400">{isOpen ? "▼" : "▶"}</td>
        <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{cls.name}</td>
        <td className="px-3 py-2.5 text-xs text-gray-700 text-right">{cls.studentCount}</td>
        <td className="px-3 py-2.5 text-xs text-right">
          {cls.paid > 0 ? <span className="text-emerald-700 font-semibold">{cls.paid}</span> : <span className="text-gray-300">0</span>}
        </td>
        <td className="px-3 py-2.5 text-xs text-right">
          {cls.partial > 0 ? <span className="text-blue-700 font-semibold">{cls.partial}</span> : <span className="text-gray-300">0</span>}
        </td>
        <td className="px-3 py-2.5 text-xs text-right">
          {cls.pending > 0 ? <span className="text-amber-700 font-semibold">{cls.pending}</span> : <span className="text-gray-300">0</span>}
        </td>
        <td className="px-3 py-2.5 text-xs text-right">
          {cls.overdue > 0 ? <span className="text-red-700 font-semibold">{cls.overdue}</span> : <span className="text-gray-300">0</span>}
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-800 text-right">{fmtMoney(cls.billed)}</td>
        <td className="px-3 py-2.5 text-xs text-emerald-700 text-right font-semibold">{fmtMoney(cls.collected)}</td>
        <td className={`px-3 py-2.5 text-xs text-right font-bold ${rateCls}`}>
          <div className="flex items-center justify-end gap-1.5">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full ${cls.rate >= 90 ? "bg-emerald-500" : cls.rate >= 70 ? "bg-teal-500" : cls.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, cls.rate)}%` }} />
            </div>
            <span>{fmtPct(cls.rate)}</span>
          </div>
        </td>
      </tr>

      {isOpen && (
        <tr className="bg-gray-50/40">
          <td></td>
          <td colSpan={9} className="px-3 py-3">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/60">
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Invoices</th>
                    <th className="px-3 py-2 text-right">Billed</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cls.studentRows.map((r) => {
                    const balance = r.billed - r.collected;
                    const rate = r.billed > 0 ? (r.collected / r.billed) * 100 : 0;
                    const status = balance <= 0.005 ? "paid" : (r.collected > 0 ? "partial" :
                      (r.invoices.some((i) => i.status === "overdue") ? "overdue" : "pending"));
                    const statusMeta = STATUS[status];
                    return (
                      <tr key={r.student_id} className="hover:bg-teal-50/30">
                        <td className="px-3 py-2">
                          <p className="text-xs font-semibold text-gray-800">
                            {r.student?.full_name || `Student #${r.student_id}`}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{r.student?.student_id || ""}</p>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {r.invoices.map((inv) => (
                              <button
                                key={inv.id}
                                onClick={(e) => { e.stopPropagation(); onOpenInvoice(inv.id); }}
                                className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-semibold hover:bg-teal-100 ring-1 ring-teal-200"
                                title={`Open ${inv.invoice_number}`}
                              >
                                {inv.invoice_number}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800 font-medium">{fmtMoney(r.billed)}</td>
                        <td className="px-3 py-2 text-right text-emerald-700 font-medium">{fmtMoney(r.collected)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={balance > 0.005 ? "text-red-600 font-semibold" : "text-gray-400"}>
                            {fmtMoney(balance)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${statusMeta.pill}`}>
                            {statusMeta.label} · {fmtPct(rate)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenStudent(r.student_id); }}
                            className="text-[10px] text-teal-700 hover:underline font-semibold"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
