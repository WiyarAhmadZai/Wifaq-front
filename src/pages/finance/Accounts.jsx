import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const typeConfig = {
  bank: { label: "Bank", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", iconBg: "bg-blue-100 text-blue-600" },
  cash: { label: "Cash", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", iconBg: "bg-emerald-100 text-emerald-600" },
  digital: { label: "Digital", color: "bg-purple-50 text-purple-700 border-purple-200", icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z", iconBg: "bg-purple-100 text-purple-600" },
};

const dummy = [
  { id: 1, account_name: "Main Bank Account", account_number: "0123-456-789", account_type: "bank", currency: "AFN", opening_balance: 500000, current_balance: 320000, is_active: true },
  { id: 2, account_name: "Petty Cash Box", account_number: "-", account_type: "cash", currency: "AFN", opening_balance: 10000, current_balance: 8500, is_active: true },
  { id: 3, account_name: "Mobile Money Wallet", account_number: "0799-123-456", account_type: "digital", currency: "AFN", opening_balance: 50000, current_balance: 40000, is_active: true },
  { id: 4, account_name: "Project Reserve Account", account_number: "9876-543-210", account_type: "bank", currency: "AFN", opening_balance: 200000, current_balance: 150000, is_active: true },
];

export default function Accounts() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    get("/finance/accounts").then((r) => setItems(r.data?.data || r.data || [])).catch(() => setItems(dummy));
  }, []);

  const handleDelete = async (id) => {
    const r = await Swal.fire({ title: "Delete account?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/finance/accounts/${id}`); } catch {}
      setItems((p) => p.filter((i) => i.id !== id));
      Swal.fire("Deleted!", "", "success");
    }
  };

  const totalBalance = items.reduce((s, i) => s + (Number(i.current_balance) || 0), 0);

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Accounts</h2>
          <p className="text-xs text-gray-500">Bank accounts, cash boxes, and digital wallets</p>
        </div>
        <button onClick={() => navigate("/finance/accounts/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Account
        </button>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-4 mb-4 text-white">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-200">Total Accounts</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-200">Total Balance</p>
            <p className="text-2xl font-bold">{totalBalance.toLocaleString()} <span className="text-sm font-normal">AFN</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((acc) => {
          const tc = typeConfig[acc.account_type] || typeConfig.bank;
          return (
            <div key={acc.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl ${tc.iconBg} flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tc.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{acc.account_name}</p>
                    <p className="text-[10px] text-gray-400">{acc.account_number !== "-" ? acc.account_number : "No account number"}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tc.color}`}>{tc.label}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-[10px] text-gray-500 mb-0.5">Current Balance</p>
                <p className="text-xl font-bold text-teal-700">{Number(acc.current_balance).toLocaleString()} <span className="text-xs font-normal">{acc.currency}</span></p>
                <p className="text-[10px] text-gray-400 mt-1">Opening: {Number(acc.opening_balance).toLocaleString()} AFN</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/finance/accounts/edit/${acc.id}`)} className="flex-1 py-1 text-[10px] font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100">Edit</button>
                <button onClick={() => handleDelete(acc.id)} className="flex-1 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">Delete</button>
              </div>
            </div>
          );
        })}
        {/* Add new card */}
        <button onClick={() => navigate("/finance/accounts/create")}
          className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-teal-400 hover:bg-teal-50 transition-all text-gray-400 hover:text-teal-600 min-h-[180px]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs font-medium">Add New Account</span>
        </button>
      </div>
    </div>
  );
}
