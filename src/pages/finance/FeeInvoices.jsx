import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getFeeInvoices } from "../../api/financial";
import { del } from "../../api/axios";
import Swal from "sweetalert2";

/**
 * Fee Invoices list — clean, line-item-aware view.
 *
 * Generation lives on the Billing Run screen now; this page is for browsing,
 * filtering, and drilling into invoices. Per-row actions: open, see student
 * statement, delete.
 */

const STATUS = {
  pending:   { label: "Pending",   pill: "bg-amber-50 text-amber-700 ring-amber-200",        bar: "bg-amber-400" },
  partial:   { label: "Partial",   pill: "bg-blue-50 text-blue-700 ring-blue-200",           bar: "bg-blue-400"  },
  paid:      { label: "Paid",      pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",  bar: "bg-emerald-500" },
  overdue:   { label: "Overdue",   pill: "bg-red-50 text-red-700 ring-red-200",              bar: "bg-red-500" },
  waived:    { label: "Waived",    pill: "bg-purple-50 text-purple-700 ring-purple-200",     bar: "bg-purple-400" },
  cancelled: { label: "Cancelled", pill: "bg-gray-100 text-gray-500 ring-gray-300",          bar: "bg-gray-300" },
};

const fmtMoney = (n) => Number(n || 0).toLocaleString();
const fmtMonth = (d) => (d ? new Date(d).toLocaleString("default", { month: "short", year: "numeric" }) : "—");
const fmtDate  = (d) => (d ? new Date(d).toLocaleDateString("en-CA") : "—");

export default function FeeInvoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch invoices when filters change (server-side filtering)
  useEffect(() => { fetchInvoices(); }, [filterStatus, filterMonth]);

  // Sync URL ?status= with state
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus && urlStatus !== filterStatus) setFilterStatus(urlStatus);
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
      console.error("Failed to fetch fee invoices:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const r = await Swal.fire({
      title: "Delete this invoice?",
      text: "This permanently removes the invoice. Use Regenerate instead if you only need to fix amounts.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await del(`/financial/fees/invoices/${id}`);
      fetchInvoices();
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not delete.", "error");
    }
  };

  // ---- Static month list for the filter dropdown -------------------------
  const months = useMemo(() => {
    const now = new Date();
    const list = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 1; y--) {
      for (let m = (y === now.getFullYear() ? now.getMonth() : 11); m >= 0; m--) {
        list.push(`${y}-${String(m + 1).padStart(2, "0")}-01`);
      }
    }
    return list;
  }, []);

  // ---- Client-side text search (server already filtered status/month) -----
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((inv) => {
      const num = (inv.invoice_number || "").toLowerCase();
      const name = (inv.student?.full_name || "").toLowerCase();
      const sid = (inv.student?.student_id || "").toLowerCase();
      return num.includes(q) || name.includes(q) || sid.includes(q);
    });
  }, [items, search]);

  // ---- Stats --------------------------------------------------------------
  const stats = useMemo(() => {
    const total = items.reduce((s, i) => s + Number(i.final_amount || 0), 0);
    const collected = items.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
    const outstanding = items
      .filter((i) => ["pending", "partial", "overdue"].includes(i.status))
      .reduce((s, i) => s + (Number(i.final_amount || 0) - Number(i.amount_paid || 0)), 0);
    const overdueCount = items.filter((i) => i.status === "overdue").length;
    return { total, collected, outstanding, overdueCount };
  }, [items]);

  const filterTabs = [
    { key: "all",     label: "All",      count: items.length },
    { key: "pending", label: "Pending",  count: items.filter((i) => i.status === "pending").length },
    { key: "partial", label: "Partial",  count: items.filter((i) => i.status === "partial").length },
    { key: "overdue", label: "Overdue",  count: items.filter((i) => i.status === "overdue").length },
    { key: "paid",    label: "Paid",     count: items.filter((i) => i.status === "paid").length },
  ];

  const setStatus = (s) => {
    setFilterStatus(s);
    setSearchParams(s === "all" ? {} : { status: s });
  };

  // ============================================================== UI

  return (
    <div className="px-4 py-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fee Invoices</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            All student invoices · Generation happens on the{" "}
            <button onClick={() => navigate("/finance/billing-runs")} className="text-teal-700 hover:underline font-medium">
              Billing Run
            </button>{" "}
            screen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/finance/cashier")}
            className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-teal-300 hover:text-teal-700 text-xs font-medium"
          >
            Take payment
          </button>
          <button
            onClick={() => navigate("/finance/billing-runs")}
            className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Generate invoices
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Total Invoiced" value={fmtMoney(stats.total)} unit="AFN" tone="text-gray-800" />
        <Stat label="Collected"      value={fmtMoney(stats.collected)} unit="AFN" tone="text-emerald-700" subtle="bg-emerald-50/60 ring-emerald-100" />
        <Stat label="Outstanding"    value={fmtMoney(stats.outstanding)} unit="AFN" tone="text-amber-700" subtle="bg-amber-50/60 ring-amber-100" />
        <Stat label="Overdue"        value={String(stats.overdueCount)} unit={stats.overdueCount === 1 ? "invoice" : "invoices"} tone="text-red-700" subtle="bg-red-50/60 ring-red-100" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-3 py-2 border-b border-gray-100 flex flex-wrap items-center gap-2">
          {/* Status segmented */}
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
            {filterTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  filterStatus === t.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
                <span className={`ml-1 text-[10px] ${filterStatus === t.key ? "text-gray-400" : "text-gray-400"}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice or student…"
              className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Month */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="ml-auto px-2.5 py-1.5 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {new Date(m).toLocaleString("default", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/60">
                <th className="w-1 px-0"></th>
                <th className="px-3 py-2.5">Invoice</th>
                <th className="px-3 py-2.5">Student</th>
                <th className="px-3 py-2.5">Parent</th>
                <th className="px-3 py-2.5">Due</th>
                <th className="px-3 py-2.5 text-right">Total / Paid</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-10">
                    <div className="inline-flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-3 h-3 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                      Loading invoices…
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <p className="text-sm text-gray-700 font-medium">No invoices match.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try a different filter, or run a Billing Run for the period you need.
                    </p>
                    <button
                      onClick={() => navigate("/finance/billing-runs")}
                      className="mt-3 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold"
                    >
                      Open Billing Run
                    </button>
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((inv) => {
                  const sc = STATUS[inv.status] || STATUS.pending;
                  const balance = Number(inv.final_amount || 0) - Number(inv.amount_paid || 0);
                  const paidPct = Number(inv.final_amount) > 0
                    ? Math.min(100, Math.round((Number(inv.amount_paid || 0) / Number(inv.final_amount)) * 100))
                    : 0;
                  const family = inv.student?.family || {};
                  return (
                    <tr
                      key={inv.id}
                      className={`group hover:bg-teal-50/30 cursor-pointer ${inv.voided_at ? "opacity-50" : ""}`}
                      onClick={() => navigate(`/finance/fee-invoices/show/${inv.id}`)}
                    >
                      <td className="w-1 p-0"><div className={`w-1 h-12 ${sc.bar}`} /></td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-bold text-teal-700">{inv.invoice_number}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{fmtMonth(inv.invoice_month)}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-medium text-gray-800">
                          {inv.student?.full_name || `Student #${inv.student_id}`}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {inv.student?.student_id || ""}
                          {inv.student?.school_class?.name ? ` · ${inv.student.school_class.name}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-[11px] text-gray-700">{family.father_name || "—"}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{family.father_phone || family.mother_phone || ""}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-600">{fmtDate(inv.due_date)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <p className="text-xs font-bold text-gray-800">{fmtMoney(inv.final_amount)} <span className="text-[10px] font-normal text-gray-500">AFN</span></p>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${paidPct >= 100 ? "bg-emerald-500" : paidPct > 0 ? "bg-blue-400" : "bg-gray-300"}`}
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500">{paidPct}%</span>
                        </div>
                        {balance > 0 && !inv.voided_at && (
                          <p className="text-[10px] text-red-500 mt-0.5">Balance {fmtMoney(balance)}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${sc.pill}`}>
                          {inv.voided_at ? "Voided" : sc.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <IconBtn
                            onClick={() => navigate(`/finance/fee-invoices/show/${inv.id}`)}
                            title="Open invoice"
                            iconPath="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                          <IconBtn
                            onClick={() => handleDelete(inv.id)}
                            title="Delete"
                            tone="danger"
                            iconPath="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </div>
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

// =================================================================== Subcomponents

function Stat({ label, value, unit, tone, subtle }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-3.5 ring-1 ring-gray-100 ${subtle || ""}`}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${tone}`}>
        {value}
        {unit && <span className="text-[10px] font-normal text-gray-500 ml-1.5">{unit}</span>}
      </p>
    </div>
  );
}

function IconBtn({ onClick, title, iconPath, tone = "default" }) {
  const cls =
    tone === "danger"
      ? "text-red-500 hover:bg-red-50"
      : "text-gray-500 hover:text-teal-700 hover:bg-teal-50";
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded ${cls}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
      </svg>
    </button>
  );
}
