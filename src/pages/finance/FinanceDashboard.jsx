import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFinanceDashboard } from "../../api/financial";

const colorMap = {
  emerald: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  red: { bg: "bg-red-50", icon: "bg-red-100 text-red-600", text: "text-red-600", badge: "bg-red-100 text-red-700" },
  teal: { bg: "bg-teal-50", icon: "bg-teal-100 text-teal-600", text: "text-teal-600", badge: "bg-teal-100 text-teal-700" },
  amber: { bg: "bg-amber-50", icon: "bg-amber-100 text-amber-600", text: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  blue: { bg: "bg-blue-50", icon: "bg-blue-100 text-blue-600", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
  purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", text: "text-purple-600", badge: "bg-purple-100 text-purple-700" },
};

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");
  const [data, setData] = useState({
    accounts: [],
    budgets: [],
    pendingInvoices: [],
    pendingFeeInvoices: [],
    recentJournal: [],
    totals: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const dash = await getFinanceDashboard();
      setData({
        accounts: dash.accounts || [],
        budgets: dash.budgets || [],
        pendingInvoices: dash.pendingInvoices || [],
        pendingFeeInvoices: dash.pendingFeeInvoices || [],
        recentJournal: dash.recentJournalEntries || [],
        totals: dash.totals || {},
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const t = data.totals || {};
  const pendingCount =
    (t.pending_documents_count ?? data.pendingInvoices.length + data.pendingFeeInvoices.length) || 0;
  const pendingAmt = parseFloat(t.pending_amount_due || 0);

  const summaryCardsData = [
    {
      title: "Cash & bank balance",
      value: parseFloat(t.cash_and_bank_balance || 0).toLocaleString(),
      sub: "All active accounts",
      color: "teal",
      icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    },
    {
      title: "Budgeted (active)",
      value: parseFloat(t.budgeted_active || 0).toLocaleString(),
      sub: "Approved active budgets",
      color: "emerald",
      icon: "M7 11l5-5m0 0l5 5m-5-5v12",
    },
    {
      title: "Spent vs budget",
      value: parseFloat(t.budget_spent || 0).toLocaleString(),
      sub: "Year-to-date in active budgets",
      color: "red",
      icon: "M17 13l-5 5m0 0l-5-5m5 5V6",
    },
    {
      title: "Open receivables",
      value: String(pendingCount),
      sub: `${pendingAmt.toLocaleString()} AFN outstanding (est.)`,
      color: "amber",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    },
  ];

  const quickLinks = [
    { label: "Record payment", path: "/finance/payments/create", color: "teal", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
    { label: "Add supplier invoice", path: "/finance/invoices/create", color: "blue", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { label: "Record fee payment", path: "/finance/fee-payments/create", color: "purple", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Parties & ledger", path: "/finance/parties", color: "amber", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  ];

  const periodLabel = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="px-4 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">Finance overview</h2>
          <p className="text-xs text-gray-500 mt-0.5">{periodLabel} — summary</p>
        </div>
        <div className="flex gap-2">
          {["this_month", "this_quarter", "this_year"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1 rounded-lg text-[10px] font-semibold capitalize transition-colors ${
                selectedPeriod === p ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300"
              }`}
            >
              {p.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCardsData.map((card) => {
          const c = colorMap[card.color];
          return (
            <div key={card.title} className={`${c.bg} rounded-xl p-4 border border-current/10`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 ${c.icon} rounded-xl flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
              </div>
              <p className={`text-xl font-bold ${c.text}`}>
                {card.value}{" "}
                {card.title !== "Open receivables" && <span className="text-[10px] font-normal">AFN</span>}
              </p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{card.title}</p>
              <p className="text-[10px] text-gray-500">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Active Budget Banner */}
      {(() => {
        const activeBudgets = (data.budgets || []).filter((b) => b.status === "active");
        if (activeBudgets.length === 0) return null;
        const ab = activeBudgets[0];
        const abBudgeted = parseFloat(ab.total_budgeted || 0);
        const abSpent = parseFloat(ab.total_spent || 0);
        const abPct = abBudgeted > 0 ? Math.round((abSpent / abBudgeted) * 100) : 0;
        return (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">Current active budget: {ab.name}</p>
                <p className="text-[10px] text-gray-500">{ab.start_date} → {ab.end_date} · {abSpent.toLocaleString()} / {abBudgeted.toLocaleString()} AFN used</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${abPct > 90 ? "bg-red-100 text-red-700 border-red-200" : abPct > 70 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>
              {abPct}%
            </span>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickLinks.map((link) => {
              const c = colorMap[link.color];
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className={`${c.bg} border border-current/10 p-3 rounded-xl hover:shadow-sm transition-all text-left`}
                >
                  <div className={`w-8 h-8 ${c.icon} rounded-lg flex items-center justify-center mb-2`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                    </svg>
                  </div>
                  <p className="text-[10px] font-semibold text-gray-700">{link.label}</p>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800">Recent journal entries</h3>
              <button
                type="button"
                onClick={() => navigate("/finance/journal-entries")}
                className="text-[10px] text-teal-600 hover:text-teal-700 font-medium"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {(data.recentJournal || []).length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-gray-400">No posted entries yet.</p>
              )}
              {(data.recentJournal || []).map((tx) => (
                <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-medium text-gray-800 truncate">{tx.description}</p>
                    <p className="text-[10px] text-gray-400">
                      {tx.transaction_date} · {tx.recorded_by?.name || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-500 font-mono">{tx.entry_number}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800">Budget vs actual</h3>
              <button type="button" onClick={() => navigate("/finance/budgets")} className="text-[10px] text-teal-600 hover:text-teal-700 font-medium">
                Manage budgets
              </button>
            </div>
            <div className="p-4 space-y-3">
              {(data.budgets || []).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No active budgets.</p>
              )}
              {(data.budgets || []).map((item) => {
                const budgeted = parseFloat(item.total_budgeted || 0);
                const spent = parseFloat(item.total_spent || 0);
                const pct = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;
                const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-teal-500";
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 truncate pr-2">{item.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-gray-500">
                          {spent.toLocaleString()} / {budgeted.toLocaleString()} AFN
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            pct > 90 ? "bg-red-100 text-red-700" : pct > 70 ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800">Cash & bank accounts</h3>
              <button type="button" onClick={() => navigate("/finance/accounts")} className="text-[10px] text-teal-600 hover:text-teal-700 font-medium">
                Manage
              </button>
            </div>
            <div className="p-3 space-y-2">
              {(data.accounts || []).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No accounts configured.</p>
              )}
              {(data.accounts || []).map((acc) => {
                const icons = {
                  bank: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
                  cash: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
                  digital: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
                  mobile_money: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
                };
                const colors = {
                  bank: "bg-blue-100 text-blue-600",
                  cash: "bg-emerald-100 text-emerald-600",
                  digital: "bg-purple-100 text-purple-600",
                  mobile_money: "bg-purple-100 text-purple-600",
                };
                const t = acc.account_type || "bank";
                const bal = parseFloat(acc.current_balance || 0);
                return (
                  <div key={acc.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${colors[t] || colors.bank} flex items-center justify-center shrink-0`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[t] || icons.bank} />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-gray-800 truncate">{acc.account_name}</p>
                        <p className="text-[9px] text-gray-400 capitalize">{t.replace("_", " ")}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-teal-700">{bal.toLocaleString()}</p>
                      <p className="text-[9px] text-gray-400">{acc.currency || "AFN"}</p>
                    </div>
                  </div>
                );
              })}
              {(data.accounts || []).length > 0 && (
                <div className="flex items-center justify-between px-2 pt-1 border-t border-gray-100">
                  <span className="text-[10px] font-semibold text-gray-600">Total</span>
                  <span className="text-xs font-bold text-teal-700">
                    {(data.accounts || []).reduce((s, a) => s + parseFloat(a.current_balance || 0), 0).toLocaleString()} AFN
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 text-white">
            <h3 className="text-xs font-bold mb-3">Finance modules</h3>
            <div className="space-y-1.5">
              {[
                { label: "Chart of accounts", path: "/finance/chart-of-accounts" },
                { label: "Bank & cash accounts", path: "/finance/accounts" },
                { label: "Supplier invoices", path: "/finance/invoices" },
                { label: "Payments", path: "/finance/payments" },
                { label: "Budgets", path: "/finance/budgets" },
                { label: "Student fee invoices", path: "/finance/fee-invoices" },
                { label: "Fee payments", path: "/finance/fee-payments" },
              ].map((m) => (
                <button
                  key={m.path}
                  type="button"
                  onClick={() => navigate(m.path)}
                  className="w-full flex items-center justify-between px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left"
                >
                  <span className="text-xs text-white">{m.label}</span>
                  <svg className="w-3.5 h-3.5 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
