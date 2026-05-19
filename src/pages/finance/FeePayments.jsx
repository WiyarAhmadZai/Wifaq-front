import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFeePayments } from "../../api/financial";

import { fmtDate } from "../../utils/formErrors";
const methodLabels = {
  cash: "Cash",
  bank: "Bank",
  mobile: "Mobile",
  check: "Check",
};

export default function FeePayments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getFeePayments({ per_page: 50 });
        const raw = res.data?.data;
        const rows = raw?.data ?? raw ?? [];
        if (!cancelled) {
          setPayments(Array.isArray(rows) ? rows : []);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setPayments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const badge = (method) => {
    const label = methodLabels[method] || method;
    const cls =
      method === "cash"
        ? "bg-emerald-100 text-emerald-800"
        : method === "bank"
          ? "bg-blue-100 text-blue-800"
          : method === "mobile"
            ? "bg-purple-100 text-purple-800"
            : "bg-gray-100 text-gray-800";
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls}`}>{label}</span>;
  };

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Fee payments</h2>
          <p className="text-xs text-gray-500 mt-0.5">Receipts applied to student fee invoices</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/finance/cashier")}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700"
        >
          Take payment
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Receipt</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-gray-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && payments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-gray-400">
                    No fee payments yet.
                  </td>
                </tr>
              )}
              {!loading &&
                payments.map((payment) => {
                  const st = payment.fee_invoice?.student;
                  const name = st?.full_name || "—";
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-800">{payment.receipt_number}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">{name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                        {payment.fee_invoice?.invoice_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{fmtDate(payment.payment_date)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900">
                        {Number(payment.amount_paid).toLocaleString()} AFN
                      </td>
                      <td className="px-4 py-3 text-xs">{badge(payment.payment_method)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{payment.account?.account_name || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        <button
                          type="button"
                          onClick={() => navigate(`/finance/fee-payments/show/${payment.id}`)}
                          className="text-teal-600 hover:text-teal-800 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
