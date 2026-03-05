import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function FeePaymentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    student_enrollment_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    amount_paid: "",
    month_covered: "",
    payment_method: "cash",
    notes: "",
  });

  const [enrollments, setEnrollments] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const paymentMethodOptions = [
    { value: "cash", label: "Cash" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "check", label: "Check" },
    { value: "credit_card", label: "Credit Card" },
    { value: "debit_card", label: "Debit Card" },
    { value: "mobile_payment", label: "Mobile Payment" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    fetchEnrollments();
    if (isEdit) {
      fetchPayment();
    }
  }, [id]);

  const fetchEnrollments = async () => {
    try {
      const response = await get("/student-management/student-enrollments?per_page=1000");
      const data = response.data?.data || response.data || [];
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch enrollments", error);
    }
  };

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const response = await get(`/finance/fee-payments/show/${id}`);
      const data = response.data;
      setFormData({
        student_enrollment_id: data.student_enrollment_id || "",
        payment_date: data.payment_date || new Date().toISOString().split("T")[0],
        amount_paid: data.amount_paid || "",
        month_covered: data.month_covered || "",
        payment_method: data.payment_method || "cash",
        notes: data.notes || "",
      });
    } catch (error) {
      Swal.fire("Error", "Failed to load payment data", "error");
      navigate("/finance/fee-payments");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      if (isEdit) {
        await put(`/finance/fee-payments/update/${id}`, formData);
        Swal.fire("Success", "Payment updated successfully", "success");
      } else {
        await post("/finance/fee-payments/store", formData);
        Swal.fire("Success", "Payment recorded successfully", "success");
      }
      navigate("/finance/fee-payments");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire(
          "Error",
          error.response?.data?.message || "Failed to save payment",
          "error"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (fieldName) => errors[fieldName]?.[0];

  const getFieldClass = (fieldName) => {
    const baseClass =
      "w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs";
    return `${baseClass} ${
      getFieldError(fieldName)
        ? "border-red-500 focus:ring-red-500"
        : "border-gray-300 focus:ring-teal-500"
    }`;
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/finance/fee-payments")}
          className="p-2 text-gray-500 hover:text-teal-600"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {isEdit ? "Edit Fee Payment" : "Record Fee Payment"}
        </h2>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Student Enrollment *
          </label>
          <select
            name="student_enrollment_id"
            value={formData.student_enrollment_id}
            onChange={handleChange}
            required
            className={getFieldClass("student_enrollment_id")}
          >
            <option value="">Select Enrollment</option>
            {enrollments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.student_name} - {e.class_name} ({e.academic_term_name})
              </option>
            ))}
          </select>
          {getFieldError("student_enrollment_id") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("student_enrollment_id")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Payment Date *
          </label>
          <input
            type="date"
            name="payment_date"
            value={formData.payment_date}
            onChange={handleChange}
            required
            className={getFieldClass("payment_date")}
          />
          {getFieldError("payment_date") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("payment_date")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Amount Paid *
          </label>
          <input
            type="number"
            name="amount_paid"
            value={formData.amount_paid}
            onChange={handleChange}
            required
            step="0.01"
            min="0"
            placeholder="0.00"
            className={getFieldClass("amount_paid")}
          />
          {getFieldError("amount_paid") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("amount_paid")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Month Covered *
          </label>
          <input
            type="date"
            name="month_covered"
            value={formData.month_covered}
            onChange={handleChange}
            required
            className={getFieldClass("month_covered")}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            e.g., 2024-09-01 represents September 2024
          </p>
          {getFieldError("month_covered") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("month_covered")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            className={getFieldClass("payment_method")}
          >
            {paymentMethodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            className={getFieldClass("notes")}
            placeholder="Additional notes about this payment..."
          />
        </div>
        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => navigate("/finance/fee-payments")}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Record Payment"}
          </button>
        </div>
      </form>
    </div>
  );
}
