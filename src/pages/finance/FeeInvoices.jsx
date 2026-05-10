import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getFeeInvoices, getFeeInvoiceMonths } from "../../api/financial";
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

// Default WhatsApp template — kept short per user preference (student name + invoice #).
// Tokens get substituted per recipient: {{student}}, {{invoice}}, {{period}}, {{amount}}, {{balance}}, {{due_date}}.
const DEFAULT_WHATSAPP_TEMPLATE =
  "Dear parent, invoice {{invoice}} has been issued for {{student}}. Thank you.";

const WHATSAPP_TOKENS = [
  { key: "{{student}}",  label: "Student name" },
  { key: "{{invoice}}",  label: "Invoice #" },
  { key: "{{period}}",   label: "Period (May 2026)" },
  { key: "{{amount}}",   label: "Total amount" },
  { key: "{{balance}}",  label: "Balance due" },
  { key: "{{due_date}}", label: "Due date" },
];

// Strip everything but digits from a phone number so it works in wa.me URLs.
const sanitizePhone = (p) => String(p || "").replace(/[^\d]/g, "");

// Pull the best phone for a recipient — father's first, mother's as fallback.
const pickPhone = (invoice) => {
  const fam = invoice.student?.family || {};
  return fam.father_phone || fam.mother_phone || "";
};

const fillTemplate = (template, invoice) => {
  const balance = Number(invoice.final_amount || 0) - Number(invoice.amount_paid || 0);
  const map = {
    "{{student}}":  invoice.student?.full_name || `Student #${invoice.student_id}`,
    "{{invoice}}":  invoice.invoice_number || "",
    "{{period}}":   fmtMonth(invoice.invoice_month),
    "{{amount}}":   `${fmtMoney(invoice.final_amount)} AFN`,
    "{{balance}}":  `${fmtMoney(balance)} AFN`,
    "{{due_date}}": fmtDate(invoice.due_date),
  };
  return Object.entries(map).reduce(
    (msg, [tok, val]) => msg.split(tok).join(val),
    template
  );
};

