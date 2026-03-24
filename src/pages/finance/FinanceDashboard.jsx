import { useState } from "react";
import { useNavigate } from "react-router-dom";

const summaryCards = [
  { title: "Total Income", value: "1,245,000", sub: "This year", color: "emerald", icon: "M7 11l5-5m0 0l5 5m-5-5v12" },
  { title: "Total Expenses", value: "876,500", sub: "This year", color: "red", icon: "M17 13l-5 5m0 0l-5-5m5 5V6" },
  { title: "Net Balance", value: "368,500", sub: "Assets - Liabilities", color: "teal", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" },
  { title: "Pending Invoices", value: "12", sub: "Awaiting payment", color: "amber", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
];

const colorMap = {
  emerald: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  red: { bg: "bg-red-50", icon: "bg-red-100 text-red-600", text: "text-red-600", badge: "bg-red-100 text-red-700" },
  teal: { bg: "bg-teal-50", icon: "bg-teal-100 text-teal-600", text: "text-teal-600", badge: "bg-teal-100 text-teal-700" },
  amber: { bg: "bg-amber-50", icon: "bg-amber-100 text-amber-600", text: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  blue: { bg: "bg-blue-50", icon: "bg-blue-100 text-blue-600", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
  purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", text: "text-purple-600", badge: "bg-purple-100 text-purple-700" },
};

const recentTransactions = [
  { id: 1, description: "Salary Payments - March", type: "expense", amount: 145000, date: "2026-03-20", account: "Main Bank", category: "Salaries" },
  { id: 2, description: "Tuition Fee Collection", type: "income", amount: 230000, date: "2026-03-18", account: "Main Bank", category: "Tuition Fees" },
  { id: 3, description: "Office Supplies Purchase", type: "expense", amount: 15000, date: "2026-03-15", account: "Petty Cash", category: "Office Supplies" },
  { id: 4, description: "Utility Bills - March", type: "expense", amount: 22000, date: "2026-03-14", account: "Main Bank", category: "Utilities" },
  { id: 5, description: "Donation Received", type: "income", amount: 50000, date: "2026-03-10", account: "Main Bank", category: "Donations" },
];

const accounts = [
  { name: "Main Bank Account", type: "bank", balance: 320000, currency: "AFN" },
  { name: "Petty Cash Box", type: "cash", balance: 8500, currency: "AFN" },
  { name: "Mobile Wallet", type: "digital", balance: 40000, currency: "AFN" },
];

const budgetProgress = [
  { category: "Salaries", budgeted: 1800000, spent: 435000 },
  { category: "Office Supplies", budgeted: 60000, spent: 44000 },
  { category: "Utilities", budgeted: 120000, spent: 66000 },
  { category: "Maintenance", budgeted: 80000, spent: 18000 },
];

const quickLinks = [
  { label: "Record Payment", path: "/finance/payments/create", color: "teal", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { label: "Add Invoice", path: "/finance/invoices/create", color: "blue", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { label: "New Budget", path: "/finance/budgets/create", color: "purple", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Fee Invoice", path: "/finance/fee-invoices/create", color: "amber", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">Finance Overview</h2>
          <p className="text-xs text-gray-500 mt-0.5">March 2026 — Financial Summary</p>
        </div>
        <div className="flex gap-2">
          {["this_month", "this_quarter", "this_year"].map((p) => (
            <button key={p} onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1 rounded-lg text-[10px] font-semibold capitalize transition-colors ${selectedPeriod === p ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300"}`}>
              {p.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const c = colorMap[card.color];
          return (
            <div key={card.title} className={`${c.bg} rounded-xl p-4 border border-current/10`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 ${c.icon} rounded-xl flex items-center justify-center`}>
                  <svg className="w-4.5 h-4.5 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
              </div>
              <p className={`text-xl font-bold ${c.text}`}>{card.value} <span className="text-[10px] font-normal">AFN</span></p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{card.title}</p>
              <p className="text-[10px] text-gray-500">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Recent Transactions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickLinks.map((link) => {
              const c = colorMap[link.color];
              return (
                <button key={link.label} onClick={() => navigate(link.path)}
                  className={`${c.bg} border border-current/10 p-3 rounded-xl hover:shadow-sm transition-all text-left`}>
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

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800">Recent Transactions</h3>
              <button onClick={() => navigate("/finance/journal-entries")} className="text-[10px] text-teal-600 hover:text-teal-700 font-medium">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === "income" ? "bg-emerald-100" : "bg-red-100"}`}>
                      <svg className={`w-4 h-4 ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tx.type === "income" ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6"} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-800">{tx.description}</p>
                      <p className="text-[10px] text-gray-400">{tx.account} · {tx.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                      {tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString()} AFN
                    </p>
                    <p className="text-[10px] text-gray-400">{tx.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Overview */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800">Budget vs Actual</h3>
              <button onClick={() => navigate("/finance/budgets")} className="text-[10px] text-teal-600 hover:text-teal-700 font-medium">Manage budgets</button>
            </div>
            <div className="p-4 space-y-3">
              {budgetProgress.map((item) => {
                const pct = Math.round((item.spent / item.budgeted) * 100);
                const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-teal-500";
                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">{item.spent.toLocaleString()} / {item.budgeted.toLocaleString()} AFN</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pct > 90 ? "bg-red-100 text-red-700" : pct > 70 ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}>{pct}%</span>
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

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Accounts */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800">Accounts</h3>
              <button onClick={() => navigate("/finance/accounts")} className="text-[10px] text-teal-600 hover:text-teal-700 font-medium">Manage</button>
            </div>
            <div className="p-3 space-y-2">
              {accounts.map((acc) => {
                const icons = { bank: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", cash: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", digital: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" };
                const colors = { bank: "bg-blue-100 text-blue-600", cash: "bg-emerald-100 text-emerald-600", digital: "bg-purple-100 text-purple-600" };
                return (
                  <div key={acc.name} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${colors[acc.type]} flex items-center justify-center`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[acc.type]} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-gray-800">{acc.name}</p>
                        <p className="text-[9px] text-gray-400 capitalize">{acc.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-teal-700">{acc.balance.toLocaleString()}</p>
                      <p className="text-[9px] text-gray-400">{acc.currency}</p>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-2 pt-1 border-t border-gray-100">
                <span className="text-[10px] font-semibold text-gray-600">Total</span>
                <span className="text-xs font-bold text-teal-700">{accounts.reduce((s, a) => s + a.balance, 0).toLocaleString()} AFN</span>
              </div>
            </div>
          </div>

          {/* Finance Modules */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 text-white">
            <h3 className="text-xs font-bold mb-3">Finance Modules</h3>
            <div className="space-y-1.5">
              {[
                { label: "Chart of Accounts", path: "/finance/chart-of-accounts" },
                { label: "Bank Accounts", path: "/finance/accounts" },
                { label: "Invoices", path: "/finance/invoices" },
                { label: "Payments", path: "/finance/payments" },
                { label: "Budgets", path: "/finance/budgets" },
                { label: "Fee Invoices", path: "/finance/fee-invoices" },
                { label: "Fee Payments", path: "/finance/fee-payments" },
              ].map((m) => (
                <button key={m.path} onClick={() => navigate(m.path)}
                  className="w-full flex items-center justify-between px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left">
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
