import { useEffect, useState } from "react";
import { getBalanceSheet } from "../../api/financial";
import { peekCache } from "../../api/axios";
import { DateField } from "../../components/hr/HrUI";

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Balance Sheet — a snapshot of what the school owns, owes, and has retained
 * at a single point in time. Drives the central accounting equation:
 *
 *       Assets  =  Liabilities  +  Equity
 *
 * The owner can pick any date; the page recomputes from posted journal
 * entries on the server. Equity always includes "Current period earnings"
 * (net income YTD) so the equation actually balances on the snapshot date.
 */
export default function BalanceSheet() {
  const [asOf, setAsOf] = useState(today());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async (dateStr) => {
    setLoading(true);
    setError(null);
    try {
      const __cached = peekCache('/financial/reports/balance-sheet', dateStr ? { as_of: dateStr } : {});
      if (__cached) { setReport(__cached?.data || null); setLoading(false); }
      const res = await getBalanceSheet(dateStr);
      setReport(res.data?.data || null);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load Balance Sheet.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(asOf); /* eslint-disable-next-line */ }, []);

  const totals = report?.totals;
  const balanced = totals?.balance_check;

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto space-y-4">
      {/* ───── Hero ───── */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-2xl shadow-lg overflow-hidden">
        <div className="relative px-6 py-5">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-100 font-bold">Snapshot Report</p>
              <h1 className="text-2xl font-black mt-1">Balance Sheet</h1>
              <p className="text-[11px] text-emerald-100 mt-1 max-w-md">
                What the school owns, owes, and has retained — at a single date.
                The accounting equation says these three must balance.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-emerald-100 mb-1">
                  As of date
                </label>
                <DateField
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg bg-white/95 text-gray-900 border border-white/40"
                />
              </div>
              <button
                onClick={() => fetchReport(asOf)}
                disabled={loading}
                className="px-4 py-2 bg-white text-emerald-700 text-xs font-bold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-shadow"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        {/* KPI strip — runs across the bottom of the hero so the totals are
            visible on first scroll without hunting through the page. */}
        {totals && (
          <div className="bg-white/10 backdrop-blur-sm px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/15">
            <Kpi label="Total Assets" value={totals.assets} positive />
            <Kpi label="Total Liabilities" value={totals.liabilities} />
            <Kpi label="Total Equity" value={totals.equity} />
            <Kpi
              label="Liab + Equity"
              value={totals.liab_plus_equity}
              note={balanced ? "✓ in balance" : `⚠ ${fmt(Math.abs(totals.assets - totals.liab_plus_equity))} off`}
              noteTone={balanced ? "good" : "warn"}
            />
          </div>
        )}
      </div>

      {/* ───── Body ───── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-emerald-100 border-t-emerald-600" />
        </div>
      ) : report ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column: Assets */}
          <SectionCard
            section={report.sections.find((s) => s.type === "Asset")}
            tone="emerald"
            equation="="
          />
          {/* Right column: Liabilities + Equity stacked */}
          <div className="space-y-4">
            <SectionCard
              section={report.sections.find((s) => s.type === "Liability")}
              tone="amber"
              equation="+"
            />
            <SectionCard
              section={report.sections.find((s) => s.type === "Equity")}
              tone="indigo"
            />
          </div>
        </div>
      ) : null}

      {/* ───── Footer — accounting equation reminder ───── */}
      {totals && (
        <div className={`rounded-2xl p-5 border-2 ${balanced ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}`}>
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">
            The Accounting Equation
          </p>
          <div className="flex items-baseline gap-3 flex-wrap font-mono text-base">
            <strong className="text-emerald-700">Assets {fmt(totals.assets)}</strong>
            <span className="text-gray-400">=</span>
            <strong className="text-amber-700">Liabilities {fmt(totals.liabilities)}</strong>
            <span className="text-gray-400">+</span>
            <strong className="text-indigo-700">Equity {fmt(totals.equity)}</strong>
          </div>
          <p className={`text-xs mt-2 ${balanced ? "text-emerald-700" : "text-red-700 font-semibold"}`}>
            {balanced
              ? "✓ The books are in balance — every journal entry has matched debits and credits."
              : `⚠ Out of balance by ${fmt(Math.abs(totals.assets - totals.liab_plus_equity))} AFN. There may be an unposted draft that needs review.`}
          </p>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, note, noteTone }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest text-white/70 font-bold">{label}</p>
      <p className="text-xl sm:text-2xl font-black mt-0.5 font-mono">{fmt(value)}</p>
      {note && (
        <p className={`text-[10px] font-bold mt-1 ${
          noteTone === "good" ? "text-emerald-200" : noteTone === "warn" ? "text-amber-200" : "text-white/80"
        }`}>{note}</p>
      )}
    </div>
  );
}

function SectionCard({ section, tone, equation }) {
  if (!section) return null;
  const toneClasses = {
    emerald: { ring: "ring-emerald-200", header: "bg-emerald-50 text-emerald-800", accent: "bg-emerald-600" },
    amber:   { ring: "ring-amber-200",   header: "bg-amber-50 text-amber-800",     accent: "bg-amber-600" },
    indigo:  { ring: "ring-indigo-200",  header: "bg-indigo-50 text-indigo-800",   accent: "bg-indigo-600" },
  }[tone] || { ring: "ring-gray-200", header: "bg-gray-50 text-gray-800", accent: "bg-gray-600" };

  return (
    <div className={`bg-white rounded-2xl shadow-sm ring-1 ${toneClasses.ring} overflow-hidden`}>
      <header className={`px-5 py-3 ${toneClasses.header} flex items-center justify-between border-b border-current/10`}>
        <div className="flex items-center gap-3">
          <span className={`w-1.5 h-6 ${toneClasses.accent} rounded`} />
          <h2 className="text-sm font-bold uppercase tracking-wider">{section.type}</h2>
        </div>
        <span className="text-base font-black font-mono">{fmt(section.total)}</span>
      </header>

      <div className="divide-y divide-gray-50">
        {section.groups.length === 0 ? (
          <div className="text-center py-6 text-[12px] text-gray-400 italic">
            No movement on any {section.type.toLowerCase()} accounts as of this date.
          </div>
        ) : (
          section.groups.map((group, gi) => (
            <div key={gi}>
              {/* Group sub-header — e.g. "Cash & Bank" under Assets */}
              <div className="px-5 py-2.5 bg-gray-50/60 flex items-center justify-between">
                <p className="text-[11px] font-bold text-gray-700">{group.label}</p>
                <span className="text-[12px] font-bold font-mono text-gray-800">{fmt(group.total)}</span>
              </div>
              {/* Leaves */}
              <div className="divide-y divide-gray-50">
                {group.accounts.map((acc, ai) => (
                  <div key={ai} className="px-5 py-1.5 flex items-center justify-between text-[12px]">
                    <span className="text-gray-700">
                      <span className="text-gray-400 font-mono text-[10px] mr-2">{acc.code}</span>
                      {acc.name}
                    </span>
                    <span className={`font-mono ${acc.balance < 0 ? "text-red-700" : "text-gray-800"}`}>
                      {fmt(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Equation hint at the bottom-right corner (= or +) so the user sees
          how the three cards relate visually. */}
      {equation && (
        <div className="px-5 py-2 bg-gray-50 border-t border-gray-100 text-right">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
            {equation === "=" ? "= Liabilities + Equity" : "+ Equity"}
          </span>
        </div>
      )}
    </div>
  );
}