export default function FeeInvoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // WhatsApp messaging — selection + modal state
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [waModalInvoices, setWaModalInvoices] = useState(null); // null = closed; array = open

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

  // ---- Real month list — only periods that actually have invoices --------
  // Comes from a dedicated backend endpoint (FeeInvoiceController::months)
  // so the filter never offers a month with zero results.
  const [months, setMonths] = useState([]);
  useEffect(() => {
    getFeeInvoiceMonths()
      .then((res) => setMonths(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setMonths([]));
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
        {selectedIds.size > 0 && (
          <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
            <p className="text-xs text-emerald-800">
              <strong>{selectedIds.size}</strong> invoice{selectedIds.size === 1 ? "" : "s"} selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[11px] text-emerald-700 hover:underline"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  const picked = items.filter((i) => selectedIds.has(i.id));
                  if (picked.length > 0) setWaModalInvoices(picked);
                }}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2z" />
                </svg>
                Send WhatsApp ({selectedIds.size})
              </button>
            </div>
          </div>
        )}
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
                <th className="w-8 px-2 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id))}
                    onChange={(e) => {
                      const next = new Set(selectedIds);
                      if (e.target.checked) filtered.forEach((i) => next.add(i.id));
                      else filtered.forEach((i) => next.delete(i.id));
                      setSelectedIds(next);
                    }}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    title="Select all on this page"
                  />
                </th>
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
                  <td colSpan={9} className="text-center py-10">
                    <div className="inline-flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-3 h-3 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                      Loading invoices…
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12">
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
                      <td className="w-8 px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inv.id)}
                          onChange={() => {
                            const next = new Set(selectedIds);
                            if (next.has(inv.id)) next.delete(inv.id);
                            else next.add(inv.id);
                            setSelectedIds(next);
                          }}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
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
                            onClick={() => setWaModalInvoices([inv])}
                            title="Send WhatsApp message to parent"
                            tone="success"
                            iconPath="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2zM8.53 7.33c.16 0 .33 0 .47.01.15.01.36-.06.55.42.2.49.66 1.69.72 1.81.06.12.1.27.02.43-.08.16-.12.27-.24.41-.12.14-.25.31-.36.42-.12.12-.24.25-.1.49.14.24.61.99 1.31 1.59.9.78 1.66 1.02 1.9 1.13.24.12.38.1.52-.06.15-.16.6-.7.76-.94.16-.24.32-.2.55-.12s1.42.67 1.66.79c.24.12.4.18.46.27.06.1.06.55-.13 1.08-.18.53-1.07 1.04-1.5 1.08-.45.04-.93.06-1.49-.09-.34-.09-.78-.24-1.34-.49-2.36-1.02-3.9-3.4-4.02-3.56-.12-.16-.96-1.27-.96-2.43 0-1.16.61-1.73.83-1.97.22-.24.48-.3.64-.3z"
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

      {waModalInvoices && (
        <WhatsAppModal
          invoices={waModalInvoices}
          onClose={() => setWaModalInvoices(null)}
        />
      )}
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
  const toneClass = {
    default: "text-gray-500 hover:text-teal-700 hover:bg-teal-50",
    danger:  "text-red-500 hover:bg-red-50",
    success: "text-emerald-600 hover:bg-emerald-50",
  }[tone] || "text-gray-500 hover:text-teal-700 hover:bg-teal-50";
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded ${toneClass}`}>
      <svg className="w-3.5 h-3.5" fill={tone === "success" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={tone === "success" ? 0 : 2} d={iconPath} />
      </svg>
    </button>
  );
}

// =================================================================== WhatsApp modal

/**
 * Modal for composing and sending WhatsApp messages to invoice recipients.
 * Send method = wa.me click-through links — opens WhatsApp Web/Desktop with
 * the message pre-filled. No backend integration needed.
 */
function WhatsAppModal({ invoices, onClose }) {
  const [template, setTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [textareaRef, setTextareaRef] = useState(null);
  // Track which recipients have already had their tab opened. A Set keyed by
  // invoice id. We can't actually verify the message was sent (that happens
  // in WhatsApp itself), but tracking that the cashier did open the tab is
  // accurate enough — and stops them from re-opening the same one.
  const [sentIds, setSentIds] = useState(() => new Set());

  const insertToken = (tok) => {
    if (!textareaRef) {
      setTemplate((t) => t + tok);
      return;
    }
    const start = textareaRef.selectionStart ?? template.length;
    const end = textareaRef.selectionEnd ?? template.length;
    const next = template.slice(0, start) + tok + template.slice(end);
    setTemplate(next);
    requestAnimationFrame(() => {
      textareaRef.focus();
      const pos = start + tok.length;
      textareaRef.setSelectionRange(pos, pos);
    });
  };

  const recipients = invoices.map((inv) => {
    const phone = pickPhone(inv);
    return {
      invoice: inv,
      phone,
      hasPhone: !!sanitizePhone(phone),
      message: fillTemplate(template, inv),
      sent: sentIds.has(inv.id),
    };
  });

  // Open the WhatsApp tab for one recipient. CRITICAL: this MUST be called
  // synchronously from a user-click handler (no setTimeout, no awaiting) or
  // the browser will block the popup as non-user-initiated.
  const sendOne = (rec) => {
    if (!rec.hasPhone) return;
    const url = `https://wa.me/${sanitizePhone(rec.phone)}?text=${encodeURIComponent(rec.message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSentIds((prev) => {
      const next = new Set(prev);
      next.add(rec.invoice.id);
      return next;
    });
  };

  // The queue: ready recipients in display order that haven't been sent yet.
  // sendNext() pops the head — this is what the "Send Next" button calls.
  const queue = recipients.filter((r) => r.hasPhone && !r.sent);
  const next = queue[0] || null;

  const sendNext = () => {
    if (next) sendOne(next);
  };

  const noPhoneCount = recipients.filter((r) => !r.hasPhone).length;
  const readyCount = recipients.length - noPhoneCount;
  const sentCount = recipients.filter((r) => r.sent).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2z" />
              </svg>
              Send WhatsApp
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              <strong className="text-emerald-700">{sentCount}</strong> sent ·{" "}
              <strong className="text-gray-700">{readyCount - sentCount}</strong> remaining
              {noPhoneCount > 0 && <span className="text-amber-700"> · {noPhoneCount} no phone</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Template editor */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-[10px] font-semibold text-gray-600 uppercase mb-1.5">Message template</p>
          <textarea
            ref={setTextareaRef}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 resize-none"
            placeholder="Type your message…"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] text-gray-500 self-center mr-1">Insert:</span>
            {WHATSAPP_TOKENS.map((t) => (
              <button
                key={t.key}
                onClick={() => insertToken(t.key)}
                className="px-2 py-0.5 bg-white border border-gray-200 text-[10px] text-gray-700 rounded hover:border-teal-300 hover:text-teal-700"
                title={`Inserts ${t.label}`}
              >
                {t.key}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <p className="text-[10px] font-semibold text-gray-600 uppercase mb-2">Recipients ({recipients.length})</p>
          <div className="space-y-2">
            {recipients.map((rec) => {
              const isNext = next && next.invoice.id === rec.invoice.id;
              const cardTone = !rec.hasPhone
                ? "border-amber-200 bg-amber-50/40"
                : rec.sent
                  ? "border-emerald-200 bg-emerald-50/40"
                  : isNext
                    ? "border-emerald-400 ring-2 ring-emerald-200"
                    : "border-gray-200";
              return (
                <div key={rec.invoice.id} className={`border rounded-lg p-2.5 transition-colors ${cardTone}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                        {rec.invoice.student?.full_name || `Student #${rec.invoice.student_id}`}
                        <span className="text-[10px] text-gray-500 font-normal">
                          {rec.invoice.invoice_number} · {fmtMonth(rec.invoice.invoice_month)}
                        </span>
                        {rec.sent && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            ✓ SENT
                          </span>
                        )}
                        {isNext && !rec.sent && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white">
                            NEXT
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {rec.hasPhone ? (
                          <span>📱 {rec.phone}</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">⚠ No phone on family record — cannot send</span>
                        )}
                      </p>
                      <div className="mt-1.5 px-2 py-1.5 bg-gray-50 rounded text-[11px] text-gray-700 whitespace-pre-wrap break-words">
                        {rec.message}
                      </div>
                    </div>
                    <button
                      onClick={() => sendOne(rec)}
                      disabled={!rec.hasPhone}
                      className={`flex-shrink-0 px-2.5 py-1 rounded text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                        rec.sent
                          ? "bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {rec.sent ? "Resend" : "Send"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <p className="text-[10px] text-gray-500 flex-1 min-w-0">
            Each click opens WhatsApp Web with the message ready. Browsers block bulk popups,
            so we open <strong>one tab per click</strong>.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 text-xs font-medium"
            >
              Close
            </button>
            {next ? (
              <button
                onClick={sendNext}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2z" />
                </svg>
                Send Next ({sentCount + 1}/{readyCount})
              </button>
            ) : readyCount > 0 ? (
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">
                ✓ All {readyCount} sent
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
