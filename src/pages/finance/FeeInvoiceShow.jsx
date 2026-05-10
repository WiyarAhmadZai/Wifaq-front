import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { del } from "../../api/axios";
import { getFeeInvoice, createFeePayment, getAccounts, getFeePayments, regenerateFeeInvoice } from "../../api/financial";
import Swal from "sweetalert2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
  partial: { label: "Partial", color: "bg-blue-50 text-blue-700 border-blue-200" },
  paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue: { label: "Overdue", color: "bg-red-50 text-red-700 border-red-200" },
  waived: { label: "Waived", color: "bg-purple-50 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500 border-gray-300" },
};

const methodLabels = { cash: "Cash", bank: "Bank Transfer", mobile: "Mobile", check: "Check" };
function fmtMoney(n) { return Number(n || 0).toLocaleString(); }
function fmtMonth(d) { return d ? new Date(d).toLocaleString("default", { month: "long", year: "numeric" }) : "—"; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-CA") : "—"; }
function fmtType(t) { return (t || "tuition").replace(/_/g, " "); }

export default function FeeInvoiceShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate, canDelete } = useResourcePermissions("invoices");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payForm, setPayForm] = useState({ amount_paid: "", payment_method: "cash", account_id: "", payment_date: new Date().toISOString().split("T")[0], reference_number: "", description: "" });
  const [showPayForm, setShowPayForm] = useState(false);
  const [savingPay, setSavingPay] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [studentPayments, setStudentPayments] = useState([]);
  const [prevPaymentsLoading, setPrevPaymentsLoading] = useState(false);

  const loadInvoice = () => {
    setLoading(true);
    getFeeInvoice(id)
      .then((r) => {
        const inv = r.data?.data;
        if (!inv) throw new Error("empty");
        setData(inv);
        // Load student's payment history across all invoices
        const studentId = inv.student?.id ?? inv.student_id;
        if (studentId) {
          setPrevPaymentsLoading(true);
          getFeePayments({ student_id: studentId, per_page: 50 })
            .then((res) => {
              const list = res.data?.data?.data || res.data?.data || [];
              setStudentPayments(Array.isArray(list) ? list : []);
            })
            .catch(() => setStudentPayments([]))
            .finally(() => setPrevPaymentsLoading(false));
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getAccounts({ per_page: 100 }).then((r) => {
      const list = r.data?.data?.data || r.data?.data || [];
      setAccounts(Array.isArray(list) ? list : []);
    }).catch(() => {});
    loadInvoice();
  }, [id]);

  const recordPayment = async () => {
    if (!payForm.amount_paid || !payForm.account_id) {
      Swal.fire("Missing Fields", "Amount and deposit account are required.", "warning");
      return;
    }
    setSavingPay(true);
    try {
      await createFeePayment({
        fee_invoice_id: Number(id),
        payment_date: payForm.payment_date,
        amount_paid: Number(payForm.amount_paid),
        payment_method: payForm.payment_method,
        account_id: Number(payForm.account_id),
        reference_number: payForm.reference_number || null,
        description: payForm.description || null,
      });
      Swal.fire("Payment Recorded!", `${Number(payForm.amount_paid).toLocaleString()} AFN recorded.`, "success");
      setPayForm({ amount_paid: "", payment_method: "cash", account_id: "", payment_date: new Date().toISOString().split("T")[0], reference_number: "", description: "" });
      setShowPayForm(false);
      loadInvoice();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to record payment", "error");
    } finally {
      setSavingPay(false);
    }
  };

  const handleDelete = async () => {
    const r = await Swal.fire({ title: "Delete this invoice?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/financial/fees/invoices/${id}`); } catch {}
      navigate("/finance/fee-invoices");
    }
  };

  const handleRegenerate = async () => {
    const result = await Swal.fire({
      title: "Regenerate this invoice?",
      text: "This voids the current invoice (with a reversing journal entry) and creates a fresh one from the student's current fee plan + pending charges.",
      icon: "question",
      input: "text",
      inputPlaceholder: "Reason (required)",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      confirmButtonText: "Regenerate",
      inputValidator: (val) => (!val || !val.trim() ? "Reason is required for the audit trail." : null),
    });
    if (!result.isConfirmed) return;
    try {
      const res = await regenerateFeeInvoice(id, { reason: result.value.trim() });
      const newId = res.data?.data?.id;
      Swal.fire("Regenerated", res.data?.message || "New invoice created.", "success");
      if (newId) navigate(`/finance/fee-invoices/show/${newId}`);
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not regenerate.", "error");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>;
  if (!data) return <div className="text-center py-12 text-xs text-gray-500">Invoice not found</div>;

  const student = data.student || {};
  const studentName = student.full_name || `Student #${data.student_id || "—"}`;
  const className = student.school_class?.name || student.school_class?.title || "—";
  const balance = Number(data.final_amount) - Number(data.amount_paid);
  const paidPct = data.final_amount > 0 ? Math.round((Number(data.amount_paid) / Number(data.final_amount)) * 100) : 0;
  const sc = statusConfig[data.status] || statusConfig.pending;
  const payments = data.payments || [];
  const lines = Array.isArray(data.lines) ? data.lines : [];
  const hasLines = lines.length > 0;
  const isVoided = !!data.voided_at;
  const canRegenerate = !isVoided && data.period_year && data.period_month && canUpdate;

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/finance/fee-invoices")} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-800">{data.invoice_number}</h2>
            <p className="text-xs text-gray-500">{studentName} · {className} · {fmtType(data.fee_type)}{data.invoice_month ? ` · ${fmtMonth(data.invoice_month)}` : ""}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sc.color}`}>{sc.label}</span>
          {isVoided && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-gray-100 text-gray-600 border-gray-300">VOIDED</span>}
          {data.student_id && (
            <button
              onClick={() => navigate(`/finance/students/${data.student_id}/statement`)}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-teal-300 hover:text-teal-700 text-xs font-medium"
              title="View this student's full statement"
            >
              Statement
            </button>
          )}
          {canRegenerate && (
            <button
              onClick={handleRegenerate}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-xs font-medium"
              title="Void this invoice and create a fresh one from the student's current fee plan"
            >
              Regenerate
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </div>
      {isVoided && (
        <div className="mb-4 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
          Voided on {fmtDate(data.voided_at)}{data.voided_reason ? ` — ${data.voided_reason}` : ""}.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Invoice Breakdown — line items (preferred) or legacy fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">
              {hasLines ? "Line Items" : "Invoice Breakdown"}
            </h3>
            {hasLines ? (
              <div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] uppercase text-gray-500">
                      <th className="text-left pb-2 font-semibold">Item</th>
                      <th className="text-left pb-2 font-semibold">Description</th>
                      <th className="text-right pb-2 font-semibold">Qty</th>
                      <th className="text-right pb-2 font-semibold">Unit</th>
                      <th className="text-right pb-2 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lines.map((line) => {
                      const amt = Number(line.amount);
                      return (
                        <tr key={line.id} className="text-gray-700">
                          <td className="py-1.5 font-medium">{line.fee_item?.name || line.fee_item?.code || "—"}</td>
                          <td className="py-1.5 text-gray-500">{line.description || "—"}</td>
                          <td className="py-1.5 text-right">{Number(line.quantity || 1)}</td>
                          <td className="py-1.5 text-right">{fmtMoney(line.unit_price)}</td>
                          <td className={`py-1.5 text-right font-medium ${amt < 0 ? "text-emerald-600" : "text-gray-800"}`}>
                            {amt < 0 ? "" : ""}{fmtMoney(amt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={4} className="pt-2 text-right text-xs text-gray-500">Subtotal</td>
                      <td className="pt-2 text-right text-xs font-semibold text-gray-700">{fmtMoney(data.subtotal)} AFN</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="text-right text-sm font-bold text-gray-800 pt-1">Total</td>
                      <td className="text-right text-sm font-bold text-gray-800 pt-1">{fmtMoney(data.final_amount)} AFN</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "Base Fee", value: data.base_amount, color: "text-gray-700" },
                  { label: "Registration Fee", value: data.registration_fee, color: "text-gray-700", hide: !Number(data.registration_fee) },
                  { label: "Exam Fee", value: data.exam_fee, color: "text-gray-700", hide: !Number(data.exam_fee) },
                  { label: "Transport Fee", value: data.transport_fee, color: "text-gray-700", hide: !Number(data.transport_fee) },
                  { label: "Discount", value: -Number(data.discount_amount), color: "text-emerald-600", hide: !Number(data.discount_amount) },
                  { label: "Support", value: -Number(data.support_amount), color: "text-blue-600", hide: !Number(data.support_amount) },
                  { label: "Late Fee", value: data.late_fee, color: "text-red-600", hide: !Number(data.late_fee) },
                ].filter((r) => !r.hide).map((row) => (
                  <div key={row.label} className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{row.label}</span>
                    <span className={`font-medium ${row.color}`}>{Number(row.value) > 0 ? "+" : ""}{fmtMoney(row.value)} AFN</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold py-2">
                  <span className="text-gray-800">Total Due</span>
                  <span className="text-gray-800">{fmtMoney(data.final_amount)} AFN</span>
                </div>
              </div>
            )}

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
                <span className="text-emerald-600 font-medium">Paid: {fmtMoney(data.amount_paid)} AFN</span>
                {balance > 0 && <span className="text-red-600 font-medium">Balance: {fmtMoney(balance)} AFN</span>}
              </div>
            </div>

            {/* Record Payment */}
            {!['paid', 'cancelled', 'waived'].includes(data.status) && canUpdate && (
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
                          <option value="check">Check</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Deposit Account *</label>
                        <select value={payForm.account_id} onChange={(e) => setPayForm((p) => ({ ...p, account_id: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500">
                          <option value="">Select account</option>
                          {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name} ({a.account_type})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Payment Date</label>
                        <input type="date" value={payForm.payment_date} onChange={(e) => setPayForm((p) => ({ ...p, payment_date: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Reference #</label>
                        <input type="text" value={payForm.reference_number} onChange={(e) => setPayForm((p) => ({ ...p, reference_number: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={recordPayment} disabled={savingPay} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50">{savingPay ? "Saving..." : "Save Payment"}</button>
                      <button onClick={() => setShowPayForm(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment History — this invoice */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Payment History — This Invoice</h3>
            {payments.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No payments recorded yet</p>
            ) : (
              <div className="space-y-2">
                {payments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{fmtMoney(pay.amount_paid)} AFN</p>
                      <p className="text-[10px] text-gray-500">{fmtDate(pay.payment_date)} · {methodLabels[pay.payment_method] || pay.payment_method} · {pay.receipt_number || "No receipt"}</p>
                    </div>
                    <div className="text-right">
                      {pay.account && <p className="text-[10px] text-gray-500">→ {pay.account.account_name}</p>}
                      {pay.reference_number && <p className="text-[10px] text-gray-400">Ref: {pay.reference_number}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment History — all invoices for this student */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">
              Previous Payments — {studentName}
            </h3>
            {prevPaymentsLoading ? (
              <p className="text-xs text-gray-400">Loading previous payments...</p>
            ) : studentPayments.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No previous payments recorded for this student</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] text-gray-500 uppercase border-b border-gray-200">
                      <th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3">Receipt #</th>
                      <th className="pb-2 pr-3">Invoice</th>
                      <th className="pb-2 pr-3 text-right">Amount</th>
                      <th className="pb-2">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {studentPayments.map((pay) => (
                      <tr key={pay.id} className="text-gray-700 hover:bg-gray-50">
                        <td className="py-2 pr-3">{pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : "—"}</td>
                        <td className="py-2 pr-3 font-medium text-teal-700">{pay.receipt_number || "—"}</td>
                        <td className="py-2 pr-3 text-gray-500">{pay.fee_invoice?.invoice_number || pay.fee_invoice_id}</td>
                        <td className="py-2 pr-3 text-right font-medium">{Number(pay.amount_paid || 0).toLocaleString()} AFN</td>
                        <td className="py-2 capitalize">{methodLabels[pay.payment_method] || pay.payment_method || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Invoice:</span><span className="font-medium">{data.invoice_number}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Student:</span><span className="font-medium">{studentName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Class:</span><span className="font-medium">{className}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Month:</span><span className="font-medium">{fmtMonth(data.invoice_month)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Due Date:</span><span className="font-medium">{fmtDate(data.due_date)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Currency:</span><span className="font-medium">{data.currency || "AFN"}</span></div>
              <div className="border-t border-gray-100 pt-2 flex justify-between"><span className="text-gray-500">Total Due:</span><span className="font-bold text-gray-800">{fmtMoney(data.final_amount)} AFN</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Paid:</span><span className="font-bold text-emerald-600">{fmtMoney(data.amount_paid)} AFN</span></div>
              {balance > 0 && <div className="flex justify-between"><span className="text-gray-500">Balance:</span><span className="font-bold text-red-600">{fmtMoney(balance)} AFN</span></div>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 text-white">
            <h3 className="text-xs font-semibold mb-3">{hasLines ? "Origin" : "Adjustments"}</h3>
            <div className="space-y-1.5 text-xs">
              {hasLines ? (
                <>
                  {data.billing_run ? (
                    <>
                      <div className="flex justify-between"><span className="text-teal-200">Billing Run</span><span className="font-medium">#{data.billing_run.id}</span></div>
                      <div className="flex justify-between"><span className="text-teal-200">Run Period</span><span className="font-medium">{data.billing_run.period_year}-{String(data.billing_run.period_month).padStart(2, "0")}</span></div>
                      <div className="flex justify-between"><span className="text-teal-200">Run Status</span><span className="font-medium capitalize">{data.billing_run.status}</span></div>
                    </>
                  ) : (
                    <p className="text-teal-200 text-[10px]">Not part of a billing run</p>
                  )}
                  {data.period_year && (
                    <div className="flex justify-between"><span className="text-teal-200">Period</span><span className="font-medium">{data.period_year}-{String(data.period_month).padStart(2, "0")}</span></div>
                  )}
                  {data.superseded_by_id && (
                    <div className="flex justify-between"><span className="text-teal-200">Superseded by</span>
                      <button onClick={() => navigate(`/finance/fee-invoices/show/${data.superseded_by_id}`)} className="font-medium underline hover:text-white">#{data.superseded_by_id}</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {Number(data.registration_fee) > 0 && <div className="flex justify-between"><span className="text-teal-200">Registration Fee</span><span className="font-medium">{fmtMoney(data.registration_fee)} AFN</span></div>}
                  {Number(data.exam_fee) > 0 && <div className="flex justify-between"><span className="text-teal-200">Exam Fee</span><span className="font-medium">{fmtMoney(data.exam_fee)} AFN</span></div>}
                  {Number(data.discount_amount) > 0 && <div className="flex justify-between"><span className="text-teal-200">Discount</span><span className="font-medium text-emerald-300">{fmtMoney(data.discount_amount)} AFN</span></div>}
                  {Number(data.support_amount) > 0 && <div className="flex justify-between"><span className="text-teal-200">Support</span><span className="font-medium text-blue-300">{fmtMoney(data.support_amount)} AFN</span></div>}
                  {Number(data.late_fee) > 0 && <div className="flex justify-between"><span className="text-teal-200">Late Fee</span><span className="font-medium text-red-300">{fmtMoney(data.late_fee)} AFN</span></div>}
                  {!Number(data.discount_amount) && !Number(data.support_amount) && !Number(data.late_fee) && !Number(data.registration_fee) && !Number(data.exam_fee) && <p className="text-teal-300 text-[10px]">No adjustments applied</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
