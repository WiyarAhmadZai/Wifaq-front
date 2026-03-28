import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const dummy = [
  { id: 1, name: "Annual Budget 2026", year: 2026, status: "active", total_budget: 2500000, total_spent: 561000,
    items: [
      { category: "Salaries", budgeted: 1800000, spent: 435000 },
      { category: "Office Supplies", budgeted: 60000, spent: 44000 },
      { category: "Utilities", budgeted: 120000, spent: 66000 },
      { category: "Maintenance", budgeted: 80000, spent: 18000 },
      { category: "Transportation", budgeted: 50000, spent: 0 },
    ],
  },
  { id: 2, name: "Q1 Operations Budget", year: 2026, status: "active", total_budget: 300000, total_spent: 187000,
    items: [
      { category: "Events", budgeted: 80000, spent: 45000 },
      { category: "Training", budgeted: 120000, spent: 95000 },
      { category: "Printing", budgeted: 100000, spent: 47000 },
    ],
  },
];

export default function Budgets() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    get("/finance/budgets").then((r) => setItems(r.data?.data || r.data || [])).catch(() => setItems(dummy));
  }, []);

  const handleDelete = async (id) => {
    const r = await Swal.fire({ title: "Delete budget?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/finance/budgets/${id}`); } catch {}
      setItems((p) => p.filter((i) => i.id !== id));
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Budgets</h2>
          <p className="text-xs text-gray-500">Plan and track spending against budget allocations</p>
        </div>
        <button onClick={() => navigate("/finance/budgets/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Budget
        </button>
      </div>

      <div className="space-y-3">
        {items.map((budget) => {
          const pct = Math.round((budget.total_spent / budget.total_budget) * 100);
          const remaining = budget.total_budget - budget.total_spent;
          const isExpanded = expandedId === budget.id;

          return (
            <div key={budget.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Budget Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{budget.name}</h3>
                    <p className="text-[10px] text-gray-400">Year {budget.year}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${budget.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {budget.status}
                    </span>
                    <button onClick={() => navigate(`/finance/budgets/edit/${budget.id}`)} className="p-1 text-teal-600 hover:bg-teal-50 rounded">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(budget.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500">Total Budget</p>
                    <p className="text-xs font-bold text-gray-800">{budget.total_budget.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500">Spent</p>
                    <p className="text-xs font-bold text-red-600">{budget.total_spent.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500">Remaining</p>
                    <p className="text-xs font-bold text-emerald-600">{remaining.toLocaleString()}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Overall Progress</span>
                    <span className={`font-semibold ${pct > 90 ? "text-red-600" : pct > 70 ? "text-amber-600" : "text-teal-600"}`}>{pct}% used</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-teal-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>

                {/* Expand toggle */}
                <button onClick={() => setExpandedId(isExpanded ? null : budget.id)}
                  className="w-full text-[10px] text-teal-600 font-medium flex items-center justify-center gap-1 hover:text-teal-700">
                  {isExpanded ? "Hide" : "Show"} Budget Items
                  <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Budget Items */}
              {isExpanded && budget.items && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="space-y-2.5">
                    {budget.items.map((item, i) => {
                      const ip = Math.round((item.spent / item.budgeted) * 100);
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">{item.category}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-gray-500">{item.spent.toLocaleString()} / {item.budgeted.toLocaleString()} AFN</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ip > 90 ? "bg-red-100 text-red-700" : ip > 70 ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}>{ip}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${ip > 90 ? "bg-red-500" : ip > 70 ? "bg-amber-500" : "bg-teal-500"}`} style={{ width: `${Math.min(ip, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-xs mb-3">No budgets created yet</p>
            <button onClick={() => navigate("/finance/budgets/create")} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs hover:bg-teal-700">Create First Budget</button>
          </div>
        )}
      </div>
    </div>
  );
}
