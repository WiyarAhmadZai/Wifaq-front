import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
  partial: { label: "Partial", color: "bg-blue-50 text-blue-700 border-blue-200" },
  paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue: { label: "Overdue", color: "bg-red-50 text-red-700 border-red-200" },
};

const dummy = [
  { id: 1, student_name: "Ahmad Karimi", class: "Grade 10-A", invoice_month: "2026-03-01", base_amount: 3000, discount_amount: 0, support_amount: 0, late_fee: 0, final_amount: 3000, amount_paid: 3000, status: "paid" },
  { id: 2, student_name: "Maryam Sultani", class: "Grade 11-B", invoice_month: "2026-03-01", base_amount: 3500, discount_amount: 500, support_amount: 0, late_fee: 0, final_amount: 3000, amount_paid: 0, status: "pending" },
  { id: 3, student_name: "Khalid Amiri", class: "Grade 9-C", invoice_month: "2026-03-01", base_amount: 2800, discount_amount: 0, support_amount: 300, late_fee: 0, final_amount: 2500, amount_paid: 1500, status: "partial" },
  { id: 4, student_name: "Zahra Ahmadi", class: "Grade 12-A", invoice_month: "2026-02-01", base_amount: 3200, discount_amount: 0, support_amount: 0, late_fee: 150, final_amount: 3350, amount_paid: 0, status: "overdue" },
  { id: 5, student_name: "Mohammad Noori", class: "Grade 10-B", invoice_month: "2026-03-01", base_amount: 3000, discount_amount: 300, support_amount: 0, late_fee: 0, final_amount: 2700, amount_paid: 2700, status: "paid" },
  { id: 6, student_name: "Fatima Hashimi", class: "Grade 11-A", invoice_month: "2026-02-01", base_amount: 3500, discount_amount: 0, support_amount: 0, late_fee: 200, final_amount: 3700, amount_paid: 0, status: "overdue" },
  { id: 7, student_name: "Ali Rahimi", class: "Grade 9-A", invoice_month: "2026-03-01", base_amount: 2800, discount_amount: 0, support_amount: 0, late_fee: 0, final_amount: 2800, amount_paid: 2800, status: "paid" },
  { id: 8, student_name: "Sara Nazari", class: "Grade 12-B", invoice_month: "2026-03-01", base_amount: 3200, discount_amount: 400, support_amount: 0, late_fee: 0, final_amount: 2800, amount_paid: 1400, status: "partial" },
];

const months = ["2026-03-01", "2026-02-01", "2026-01-01"];

export default function FeeInvoices() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  useEffect(() => {
    get("/finance/fee-invoices").then((r) => setItems(r.data?.data || r.data || [])).catch(() => setItems(dummy));
  }, []);

  const handleDelete = async (id) => {
    const r = await Swal.fire({ title: "Delete fee invoice?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/finance/fee-invoices/${id}`); } catch {}
      setItems((p) => p.filter((i) => i.id !== id));
    }
  };

  let filtered = items;
  if (filterStatus !== "all") filtered = filtered.filter((i) => i.status === filterStatus);
  if (filterMonth !== "all") filtered = filtered.filter((i) => i.invoice_month === filterMonth);

  const stats = {
    total: items.reduce((s, i) => s + Number(i.final_amount), 0),
    collected: items.reduce((s, i) => s + Number(i.amount_paid), 0),
    pending: items.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + (Number(i.final_amount) - Number(i.amount_paid)), 0),
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Fee Invoices</h2>
          <p className="text-xs text-gray-500">Monthly student fee invoices and collection tracking</p>
        </div>
        <button onClick={() => navigate("/finance/fee-invoices/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Total Invoiced</p>
          <p className="text-sm font-bold text-teal-700">{stats.total.toLocaleString()} AFN</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Collected</p>
          <p className="text-sm font-bold text-emerald-700">{stats.collected.toLocaleString()} AFN</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Pending</p>
          <p className="text-sm font-bold text-amber-700">{stats.pending.toLocaleString()} AFN</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1">
          {["all", "pending", "partial", "paid", "overdue"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-colors ${filterStatus === s ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
            className="px-2.5 py-1 border border-gray-200 rounded-lg text-[10px] text-gray-700 focus:ring-1 focus:ring-teal-500">
            <option value="all">All months</option>
            {months.map((m) => <option key={m} value={m}>{new Date(m).toLocaleString("default", { month: "long", year: "numeric" })}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-teal-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Student</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Class</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Month</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Base</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Disc.</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Late Fee</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Final</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Paid</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((inv) => {
                const sc = statusConfig[inv.status] || statusConfig.pending;
                const balance = Number(inv.final_amount) - Number(inv.amount_paid);
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/finance/fee-invoices/show/${inv.id}`)}>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{inv.student_name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{inv.class}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(inv.invoice_month).toLocaleString("default", { month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 text-right">{Number(inv.base_amount).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-emerald-600 text-right">{Number(inv.discount_amount) > 0 ? `-${Number(inv.discount_amount).toLocaleString()}` : "-"}</td>
                    <td className="px-4 py-2.5 text-xs text-red-600 text-right">{Number(inv.late_fee) > 0 ? `+${Number(inv.late_fee).toLocaleString()}` : "-"}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-800 text-right">{Number(inv.final_amount).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-teal-700 text-right">{Number(inv.amount_paid).toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.color}`}>{sc.label}</span>
                        {balance > 0 && <p className="text-[9px] text-red-500 mt-0.5">Balance: {balance.toLocaleString()}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/finance/fee-invoices/show/${inv.id}`)} className="p-1 text-teal-600 hover:bg-teal-50 rounded">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-xs text-gray-400">No fee invoices found</div>}
        </div>
      </div>
    </div>
  );
}
