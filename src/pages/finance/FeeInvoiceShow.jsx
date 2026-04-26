import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, del } from "../../api/axios";
import Swal from "sweetalert2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

const dummyInvoices = {
  3: { id: 3, student_name: "Khalid Amiri", class: "Grade 9-C", invoice_month: "2026-03-01", base_amount: 2800, discount_amount: 0, support_amount: 300, late_fee: 0, final_amount: 2500, amount_paid: 1500, status: "partial",
    payments: [{ id: 1, payment_date: "2026-03-05", amount_paid: 1500, payment_method: "cash", receipt_number: "RCP-003", recorded_by: "Ahmad Rahimi" }] },
  4: { id: 4, student_name: "Zahra Ahmadi", class: "Grade 12-A", invoice_month: "2026-02-01", base_amount: 3200, discount_amount: 0, support_amount: 0, late_fee: 150, final_amount: 3350, amount_paid: 0, status: "overdue", payments: [] },
  1: { id: 1, student_name: "Ahmad Karimi", class: "Grade 10-A", invoice_month: "2026-03-01", base_amount: 3000, discount_amount: 0, support_amount: 0, late_fee: 0, final_amount: 3000, amount_paid: 3000, status: "paid",
    payments: [{ id: 1, payment_date: "2026-03-02", amount_paid: 3000, payment_method: "bank", receipt_number: "RCP-001", recorded_by: "Ahmad Rahimi" }] },
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
  partial: { label: "Partial", color: "bg-blue-50 text-blue-700 border-blue-200" },
  paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue: { label: "Overdue", color: "bg-red-50 text-red-700 border-red-200" },
};

