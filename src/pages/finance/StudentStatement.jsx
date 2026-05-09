import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getStudentStatement,
  getFeeItems,
  addPendingCharge,
  cancelPendingCharge,
} from "../../api/financial";

/**
 * Per-student account view. Balance, outstanding & paid invoices (each with
 * their lines), pending charges that will appear on the next billing run.
 *
 * Designed in FEE_MODULE_REDESIGN_PLAN.md §7.1.
 */

const STATUS_TONE = {
  pending:   { label: "Pending",   tone: "bg-amber-50 text-amber-700 border-amber-200" },
  partial:   { label: "Partial",   tone: "bg-blue-50 text-blue-700 border-blue-200" },
  paid:      { label: "Paid",      tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:   { label: "Overdue",   tone: "bg-red-50 text-red-700 border-red-200" },
  waived:    { label: "Waived",    tone: "bg-purple-50 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelled", tone: "bg-gray-100 text-gray-500 border-gray-300" },
};

const fmtMoney = (n) => Number(n || 0).toLocaleString();
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-CA") : "—");
const fmtMonth = (d) => (d ? new Date(d).toLocaleString("default", { month: "long", year: "numeric" }) : "—");

export default function StudentStatement() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("outstanding"); // outstanding | paid | all
  const [expanded, setExpanded] = useState({});
  const [feeItems, setFeeItems] = useState([]);

  const load = () => {
    setLoading(true);
    getStudentStatement(studentId, { filter: "all" })
      .then((res) => setData(res.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [studentId]);
  useEffect(() => {
    getFeeItems().then((r) => setFeeItems(r.data?.data || [])).catch(() => setFeeItems([]));
  }, []);

  const filteredInvoices = useMemo(() => {
    if (!data?.invoices) return [];
    return data.invoices.filter((inv) => {
      if (inv.voided_at) return filter === "all";
      if (filter === "outstanding") return ["pending", "partial", "overdue"].includes(inv.status);
      if (filter === "paid") return inv.status === "paid";
      return true; // all
    });
  }, [data, filter]);

  const handleAddCharge = async () => {
    const itemOptions = (feeItems || []).reduce((acc, it) => {
      acc[it.id] = `${it.code} — ${it.name}`;
      return acc;
    }, {});
    if (Object.keys(itemOptions).length === 0) {
      Swal.fire("No fee items", "Seed the fee_items catalog first.", "warning");
      return;
    }

    const { value } = await Swal.fire({
      title: "Add pending charge",
      html:
        '<select id="sw-item" class="swal2-input" style="margin-top:0.5rem">' +
          Object.entries(itemOptions).map(([id, label]) => `<option value="${id}">${label}</option>`).join("") +
        '</select>' +
        '<input id="sw-amount" type="number" class="swal2-input" placeholder="Amount" />' +
        '<input id="sw-desc" type="text" class="swal2-input" placeholder="Description (optional)" />',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      preConfirm: () => {
        const fee_item_id = Number(document.getElementById("sw-item").value);
        const amount = Number(document.getElementById("sw-amount").value);
        const description = document.getElementById("sw-desc").value || null;
        if (!fee_item_id || !amount) {
          Swal.showValidationMessage("Item and amount are required");
          return false;
        }
        return { fee_item_id, amount, description };
      },
    });

    if (value) {
      try {
        await addPendingCharge(studentId, value);
        Swal.fire("Added", "Pending charge queued for next billing run.", "success");
        load();
      } catch (err) {
        Swal.fire("Failed", err.response?.data?.message || "Could not add charge.", "error");
      }
    }
  };

  const handleCancelPending = async (charge) => {
    const r = await Swal.fire({
      title: "Cancel this pending charge?",
      input: "text",
      inputPlaceholder: "Reason (optional)",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Cancel charge",
    });
    if (!r.isConfirmed) return;
    try {
      await cancelPendingCharge(charge.id, { reason: r.value || null });
      load();
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not cancel.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  if (!data) {
    return <div className="text-center py-12 text-xs text-gray-500">Student not found</div>;
  }

  const student = data.student || {};
  const studentName = student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim() || `Student #${studentId}`;
  const className = student.school_class?.name || student.school_class?.title || "—";
  const family = student.family || {};

  const counts = {
    outstanding: (data.invoices || []).filter((i) => !i.voided_at && ["pending", "partial", "overdue"].includes(i.status)).length,
    paid: (data.invoices || []).filter((i) => !i.voided_at && i.status === "paid").length,
    all: (data.invoices || []).length,
    pending: (data.pending_charges || []).length,
  };

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{studentName}</h2>
              <p className="text-xs text-gray-500">
                Class {className}
                {family.father_name ? ` · Father: ${family.father_name}` : ""}
                {family.father_phone ? ` · ${family.father_phone}` : (family.mother_phone ? ` · ${family.mother_phone}` : "")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Balance Due</p>
            <p className={`text-2xl font-bold ${data.balance_due > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {fmtMoney(data.balance_due)} <span className="text-xs">AFN</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleAddCharge}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-teal-300 hover:text-teal-700 text-xs font-medium"
          >
            + Add pending charge
          </button>
          {data.balance_due > 0 && (
            <button
              onClick={() => navigate(`/finance/cashier?student_id=${studentId}`)}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium"
            >
              Take payment
            </button>
          )}
          <button
            onClick={() => navigate("/finance/billing-runs")}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium"
          >
            Run billing
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Invoices */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1 bg-gray-50">
            {[
              ["outstanding", `Outstanding (${counts.outstanding})`],
              ["paid", `Paid (${counts.paid})`],
              ["all", `All (${counts.all})`],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                  filter === key
                    ? "bg-teal-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-gray-100">
            {filteredInvoices.length === 0 && (
              <div className="text-center py-8 text-xs text-gray-400">No invoices in this filter.</div>
            )}
            {filteredInvoices.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                isOpen={!!expanded[inv.id]}
                toggle={() => setExpanded((p) => ({ ...p, [inv.id]: !p[inv.id] }))}
                onPay={() => navigate(`/finance/fee-invoices/show/${inv.id}`)}
                onView={() => navigate(`/finance/fee-invoices/show/${inv.id}`)}
              />
            ))}
          </div>
        </div>

        {/* Pending charges */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 self-start">
          <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-1">
            Pending charges <span className="text-gray-400 normal-case font-normal">({counts.pending})</span>
          </h3>
          <p className="text-[10px] text-gray-500 mb-3">Will appear on the next billing run for this student.</p>

          {(data.pending_charges || []).length === 0 ? (
            <p className="text-xs text-gray-400 italic">None queued</p>
          ) : (
            <div className="space-y-2">
              {data.pending_charges.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {c.fee_item?.name || c.fee_item?.code || "Charge"}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {c.description || "—"}
                      {c.source_type ? ` · from ${c.source_type}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-amber-700">{fmtMoney(c.amount)}</p>
                    <button
                      onClick={() => handleCancelPending(c)}
                      className="text-[10px] text-red-500 hover:text-red-700"
                      title="Cancel this pending charge"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-xs font-bold border-t border-amber-200 pt-2 mt-2">
                <span className="text-gray-600">Pending total</span>
                <span className="text-amber-700">{fmtMoney(data.pending_total)} AFN</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, isOpen, toggle, onPay, onView }) {
  const sc = STATUS_TONE[invoice.status] || STATUS_TONE.pending;
  const balance = Number(invoice.final_amount) - Number(invoice.amount_paid);
  const lines = invoice.lines || [];
  const voided = !!invoice.voided_at;

  return (
    <div className={`px-4 py-3 ${voided ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <button onClick={toggle} className="flex items-center gap-2 text-left flex-1 min-w-0">
          <span className="text-gray-400 w-3 flex-shrink-0">{isOpen ? "▼" : "▶"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-teal-700 truncate">{invoice.invoice_number}</p>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${sc.tone}`}>{sc.label}</span>
              {voided && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-gray-100 text-gray-500 border border-gray-300">VOIDED</span>}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {fmtMonth(invoice.invoice_month)}
              {invoice.due_date && ` · Due ${fmtDate(invoice.due_date)}`}
              {invoice.billing_run && ` · Run #${invoice.billing_run.id}`}
            </p>
          </div>
        </button>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-gray-800">{fmtMoney(invoice.final_amount)} AFN</p>
          {balance > 0 && !voided && (
            <p className="text-[10px] text-red-500">Balance: {fmtMoney(balance)}</p>
          )}
          <div className="flex items-center justify-end gap-1 mt-1">
            {balance > 0 && !voided && (
              <button onClick={onPay} className="px-2 py-0.5 bg-teal-600 text-white rounded text-[10px] font-semibold hover:bg-teal-700">
                Pay
              </button>
            )}
            <button onClick={onView} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 rounded text-[10px] hover:border-teal-300 hover:text-teal-700">
              View
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 ml-6 pl-3 border-l-2 border-teal-100 space-y-1">
          {lines.length === 0 && (
            <p className="text-[10px] text-gray-400 italic">No line items (legacy invoice; see View for the breakdown)</p>
          )}
          {lines.map((line) => {
            const amt = Number(line.amount);
            return (
              <div key={line.id} className="flex justify-between text-xs">
                <span className="text-gray-600">{line.description || line.fee_item?.name}</span>
                <span className={`font-medium ${amt < 0 ? "text-emerald-600" : "text-gray-700"}`}>
                  {fmtMoney(amt)}
                </span>
              </div>
            );
          })}
          {lines.length > 0 && (
            <div className="flex justify-between text-xs pt-1.5 border-t border-gray-100 font-semibold">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-gray-800">{fmtMoney(invoice.subtotal)}</span>
            </div>
          )}
          {Number(invoice.amount_paid) > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600">Paid</span>
              <span className="text-emerald-700 font-medium">−{fmtMoney(invoice.amount_paid)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
