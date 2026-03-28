import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const typeColors = {
  Asset: "bg-blue-50 text-blue-700 border-blue-200",
  Liability: "bg-red-50 text-red-700 border-red-200",
  Income: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Expense: "bg-orange-50 text-orange-700 border-orange-200",
};

const dummy = [
  { id: 1, code: "1000", name: "Cash", type: "Asset", parent_id: null, is_active: true },
  { id: 2, code: "1100", name: "Bank Account", type: "Asset", parent_id: null, is_active: true },
  { id: 3, code: "1200", name: "Accounts Receivable", type: "Asset", parent_id: null, is_active: true },
  { id: 4, code: "2000", name: "Accounts Payable", type: "Liability", parent_id: null, is_active: true },
  { id: 5, code: "2100", name: "Salaries Payable", type: "Liability", parent_id: null, is_active: true },
  { id: 6, code: "4000", name: "Tuition Fees", type: "Income", parent_id: null, is_active: true },
  { id: 7, code: "4100", name: "Donations", type: "Income", parent_id: null, is_active: true },
  { id: 8, code: "5000", name: "Salaries", type: "Expense", parent_id: null, is_active: true },
  { id: 9, code: "5100", name: "Office Supplies", type: "Expense", parent_id: null, is_active: true },
  { id: 10, code: "5200", name: "Utilities", type: "Expense", parent_id: null, is_active: true },
  { id: 11, code: "5300", name: "Maintenance", type: "Expense", parent_id: null, is_active: true },
  { id: 12, code: "5400", name: "Transportation", type: "Expense", parent_id: null, is_active: true },
];

export default function ChartOfAccounts() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    get("/finance/chart-of-accounts").then((r) => setItems(r.data?.data || r.data || [])).catch(() => setItems(dummy));
  }, []);

  const handleDelete = async (id) => {
    const r = await Swal.fire({ title: "Delete account?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/finance/chart-of-accounts/${id}`); } catch {}
      setItems((p) => p.filter((i) => i.id !== id));
    }
  };

  const types = ["All", "Asset", "Liability", "Income", "Expense"];
  const filtered = filter === "All" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Chart of Accounts</h2>
          <p className="text-xs text-gray-500">Financial categories for income, expenses, assets, and liabilities</p>
        </div>
        <button onClick={() => navigate("/finance/chart-of-accounts/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Account
        </button>
      </div>

      {/* Type Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {["Asset", "Liability", "Income", "Expense"].map((t) => {
          const count = items.filter((i) => i.type === t).length;
          return (
            <button key={t} onClick={() => setFilter(filter === t ? "All" : t)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${filter === t ? `${typeColors[t]} border-current` : "bg-white border-gray-100 hover:border-gray-200"}`}>
              <p className="text-lg font-bold text-gray-800">{count}</p>
              <p className="text-[10px] font-semibold text-gray-500 uppercase">{t}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
          {types.map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${filter === t ? "bg-teal-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>
        <table className="w-full">
          <thead className="bg-teal-50">
            <tr>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Code</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Account Name</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Type</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Status</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-xs font-mono font-medium text-gray-600">{item.code}</td>
                <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{item.name}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeColors[item.type] || "bg-gray-50 text-gray-700 border-gray-200"}`}>{item.type}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${item.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/finance/chart-of-accounts/edit/${item.id}`)} className="p-1 text-teal-600 hover:bg-teal-50 rounded" title="Edit">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-8 text-xs text-gray-400">No accounts found</div>}
      </div>
    </div>
  );
}