export default function FeeInvoiceShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate, canDelete } = useResourcePermissions("invoices");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payForm, setPayForm] = useState({ amount_paid: "", payment_method: "cash", receipt_number: "", recorded_by: "" });
  const [showPayForm, setShowPayForm] = useState(false);

  useEffect(() => {
    setLoading(true);
    get(`/finance/fee-invoices/${id}`).then((r) => setData(r.data)).catch(() => setData(dummyInvoices[id] || dummyInvoices[1])).finally(() => setLoading(false));
  }, [id]);

  const recordPayment = () => {
    if (!payForm.amount_paid) return;
    const newPay = { id: Date.now(), payment_date: new Date().toISOString().split("T")[0], ...payForm };
    const newPaid = Number(data.amount_paid) + Number(payForm.amount_paid);
    const newStatus = newPaid >= Number(data.final_amount) ? "paid" : "partial";
    setData((p) => ({ ...p, payments: [...(p.payments || []), newPay], amount_paid: newPaid, status: newStatus }));
    setPayForm({ amount_paid: "", payment_method: "cash", receipt_number: "", recorded_by: "" });
    setShowPayForm(false);
    Swal.fire("Payment Recorded!", `${Number(newPay.amount_paid).toLocaleString()} AFN recorded.`, "success");
  };

  const handleDelete = async () => {
    const r = await Swal.fire({ title: "Delete this invoice?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/finance/fee-invoices/${id}`); } catch {}
      navigate("/finance/fee-invoices");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>;
  if (!data) return <div className="text-center py-12 text-xs text-gray-500">Invoice not found</div>;

  const balance = Number(data.final_amount) - Number(data.amount_paid);
  const paidPct = Math.round((Number(data.amount_paid) / Number(data.final_amount)) * 100);
  const sc = statusConfig[data.status] || statusConfig.pending;

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/finance/fee-invoices")} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-800">{data.student_name}</h2>
            <p className="text-xs text-gray-500">{data.class} · {new Date(data.invoice_month).toLocaleString("default", { month: "long", year: "numeric" })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sc.color}`}>{sc.label}</span>
          {canDelete && (
            <button onClick={handleDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Invoice Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Invoice Breakdown</h3>
            <div className="space-y-2">
              {[
                { label: "Base Fee", value: data.base_amount, color: "text-gray-700" },
                { label: "Discount", value: -Number(data.discount_amount), color: "text-emerald-600", hide: !Number(data.discount_amount) },
                { label: "Support", value: -Number(data.support_amount), color: "text-blue-600", hide: !Number(data.support_amount) },
                { label: "Late Fee", value: data.late_fee, color: "text-red-600", hide: !Number(data.late_fee) },
              ].filter((r) => !r.hide).map((row) => (
                <div key={row.label} className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">{row.label}</span>
                  <span className={`font-medium ${row.color}`}>{Number(row.value) > 0 ? "+" : ""}{Number(row.value).toLocaleString()} AFN</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold py-2">
                <span className="text-gray-800">Total Due</span>
                <span className="text-gray-800">{Number(data.final_amount).toLocaleString()} AFN</span>
              </div>
            </div>

            {/* Payment progress */}
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-500">Payment Progress</span>
                <span className={`font-semibold ${paidPct === 100 ? "text-emerald-600" : "text-amber-600"}`}>{paidPct}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full ${paidPct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${paidPct}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-600 font-medium">Paid: {Number(data.amount_paid).toLocaleString()} AFN</span>
                {balance > 0 && <span className="text-red-600 font-medium">Balance: {balance.toLocaleString()} AFN</span>}
              </div>
            </div>

            {/* Record Payment */}
            {data.status !== "paid" && canUpdate && (
              <div className="mt-3">
                {!showPayForm ? (
                  <button onClick={() => setShowPayForm(true)} className="w-full py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Record Payment
                  </button>
                ) : (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-teal-700 mb-2">Record New Payment</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Amount (AFN) *</label>
                        <input type="number" value={payForm.amount_paid} onChange={(e) => setPayForm((p) => ({ ...p, amount_paid: e.target.value }))}
                          placeholder="0" className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Method</label>
                        <select value={payForm.payment_method} onChange={(e) => setPayForm((p) => ({ ...p, payment_method: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500">
                          <option value="cash">Cash</option>
                          <option value="bank">Bank</option>
                          <option value="mobile">Mobile</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Receipt No.</label>
                        <input type="text" value={payForm.receipt_number} onChange={(e) => setPayForm((p) => ({ ...p, receipt_number: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Recorded By</label>
                        <input type="text" value={payForm.recorded_by} onChange={(e) => setPayForm((p) => ({ ...p, recorded_by: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={recordPayment} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700">Save Payment</button>
                      <button onClick={() => setShowPayForm(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Payment History</h3>
            {(data.payments || []).length === 0 ? (
              <p className="text-xs text-gray-400 italic">No payments recorded yet</p>
            ) : (
              <div className="space-y-2">
                {data.payments.map((pay, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{Number(pay.amount_paid).toLocaleString()} AFN</p>
                      <p className="text-[10px] text-gray-500">{pay.payment_date} · {pay.payment_method} · {pay.receipt_number || "No receipt"}</p>
                    </div>
                    <span className="text-[10px] text-gray-400">{pay.recorded_by}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Student:</span><span className="font-medium">{data.student_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Class:</span><span className="font-medium">{data.class}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Month:</span><span className="font-medium">{new Date(data.invoice_month).toLocaleString("default", { month: "long", year: "numeric" })}</span></div>
              <div className="border-t border-gray-100 pt-2 flex justify-between"><span className="text-gray-500">Total Due:</span><span className="font-bold text-gray-800">{Number(data.final_amount).toLocaleString()} AFN</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Paid:</span><span className="font-bold text-emerald-600">{Number(data.amount_paid).toLocaleString()} AFN</span></div>
              {balance > 0 && <div className="flex justify-between"><span className="text-gray-500">Balance:</span><span className="font-bold text-red-600">{balance.toLocaleString()} AFN</span></div>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 text-white">
            <h3 className="text-xs font-semibold mb-3">Adjustments</h3>
            <div className="space-y-1.5 text-xs">
              {Number(data.discount_amount) > 0 && <div className="flex justify-between"><span className="text-teal-200">Discount</span><span className="font-medium text-emerald-300">{Number(data.discount_amount).toLocaleString()} AFN</span></div>}
              {Number(data.support_amount) > 0 && <div className="flex justify-between"><span className="text-teal-200">Support</span><span className="font-medium text-blue-300">{Number(data.support_amount).toLocaleString()} AFN</span></div>}
              {Number(data.late_fee) > 0 && <div className="flex justify-between"><span className="text-teal-200">Late Fee</span><span className="font-medium text-red-300">{Number(data.late_fee).toLocaleString()} AFN</span></div>}
              {!Number(data.discount_amount) && !Number(data.support_amount) && !Number(data.late_fee) && <p className="text-teal-300 text-[10px]">No adjustments applied</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
