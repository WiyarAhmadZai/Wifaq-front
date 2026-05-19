import { useEffect, useMemo, useState } from "react";
import { getLeadershipReport } from "../../api/financial";

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const SCHOOL = { name: "Wifaq School", logo: "/wiyarkpu.jpg" };

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  body * { visibility: hidden !important; }
  [data-print], [data-print] * { visibility: visible !important; }
  [data-print] { position: absolute; inset: 0; width: 100%; }
  .no-print { display: none !important; }
}
`;

export default function LeadershipReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchReport(); /* eslint-disable-next-line */ }, [year, month]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const r = await getLeadershipReport({ year, month });
      setData(r.data?.data || null);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const k = data?.kpis || {};
  const maxTrend = useMemo(() => {
    const t = data?.trend || [];
    return Math.max(1, ...t.flatMap((x) => [x.income, x.expense]));
  }, [data]);

  if (loading && !data) return <p className="px-4 py-10 text-center text-xs text-gray-400">Loading report…</p>;

  return (
    <div className="px-4 py-4 max-w-5xl mx-auto">
      <style>{PRINT_CSS}</style>

      {/* Controls */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Leadership Financial Report</h2>
          <p className="text-xs text-gray-500">Consolidated month view derived from the general ledger — fees, payroll, procurement, repairs, cash & advances.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(+e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(+e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => window.print()}
            className="px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
        </div>
      </div>

      {!data ? (
        <p className="text-center text-xs text-gray-400 py-10">No data.</p>
      ) : (
        <div data-print className="bg-white border border-gray-200 rounded-xl">
          {/* Report header */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b-2 border-gray-900">
            <div className="flex items-center gap-3">
              <img src={SCHOOL.logo} alt="" className="w-12 h-12 rounded object-cover" onError={(e) => { e.target.style.display = "none"; }} />
              <div>
                <h1 className="text-lg font-extrabold text-gray-900">{SCHOOL.name}</h1>
                <p className="text-[11px] text-gray-500">Financial Report — Leadership Summary</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Period</p>
              <p className="text-sm font-bold text-gray-900">{data.period.label}</p>
            </div>
          </div>

          {/* KPI band */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 border-b border-gray-200">
            <Kpi label="Cash position" value={k.cash_position} tone="text-teal-700" />
            <Kpi label="Income (month)" value={k.period_income} tone="text-emerald-700" />
            <Kpi label="Expense (month)" value={k.period_expense} tone="text-red-700" />
            <Kpi label="Net (month)" value={k.period_net} tone={k.period_net >= 0 ? "text-emerald-700" : "text-red-700"} />
            <Kpi label="Receivable (owed to us)" value={k.receivables_total} tone="text-amber-700" />
            <Kpi label="Payable (we owe)" value={k.payables_total} tone="text-orange-700" />
            <Kpi label="Income (YTD)" value={k.ytd_income} tone="text-emerald-700" />
            <Kpi label="Net (YTD)" value={k.ytd_net} tone={k.ytd_net >= 0 ? "text-emerald-700" : "text-red-700"} />
          </div>

          <div className="p-6 space-y-6">
            {/* Income statement */}
            <Section title="Income Statement (this month)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PnlList title="Income" lines={data.income_statement.period.income}
                  total={data.income_statement.period.total_income} totalTone="text-emerald-700" />
                <PnlList title="Expenses" lines={data.income_statement.period.expense}
                  total={data.income_statement.period.total_expense} totalTone="text-red-700" />
              </div>
              <div className="mt-4 flex justify-end">
                <div className={`px-5 py-2 rounded-lg border-2 ${data.income_statement.period.net >= 0 ? "border-emerald-600" : "border-red-600"}`}>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mr-3">Net surplus / (deficit)</span>
                  <span className={`text-xl font-extrabold ${data.income_statement.period.net >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {fmt(data.income_statement.period.net)} <span className="text-xs font-medium">AFN</span>
                  </span>
                </div>
              </div>
            </Section>

            {/* Cash + Spend by source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section title="Cash & Bank Position">
                <Table head={["Account", "Type", "Balance (AFN)"]}
                  rows={(data.cash_position.accounts || []).map((a) => [a.account_name, a.account_type, fmt(a.current_balance)])}
                  foot={["Total", "", fmt(data.cash_position.total)]} alignLast />
              </Section>
              <Section title="Where the Money Went (this month)">
                {data.spend_by_source.length === 0
                  ? <Empty />
                  : <Table head={["Source", "Amount (AFN)"]}
                      rows={data.spend_by_source.map((s) => [s.source, fmt(s.amount)])} alignLast />}
              </Section>
            </div>

            {/* Receivables / Payables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section title="Receivables — owed to the school">
                <KV label="Student fees outstanding" value={data.receivables.students_outstanding} />
                <KV label="Staff/vendor advances out" value={data.receivables.party_receivable} />
                <KV label="Total" value={data.receivables.total} bold />
                {data.receivables.top.length > 0 && (
                  <Table className="mt-3" head={["Party", "Type", "Amount"]}
                    rows={data.receivables.top.map((t) => [`${t.name} (${t.code})`, t.type, fmt(t.amount)])} alignLast />
                )}
              </Section>
              <Section title="Payables — the school owes">
                <KV label="Vendor invoices unpaid" value={data.payables.vendor_outstanding} />
                <KV label="Owed to staff/vendor parties" value={data.payables.party_payable} />
                <KV label="Total" value={data.payables.total} bold />
                {data.payables.top.length > 0 && (
                  <Table className="mt-3" head={["Party", "Type", "Amount"]}
                    rows={data.payables.top.map((t) => [`${t.name} (${t.code})`, t.type, fmt(t.amount)])} alignLast />
                )}
              </Section>
            </div>

            {/* Budget vs actual */}
            <Section title="Budget vs Actual (active budgets)">
              {data.budgets.length === 0 ? <Empty /> : (
                <Table head={["Budget", "Budgeted", "Spent", "Remaining", "Used %"]}
                  rows={data.budgets.map((b) => [
                    b.name, fmt(b.budgeted), fmt(b.spent), fmt(b.remaining),
                    `${b.utilization}%`,
                  ])} />
              )}
            </Section>

            {/* 6-month trend */}
            <Section title="Income vs Expense — last 6 months">
              <div className="flex items-end gap-4 h-40 px-2">
                {data.trend.map((t) => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-end gap-1 h-32 w-full justify-center">
                      <div className="w-4 bg-emerald-500 rounded-t" style={{ height: `${Math.max(2, (t.income / maxTrend) * 100)}%` }} title={`Income ${fmt(t.income)}`} />
                      <div className="w-4 bg-red-500 rounded-t" style={{ height: `${Math.max(2, (t.expense / maxTrend) * 100)}%` }} title={`Expense ${fmt(t.expense)}`} />
                    </div>
                    <span className="text-[9px] text-gray-500">{t.month}</span>
                    <span className={`text-[9px] font-semibold ${t.net >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(t.net)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-gray-500 mt-2 justify-center">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Income</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-sm" /> Expense</span>
                <span>· figure under each month = net</span>
              </div>
            </Section>

            <p className="text-[9px] text-gray-400 text-center pt-4 border-t border-gray-100">
              Generated from the general ledger · {SCHOOL.name} Finance Office · {data.period.label}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold">{label}</p>
      <p className={`text-lg font-extrabold mt-0.5 ${tone}`}>{fmt(value)} <span className="text-[10px] font-medium text-gray-400">AFN</span></p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-700 border-b border-gray-200 pb-1.5 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function PnlList({ title, lines, total, totalTone }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{title}</p>
      <table className="w-full text-[11px]">
        <tbody className="divide-y divide-gray-100">
          {lines.length === 0 ? (
            <tr><td className="py-2 text-gray-400 italic">None recorded</td></tr>
          ) : lines.map((l) => (
            <tr key={l.code}>
              <td className="py-1 text-gray-700"><span className="text-gray-400 font-mono text-[10px] mr-1.5">{l.code}</span>{l.name}</td>
              <td className="py-1 text-right font-mono text-gray-800">{fmt(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300">
            <td className="py-1.5 font-bold text-gray-700">Total {title}</td>
            <td className={`py-1.5 text-right font-extrabold font-mono ${totalTone}`}>{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Table({ head, rows, foot, alignLast, className = "" }) {
  return (
    <table className={`w-full text-[11px] border-collapse ${className}`}>
      <thead>
        <tr className="bg-gray-900 text-white">
          {head.map((h, i) => (
            <th key={i} className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${i === head.length - 1 && alignLast ? "text-right" : "text-left"}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {rows.length === 0 ? (
          <tr><td colSpan={head.length} className="px-2 py-3 text-center text-gray-400 italic">No data</td></tr>
        ) : rows.map((r, ri) => (
          <tr key={ri}>
            {r.map((c, ci) => (
              <td key={ci} className={`px-2 py-1.5 ${ci === r.length - 1 && alignLast ? "text-right font-mono font-semibold text-gray-800" : "text-gray-700"}`}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
      {foot && (
        <tfoot>
          <tr className="bg-gray-100 font-bold">
            {foot.map((f, i) => (
              <td key={i} className={`px-2 py-1.5 ${i === foot.length - 1 && alignLast ? "text-right font-mono" : ""}`}>{f}</td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function KV({ label, value, bold }) {
  return (
    <div className={`flex items-center justify-between py-1 text-xs ${bold ? "border-t border-gray-200 mt-1 pt-1.5 font-bold" : ""}`}>
      <span className={bold ? "text-gray-800" : "text-gray-500"}>{label}</span>
      <span className="font-mono font-semibold text-gray-800">{fmt(value)} AFN</span>
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-gray-400 italic py-3">Nothing recorded for this period.</p>;
}
