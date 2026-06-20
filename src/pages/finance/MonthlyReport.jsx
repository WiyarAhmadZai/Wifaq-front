import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { getMonthlyReport, downloadMonthlyReportPdf } from "../../api/financial";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Monthly Comprehensive Report — the board pack the finance manager owes the
 * owner each month. Bundles the four most-asked-for views:
 *
 *   1. Headline KPIs (income, expense, net, cash, deltas vs last month)
 *   2. Profit & Loss for the period
 *   3. Balance Sheet at month-end
 *   4. Cash position breakdown by account
 *   5. Budget override audit (any breach-and-override JEs in the month)
 *
 * One click → server renders the same data as a print-ready A4 PDF via mPDF.
 */
export default function MonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const load = async (y, m) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMonthlyReport(y, m);
      setReport(res.data?.data || null);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(year, month); /* eslint-disable-next-line */ }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadMonthlyReportPdf(year, month);
    } catch (e) {
      Swal.fire("Download failed", e.response?.data?.message || "Could not generate PDF.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const k = report?.kpis;
  const pl = report?.profit_loss;
  const bs = report?.balance_sheet;
  const cash = report?.cash_position;
  const overrides = report?.overrides || [];

  const delta = k ? k.net_income - k.prev_net_income : 0;

  return (
    <div className="px-4 py-5 max-w-6xl mx-auto space-y-4">
      {/* ───── Hero — system teal (matches Cashier, Payroll, Balance Sheet) ───── */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white rounded-2xl shadow-lg overflow-hidden">
        <div className="relative px-6 py-5">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-teal-100 font-bold">Board pack</p>
              <h1 className="text-2xl font-black mt-1">Monthly Finance Report</h1>
              <p className="text-[11px] text-teal-100 mt-1 max-w-md">
                Everything the owner needs each month — income, spend, net,
                cash, balance sheet, and budget overrides.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-teal-100 mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value) || year)}
                  className="w-24 px-3 py-2 text-sm rounded-lg bg-white/95 text-gray-900 border border-white/40"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-teal-100 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="px-3 py-2 text-sm rounded-lg bg-white/95 text-gray-900 border border-white/40"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => load(year, month)}
                disabled={loading}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-lg hover:bg-white/30 disabled:opacity-50 transition-colors"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
              <button
                onClick={handleDownload}
                disabled={!report || downloading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-teal-700 text-xs font-bold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-shadow"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M4 14v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
                </svg>
                {downloading ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600" />
        </div>
      ) : report ? (
        <>
          {/* ───── KPI tiles ───── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              tone="emerald"
              label="Income"
              value={k.income}
              sub={`${report.period.label}`}
            />
            <KpiCard
              tone="red"
              label="Expenses"
              value={k.expense}
              sub={`${report.period.label}`}
            />
            <KpiCard
              tone={k.net_income >= 0 ? "teal" : "red"}
              label="Net Income"
              value={k.net_income}
              sub={(
                <span className={delta >= 0 ? "text-emerald-700" : "text-red-700"}>
                  {delta >= 0 ? "▲ +" : "▼ "}{fmt(delta)} vs last month
                </span>
              )}
              big
            />
            <KpiCard
              tone="teal"
              label="Cash position"
              value={k.cash_position}
              sub={(
                <span className={k.cash_change >= 0 ? "text-emerald-700" : "text-red-700"}>
                  {k.cash_change >= 0 ? "▲ +" : "▼ "}{fmt(k.cash_change)} this month
                </span>
              )}
            />
          </div>

          {/* ───── P&L + Balance sheet side-by-side on wide screens ───── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReportCard
              title={`Profit & Loss — ${report.period.label}`}
              subtitle={`Income − Expenses = Net Income for the month`}
              tone="emerald"
            >
              <ReportTable sections={pl.sections} />
              <FooterTotal label="Net Income" value={pl.summary.net_income} positive={pl.summary.net_income >= 0} />
            </ReportCard>

            <ReportCard
              title={`Balance Sheet — ${bs.as_of}`}
              subtitle={`Assets = Liabilities + Equity`}
              tone="teal"
            >
              <ReportTable sections={bs.sections} />
              <div className={`px-4 py-3 ${bs.totals.balance_check ? "bg-emerald-50" : "bg-red-50"} border-t border-gray-100 flex items-center justify-between`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Liab + Equity
                </span>
                <span className="text-base font-black font-mono">
                  {fmt(bs.totals.liab_plus_equity)}
                </span>
              </div>
              <p className={`px-4 py-2 text-[11px] ${bs.totals.balance_check ? "text-emerald-700" : "text-red-700 font-semibold"}`}>
                {bs.totals.balance_check
                  ? "✓ In balance"
                  : `⚠ Off by ${fmt(Math.abs(bs.totals.assets - bs.totals.liab_plus_equity))} AFN`}
              </p>
            </ReportCard>
          </div>

          {/* ───── Cash position breakdown ───── */}
          <ReportCard
            title="Cash position breakdown"
            subtitle="How much sits in each cash and bank account"
            tone="teal"
          >
            <table className="w-full text-[12px]">
              <tbody className="divide-y divide-gray-50">
                {cash.accounts.map((a) => (
                  <tr key={a.code}>
                    <td className="px-4 py-2 text-gray-700">
                      <span className="text-gray-400 font-mono text-[10px] mr-2">{a.code}</span>
                      {a.name}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <FooterTotal label="Total cash on hand" value={cash.total} positive />
          </ReportCard>

          {/* ───── Budget overrides audit ───── */}
          {overrides.length > 0 && (
            <ReportCard
              title={`Budget Overrides (${overrides.length} this month)`}
              subtitle="Journal entries posted past a budget cap — each with a written reason"
              tone="amber"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] min-w-[700px]">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
                    <tr>
                      <th className="text-left px-3 py-2">Entry #</th>
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-3 py-2">Description</th>
                      <th className="text-right px-3 py-2">Amount</th>
                      <th className="text-left px-3 py-2">Approved by</th>
                      <th className="text-left px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {overrides.map((o, i) => (
                      <tr key={i} className="hover:bg-amber-50/30">
                        <td className="px-3 py-2 font-mono">{o.entry_number}</td>
                        <td className="px-3 py-2 text-gray-600">{o.transaction_date}</td>
                        <td className="px-3 py-2 text-gray-700">{o.description}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(o.amount)}</td>
                        <td className="px-3 py-2 text-gray-600">{o.overridden_by || "—"}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-xs">{o.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportCard>
          )}
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ label, value, sub, tone = "teal", big = false }) {
  const toneText = {
    emerald: "text-emerald-700",
    red:     "text-red-700",
    teal:    "text-teal-700",
  }[tone] || "text-gray-700";
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">{label}</p>
      <p className={`${big ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"} font-black mt-1 font-mono ${toneText}`}>
        {fmt(value)}
      </p>
      {sub && <p className="text-[10px] text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function ReportCard({ title, subtitle, tone = "teal", children }) {
  const accent = {
    emerald: "border-l-emerald-500",
    teal:    "border-l-teal-500",
    amber:   "border-l-amber-500",
  }[tone] || "border-l-gray-400";
  return (
    <section className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${accent} overflow-hidden`}>
      <header className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function ReportTable({ sections }) {
  return (
    <div className="divide-y divide-gray-100">
      {sections.map((section, si) => (
        <div key={si}>
          <div className="px-4 py-2 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-700">
            {section.type}
          </div>
          {section.groups.map((g, gi) => (
            <div key={gi}>
              <div className="px-4 py-2 flex items-center justify-between bg-white">
                <p className="text-[12px] font-bold text-gray-800">{g.label}</p>
                <span className="text-[12px] font-bold font-mono">{fmt(g.total)}</span>
              </div>
              {g.accounts.map((acc, ai) => (
                <div key={ai} className="px-4 py-1 flex items-center justify-between text-[11px] bg-white">
                  <span className="text-gray-600 pl-2">
                    <span className="text-gray-400 font-mono text-[10px] mr-2">{acc.code}</span>
                    {acc.name}
                  </span>
                  <span className="font-mono text-gray-700">{fmt(acc.balance)}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="px-4 py-2 flex items-center justify-between bg-gray-50 border-t border-gray-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
              Total {section.type}
            </span>
            <span className="text-[13px] font-black font-mono">{fmt(section.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FooterTotal({ label, value, positive }) {
  return (
    <div className={`px-4 py-3 flex items-center justify-between border-t border-gray-100 ${positive ? "bg-emerald-50" : "bg-red-50"}`}>
      <span className="text-[12px] font-bold uppercase tracking-wider text-gray-700">{label}</span>
      <span className={`text-base font-black font-mono ${positive ? "text-emerald-800" : "text-red-700"}`}>
        {fmt(value)}
      </span>
    </div>
  );
}
