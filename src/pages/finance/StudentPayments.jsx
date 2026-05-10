import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFeePayments, getFeeInvoices } from "../../api/financial";

/**
 * Per-student payment + billing coverage view.
 *
 * Two view modes:
 *   • List      — chronological table of every payment received from the student
 *   • Calendar  — month-by-month coverage grid: which months are paid, partial,
 *                 overdue, pending, or not invoiced. Click any month to drill
 *                 the list down to that month's payments.
 *
 * Reached from the invoice detail page header and from the Cashier when a
 * student is selected.
 */

const fmtMoney = (n) => Number(n || 0).toLocaleString();
const fmtDateLong = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const isoDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const monthKey = (d) => (d ? new Date(d).toISOString().slice(0, 7) : ""); // "YYYY-MM"

const METHOD = {
  cash:   { label: "Cash",   tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  bank:   { label: "Bank",   tone: "bg-blue-50 text-blue-700 ring-blue-200" },
  mobile: { label: "Mobile", tone: "bg-purple-50 text-purple-700 ring-purple-200" },
  check:  { label: "Cheque", tone: "bg-amber-50 text-amber-700 ring-amber-200" },
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Coverage status for a single (year, month) — drives cell colour and label.
const COVERAGE = {
  paid:         { label: "Paid",          tone: "bg-emerald-50 border-emerald-300 hover:bg-emerald-100",        textTone: "text-emerald-700",  icon: "✓" },
  partial:      { label: "Partial",       tone: "bg-blue-50 border-blue-300 hover:bg-blue-100",                 textTone: "text-blue-700",     icon: "◐" },
  overdue:      { label: "Overdue",       tone: "bg-red-50 border-red-300 hover:bg-red-100",                    textTone: "text-red-700",      icon: "!"  },
  pending:      { label: "Pending",       tone: "bg-amber-50 border-amber-300 hover:bg-amber-100",              textTone: "text-amber-700",    icon: "○" },
  not_invoiced: { label: "Not invoiced",  tone: "bg-gray-50 border-gray-200 cursor-default",                    textTone: "text-gray-400",     icon: "—" },
};

export default function StudentPayments() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");                  // 'list' | 'calendar'
  const [selectedMonth, setSelectedMonth] = useState(null);  // 'YYYY-MM' or null

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getFeePayments({ student_id: studentId, per_page: 1000 }),
      getFeeInvoices({ student_id: studentId, per_page: 1000 }),
    ])
      .then(([pRes, iRes]) => {
        setPayments(Array.isArray(pRes.data?.data?.data ?? pRes.data?.data) ? (pRes.data?.data?.data ?? pRes.data?.data) : []);
        setInvoices(Array.isArray(iRes.data?.data?.data ?? iRes.data?.data) ? (iRes.data?.data?.data ?? iRes.data?.data) : []);
      })
      .catch(() => { setPayments([]); setInvoices([]); })
      .finally(() => setLoading(false));
  }, [studentId]);

  // ─── Student header info derived from any loaded record ────────────────
  const student =
    payments[0]?.fee_invoice?.student ||
    invoices[0]?.student ||
    null;
  const studentName =
    student?.full_name ||
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    `Student #${studentId}`;
  const className = student?.school_class?.class_name || student?.school_class?.name || "—";
  const family = student?.family || {};

  // ─── Stats over all payments ───────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
    let total = 0, thisMonthSum = 0, lastMonthSum = 0, last = null;
    for (const p of payments) {
      const amt = Number(p.amount_paid || 0);
      total += amt;
      const d = new Date(p.payment_date);
      if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) thisMonthSum += amt;
      if (d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth()) lastMonthSum += amt;
      if (!last || d > new Date(last.payment_date)) last = p;
    }
    return { total, thisMonth: thisMonthSum, lastMonth: lastMonthSum, last };
  }, [payments]);

  // ─── Coverage map: invoice_month → { invoices[], total, paid, balance, status } ─
  const coverage = useMemo(() => {
    const map = {};
    for (const inv of invoices) {
      if (inv.voided_at) continue;                           // voided → ignore
      const key = monthKey(inv.invoice_month);
      if (!key) continue;
      if (!map[key]) map[key] = { invoices: [], total: 0, paid: 0, anyOverdue: false };
      map[key].invoices.push(inv);
      map[key].total += Number(inv.final_amount || 0);
      map[key].paid  += Number(inv.amount_paid  || 0);
      if (inv.status === "overdue") map[key].anyOverdue = true;
    }
    for (const [, c] of Object.entries(map)) {
      c.balance = c.total - c.paid;
      if (c.balance <= 0.005) c.status = "paid";
      else if (c.paid > 0)    c.status = "partial";
      else if (c.anyOverdue)  c.status = "overdue";
      else                    c.status = "pending";
    }
    return map;
  }, [invoices]);

  // ─── Year nav for the calendar (defaults to current year, but jumps to
  //     the year of the latest invoice so the page lands on real data). ──
  const [calYear, setCalYear] = useState(null);
  useEffect(() => {
    if (calYear !== null || invoices.length === 0) return;
    const latest = invoices.reduce((max, inv) => {
      const d = new Date(inv.invoice_month);
      return !max || d > max ? d : max;
    }, null);
    setCalYear(latest ? latest.getFullYear() : new Date().getFullYear());
  }, [invoices, calYear]);

  const year = calYear ?? new Date().getFullYear();
  const yearMonths = useMemo(() => {
    const cells = [];
    for (let m = 0; m < 12; m++) {
      const key = `${year}-${String(m + 1).padStart(2, "0")}`;
      const cov = coverage[key];
      cells.push({
        key,
        index: m,
        label: MONTHS_SHORT[m],
        status: cov ? cov.status : "not_invoiced",
        total: cov ? cov.total : 0,
        paid:  cov ? cov.paid  : 0,
        balance: cov ? cov.balance : 0,
        invoiceCount: cov ? cov.invoices.length : 0,
      });
    }
    return cells;
  }, [year, coverage]);

  // Year totals (for the panel summary)
  const yearTotals = useMemo(() => {
    const months = yearMonths.filter((m) => m.status !== "not_invoiced");
    return {
      billed:  months.reduce((s, m) => s + m.total, 0),
      paid:    months.reduce((s, m) => s + m.paid, 0),
      balance: months.reduce((s, m) => s + m.balance, 0),
      paidMonths:    months.filter((m) => m.status === "paid").length,
      unpaidMonths:  months.filter((m) => m.status !== "paid" && m.status !== "not_invoiced").length,
    };
  }, [yearMonths]);

  // ─── List filter: when a month is selected, show only its payments ─────
  const visiblePayments = useMemo(() => {
    if (!selectedMonth) return payments;
    return payments.filter((p) => {
      // A payment belongs to a month if its invoice's invoice_month falls in that month.
      // Fall back to payment_date for legacy rows where the invoice doesn't load.
      const inv = p.fee_invoice;
      const k = inv ? monthKey(inv.invoice_month) : monthKey(p.payment_date);
      return k === selectedMonth;
    });
  }, [payments, selectedMonth]);

  // ====================================================================== UI

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-6xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg flex-shrink-0"
              title="Back"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{studentName}</h1>
              <p className="text-xs text-gray-500 truncate">
                Payments &amp; coverage · Class {className}
                {family.father_name ? ` · ${family.father_name}` : ""}
                {family.father_phone ? ` · ${family.father_phone}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/finance/cashier?student_id=${studentId}`)}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold whitespace-nowrap"
          >
            Take payment
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Total paid"  value={fmtMoney(stats.total)}     unit="AFN" tone="text-gray-900" />
        <Stat label="This month"  value={fmtMoney(stats.thisMonth)} unit="AFN" tone="text-emerald-700" subtle="bg-emerald-50/40 ring-emerald-100" />
        <Stat label="Last month"  value={fmtMoney(stats.lastMonth)} unit="AFN" tone="text-gray-700" />
        <Stat
          label="Last payment"
          value={stats.last ? fmtDateLong(stats.last.payment_date) : "—"}
          unit={stats.last ? `${fmtMoney(stats.last.amount_paid)} AFN` : ""}
          tone="text-gray-800"
        />
      </div>

      {/* ── View switcher ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
          {[["list", "List"], ["calendar", "Calendar"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                view === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {selectedMonth && (
          <button
            onClick={() => setSelectedMonth(null)}
            className="text-xs text-teal-700 hover:underline"
          >
            Clear month filter ({MONTHS_LONG[Number(selectedMonth.split("-")[1]) - 1]} {selectedMonth.split("-")[0]})
          </button>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      {view === "calendar" ? (
        <CoverageCalendar
          year={year}
          onPrevYear={() => setCalYear(year - 1)}
          onNextYear={() => setCalYear(year + 1)}
          months={yearMonths}
          totals={yearTotals}
          selectedMonth={selectedMonth}
          onSelectMonth={(key) => {
            const m = yearMonths.find((mm) => mm.key === key);
            if (!m || m.status === "not_invoiced") return; // gray cells aren't clickable
            setSelectedMonth(selectedMonth === key ? null : key);
            setView("list");
          }}
        />
      ) : (
        <ListView
          payments={visiblePayments}
          selectedMonth={selectedMonth}
          coverageForMonth={selectedMonth ? coverage[selectedMonth] : null}
          onOpenInvoice={(id) => navigate(`/finance/fee-invoices/show/${id}`)}
        />
      )}
    </div>
  );
}

// ====================================================================== Stat

function Stat({ label, value, unit, tone, subtle }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-3.5 ring-1 ring-gray-100 ${subtle || ""}`}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${tone}`}>
        {value}
        {unit && <span className="text-[10px] font-normal text-gray-500 ml-1.5">{unit}</span>}
      </p>
    </div>
  );
}

// ====================================================================== List

function ListView({ payments, selectedMonth, coverageForMonth, onOpenInvoice }) {
  return (
    <div className="space-y-3">
      {selectedMonth && coverageForMonth && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {MONTHS_LONG[Number(selectedMonth.split("-")[1]) - 1]} {selectedMonth.split("-")[0]} — coverage
            </p>
            <p className="text-sm text-gray-700 mt-0.5">
              {coverageForMonth.invoices.length} invoice{coverageForMonth.invoices.length === 1 ? "" : "s"} ·
              <span className="ml-1 font-bold text-gray-900">{fmtMoney(coverageForMonth.total)} AFN</span> billed,
              <span className="ml-1 font-bold text-emerald-700">{fmtMoney(coverageForMonth.paid)} paid</span>,
              <span className="ml-1 font-bold text-red-600">{fmtMoney(coverageForMonth.balance)} owed</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {coverageForMonth.invoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => onOpenInvoice(inv.id)}
                className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-semibold hover:bg-teal-100 ring-1 ring-teal-200"
              >
                {inv.invoice_number}
              </button>
            ))}
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-700 font-medium">No payments to show.</p>
          <p className="text-xs text-gray-400 mt-1">
            {selectedMonth ? "No payments recorded for this month." : "This student has no recorded payments yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/60">
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Receipt</th>
                  <th className="px-3 py-2.5">Invoice</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-3 py-2.5">Method</th>
                  <th className="px-3 py-2.5">Account</th>
                  <th className="px-3 py-2.5">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const meta = METHOD[p.payment_method] || { label: p.payment_method, tone: "bg-gray-100 text-gray-600 ring-gray-200" };
                  return (
                    <tr key={p.id} className="hover:bg-teal-50/30">
                      <td className="px-3 py-2.5 text-xs text-gray-700">{fmtDateLong(p.payment_date)}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-700">{p.receipt_number || "—"}</td>
                      <td className="px-3 py-2.5 text-xs">
                        <button
                          onClick={() => onOpenInvoice(p.fee_invoice_id)}
                          className="font-semibold text-teal-700 hover:underline"
                        >
                          {p.fee_invoice?.invoice_number || `INV-${p.fee_invoice_id}`}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-900 text-right">
                        {fmtMoney(p.amount_paid)} <span className="text-[10px] font-normal text-gray-500">AFN</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${meta.tone}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{p.account?.account_name || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{p.reference_number || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-right text-xs text-gray-600">
                    Total ({payments.length} payment{payments.length === 1 ? "" : "s"})
                  </td>
                  <td className="px-3 py-2 text-xs text-right font-bold text-teal-700">
                    {fmtMoney(payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0))} AFN
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================================== Coverage Calendar

function CoverageCalendar({ year, onPrevYear, onNextYear, months, totals, selectedMonth, onSelectMonth }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Year navigation */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevYear}
            className="p-1.5 text-gray-500 hover:text-teal-700 hover:bg-white rounded"
            title="Previous year"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-800 min-w-[80px] text-center">{year}</h2>
          <button
            onClick={onNextYear}
            className="p-1.5 text-gray-500 hover:text-teal-700 hover:bg-white rounded"
            title="Next year"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-600">
            <span className="text-emerald-700 font-bold">{totals.paidMonths}</span> paid
          </span>
          <span className="text-gray-600">
            <span className="text-red-600 font-bold">{totals.unpaidMonths}</span> open
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">
            Billed <strong>{fmtMoney(totals.billed)}</strong>
          </span>
          <span className="text-gray-600">
            Paid <strong className="text-emerald-700">{fmtMoney(totals.paid)}</strong>
          </span>
          {totals.balance > 0 && (
            <span className="text-gray-600">
              Owed <strong className="text-red-600">{fmtMoney(totals.balance)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* 4×3 month grid */}
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {months.map((m) => {
          const meta = COVERAGE[m.status];
          const isSelected = selectedMonth === m.key;
          const clickable = m.status !== "not_invoiced";
          return (
            <button
              key={m.key}
              onClick={() => onSelectMonth(m.key)}
              disabled={!clickable}
              className={`relative text-left border rounded-lg p-3 transition-all ${meta.tone} ${
                isSelected ? "ring-2 ring-teal-500 ring-offset-1" : ""
              } ${clickable ? "" : "opacity-60"}`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-xs font-bold uppercase tracking-wider ${meta.textTone}`}>{m.label}</p>
                <span className={`text-base font-bold ${meta.textTone}`}>{meta.icon}</span>
              </div>
              <p className={`text-[10px] mt-0.5 ${meta.textTone} font-semibold`}>{meta.label}</p>
              {m.status !== "not_invoiced" ? (
                <div className="mt-2 pt-2 border-t border-current/10 space-y-0.5">
                  <p className="text-[10px] text-gray-500">
                    Billed <span className="font-semibold text-gray-700">{fmtMoney(m.total)}</span>
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Paid <span className="font-semibold text-emerald-700">{fmtMoney(m.paid)}</span>
                  </p>
                  {m.balance > 0.005 && (
                    <p className="text-[10px] text-gray-500">
                      Owed <span className="font-semibold text-red-600">{fmtMoney(m.balance)}</span>
                    </p>
                  )}
                  <p className="text-[9px] text-gray-400 italic pt-0.5">
                    {m.invoiceCount} invoice{m.invoiceCount === 1 ? "" : "s"}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 mt-2 italic">No invoice</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3 text-[10px] text-gray-600">
        <Legend dot="bg-emerald-300" label="Paid" />
        <Legend dot="bg-blue-300" label="Partial" />
        <Legend dot="bg-red-300" label="Overdue" />
        <Legend dot="bg-amber-300" label="Pending" />
        <Legend dot="bg-gray-200" label="Not invoiced" />
        <span className="ml-auto text-gray-400 italic">Click a month to drill into that month's payments.</span>
      </div>
    </div>
  );
}

function Legend({ dot, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-sm ${dot}`} />
      {label}
    </span>
  );
}
