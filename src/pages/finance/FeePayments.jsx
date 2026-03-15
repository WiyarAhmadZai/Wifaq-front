import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function FeePayments() {
  const navigate = useNavigate();

  // Dummy data for fee payments
  const [payments] = useState([
    {
      id: 1,
      student_name: "Ahmad Mohammad",
      payment_date: "2024-09-01",
      amount_paid: 1500.0,
      month_covered: "September 2024",
      payment_method: "Cash",
    },
    {
      id: 2,
      student_name: "Fatima Ali",
      payment_date: "2024-09-02",
      amount_paid: 1200.0,
      month_covered: "September 2024",
      payment_method: "Bank Transfer",
    },
    {
      id: 3,
      student_name: "Mohammad Rahman",
      payment_date: "2024-09-03",
      amount_paid: 1500.0,
      month_covered: "September 2024",
      payment_method: "Cash",
    },
    {
      id: 4,
      student_name: "Aisha Omar",
      payment_date: "2024-09-04",
      amount_paid: 0.0,
      month_covered: "September 2024",
      payment_method: "Scholarship",
    },
    {
      id: 5,
      student_name: "Karim Hassan",
      payment_date: "2024-09-05",
      amount_paid: 1350.0,
      month_covered: "September 2024",
      payment_method: "Mobile Payment",
    },
    {
      id: 6,
      student_name: "Zahra Mahmoud",
      payment_date: "2024-09-06",
      amount_paid: 1500.0,
      month_covered: "September 2024",
      payment_method: "Cash",
    },
    {
      id: 7,
      student_name: "Yusuf Khalid",
      payment_date: "2024-09-07",
      amount_paid: 1050.0,
      month_covered: "September 2024",
      payment_method: "Bank Transfer",
    },
    {
      id: 8,
      student_name: "Mariam Farooq",
      payment_date: "2024-09-08",
      amount_paid: 1400.0,
      month_covered: "September 2024",
      payment_method: "Cash",
    },
    {
      id: 9,
      student_name: "Ibrahim Said",
      payment_date: "2024-09-09",
      amount_paid: 900.0,
      month_covered: "September 2024",
      payment_method: "Mobile Payment",
    },
    {
      id: 10,
      student_name: "Layla Abdul",
      payment_date: "2024-09-10",
      amount_paid: 1500.0,
      month_covered: "September 2024",
      payment_method: "Cash",
    },
    {
      id: 11,
      student_name: "Omar Ibrahim",
      payment_date: "2024-09-11",
      amount_paid: 1125.0,
      month_covered: "September 2024",
      payment_method: "Bank Transfer",
    },
    {
      id: 12,
      student_name: "Amina Yusuf",
      payment_date: "2024-09-12",
      amount_paid: 750.0,
      month_covered: "September 2024",
      payment_method: "Mobile Payment",
    },
    {
      id: 13,
      student_name: "Ahmad Mohammad",
      payment_date: "2024-10-01",
      amount_paid: 1500.0,
      month_covered: "October 2024",
      payment_method: "Cash",
    },
    {
      id: 14,
      student_name: "Fatima Ali",
      payment_date: "2024-10-02",
      amount_paid: 1200.0,
      month_covered: "October 2024",
      payment_method: "Bank Transfer",
    },
    {
      id: 15,
      student_name: "Mohammad Rahman",
      payment_date: "2024-10-03",
      amount_paid: 1500.0,
      month_covered: "October 2024",
      payment_method: "Cash",
    },
  ]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      // In a real app, this would call the API
      Swal.fire("Deleted!", "Payment has been deleted.", "success");
    }
  };

  const getPaymentMethodBadge = (method) => {
    const methodConfig = {
      Cash: { bg: "bg-green-100", text: "text-green-800" },
      "Bank Transfer": { bg: "bg-blue-100", text: "text-blue-800" },
      "Mobile Payment": { bg: "bg-purple-100", text: "text-purple-800" },
      Scholarship: { bg: "bg-orange-100", text: "text-orange-800" },
    };

    const config = methodConfig[method] || methodConfig["Cash"];
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}
      >
        {method}
      </span>
    );
  };

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-800">Fee Payments</h2>
        <button
          onClick={() => navigate("/finance/fee-payments/create")}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700"
        >
          Add Payment
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Amount Paid
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Month Covered
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">
                    {payment.student_name}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {payment.payment_date}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-900">
                    ${payment.amount_paid.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {payment.month_covered}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {getPaymentMethodBadge(payment.payment_method)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          navigate(`/finance/fee-payments/show/${payment.id}`)
                        }
                        className="text-teal-600 hover:text-teal-800"
                        title="View"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/finance/fee-payments/edit/${payment.id}`)
                        }
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
