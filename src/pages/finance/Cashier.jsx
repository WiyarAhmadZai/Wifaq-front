import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get } from "../../api/axios";
import {
  getStudentStatement,
  getAccounts,
  getFeeItems,
  addInvoiceLine,
  createFeePayment,
  addPendingCharge,
} from "../../api/financial";

/**
 * Cashier — single-screen "settle this student's bill" flow.
 *
 * Replaces the old per-invoice payment form. Drives off the new line-item
 * model: search a student, see ALL outstanding invoices and their lines,
 * apply ad-hoc discounts in place, allocate amounts across invoices, and
 * record the whole settlement in one click.
 *
 * One physical receipt = one row in fee_payments per invoice settled. The
 * cashier sees them as a single transaction.
 */

const fmtMoney = (n) => Number(n || 0).toLocaleString();
const fmtMonth = (d) => (d ? new Date(d).toLocaleString("default", { month: "short", year: "numeric" }) : "—");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-CA") : "—");

export default function Cashier() {
  const navigate = useNavigate();
  const [search] = useSearchParams();

  const [students, setStudents] = useState([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(search.get("student_id") || "");

  const [statement, setStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [feeItems, setFeeItems] = useState([]);

  const [allocations, setAllocations] = useState({}); // { invoiceId: amount }
  const [expanded, setExpanded] = useState({});       // { invoiceId: bool }

  const today = new Date().toISOString().split("T")[0];
  const [paymentMeta, setPaymentMeta] = useState({
    account_id: "",
    payment_method: "cash",
    payment_date: today,
    reference_number: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null); // post-submit summary

  // Load reference data once
  useEffect(() => {
    get("/student-management/students/list", { params: { registration_status: "phase_2", per_page: 1000 } })
      .then((r) => setStudents(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => setStudents([]));
    getAccounts({ per_page: 100 })
      .then((r) => setAccounts(r.data?.data?.data || r.data?.data || []))
      .catch(() => setAccounts([]));
    getFeeItems()
      .then((r) => setFeeItems(r.data?.data || []))
      .catch(() => setFeeItems([]));
  }, []);

  // Load statement when student selected
  useEffect(() => {
    if (!selectedStudentId) {
      setStatement(null);
      setAllocations({});
      setReceipt(null);
      return;
    }
    loadStatement();
  }, [selectedStudentId]);

  const loadStatement = async () => {
    setLoadingStatement(true);
    try {
      const r = await getStudentStatement(selectedStudentId, { filter: "outstanding" });
      const s = r.data?.data || null;
      setStatement(s);
      // Default allocation = balance due per invoice
      if (s?.invoices) {
        const next = {};
        for (const inv of s.invoices) {
          if (inv.voided_at) continue;
          if (["pending", "partial", "overdue"].includes(inv.status)) {
            const bal = Number(inv.final_amount) - Number(inv.amount_paid);
            if (bal > 0) next[inv.id] = bal.toFixed(2);
          }
        }
        setAllocations(next);
      }
    } catch (e) {
      console.error(e);
      setStatement(null);
    } finally {
      setLoadingStatement(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!studentQuery.trim()) return students.slice(0, 50);
    const q = studentQuery.trim().toLowerCase();
    return students.filter((s) => {
      const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
      return name.includes(q) || (s.student_id || "").toLowerCase().includes(q);
    }).slice(0, 50);
  }, [students, studentQuery]);

  const outstandingInvoices = useMemo(() => {
    if (!statement?.invoices) return [];
    return statement.invoices.filter((i) => !i.voided_at && ["pending", "partial", "overdue"].includes(i.status));
  }, [statement]);

  // Sums
  const totalDue = outstandingInvoices.reduce(
    (s, i) => s + (Number(i.final_amount) - Number(i.amount_paid)),
    0
  );
  const totalAllocated = Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0);

  // ---- actions ----

  const setAlloc = (invoiceId, value) => {
    setAllocations((p) => ({ ...p, [invoiceId]: value }));
  };

  const fillFullForInvoice = (inv) => {
    const bal = Number(inv.final_amount) - Number(inv.amount_paid);
    setAlloc(inv.id, bal.toFixed(2));
  };
  const clearAllocation = (inv) => setAlloc(inv.id, "0");

  const handleApplyDiscount = async (invoice) => {
    const discountItem = feeItems.find((i) => i.code === "DISCOUNT");
    if (!discountItem) {
      Swal.fire("No DISCOUNT fee item", "Seed the fee_items catalog (FeeItemsSeeder) first.", "warning");
      return;
    }
    const balance = Number(invoice.final_amount) - Number(invoice.amount_paid);

    const { value } = await Swal.fire({
      title: `Apply discount on ${invoice.invoice_number}`,
      html: `
        <div style="text-align:left;font-size:12px;color:#475569;margin-bottom:8px">
          Current balance: <strong>${fmtMoney(balance)} AFN</strong>
        </div>
        <input id="sw-amount" type="number" class="swal2-input" placeholder="Discount amount (positive number)" />
        <input id="sw-reason" type="text" class="swal2-input" placeholder="Reason (e.g. sibling discount)" />
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      confirmButtonText: "Add discount line",
      preConfirm: () => {
        const amount = Number(document.getElementById("sw-amount").value);
        const reason = document.getElementById("sw-reason").value.trim();
        if (!amount || amount <= 0) {
          Swal.showValidationMessage("Discount amount is required and must be positive.");
          return false;
        }
        if (!reason) {
          Swal.showValidationMessage("Reason is required for the audit trail.");
          return false;
        }
        if (amount > balance) {
          Swal.showValidationMessage(`Discount cannot exceed balance (${fmtMoney(balance)}).`);
          return false;
        }
        return { amount, reason };
      },
    });

    if (!value) return;
    try {
      await addInvoiceLine(invoice.id, {
        fee_item_id: discountItem.id,
        amount: -Number(value.amount),
        description: value.reason,
      });
      Swal.fire("Discount applied", `${fmtMoney(value.amount)} AFN deducted from ${invoice.invoice_number}.`, "success");
      await loadStatement();
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not add discount.", "error");
    }
  };

  const handleAddPendingCharge = async () => {
    if (!selectedStudentId) return;
    const itemOptions = feeItems.reduce((acc, it) => {
      acc[it.id] = `${it.code} — ${it.name}`;
      return acc;
    }, {});
    if (Object.keys(itemOptions).length === 0) {
      Swal.fire("No fee items", "Seed the fee_items catalog first.", "warning");
      return;
    }
    const { value } = await Swal.fire({
      title: "Add pending charge",
      text: "This charge will be picked up by the next billing run for this student.",
      html:
        '<select id="pc-item" class="swal2-input" style="margin-top:0.5rem">' +
          Object.entries(itemOptions).map(([id, label]) => `<option value="${id}">${label}</option>`).join("") +
        "</select>" +
        '<input id="pc-amount" type="number" class="swal2-input" placeholder="Amount" />' +
        '<input id="pc-desc" type="text" class="swal2-input" placeholder="Description (optional)" />',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      preConfirm: () => {
        const fee_item_id = Number(document.getElementById("pc-item").value);
        const amount = Number(document.getElementById("pc-amount").value);
        const description = document.getElementById("pc-desc").value || null;
        if (!fee_item_id || !amount) {
          Swal.showValidationMessage("Item and amount are required");
          return false;
        }
        return { fee_item_id, amount, description };
      },
    });
    if (!value) return;
    try {
      await addPendingCharge(selectedStudentId, value);
      Swal.fire("Queued", "Pending charge added — it will appear on the next billing run.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not add pending charge.", "error");
    }
  };

  const handleSubmit = async () => {
    const items = outstandingInvoices
      .map((inv) => ({ inv, amt: Number(allocations[inv.id]) || 0 }))
      .filter((x) => x.amt > 0);

    if (items.length === 0) {
      Swal.fire("Nothing to pay", "Set an allocation amount on at least one invoice.", "info");
      return;
    }
    if (!paymentMeta.account_id) {
      Swal.fire("Pick a deposit account", "Select where the money lands.", "warning");
      return;
    }

    const confirm = await Swal.fire({
      title: `Take ${fmtMoney(totalAllocated)} AFN?`,
      text: `${items.length} invoice${items.length === 1 ? "" : "s"} will be settled in this transaction.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      confirmButtonText: "Take payment",
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    const results = [];
    let firstErr = null;
    for (const { inv, amt } of items) {
      try {
        const r = await createFeePayment({
          fee_invoice_id: inv.id,
          amount_paid: amt,
          payment_method: paymentMeta.payment_method,
          account_id: Number(paymentMeta.account_id),
          payment_date: paymentMeta.payment_date,
          reference_number: paymentMeta.reference_number || null,
          description: paymentMeta.description || null,
        });
        results.push({ invoice: inv, amount: amt, payment: r.data?.data, ok: true });
      } catch (e) {
        firstErr = e;
        results.push({ invoice: inv, amount: amt, ok: false, message: e.response?.data?.message || "Failed" });
      }
    }
    setSubmitting(false);

    setReceipt({
      student: statement?.student,
      total: results.filter((r) => r.ok).reduce((s, r) => s + r.amount, 0),
      method: paymentMeta.payment_method,
      paymentDate: paymentMeta.payment_date,
      reference: paymentMeta.reference_number,
      account: accounts.find((a) => String(a.id) === String(paymentMeta.account_id)),
      results,
    });

    if (firstErr) {
      Swal.fire("Partial failure", "Some invoices could not be settled. See receipt for details.", "warning");
    } else {
      Swal.fire("Done", `${fmtMoney(totalAllocated)} AFN recorded across ${items.length} invoice${items.length === 1 ? "" : "s"}.`, "success");
    }
  };

  const handleNewTransaction = () => {
    setReceipt(null);
    setSelectedStudentId("");
    setStudentQuery("");
    setAllocations({});
    setPaymentMeta((p) => ({ ...p, reference_number: "", description: "" }));
  };

  // ===================================================================== UI

  return (
    <div className="px-4 py-4 max-w-6xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Cashier</h1>
          <p className="text-xs text-gray-500">Settle a student's outstanding bill in one transaction.</p>
        </div>
        <button
          onClick={() => navigate("/finance/fee-payments")}
          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-teal-300 hover:text-teal-700 text-xs font-medium"
        >
          Payment history →
        </button>
      </div>

      {receipt ? (
        <ReceiptPanel receipt={receipt} onNew={handleNewTransaction} />
      ) : (
        <>
          {/* Student picker */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-1">Student</label>
            {!selectedStudentId ? (
              <>
                <input
                  type="text"
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Search by name or student ID…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-500"
                  autoFocus
                />
                {studentQuery && (
                  <div className="mt-2 max-h-64 overflow-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                    {filteredStudents.length === 0 ? (
                      <div className="text-xs text-gray-400 italic p-3">No matches</div>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStudentId(String(s.id))}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 flex items-center justify-between"
                        >
                          <span className="font-medium text-gray-800">{s.first_name} {s.last_name}</span>
                          <span className="text-[10px] text-gray-500">{s.student_id || `#${s.id}`}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            ) : (
              <SelectedStudentBar
                student={statement?.student}
                onChange={() => { setSelectedStudentId(""); setStudentQuery(""); setStatement(null); }}
                onAddPending={handleAddPendingCharge}
              />
            )}
          </div>

          {/* Outstanding invoices */}
          {selectedStudentId && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Invoice list */}
              <div className="lg:col-span-2">
                {loadingStatement ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-xs text-gray-500">
                    Loading outstanding bills…
                  </div>
                ) : outstandingInvoices.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
                    <p className="text-emerald-700 font-semibold text-sm">✓ No outstanding bills</p>
                    <p className="text-emerald-600 text-xs mt-1">This student has no pending invoices.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between px-1">
                      <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Outstanding ({outstandingInvoices.length})
                      </h2>
                      <span className="text-xs text-gray-500">
                        Total due: <span className="font-bold text-red-600">{fmtMoney(totalDue)} AFN</span>
                      </span>
                    </div>

                    <OutstandingBreakdown invoices={outstandingInvoices} />

                    {outstandingInvoices.map((inv) => (
                      <InvoiceCard
                        key={inv.id}
                        invoice={inv}
                        allocation={allocations[inv.id] ?? "0"}
                        setAllocation={(v) => setAlloc(inv.id, v)}
                        fillFull={() => fillFullForInvoice(inv)}
                        clear={() => clearAllocation(inv)}
                        applyDiscount={() => handleApplyDiscount(inv)}
                        isOpen={!!expanded[inv.id]}
                        toggle={() => setExpanded((p) => ({ ...p, [inv.id]: !p[inv.id] }))}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Payment summary */}
              {outstandingInvoices.length > 0 && (
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm sticky top-4">
                    <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Take payment</h2>

                    <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 mb-3">
                      <p className="text-[10px] uppercase text-teal-700 font-semibold">Receiving now</p>
                      <p className="text-2xl font-bold text-teal-700">{fmtMoney(totalAllocated)} <span className="text-xs">AFN</span></p>
                      <p className="text-[10px] text-teal-600 mt-0.5">
                        Out of {fmtMoney(totalDue)} due across {outstandingInvoices.length} invoice{outstandingInvoices.length === 1 ? "" : "s"}.
                      </p>
                    </div>

                    <Field label="Method">
                      <select
                        value={paymentMeta.payment_method}
                        onChange={(e) => setPaymentMeta((p) => ({ ...p, payment_method: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank">Bank</option>
                        <option value="mobile">Mobile</option>
                        <option value="check">Check</option>
                      </select>
                    </Field>

                    <Field label="Deposit account">
                      <select
                        value={paymentMeta.account_id}
                        onChange={(e) => setPaymentMeta((p) => ({ ...p, account_id: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="">— pick account —</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.account_name} ({a.account_type})</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Date">
                      <input
                        type="date"
                        value={paymentMeta.payment_date}
                        onChange={(e) => setPaymentMeta((p) => ({ ...p, payment_date: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
                      />
                    </Field>

                    <Field label="Reference (optional)">
                      <input
                        type="text"
                        value={paymentMeta.reference_number}
                        onChange={(e) => setPaymentMeta((p) => ({ ...p, reference_number: e.target.value }))}
                        placeholder="Receipt # / cheque #"
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
                      />
                    </Field>

                    <Field label="Notes (optional)">
                      <textarea
                        value={paymentMeta.description}
                        onChange={(e) => setPaymentMeta((p) => ({ ...p, description: e.target.value }))}
                        rows={2}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
                      />
                    </Field>

                    <button
                      onClick={handleSubmit}
                      disabled={submitting || totalAllocated <= 0}
                      className="w-full mt-2 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold disabled:opacity-50"
                    >
                      {submitting ? "Recording…" : `Take ${fmtMoney(totalAllocated)} AFN`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================== Subcomponents

function Field({ label, children }) {
  return (
    <div className="mb-2">
      <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-1">{label}</label>
      {children}
    </div>
  );
}

function SelectedStudentBar({ student, onChange, onAddPending }) {
  const name = student?.full_name || `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "Student";
  const className = student?.school_class?.name || "—";
  const family = student?.family || {};
  return (
    <div className="flex items-center justify-between gap-3 p-2 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 rounded-lg">
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{name}</p>
        <p className="text-[11px] text-gray-500 truncate">
          Class {className}
          {family.father_name ? ` · ${family.father_name}` : ""}
          {family.father_phone ? ` · ${family.father_phone}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onAddPending && (
          <button
            onClick={onAddPending}
            className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-teal-300 hover:text-teal-700 text-[11px] font-medium"
            title="Queue a one-off charge for this student's next billing run"
          >
            + Pending charge
          </button>
        )}
        <button
          onClick={onChange}
          className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg hover:border-teal-300 text-[11px] font-medium"
        >
          Change
        </button>
      </div>
    </div>
  );
}

/**
 * Compute the discount percentage = |discount| / (positive charges) * 100.
 * Returns null when there's no discount or no charges to discount against.
 */
function discountPercent(buckets) {
  const discount = Math.abs(buckets.DISCOUNT || 0);
  if (discount <= 0) return null;
  const charges = Object.entries(buckets)
    .filter(([code, amt]) => code !== "DISCOUNT" && amt > 0)
    .reduce((s, [, amt]) => s + amt, 0);
  if (charges <= 0) return null;
  return (discount / charges) * 100;
}

/**
 * Aggregate-breakdown card shown above the per-invoice list. Sums each fee
 * category across every outstanding invoice for the student so the cashier
 * sees "Y is for tuition, X is for transport, Z is for uniform" before they
 * start allocating payments.
 */
function OutstandingBreakdown({ invoices }) {
  const totals = invoices.reduce((acc, inv) => {
    const buckets = bucketInvoiceLines(inv.lines || []);
    for (const [k, v] of Object.entries(buckets)) acc[k] = (acc[k] || 0) + v;
    return acc;
  }, {});

  // Hide the card if the breakdown is empty (legacy invoices with no lines).
  const entries = Object.entries(totals).filter(([, v]) => v !== 0);
  if (entries.length === 0) return null;

  const pct = discountPercent(totals);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Where the balance comes from
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {entries.map(([code, amt]) => {
          const meta = BREAKDOWN_LABELS[code] || { label: code, tone: "text-gray-700" };
          const isDiscount = code === "DISCOUNT";
          return (
            <div
              key={code}
              className="bg-white border border-gray-100 rounded-lg px-2.5 py-1.5"
            >
              <p className="text-[10px] text-gray-500">
                {meta.label}
                {isDiscount && pct !== null && (
                  <span className="ml-1 text-emerald-600 font-semibold">({pct.toFixed(1)}%)</span>
                )}
              </p>
              <p className={`text-sm font-bold ${meta.tone}`}>{fmtMoney(amt)} <span className="text-[10px] font-normal text-gray-500">AFN</span></p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Bucket invoice lines by fee_item.code so the cashier sees what each chunk
// of the balance is for (Tuition / Transport / Uniform / Discount / Other).
// Multiple lines with the same code (e.g. two DISCOUNT lines) are summed.
function bucketInvoiceLines(lines = []) {
  const buckets = { TUITION: 0, TRANSPORT: 0, UNIFORM: 0, ADMISSION: 0, EXAM: 0, LATE_FEE: 0, DISCOUNT: 0, OTHER: 0 };
  for (const line of lines) {
    const code = (line.fee_item?.code || "").toUpperCase();
    if (code in buckets) buckets[code] += Number(line.amount);
    else buckets.OTHER += Number(line.amount);
  }
  return buckets;
}

const BREAKDOWN_LABELS = {
  TUITION:   { label: "Tuition",   tone: "text-gray-700" },
  TRANSPORT: { label: "Transport", tone: "text-gray-700" },
  UNIFORM:   { label: "Uniform",   tone: "text-gray-700" },
  ADMISSION: { label: "Admission", tone: "text-gray-700" },
  EXAM:      { label: "Exam",      tone: "text-gray-700" },
  LATE_FEE:  { label: "Late fee",  tone: "text-red-600" },
  DISCOUNT:  { label: "Discount",  tone: "text-emerald-600" },
  OTHER:     { label: "Other",     tone: "text-gray-700" },
};

function InvoiceCard({ invoice, allocation, setAllocation, fillFull, clear, applyDiscount, isOpen, toggle }) {
  const balance = Number(invoice.final_amount) - Number(invoice.amount_paid);
  const lines = invoice.lines || [];
  const allocNum = Number(allocation) || 0;
  const willOverpay = allocNum > balance + 0.005;
  const buckets = bucketInvoiceLines(lines);

  const statusBadge = {
    pending: { label: "Pending", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    partial: { label: "Partial", tone: "bg-blue-50 text-blue-700 border-blue-200" },
    overdue: { label: "Overdue", tone: "bg-red-50 text-red-700 border-red-200" },
  }[invoice.status] || { label: invoice.status, tone: "bg-gray-100 text-gray-600 border-gray-300" };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3 flex items-start justify-between gap-3">
        {/* Left: invoice meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="text-gray-400 hover:text-teal-700 text-xs">
              {isOpen ? "▼" : "▶"}
            </button>
            <p className="text-sm font-bold text-teal-700 truncate">{invoice.invoice_number}</p>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${statusBadge.tone}`}>
              {statusBadge.label}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 ml-5">
            {fmtMonth(invoice.invoice_month)} · Due {fmtDate(invoice.due_date)}
            {lines.length > 0 ? ` · ${lines.length} line${lines.length === 1 ? "" : "s"}` : ""}
          </p>

          {/* Breakdown chips — shows what the balance is made of */}
          {lines.length > 0 && (() => {
            const invPct = discountPercent(buckets);
            return (
              <div className="ml-5 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                {Object.entries(buckets)
                  .filter(([, amt]) => amt !== 0)
                  .map(([code, amt]) => {
                    const meta = BREAKDOWN_LABELS[code] || { label: code, tone: "text-gray-700" };
                    const isDiscount = code === "DISCOUNT";
                    return (
                      <span key={code} className="inline-flex items-baseline gap-1 text-[11px]">
                        <span className="text-gray-500">{meta.label}</span>
                        <span className={`font-semibold ${meta.tone}`}>{fmtMoney(amt)}</span>
                        {isDiscount && invPct !== null && (
                          <span className="text-[10px] text-emerald-600 font-semibold">({invPct.toFixed(1)}%)</span>
                        )}
                      </span>
                    );
                  })}
              </div>
            );
          })()}
        </div>
        {/* Middle: balance */}
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-500 uppercase">Balance</p>
          <p className="text-sm font-bold text-red-600">{fmtMoney(balance)}</p>
        </div>
        {/* Right: allocation input */}
        <div className="flex-shrink-0">
          <p className="text-[10px] text-gray-500 uppercase mb-0.5">Pay now</p>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={allocation}
              onChange={(e) => setAllocation(e.target.value)}
              step="0.01"
              min="0"
              className={`w-28 px-2 py-1 border rounded-lg text-xs text-right focus:ring-1 ${
                willOverpay ? "border-red-300 focus:ring-red-500 bg-red-50" : "border-gray-200 focus:ring-teal-500"
              }`}
            />
            <button onClick={fillFull} className="px-1.5 py-1 text-[10px] text-teal-700 hover:bg-teal-50 rounded" title="Pay full balance">
              Max
            </button>
            <button onClick={clear} className="px-1.5 py-1 text-[10px] text-gray-500 hover:bg-gray-50 rounded" title="Skip this invoice">
              Skip
            </button>
          </div>
          {willOverpay && (
            <p className="text-[10px] text-red-500 mt-0.5 text-right">Exceeds balance</p>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="px-4 pb-3 ml-5 border-l-2 border-teal-100 pl-3 bg-gray-50/50">
          {lines.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic py-2">No line items (legacy invoice)</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-gray-500">
                  <th className="text-left py-1">Item</th>
                  <th className="text-left py-1">Description</th>
                  <th className="text-right py-1">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line) => {
                  const amt = Number(line.amount);
                  return (
                    <tr key={line.id}>
                      <td className="py-1 font-medium text-gray-700">{line.fee_item?.name || line.fee_item?.code}</td>
                      <td className="py-1 text-gray-500">{line.description || "—"}</td>
                      <td className={`py-1 text-right font-medium ${amt < 0 ? "text-emerald-600" : "text-gray-700"}`}>
                        {fmtMoney(amt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200">
            <button
              onClick={applyDiscount}
              className="text-[11px] px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 border border-emerald-200"
              title="Add a DISCOUNT line and post the adjustment to the journal"
            >
              + Apply discount
            </button>
            <div className="text-[11px] text-gray-600">
              Subtotal <span className="font-bold text-gray-800">{fmtMoney(invoice.subtotal || invoice.final_amount)}</span>
              {Number(invoice.amount_paid) > 0 && (
                <> · Paid <span className="text-emerald-600 font-medium">{fmtMoney(invoice.amount_paid)}</span></>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptPanel({ receipt, onNew }) {
  const okItems = receipt.results.filter((r) => r.ok);
  const failed = receipt.results.filter((r) => !r.ok);
  const studentName = receipt.student?.full_name
    || `${receipt.student?.first_name || ""} ${receipt.student?.last_name || ""}`.trim()
    || "Student";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100">
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-semibold">Receipt</p>
          <h2 className="text-xl font-bold text-gray-900">{fmtMoney(receipt.total)} <span className="text-sm">AFN</span></h2>
          <p className="text-xs text-gray-500 mt-1">
            {studentName} · {receipt.method} · {fmtDate(receipt.paymentDate)}
            {receipt.reference ? ` · Ref ${receipt.reference}` : ""}
            {receipt.account ? ` · → ${receipt.account.account_name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-teal-300 text-xs font-medium"
          >
            🖨 Print
          </button>
          <button
            onClick={onNew}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium"
          >
            New transaction
          </button>
        </div>
      </div>

      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Settled invoices</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase text-gray-500 border-b border-gray-100">
            <th className="py-1.5">Invoice</th>
            <th className="py-1.5">Period</th>
            <th className="py-1.5 text-right">Allocated</th>
            <th className="py-1.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {okItems.map((r) => (
            <tr key={r.invoice.id}>
              <td className="py-1.5 font-medium text-teal-700">{r.invoice.invoice_number}</td>
              <td className="py-1.5 text-gray-600">{fmtMonth(r.invoice.invoice_month)}</td>
              <td className="py-1.5 text-right font-bold">{fmtMoney(r.amount)}</td>
              <td className="py-1.5"><span className="text-emerald-700 text-[10px] font-semibold">✓ Recorded</span></td>
            </tr>
          ))}
          {failed.map((r) => (
            <tr key={r.invoice.id} className="bg-red-50">
              <td className="py-1.5 font-medium text-red-700">{r.invoice.invoice_number}</td>
              <td className="py-1.5 text-gray-600">{fmtMonth(r.invoice.invoice_month)}</td>
              <td className="py-1.5 text-right">{fmtMoney(r.amount)}</td>
              <td className="py-1.5"><span className="text-red-700 text-[10px] font-semibold">✗ {r.message}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
