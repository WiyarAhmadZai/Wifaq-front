import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { del } from "../../api/axios";
import { getFeeInvoice, regenerateFeeInvoice } from "../../api/financial";
import Swal from "sweetalert2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

/**
 * Single invoice view. Read-only breakdown + payment history. Payments are
 * taken on the Cashier screen — this page just deep-links there with the
 * student preselected.
 */

const STATUS = {
  pending:   { label: "Pending",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  partial:   { label: "Partial",   color: "bg-blue-50 text-blue-700 border-blue-200" },
  paid:      { label: "Paid",      color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:   { label: "Overdue",   color: "bg-red-50 text-red-700 border-red-200" },
  waived:    { label: "Waived",    color: "bg-purple-50 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500 border-gray-300" },
};

const methodLabels = { cash: "Cash", bank: "Bank Transfer", mobile: "Mobile", check: "Check" };
const fmtMoney = (n) => Number(n || 0).toLocaleString();
const fmtMonth = (d) => (d ? new Date(d).toLocaleString("default", { month: "long", year: "numeric" }) : "—");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-CA") : "—");
const fmtType = (t) => (t || "tuition").replace(/_/g, " ");

export default function FeeInvoiceShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate, canDelete } = useResourcePermissions("invoices");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadInvoice = () => {
    setLoading(true);
    getFeeInvoice(id)
      .then((r) => {
        const inv = r.data?.data;
        if (!inv) throw new Error("empty");
        setData(inv);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(loadInvoice, [id]);

  const handleDelete = async () => {
    const r = await Swal.fire({
      title: "Delete this invoice?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try { await del(`/financial/fees/invoices/${id}`); } catch {}
    navigate("/finance/fee-invoices");
  };

  const handleRegenerate = async () => {
    const r = await Swal.fire({
      title: "Regenerate this invoice?",
      text: "Voids the current invoice (with a reversing journal entry) and creates a fresh one from the student's current fee plan + pending charges.",
      icon: "question",
      input: "text",
      inputPlaceholder: "Reason (required)",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      confirmButtonText: "Regenerate",
      inputValidator: (v) => (!v || !v.trim() ? "Reason is required for the audit trail." : null),
    });
    if (!r.isConfirmed) return;
    try {
      const res = await regenerateFeeInvoice(id, { reason: r.value.trim() });
      const newId = res.data?.data?.id;
      Swal.fire("Regenerated", res.data?.message || "New invoice created.", "success");
      if (newId) navigate(`/finance/fee-invoices/show/${newId}`);
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not regenerate.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  if (!data) return <div className="text-center py-12 text-xs text-gray-500">Invoice not found</div>;

  const student = data.student || {};
  const studentName = student.full_name || `Student #${data.student_id || "—"}`;
  const className = student.school_class?.name || student.school_class?.title || "—";
  const balance = Number(data.final_amount) - Number(data.amount_paid);
  const paidPct = data.final_amount > 0 ? Math.round((Number(data.amount_paid) / Number(data.final_amount)) * 100) : 0;
  const sc = STATUS[data.status] || STATUS.pending;
  const payments = data.payments || [];
  const lines = Array.isArray(data.lines) ? data.lines : [];
  const hasLines = lines.length > 0;
  const isVoided = !!data.voided_at;
  const canRegenerate = !isVoided && data.period_year && data.period_month && canUpdate;
  const canTakePayment = !isVoided && balance > 0 && canUpdate;

  return (
    <div className="px-4 py-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/finance/fee-invoices")} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-800">{data.invoice_number}</h2>
            <p className="text-xs text-gray-500">
              {studentName} · {className} · {fmtType(data.fee_type)}
              {data.invoice_month ? ` · ${fmtMonth(data.invoice_month)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sc.color}`}>{sc.label}</span>
          {isVoided && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-gray-100 text-gray-600 border-gray-300">VOIDED</span>}
          {canTakePayment && (
            <button
              onClick={() => navigate(`/finance/cashier?student_id=${data.student_id}`)}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold"
            >
              Take payment
            </button>
          )}
          {canRegenerate && (
            <button
              onClick={handleRegenerate}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-xs font-medium"
              title="Void this invoice and create a fresh one from the current fee plan"
            >
              Regenerate
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
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
          {/* Lines (preferred) or legacy breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">
              {hasLines ? "Line Items" : "Invoice Breakdown"}
            </h3>
            {hasLines ? (
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
                          {fmtMoney(amt)}
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
            ) : (
              <div className="space-y-2">
                {[
                  { label: "Base Fee",         value: data.base_amount,           color: "text-gray-700" },
                  { label: "Registration Fee", value: data.registration_fee,      color: "text-gray-700", hide: !Number(data.registration_fee) },
                  { label: "Exam Fee",         value: data.exam_fee,              color: "text-gray-700", hide: !Number(data.exam_fee) },
                  { label: "Transport Fee",    value: data.transport_fee,         color: "text-gray-700", hide: !Number(data.transport_fee) },
                  { label: "Discount",         value: -Number(data.discount_amount), color: "text-emerald-600", hide: !Number(data.discount_amount) },
                  { label: "Support",          value: -Number(data.support_amount),  color: "text-blue-600", hide: !Number(data.support_amount) },
                  { label: "Late Fee",         value: data.late_fee,              color: "text-red-600", hide: !Number(data.late_fee) },
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
          </div>

          {/* Payment History — this invoice only */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Payment History</h3>
            {payments.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No payments recorded yet</p>
            ) : (
              <div className="space-y-2">
                {payments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{fmtMoney(pay.amount_paid)} AFN</p>
                      <p className="text-[10px] text-gray-500">
                        {fmtDate(pay.payment_date)} · {methodLabels[pay.payment_method] || pay.payment_method}
                        {pay.receipt_number ? ` · ${pay.receipt_number}` : ""}
                      </p>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Summary</h3>
            <div className="space-y-2 text-xs">
              <Row k="Invoice" v={data.invoice_number} />
              <Row k="Student" v={studentName} />
              <Row k="Class" v={className} />
              <Row k="Month" v={fmtMonth(data.invoice_month)} />
              <Row k="Due Date" v={fmtDate(data.due_date)} />
              <Row k="Currency" v={data.currency || "AFN"} />
              <div className="border-t border-gray-100 pt-2">
                <Row k="Total Due" v={`${fmtMoney(data.final_amount)} AFN`} bold />
              </div>
              <Row k="Paid" v={`${fmtMoney(data.amount_paid)} AFN`} bold tone="text-emerald-600" />
              {balance > 0 && <Row k="Balance" v={`${fmtMoney(balance)} AFN`} bold tone="text-red-600" />}
            </div>
          </div>

          {hasLines && (
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 text-white">
              <h3 className="text-xs font-semibold mb-3">Origin</h3>
              <div className="space-y-1.5 text-xs">
                {data.billing_run ? (
                  <>
                    <div className="flex justify-between"><span className="text-teal-200">Billing Run</span><span className="font-medium">#{data.billing_run.id}</span></div>
                    <div className="flex justify-between"><span className="text-teal-200">Run Period</span><span className="font-medium">{data.billing_run.period_year}-{String(data.billing_run.period_month).padStart(2, "0")}</span></div>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, bold, tone }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{k}:</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${tone || "text-gray-800"}`}>{v}</span>
    </div>
  );
}
