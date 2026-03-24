import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", color: "bg-blue-50 text-blue-700 border-blue-200" },
  paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue: { label: "Overdue", color: "bg-red-50 text-red-700 border-red-200" },
};

const dummy = [
  { id: 1, invoice_number: "INV-2026-001", supplier: "ABC Office Supplies", invoice_date: "2026-02-10", due_date: "2026-02-25", total_amount: 15000, status: "paid", description: "Office stationery and supplies" },
  { id: 2, invoice_number: "INV-2026-002", supplier: "TechWorld Kabul", invoice_date: "2026-02-15", due_date: "2026-03-15", total_amount: 248000, status: "approved", description: "Computer lab equipment" },
  { id: 3, invoice_number: "INV-2026-003", supplier: "CleanMart", invoice_date: "2026-02-20", due_date: "2026-03-05", total_amount: 8500, status: "paid", description: "Cleaning supplies" },
  { id: 4, invoice_number: "INV-2026-004", supplier: "PrintStar", invoice_date: "2026-03-01", due_date: "2026-03-20", total_amount: 12000, status: "pending", description: "Printer cartridges" },
  { id: 5, invoice_number: "INV-2026-005", supplier: "BookHouse AF", invoice_date: "2026-03-05", due_date: "2026-03-15", total_amount: 45000, status: "overdue", description: "Library books" },
  { id: 6, invoice_number: "INV-2026-006", supplier: "PowerGen", invoice_date: "2026-03-10", due_date: "2026-03-30", total_amount: 22000, status: "pending", description: "Utility bills - March" },
];

export default function Invoices() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    get("/finance/invoices").then((r) => setItems(r.data?.data || r.data || [])).catch(() => setItems(dummy));
  }, []);

  const handleDelete = async (id) => {
    const r = await Swal.fire({ title: "Delete invoice?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/finance/invoices/${id}`); } catch {}
      setItems((p) => p.filter((i) => i.id !== id));
    }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  const totals = { pending: items.filter((i) => i.status === "pending").reduce((s, i) => s + Number(i.total_amount), 0), overdue: items.filter((i) => i.status === "overdue").reduce((s, i) => s + Number(i.total_amount), 0) };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Invoices</h2>
          <p className="text-xs text-gray-500">Supplier bills and payment tracking</p>
        </div>
        <button onClick={() => navigate("/finance/invoices/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </button>
      </div>

      {/* Alert cards */}
      {(totals.overdue > 0 || totals.pending > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {totals.overdue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-red-700">Overdue Invoices</p>
                <p className="text-[10px] text-red-600">{totals.overdue.toLocaleString()} AFN overdue</p>
              </div>
            </div>
          )}
          {totals.pending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-amber-700">Pending Invoices</p>
                <p className="text-[10px] text-amber-600">{totals.pending.toLocaleString()} AFN awaiting payment</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-3">
        {["all", "pending", "approved", "paid", "overdue"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-lg text-[10px] font-semibold capitalize transition-colors ${filter === s ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300"}`}>
            {s === "all" ? `All (${items.length})` : `${s} (${items.filter((i) => i.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-teal-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Invoice #</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Supplier</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Description</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Due</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Amount</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((inv) => {
                const sc = statusConfig[inv.status] || statusConfig.pending;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs font-medium text-teal-600">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{inv.supplier}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[150px] truncate">{inv.description}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{inv.invoice_date}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{inv.due_date}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-800 text-right">{Number(inv.total_amount).toLocaleString()} AFN</td>
                    <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.color}`}>{sc.label}</span></td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/finance/invoices/show/${inv.id}`)} className="p-1 text-teal-600 hover:bg-teal-50 rounded" title="View">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => navigate(`/finance/invoices/edit/${inv.id}`)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-xs text-gray-400">No invoices found</div>}
        </div>
      </div>
    </div>
  );
}
