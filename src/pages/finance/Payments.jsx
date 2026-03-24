import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const methodColors = {
  cash: "bg-emerald-50 text-emerald-700 border-emerald-200",
  bank: "bg-blue-50 text-blue-700 border-blue-200",
  mobile: "bg-purple-50 text-purple-700 border-purple-200",
};

const dummy = [
  { id: 1, reference: "PAY-001", invoice_number: "INV-2026-001", supplier: "ABC Office Supplies", payment_date: "2026-02-26", amount: 15000, payment_method: "bank", account: "Main Bank", notes: "" },
  { id: 2, reference: "PAY-002", invoice_number: "INV-2026-003", supplier: "CleanMart", payment_date: "2026-02-28", amount: 8500, payment_method: "cash", account: "Petty Cash", notes: "" },
  { id: 3, reference: "PAY-003", invoice_number: "INV-2026-004", supplier: "PrintStar", payment_date: "2026-03-10", amount: 6000, payment_method: "mobile", account: "Mobile Wallet", notes: "Partial payment" },
  { id: 4, reference: "PAY-004", invoice_number: "-", supplier: "Various", payment_date: "2026-03-20", amount: 145000, payment_method: "bank", account: "Main Bank", notes: "Salary payments March" },
];

export default function Payments() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    get("/finance/payments").then((r) => setItems(r.data?.data || r.data || [])).catch(() => setItems(dummy));
  }, []);

  const handleDelete = async (id) => {
    const r = await Swal.fire({ title: "Delete payment?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/finance/payments/${id}`); } catch {}
      setItems((p) => p.filter((i) => i.id !== id));
    }
  };

  const total = items.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Payments</h2>
          <p className="text-xs text-gray-500">All outgoing payment records</p>
        </div>
        <button onClick={() => navigate("/finance/payments/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Payment
        </button>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-4 mb-4 text-white">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-200">Total Payments</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-200">Total Amount Paid</p>
            <p className="text-2xl font-bold">{total.toLocaleString()} <span className="text-sm font-normal">AFN</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-teal-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Reference</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Invoice</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Supplier/Purpose</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Date</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Amount</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Method</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Account</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((pay) => (
                <tr key={pay.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs font-medium text-teal-600">{pay.reference}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{pay.invoice_number}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-medium text-gray-800">{pay.supplier}</p>
                    {pay.notes && <p className="text-[10px] text-gray-400">{pay.notes}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{pay.payment_date}</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-gray-800 text-right">{Number(pay.amount).toLocaleString()} AFN</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${methodColors[pay.payment_method] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{pay.payment_method}</span></td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{pay.account}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => handleDelete(pay.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div className="text-center py-8 text-xs text-gray-400">No payments recorded</div>}
        </div>
      </div>
    </div>
  );
}
