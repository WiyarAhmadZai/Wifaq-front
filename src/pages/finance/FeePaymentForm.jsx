import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { getFeeInvoices, getAccounts, getFeePayment, createFeePayment, getFeePayments } from "../../api/financial";
import { get } from "../../api/axios";
import { handleValidationErrors } from "../../utils/formErrors";

function unwrapList(res) {
  const d = res?.data?.data;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.data)) return d.data;
  return [];
}

export default function FeePaymentForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isView = location.pathname.includes("/show/");

  const [formData, setFormData] = useState({
    fee_invoice_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    amount_paid: "",
    payment_method: "cash",
    account_id: "",
    reference_number: "",
    description: "",
  });

  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentPayments, setStudentPayments] = useState([]);
  const [prevPaymentsLoading, setPrevPaymentsLoading] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const paymentMethodOptions = [
    { value: "cash", label: "Cash" },
    { value: "bank", label: "Bank" },
    { value: "mobile", label: "Mobile" },
    { value: "check", label: "Check" },
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [accRes, stuRes] = await Promise.all([
          getAccounts({ per_page: 100 }),
          get("/student-management/students/list", { params: { registration_status: "phase_2", per_page: 1000 } }),
        ]);

        setAccounts(unwrapList(accRes));
        const stuList = stuRes.data?.data || [];
        setStudents(Array.isArray(stuList) ? stuList : []);

        if (id) {
          const payRes = await getFeePayment(id);
          const p = payRes.data?.data;
          if (p) {
            const studentId = p.fee_invoice?.student?.id || p.fee_invoice?.student_id;
            if (studentId) setSelectedStudentId(String(studentId));
            setFormData({
              fee_invoice_id: String(p.fee_invoice_id || ""),
              payment_date: p.payment_date?.split("T")?.[0] || formData.payment_date,
              amount_paid: p.amount_paid,
              payment_method: p.payment_method,
              account_id: String(p.account_id || ""),
              reference_number: p.reference_number || "",
              description: p.description || "",
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!selectedStudentId) {
        setInvoices([]);
        setFormData((p) => ({ ...p, fee_invoice_id: "" }));
        setSelectedInvoiceId("");
        setShowPaymentForm(false);
        return;
      }
      try {
        const invRes = await getFeeInvoices({
          student_id: selectedStudentId,
          per_page: 200,
          statuses: "pending,partial,overdue",
        });
        setInvoices(unwrapList(invRes));
        setSelectedInvoiceId("");
        setShowPaymentForm(false);
      } catch {
        setInvoices([]);
      }
    };
    fetchInvoices();
  }, [selectedStudentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleStudentChange = (e) => {
    const val = e.target.value;
    setSelectedStudentId(val);
    if (errors.fee_invoice_id) {
      setErrors((prev) => ({ ...prev, fee_invoice_id: null }));
    }
  };

  const handlePayInvoice = (invoiceId) => {
    setSelectedInvoiceId(String(invoiceId));
    setFormData((p) => ({ ...p, fee_invoice_id: String(invoiceId), amount_paid: "" }));
    setShowPaymentForm(true);
  };

  const handleClosePaymentForm = () => {
    setShowPaymentForm(false);
    setSelectedInvoiceId("");
    setFormData((p) => ({ ...p, fee_invoice_id: "", amount_paid: "" }));
  };

  const selectedInvoice = invoices.find((i) => String(i.id) === String(formData.fee_invoice_id));
  const balanceDue = selectedInvoice
    ? Math.max(0, parseFloat(selectedInvoice.final_amount) - parseFloat(selectedInvoice.amount_paid || 0))
    : null;

  // Fetch previous payments for the selected student whenever invoice changes
  useEffect(() => {
    const studentId = selectedInvoice?.student?.id ?? selectedInvoice?.student_id;
    if (!studentId) {
      setStudentPayments([]);
      return;
    }
    setPrevPaymentsLoading(true);
    getFeePayments({ student_id: studentId, per_page: 50 })
      .then((r) => {
        const list = unwrapList(r);
        setStudentPayments(Array.isArray(list) ? list : []);
      })
      .catch(() => setStudentPayments([]))
      .finally(() => setPrevPaymentsLoading(false));
  }, [formData.fee_invoice_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;
    setSaving(true);
    setErrors({});
    try {
      await createFeePayment({
        fee_invoice_id: Number(formData.fee_invoice_id),
        payment_date: formData.payment_date,
        amount_paid: Number(formData.amount_paid),
        payment_method: formData.payment_method,
        account_id: Number(formData.account_id),
        reference_number: formData.reference_number || null,
        description: formData.description || null,
      });
      Swal.fire("Success", "Fee payment recorded.", "success");
      navigate("/finance/fee-payments");
    } catch (error) {
      if (!handleValidationErrors(error.response, setErrors)) {
        Swal.fire("Error", error.response?.data?.message || "Failed to save payment", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (fieldName) => errors[fieldName]?.[0];
  const getFieldClass = (fieldName) => {
    const baseClass = "w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs";
    return `${baseClass} ${
      getFieldError(fieldName) ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-teal-500"
    }`;
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-gray-500">Loading...</div>;
  }

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate("/finance/fee-payments")} className="p-2 text-gray-500 hover:text-teal-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-800">{isView ? "Fee payment" : "Record fee payment"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Student *</label>
          <select
            value={selectedStudentId}
            onChange={handleStudentChange}
            disabled={isView}
            className={getFieldClass("fee_invoice_id")}
          >
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.student_id || s.id} — {`${s.first_name || ""} ${s.last_name || ""}`.trim()}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <h3 className="text-xs font-semibold text-teal-800 uppercase tracking-wider mb-3">Unpaid Invoices</h3>
          {invoices.length === 0 ? (
            <p className="text-xs text-teal-400 italic">No unpaid invoices for this student</p>
          ) : (
            <div className="overflow-x-auto border border-teal-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-teal-50">
                  <tr className="text-left text-[10px] text-teal-600 uppercase border-b border-teal-200">
                    <th className="px-3 py-2">Invoice #</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Month</th>
                    <th className="px-3 py-2">Due Date</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                    <th className="px-3 py-2 text-right">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  {invoices.map((inv) => {
                    const due = Math.max(0, parseFloat(inv.final_amount) - parseFloat(inv.amount_paid || 0));
                    const statusConfig = {
                      pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-300" },
                      partial: { label: "Partial", color: "bg-blue-100 text-blue-700 border-blue-300" },
                      overdue: { label: "Overdue", color: "bg-red-100 text-red-700 border-red-300" },
                    };
                    const sc = statusConfig[inv.status] || { label: inv.status, color: "bg-gray-100 text-gray-600 border-gray-300" };
                    const isSelected = String(inv.id) === selectedInvoiceId;
                    const feeType = inv.fee_type || "tuition";
                    const isUniform = feeType === "uniform";
                    const isTransport = feeType === "transport";
                    const isAdmission = feeType === "admission";
                    return (
                      <tr key={inv.id} className={`${isSelected ? "bg-teal-50" : "hover:bg-teal-50/50"}`}>
                        <td className="px-3 py-2 font-medium text-teal-700">{inv.invoice_number}</td>
                        <td className="px-3 py-2">
                          {isUniform ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 border border-indigo-300">
                              Uniform
                            </span>
                          ) : isTransport ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-300">
                              Transport
                            </span>
                          ) : isAdmission ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                              Admission
                            </span>
                          ) : (
                            <span className="text-gray-600 capitalize">Tuition</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{inv.invoice_month ? new Date(inv.invoice_month).toLocaleDateString("en-CA", { year: "numeric", month: "short" }) : "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-700">{Number(inv.final_amount).toLocaleString()} AFN</td>
                        <td className="px-3 py-2 text-right text-emerald-600">{Number(inv.amount_paid || 0).toLocaleString()} AFN</td>
                        <td className="px-3 py-2 text-right font-bold text-red-600">{due.toLocaleString()} AFN</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.color}`}>{sc.label}</span></td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handlePayInvoice(inv.id)}
                            disabled={isView}
                            className="px-3 py-1 bg-teal-600 text-white rounded-lg text-[10px] font-medium hover:bg-teal-700 disabled:opacity-50"
                          >
                            Pay
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Inline Payment Form when invoice selected */}
        {showPaymentForm && selectedInvoice && (
          <div className="md:col-span-2 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
                Payment for {selectedInvoice.invoice_number} — {(selectedInvoice.fee_type || "tuition").replace(/_/g, " ")}
              </h3>
              <button type="button" onClick={handleClosePaymentForm} className="text-teal-600 hover:text-teal-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-teal-700 mb-0.5">Payment date *</label>
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  required={!isView}
                  disabled={isView}
                  className="w-full px-2 py-1.5 border border-teal-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-teal-700 mb-0.5">Amount (AFN) *</label>
                <input
                  type="number"
                  name="amount_paid"
                  value={formData.amount_paid}
                  onChange={handleChange}
                  required={!isView}
                  disabled={isView}
                  step="0.01"
                  min="0"
                  placeholder={balanceDue ? balanceDue.toLocaleString() : "0"}
                  className="w-full px-2 py-1.5 border border-teal-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                {balanceDue != null && (
                  <p className="text-[9px] text-teal-600 mt-0.5 font-medium">Balance due: {balanceDue.toLocaleString()} AFN</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-teal-700 mb-0.5">Deposit account *</label>
                <select
                  name="account_id"
                  value={formData.account_id}
                  onChange={handleChange}
                  required={!isView}
                  disabled={isView}
                  className="w-full px-2 py-1.5 border border-teal-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} ({a.account_type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-teal-700 mb-0.5">Method *</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  disabled={isView}
                  className="w-full px-2 py-1.5 border border-teal-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  {paymentMethodOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold text-teal-700 mb-0.5">Reference #</label>
                <input
                  type="text"
                  name="reference_number"
                  value={formData.reference_number}
                  onChange={handleChange}
                  disabled={isView}
                  className="w-full px-2 py-1.5 border border-teal-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold text-teal-700 mb-0.5">Notes</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isView}
                  rows={2}
                  className="w-full px-2 py-1.5 border border-teal-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleClosePaymentForm}
                  className="px-3 py-1.5 bg-white text-teal-700 border border-teal-300 rounded-lg text-xs font-medium hover:bg-teal-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Record payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Previous Payments for this Student */}
        {selectedStudentId && (
          <div className="md:col-span-2">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-teal-800 uppercase tracking-wider mb-3">
                Previous Payments — {students.find((s) => String(s.id) === selectedStudentId)?.full_name || `Student #${selectedStudentId}`}
              </h3>
              {prevPaymentsLoading ? (
                <p className="text-xs text-teal-400">Loading previous payments...</p>
              ) : studentPayments.length === 0 ? (
                <p className="text-xs text-teal-400 italic">No previous payments recorded for this student</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] text-teal-600 uppercase border-b border-teal-200">
                        <th className="pb-2 pr-3">Date</th>
                        <th className="pb-2 pr-3">Receipt #</th>
                        <th className="pb-2 pr-3">Invoice</th>
                        <th className="pb-2 pr-3 text-right">Amount</th>
                        <th className="pb-2">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100">
                      {studentPayments.map((pay) => (
                        <tr key={pay.id} className="text-gray-700 hover:bg-teal-50/30">
                          <td className="py-2 pr-3">{pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : "—"}</td>
                          <td className="py-2 pr-3 font-medium text-teal-700">{pay.receipt_number || "—"}</td>
                          <td className="py-2 pr-3 text-gray-500">{pay.fee_invoice?.invoice_number || pay.fee_invoice_id}</td>
                          <td className="py-2 pr-3 text-right font-medium">{Number(pay.amount_paid || 0).toLocaleString()} AFN</td>
                          <td className="py-2 capitalize">{pay.payment_method || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
