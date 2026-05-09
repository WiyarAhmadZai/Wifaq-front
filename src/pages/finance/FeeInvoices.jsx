import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getFeeInvoices, generateMonthlyFees, applyFeeDiscount } from "../../api/financial";
import Swal from "sweetalert2";

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
  partial: { label: "Partial", color: "bg-blue-50 text-blue-700 border-blue-200" },
  paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue: { label: "Overdue", color: "bg-red-50 text-red-700 border-red-200" },
  waived: { label: "Waived", color: "bg-purple-50 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500 border-gray-300" },
};

function fmtMoney(n) { return Number(n || 0).toLocaleString(); }

export default function FeeInvoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [loading, setLoading] = useState(false);

  // Fetch invoices when filters change (server-side filtering)
  useEffect(() => {
    fetchInvoices();
  }, [filterStatus, filterMonth]);

  // Sync URL query param with filterStatus state
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus && urlStatus !== filterStatus) {
      setFilterStatus(urlStatus);
    }
  }, [searchParams]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterMonth !== "all") params.month = filterMonth;
      const response = await getFeeInvoices(params);
      setItems(response.data?.data?.data || response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch fee invoices:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMonthly = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const inputOptions = {};
    for (let m = 1; m <= 12; m += 1) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      const label = new Date(year, m - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
      inputOptions[key] = label;
    }

    const { value: month } = await Swal.fire({
      title: "Generate Monthly Invoices",
      input: "select",
      inputOptions,
      inputPlaceholder: "Select month",
      showCancelButton: true,
    });

    if (month) {
      const [year, monthNum] = month.split("-");
      try {
        setLoading(true);
        const response = await generateMonthlyFees({ year: parseInt(year), month: parseInt(monthNum) });
        const counts = response.data?.meta?.counts;
        const message = response.data?.message || "Invoices created successfully";
        if (counts && counts.eligible_to_generate === 0) {
          Swal.fire(
            "No invoices generated",
            `${message}\n\nDiagnostics:\n` +
            `- Active Phase-2 students: ${counts.active_phase2_students_in_scope}\n` +
            `- Already have invoice: ${counts.already_have_invoice_for_month}\n` +
            `- Eligible to generate: ${counts.eligible_to_generate}`,
            "warning"
          );
        } else {
          Swal.fire("Generated!", message, "success");
        }
        await fetchInvoices();
      } catch (error) {
        Swal.fire("Error", error.response?.data?.message || "Failed to generate", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApplyDiscount = async (id) => {
    const { value: formValues } = await Swal.fire({
      title: "Apply Discount",
      html:
        '<input id="swal-amount" class="swal2-input" placeholder="Discount Amount">' +
        '<input id="swal-reason" class="swal2-input" placeholder="Reason">',
      focusConfirm: false,
      preConfirm: () => {
        return {
          discount_amount: document.getElementById("swal-amount").value,
          discount_reason: document.getElementById("swal-reason").value,
        };
      },
      showCancelButton: true,
    });

    if (formValues) {
      try {
        await applyFeeDiscount(id, formValues);
        await fetchInvoices();
        Swal.fire("Applied!", "Discount applied successfully", "success");
      } catch (error) {
        Swal.fire("Error", error.response?.data?.message || "Failed to apply discount", "error");
      }
    }
  };

  // Build a static list of months for the filter dropdown so it never empties after filtering
  const months = (() => {
    const now = new Date();
    const list = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 1; y--) {
      for (let m = (y === now.getFullYear() ? now.getMonth() : 11); m >= 0; m--) {
        list.push(`${y}-${String(m + 1).padStart(2, "0")}-01`);
      }
    }
    return list;
  })();

  // Server-side filtering: items already filtered by API
  const filtered = items;

  const stats = {
    total: items.reduce((s, i) => s + Number(i.final_amount), 0),
    collected: items.reduce((s, i) => s + Number(i.amount_paid), 0),
    pending: items.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + (Number(i.final_amount) - Number(i.amount_paid)), 0),
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Fee Invoices</h2>
          <p className="text-xs text-gray-500">Monthly student fee invoices and collection tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/finance/billing-runs")}
            className="px-3 py-1.5 bg-white border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Billing Run
          </button>
          <button onClick={handleGenerateMonthly}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-500 rounded-lg hover:border-gray-300 text-xs font-medium flex items-center gap-1.5"
            title="Legacy: generates one tuition invoice per student. Prefer Billing Run.">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
            </svg>
            Generate Monthly (legacy)
          </button>
          <button onClick={() => navigate("/finance/fee-invoices/create")}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Total Invoiced</p>
          <p className="text-sm font-bold text-teal-700">{stats.total.toLocaleString()} AFN</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Collected</p>
          <p className="text-sm font-bold text-emerald-700">{stats.collected.toLocaleString()} AFN</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Pending</p>
          <p className="text-sm font-bold text-amber-700">{stats.pending.toLocaleString()} AFN</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1">
          {["all", "pending", "partial", "paid", "overdue"].map((s) => (
            <button key={s} onClick={() => {
                setFilterStatus(s);
                // Update URL to reflect filter (optional UX)
                if (s === "all") {
                  setSearchParams({});
                } else {
                  setSearchParams({ status: s });
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-colors ${filterStatus === s ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
            className="px-2.5 py-1 border border-gray-200 rounded-lg text-[10px] text-gray-700 focus:ring-1 focus:ring-teal-500">
            <option value="all">All months</option>
            {months.map((m) => <option key={m} value={m}>{new Date(m).toLocaleString("default", { month: "long", year: "numeric" })}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-teal-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Invoice #</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Student ID</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Student</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Parent</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Parent Number</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Month</th>
                {/* <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Base</th> */}
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Disc.</th>
                {/* <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Late Fee</th> */}
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Final</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Paid</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((inv) => {
                const sc = statusConfig[inv.status] || statusConfig.pending;
                const balance = Number(inv.final_amount) - Number(inv.amount_paid);
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/finance/fee-invoices/show/${inv.id}`)}>
                    <td className="px-4 py-2.5 text-xs font-medium text-teal-700">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 text-[10px] font-semibold text-gray-700 capitalize">{(inv.fee_type || "tuition").replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{inv.student?.student_id || inv.student_id}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{inv.student?.full_name || `Student #${inv.student_id}`}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{inv.student?.family?.father_name || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{inv.student?.family?.father_phone || inv.student?.family?.mother_phone || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{inv.invoice_month ? new Date(inv.invoice_month).toLocaleString("default", { month: "short", year: "numeric" }) : "—"}</td>
                    {/* <td className="px-4 py-2.5 text-xs text-gray-600 text-right">{fmtMoney(inv.base_amount)}</td> */}
                    <td className="px-4 py-2.5 text-xs text-emerald-600 text-right">{Number(inv.discount_amount) > 0 ? `-${fmtMoney(inv.discount_amount)}` : "-"}</td>
                    {/* <td className="px-4 py-2.5 text-xs text-red-600 text-right">{Number(inv.late_fee) > 0 ? `+${fmtMoney(inv.late_fee)}` : "-"}</td> */}
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-800 text-right">{fmtMoney(inv.final_amount)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-teal-700 text-right">{fmtMoney(inv.amount_paid)}</td>
                    <td className="px-4 py-2.5">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.color}`}>{sc.label}</span>
                        {balance > 0 && <p className="text-[9px] text-red-500 mt-0.5">Balance: {balance.toLocaleString()}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/finance/students/${inv.student_id}/statement`)}
                          className="p-1 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded"
                          title="Open student statement"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>
                        </button>
                        <button onClick={() => navigate(`/finance/fee-invoices/show/${inv.id}`)} className="p-1 text-teal-600 hover:bg-teal-50 rounded" title="Open invoice">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-xs text-gray-400">No fee invoices found</div>}
        </div>
      </div>
    </div>
  );
}
