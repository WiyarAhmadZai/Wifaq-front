import { useEffect, useMemo, useState } from "react";
import { getLeadershipReport } from "../../api/financial";

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtK = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return fmt(v);
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SCHOOL = { name: "Wifaq School", logo: "/wiyarkpu.jpg" };

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 10mm; }
  body * { visibility: hidden !important; }
  [data-print], [data-print] * { visibility: visible !important; }
  [data-print] { position: absolute; inset: 0; width: 100%; }
  .no-print { display: none !important; }
  .pro-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; break-inside: avoid; }
}
`;

/* ── tiny inline icons ─────────────────────────────────────────────────── */
const I = {
  cash: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  up: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  down: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
  scale: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  bank: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  doc: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  pie: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z",
  trend: "M3 3v18h18 M7 14l3-3 4 4 5-6",
};
const Ico = ({ d, className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

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
    } catch (e) { console.error(e); setData(null); }
    finally { setLoading(false); }
  };

  const k = data?.kpis || {};
  const maxTrend = useMemo(
    () => Math.max(1, ...(data?.trend || []).flatMap((x) => [x.income, x.expense])),
    [data]
  );
  const spendTotal = useMemo(
    () => (data?.spend_by_source || []).reduce((s, x) => s + x.amount, 0) || 1,
    [data]
  );
  const SPEND_COLORS = ["bg-teal-500", "bg-indigo-500", "bg-amber-500", "bg-rose-500", "bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-orange-500"];

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:px-6 py-5">
      <style>{PRINT_CSS}</style>

      {/* Top bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-5 max-w-6xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financial Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">Consolidated from the general ledger — every workflow, one view.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <select value={month} onChange={(e) => setMonth(+e.target.value)}
              className="px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none bg-transparent">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(+e.target.value)}
              className="px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none border-l border-slate-200 bg-transparent">
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 shadow-sm">
            <Ico d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="max-w-6xl mx-auto text-center py-24 text-sm text-slate-400">Loading dashboard…</div>
      )}

      {data && (
        <div data-print className="max-w-6xl mx-auto space-y-5">
          {/* Print-only report header */}
          <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-2">
            <div className="flex items-center gap-3">
              <img src={SCHOOL.logo} alt="" className="w-10 h-10 rounded object-cover" onError={(e) => { e.target.style.display = "none"; }} />
              <div><h1 className="text-lg font-extrabold">{SCHOOL.name}</h1><p className="text-[11px] text-slate-500">Leadership Financial Report</p></div>
            </div>
            <p className="text-sm font-bold">{data.period.label}</p>
          </div>

          {/* ── Hero: net result + period ──────────────────────────────── */}
          <div className="pro-card rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 shadow-lg flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Net result · {data.period.label}</p>
              <p className={`text-4xl font-extrabold mt-1 ${k.period_net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {k.period_net >= 0 ? "+" : "−"}{fmt(Math.abs(k.period_net))} <span className="text-lg font-semibold text-slate-400">AFN</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                YTD net <span className={k.ytd_net >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>{fmt(k.ytd_net)} AFN</span>
              </p>
            </div>
            <div className="flex gap-8">
              <HeroStat label="Income" value={k.period_income} accent="text-emerald-400" />
              <HeroStat label="Expense" value={k.period_expense} accent="text-rose-400" />
              <HeroStat label="Cash on hand" value={k.cash_position} accent="text-teal-300" />
            </div>
          </div>

          {/* ── KPI strip ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={I.cash} label="Cash & Bank" value={k.cash_position} tint="teal" />
            <Kpi icon={I.up} label="Income (month)" value={k.period_income} tint="emerald" />
            <Kpi icon={I.down} label="Expense (month)" value={k.period_expense} tint="rose" />
            <Kpi icon={I.scale} label="Net (month)" value={k.period_net} tint={k.period_net >= 0 ? "emerald" : "rose"} signed />
            <Kpi icon={I.doc} label="Receivable" sub="owed to us" value={k.receivables_total} tint="amber" />
            <Kpi icon={I.doc} label="Payable" sub="we owe" value={k.payables_total} tint="orange" />
            <Kpi icon={I.up} label="Income (YTD)" value={k.ytd_income} tint="emerald" />
            <Kpi icon={I.scale} label="Net (YTD)" value={k.ytd_net} tint={k.ytd_net >= 0 ? "emerald" : "rose"} signed />
          </div>

          {/* ── Income statement + spend breakdown ─────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2" title="Income Statement" sub="this month" icon={I.scale}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Pnl title="Income" tone="emerald" lines={data.income_statement.period.income} total={data.income_statement.period.total_income} />
                <Pnl title="Expenses" tone="rose" lines={data.income_statement.period.expense} total={data.income_statement.period.total_expense} />
              </div>
              <div className={`mt-5 rounded-xl px-5 py-3 flex items-center justify-between ${data.income_statement.period.net >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Net surplus / (deficit)</span>
                <span className={`text-2xl font-extrabold ${data.income_statement.period.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {fmt(data.income_statement.period.net)} <span className="text-xs font-semibold">AFN</span>
                </span>
              </div>
            </Card>

            <Card title="Where money went" sub="this month" icon={I.pie}>
              {data.spend_by_source.length === 0 ? <Empty /> : (
                <div className="space-y-3">
                  {/* stacked proportion bar */}
                  <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                    {data.spend_by_source.map((s, i) => (
                      <div key={s.source} className={SPEND_COLORS[i % SPEND_COLORS.length]}
                        style={{ width: `${(s.amount / spendTotal) * 100}%` }} title={s.source} />
                    ))}
                  </div>
                  <ul className="space-y-2 mt-3">
                    {data.spend_by_source.map((s, i) => (
                      <li key={s.source} className="flex items-center gap-2 text-xs">
                        <span className={`w-2.5 h-2.5 rounded-sm ${SPEND_COLORS[i % SPEND_COLORS.length]}`} />
                        <span className="flex-1 text-slate-600 truncate">{s.source}</span>
                        <span className="font-semibold text-slate-800 font-mono">{fmt(s.amount)}</span>
                        <span className="text-slate-400 w-9 text-right">{Math.round((s.amount / spendTotal) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          {/* ── Cash position + Receivables + Payables ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Cash & Bank" sub={`${fmt(data.cash_position.total)} AFN total`} icon={I.bank}>
              <ul className="divide-y divide-slate-100">
                {(data.cash_position.accounts || []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{a.account_name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{a.account_type}</p>
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-900">{fmt(a.current_balance)}</span>
                  </li>
                ))}
                {(data.cash_position.accounts || []).length === 0 && <Empty />}
              </ul>
            </Card>

            <LedgerCard title="Receivables" sub="money owed to the school" icon={I.doc} tone="amber"
              rows={[
                ["Student fees outstanding", data.receivables.students_outstanding],
                ["Staff / vendor advances out", data.receivables.party_receivable],
              ]}
              total={data.receivables.total} top={data.receivables.top} />

            <LedgerCard title="Payables" sub="money the school owes" icon={I.doc} tone="orange"
              rows={[
                ["Vendor invoices unpaid", data.payables.vendor_outstanding],
                ["Owed to staff / vendor parties", data.payables.party_payable],
              ]}
              total={data.payables.total} top={data.payables.top} />
          </div>

          {/* ── Budgets + Trend ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Budget vs Actual" sub="active budgets" icon={I.scale}>
              {data.budgets.length === 0 ? <Empty /> : (
                <ul className="space-y-4">
                  {data.budgets.map((b) => {
                    const over = b.utilization > 100;
                    return (
                      <li key={b.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">{b.name}</span>
                          <span className={`font-mono ${over ? "text-rose-600 font-bold" : "text-slate-500"}`}>
                            {fmt(b.spent)} / {fmt(b.budgeted)}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${over ? "bg-rose-500" : b.utilization > 80 ? "bg-amber-500" : "bg-teal-500"}`}
                            style={{ width: `${Math.min(100, b.utilization)}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{b.utilization}% used · {fmt(b.remaining)} AFN left</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Income vs Expense" sub="last 6 months" icon={I.trend}>
              <div className="flex items-end gap-3 h-44 px-1">
                {data.trend.map((t) => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="flex items-end gap-1 h-32 w-full justify-center">
                      <div className="w-3.5 bg-emerald-500 rounded-t-md transition-all" style={{ height: `${Math.max(3, (t.income / maxTrend) * 100)}%` }} title={`Income ${fmt(t.income)}`} />
                      <div className="w-3.5 bg-rose-400 rounded-t-md transition-all" style={{ height: `${Math.max(3, (t.expense / maxTrend) * 100)}%` }} title={`Expense ${fmt(t.expense)}`} />
                    </div>
                    <span className="text-[9px] text-slate-500 font-medium">{t.month.split(" ")[0]}</span>
                    <span className={`text-[9px] font-bold font-mono ${t.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmtK(t.net)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-500 mt-3 justify-center border-t border-slate-100 pt-2">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Income</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-400 rounded-sm" /> Expense</span>
                <span className="text-slate-400">· value = monthly net</span>
              </div>
            </Card>
          </div>

          <p className="text-[10px] text-slate-400 text-center pt-1">
            Generated from the general ledger · {SCHOOL.name} Finance Office · {data.period.label}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── components ────────────────────────────────────────────────────────── */

function HeroStat({ label, value, accent }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${accent}`}>{fmt(value)}</p>
    </div>
  );
}

const TINT = {
  teal:    { ring: "bg-teal-50 text-teal-600", val: "text-slate-900" },
  emerald: { ring: "bg-emerald-50 text-emerald-600", val: "text-slate-900" },
  rose:    { ring: "bg-rose-50 text-rose-600", val: "text-slate-900" },
  amber:   { ring: "bg-amber-50 text-amber-600", val: "text-slate-900" },
  orange:  { ring: "bg-orange-50 text-orange-600", val: "text-slate-900" },
};

function Kpi({ icon, label, sub, value, tint = "teal", signed }) {
  const t = TINT[tint] || TINT.teal;
  return (
    <div className="pro-card bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.ring}`}>
        <Ico d={icon} className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold leading-tight">
          {label}{sub && <span className="text-slate-300 normal-case tracking-normal"> · {sub}</span>}
        </p>
        <p className={`text-lg font-extrabold mt-1 ${t.val}`}>
          {signed && value >= 0 ? "+" : ""}{fmt(value)} <span className="text-[10px] font-semibold text-slate-400">AFN</span>
        </p>
      </div>
    </div>
  );
}

function Card({ title, sub, icon, children, className = "" }) {
  return (
    <div className={`pro-card bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${className}`}>
      <div className="flex items-center gap-2.5 mb-4">
        {icon && <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><Ico d={icon} className="w-3.5 h-3.5" /></span>}
        <div>
          <h3 className="text-sm font-bold text-slate-800 leading-tight">{title}</h3>
          {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Pnl({ title, tone, lines, total }) {
  const totalTone = tone === "emerald" ? "text-emerald-600" : "text-rose-600";
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{title}</p>
      <ul className="space-y-1.5">
        {lines.length === 0 ? <li className="text-xs text-slate-300 italic py-1">None recorded</li> :
          lines.map((l) => (
            <li key={l.code} className="flex items-center justify-between text-xs">
              <span className="text-slate-600 truncate">
                <span className="text-slate-300 font-mono text-[10px] mr-1.5">{l.code}</span>{l.name}
              </span>
              <span className="font-mono font-medium text-slate-800 ml-2">{fmt(l.amount)}</span>
            </li>
          ))}
      </ul>
      <div className="flex items-center justify-between mt-3 pt-2 border-t-2 border-slate-200">
        <span className="text-xs font-bold text-slate-600">Total {title}</span>
        <span className={`text-sm font-extrabold font-mono ${totalTone}`}>{fmt(total)}</span>
      </div>
    </div>
  );
}

function LedgerCard({ title, sub, icon, tone, rows, total, top }) {
  const bar = tone === "amber" ? "bg-amber-500" : "bg-orange-500";
  const max = Math.max(1, ...(top || []).map((t) => t.amount));
  return (
    <Card title={title} sub={sub} icon={icon}>
      {rows.map(([label, val]) => (
        <div key={label} className="flex items-center justify-between py-1 text-xs">
          <span className="text-slate-500">{label}</span>
          <span className="font-mono font-semibold text-slate-800">{fmt(val)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between py-1.5 mt-1 border-t border-slate-200 text-xs font-bold">
        <span className="text-slate-700">Total</span>
        <span className="font-mono text-slate-900">{fmt(total)} AFN</span>
      </div>
      {top && top.length > 0 && (
        <ul className="mt-3 space-y-2">
          {top.slice(0, 5).map((tp) => (
            <li key={tp.code}>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-slate-600 truncate">{tp.name} <span className="text-slate-300">· {tp.type}</span></span>
                <span className="font-mono font-semibold text-slate-800 ml-2">{fmt(tp.amount)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${(tp.amount / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Empty() {
  return <p className="text-xs text-slate-300 italic py-4 text-center">Nothing recorded for this period.</p>;
}
