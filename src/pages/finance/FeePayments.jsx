import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getFeePayments } from "../../api/financial";
import { peekCache } from "../../api/axios";

import { fmtDate } from "../../utils/formErrors";
const methodLabels = {
  cash: "Cash",
  bank: "Bank",
  mobile: "Mobile",
  check: "Check",
};

export default function FeePayments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromDate = searchParams.get("from_date") || "";
  const toDate = searchParams.get("to_date") || "";

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = { per_page: 50 };
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
        const __cached = peekCache('/financial/fees/payments', params);
        if (__cached && !cancelled) {
          const craw = __cached?.data;
          const crows = craw?.data ?? craw ?? [];
          setPayments(Array.isArray(crows) ? crows : []);
          setLoading(false);
        }
        const res = await getFeePayments(params);
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
  }, [fromDate, toDate]);

  const clearDateFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("from_date");
    next.delete("to_date");
    setSearchParams(next);
  };

  const totalShown = payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0);

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
      <div className="flex items-center justify-between mb-4">
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

      {(fromDate || toDate) && (
        <div className="mb-4 flex items-center justify-between gap-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-emerald-800">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>
              Filtered:&nbsp;
              <strong>{fromDate ? fmtDate(fromDate) : "…"} → {toDate ? fmtDate(toDate) : "…"}</strong>
              {!loading && (
                <span className="ml-2 text-emerald-700">
                  · {payments.length} payment{payments.length === 1 ? "" : "s"} · {totalShown.toLocaleString()} AFN
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={clearDateFilter}
            className="text-[11px] font-semibold text-emerald-700 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

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
