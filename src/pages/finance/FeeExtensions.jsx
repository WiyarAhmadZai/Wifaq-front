import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Modal from "../../components/Modal";
import Select2 from "../../components/hr/Select2";
import { useAuth } from "../../admin/context/AuthContext";
import { fmtDate, fmtDateTime } from "../../utils/formErrors";
import {
  getFeeExtensions,
  getFeeExtensionStats,
  getFeeExtensionFormData,
  getFeeExtension,
  createFeeExtension,
  approveFeeExtension,
  rejectFeeExtension,
  modifyFeeExtension,
  completeFeeExtension,
  deleteFeeExtension,
  generateFeeExtensionLink,
} from "../../api/feeExtensions";

/**
 * Fee Payment Extensions — the fee officer's review queue.
 *
 * A parent asks for a few extra days on a fee; the officer reads the
 * request, approves / rejects / re-dates it, and the parent is emailed
 * the outcome. The dashboard is the queue: status cards up top, the
 * requests below, and the decision dialogs beside each row.
 */

const STATUS_META = {
  pending:   { label: "Pending",   chip: "bg-amber-100 text-amber-800" },
  approved:  { label: "Approved",  chip: "bg-emerald-100 text-emerald-800" },
  rejected:  { label: "Rejected",  chip: "bg-red-100 text-red-800" },
  modified:  { label: "Modified",  chip: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", chip: "bg-gray-100 text-gray-700" },
  overdue:   { label: "Overdue",   chip: "bg-purple-100 text-purple-800" },
};

const STATUS_ORDER = ["pending", "approved", "modified", "rejected", "completed", "overdue"];

const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const studentName = (r) =>
  r.student ? [r.student.first_name, r.student.last_name].filter(Boolean).join(" ") : "—";

const StatusChip = ({ status }) => {
  const meta = STATUS_META[status] || { label: status, chip: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.chip}`}>
      {meta.label}
    </span>
  );
};

export default function FeeExtensions() {
  const { hasPermission } = useAuth();
  const canReview = hasPermission("fee-extensions.manage") || hasPermission("fee-extensions.update");
  const canCreate = hasPermission("fee-extensions.create") || canReview;
  const canDelete = hasPermission("fee-extensions.delete") || canReview;

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Reference data for the "new request" form.
  const [formData, setFormData] = useState(null);

  // Dialogs.
  const [detail, setDetail] = useState(null);       // full row (show)
  const [detailLoading, setDetailLoading] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [decision, setDecision] = useState(null);   // { mode: 'approve'|'reject'|'modify'|'notes', row }

  const load = (p = page, s = status, q = search) => {
    setLoading(true);
    const params = { page: p, per_page: 15 };
    if (s) params.status = s;
    if (q) params.search = q;
    getFeeExtensions(params)
      .then((r) => {
        setRows(r.data?.data || []);
        setMeta(r.data?.meta || {});
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getFeeExtensionStats()
      .then((r) => setStats(r.data?.data || null))
      .catch(() => setStats(null));
    getFeeExtensionFormData()
      .then((r) => setFormData(r.data?.data || null))
      .catch(() => setFormData(null));
    load(1, "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch the queue whenever a filter changes (page resets to 1).
  useEffect(() => {
    setPage(1);
    load(1, status, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search]);

  const refresh = () => {
    load(page, status, search);
    getFeeExtensionStats()
      .then((r) => setStats(r.data?.data || null))
      .catch(() => {});
  };

  /* ── detail drawer ─────────────────────────────────── */
  const openDetail = (row) => {
    setDetail(row);
    setDetailLoading(true);
    getFeeExtension(row.id)
      .then((r) => setDetail(r.data?.data || row))
      .catch(() => setDetail(row))
      .finally(() => setDetailLoading(false));
  };

  /* ── decisions ─────────────────────────────────────── */
  const openDecision = (mode, row) => setDecision({ mode, row });

  const submitDecision = async (values) => {
    const d = decision;
    if (!d) return;
    const { mode, row } = d;
    try {
      if (mode === "approve") {
        await approveFeeExtension(row.id, values);
        Swal.fire("Approved", "The parent has been notified by email.", "success");
      } else if (mode === "reject") {
        await rejectFeeExtension(row.id, values);
        Swal.fire("Rejected", "The parent has been notified by email.", "success");
      } else if (mode === "modify") {
        await modifyFeeExtension(row.id, values);
        Swal.fire("Modified", "The parent has been notified of the new date by email.", "success");
      } else if (mode === "notes") {
        await updateFeeExtension(row.id, values);
        Swal.fire("Saved", "Notes updated.", "success");
      }
      setDecision(null);
      refresh();
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not save.", "error");
    }
  };

  const doComplete = (row) => {
    Swal.fire({
      title: "Mark completed?",
      text: "The commitment has been honoured — the fee is paid.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, mark completed",
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      try {
        await completeFeeExtension(row.id);
        Swal.fire("Completed", "The extension is now marked completed.", "success");
        refresh();
      } catch (e) {
        Swal.fire("Failed", e.response?.data?.message || "Could not update.", "error");
      }
    });
  };

  const doDelete = (row) => {
    Swal.fire({
      title: "Remove this request?",
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      try {
        await deleteFeeExtension(row.id);
        Swal.fire("Removed", "The request has been removed.", "success");
        refresh();
      } catch (e) {
        Swal.fire("Failed", e.response?.data?.message || "Could not remove.", "error");
      }
    });
  };

  /* ── new request (staff, on behalf of a family) ────── */
  const [newForm, setNewForm] = useState({});
  const [newErrors, setNewErrors] = useState({});
  const [newSubmitting, setNewSubmitting] = useState(false);

  const openNew = () => {
    setNewForm({
      student_id: "",
      parent_name: "",
      parent_phone: "",
      parent_email: "",
      parent_relation: "",
      outstanding_amount: "",
      currency: "AFN",
      reason: "",
      requested_payment_date: "",
      notes: "",
      declaration_language: "dr",
      declaration_version: "v1",
      declaration_accepted: true,
    });
    setNewErrors({});
    setNewOpen(true);
  };

  const submitNew = async () => {
    setNewSubmitting(true);
    setNewErrors({});
    try {
      const payload = {
        ...newForm,
        student_id: Number(newForm.student_id),
        outstanding_amount: Number(newForm.outstanding_amount),
        requested_payment_date: newForm.requested_payment_date,
        declaration_accepted: true,
      };
      await createFeeExtension(payload);
      Swal.fire("Recorded", "The request is filed and the parent has been emailed a confirmation.", "success");
      setNewOpen(false);
      refresh();
    } catch (e) {
      if (e.response?.status === 422) setNewErrors(e.response.data?.errors || {});
      Swal.fire("Failed", e.response?.data?.message || "Could not record the request.", "error");
    } finally {
      setNewSubmitting(false);
    }
  };

  /* ── public link generator ─────────────────────────── */
  const [linkForm, setLinkForm] = useState({ student_id: "", label: "", valid_days: 14 });
  const [linkErrors, setLinkErrors] = useState({});
  const [linkResult, setLinkResult] = useState(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  const openLink = () => {
    setLinkForm({ student_id: "", label: "", valid_days: 14 });
    setLinkErrors({});
    setLinkResult(null);
    setLinkOpen(true);
  };

  const submitLink = async () => {
    setLinkSubmitting(true);
    setLinkErrors({});
    setLinkResult(null);
    try {
      const r = await generateFeeExtensionLink({
        student_id: Number(linkForm.student_id),
        label: linkForm.label,
        valid_days: Number(linkForm.valid_days) || 14,
      });
      setLinkResult(r.data?.data || null);
    } catch (e) {
      if (e.response?.status === 422) setLinkErrors(e.response.data?.errors || {});
      Swal.fire("Failed", e.response?.data?.message || "Could not generate the link.", "error");
    } finally {
      setLinkSubmitting(false);
    }
  };

  const copyLink = (url) => {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => Swal.fire("Copied", "The link is on your clipboard.", "success"),
      () => Swal.fire("Link", url, "info")
    );
  };

  /* ── render helpers ────────────────────────────────── */
  const err = (errors, key) =>
    errors[key] ? <p className="text-[11px] text-red-600 mt-1">{errors[key][0]}</p> : null;

  const inputCls = (errors, key) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-teal-500 ${
      errors[key] ? "border-red-300" : "border-gray-200"
    }`;

  const todayIso = new Date().toISOString().split("T")[0];

  const declaration = formData?.declaration;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Fee Payment Extensions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Parents ask for extra time on a fee; review, decide, and the parent is emailed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <button
              onClick={openNew}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700"
            >
              + New Request
            </button>
          )}
          {canCreate && (
            <button
              onClick={openLink}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100"
            >
              🔗 Generate Public Link
            </button>
          )}
        </div>
      </div>

      {/* Status cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-5">
          {STATUS_ORDER.map((s) => {
            const meta = STATUS_META[s];
            const count = stats[s] ?? 0;
            return (
              <button
                key={s}
                onClick={() => setStatus(status === s ? "" : s)}
                className={`text-left rounded-xl border p-3 transition ${
                  status === s ? "border-teal-500 ring-1 ring-teal-500" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-[11px] font-semibold text-gray-500 uppercase">{meta.label}</p>
                <p className="text-2xl font-black text-gray-800 mt-0.5">{count}</p>
              </button>
            );
          })}
          <button
            onClick={() => setStatus("")}
            className={`text-left rounded-xl border p-3 transition ${
              status === "" ? "border-teal-500 ring-1 ring-teal-500" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-black text-gray-800 mt-0.5">{stats.total ?? 0}</p>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, parent, student, reason…"
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-500"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        {(status || search) && (
          <button
            onClick={() => { setStatus(""); setSearch(""); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 text-left text-[11px] uppercase text-gray-500">
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Parent</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Requested date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-100 border-t-teal-600" />
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No fee payment extension requests found.
                  </td>
                </tr>
              )}
              {!loading && rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(r)} className="font-mono text-xs font-semibold text-teal-700 hover:underline">
                      {r.request_code}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <bdi dir="auto" className="block font-medium text-gray-800 truncate max-w-[180px]">{studentName(r)}</bdi>
                    <span className="block text-[10px] text-gray-400 truncate">{r.student?.student_id || ""}{r.student?.schoolClass?.class_name ? ` · ${r.student.schoolClass.class_name}` : ""}</span>
                  </td>
                  <td className="px-4 py-3">
                    <bdi dir="auto" className="block text-gray-700 truncate max-w-[160px]">{r.parent_name}</bdi>
                    {r.parent_phone && <span className="block text-[10px] text-gray-400">{r.parent_phone}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                    {fmtMoney(r.outstanding_amount)} <span className="text-[10px] font-normal text-gray-400">{r.currency || "AFN"}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{fmtDate(r.requested_payment_date)}</td>
                  <td className="px-4 py-3"><StatusChip status={r.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{fmtDateTime(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openDetail(r)} className="p-1.5 text-gray-400 hover:text-teal-600 rounded" title="View">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      {canReview && r.status === "pending" && (
                        <>
                          <button onClick={() => openDecision("approve", r)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded" title="Approve">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button onClick={() => openDecision("reject", r)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Reject">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                          <button onClick={() => openDecision("modify", r)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="Modify date">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </button>
                        </>
                      )}
                      {canReview && (r.status === "approved" || r.status === "modified") && (
                        <button onClick={() => doComplete(r)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded" title="Mark completed">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                      )}
                      {canReview && (
                        <button onClick={() => openDecision("notes", r)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded" title="Add notes">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => doDelete(r)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {meta.current_page} of {meta.last_page} · {meta.total} total
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); load(p); }}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ‹ Prev
              </button>
              <button
                disabled={page >= meta.last_page}
                onClick={() => { const p = page + 1; setPage(p); load(p); }}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail modal ─────────────────────────────── */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Extension ${detail.request_code}` : ""}
        subtitle={detail ? `${studentName(detail)} · ${STATUS_META[detail.status]?.label || detail.status}` : ""}
        maxWidth="sm:max-w-2xl"
        footer={
          detail && canReview && detail.status === "pending" ? (
            <>
              <button onClick={() => { const r = detail; setDetail(null); openDecision("reject", r); }}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100">
                Reject
              </button>
              <button onClick={() => { const r = detail; setDetail(null); openDecision("modify", r); }}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100">
                Modify Date
              </button>
              <button onClick={() => { const r = detail; setDetail(null); openDecision("approve", r); }}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700">
                Approve
              </button>
            </>
          ) : null
        }
      >
        {detailLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-100 border-t-teal-600" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-gray-400 uppercase">Student</p>
                <bdi dir="auto" className="font-medium text-gray-800">{studentName(detail)}</bdi>
                {detail.student?.student_id && <p className="text-xs text-gray-400">{detail.student.student_id}</p>}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase">Parent</p>
                <bdi dir="auto" className="font-medium text-gray-800">{detail.parent_name}</bdi>
                {detail.parent_relation && <p className="text-xs text-gray-400">{detail.parent_relation}</p>}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase">Outstanding amount</p>
                <p className="font-semibold text-gray-800">{fmtMoney(detail.outstanding_amount)} {detail.currency || "AFN"}</p>
                {detail.outstanding_now != null && (
                  <p className="text-xs text-gray-400">Balance now: {fmtMoney(detail.outstanding_now)}</p>
                )}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase">Requested payment date</p>
                <p className="font-medium text-gray-800">{fmtDate(detail.requested_payment_date)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase">Status</p>
                <StatusChip status={detail.status} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase">Submitted</p>
                <p className="font-medium text-gray-800">{fmtDateTime(detail.created_at)}</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-gray-400 uppercase mb-1">Reason</p>
              <bdi dir="auto" className="block text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{detail.reason}</bdi>
            </div>

            {detail.notes && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase mb-1">Parent notes</p>
                <bdi dir="auto" className="block text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{detail.notes}</bdi>
              </div>
            )}

            {detail.response_message && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase mb-1">Response to parent</p>
                <bdi dir="auto" className="block text-sm text-gray-700 whitespace-pre-wrap bg-teal-50 rounded-lg p-3">{detail.response_message}</bdi>
              </div>
            )}

            {detail.staff_notes && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase mb-1">Staff notes</p>
                <bdi dir="auto" className="block text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{detail.staff_notes}</bdi>
              </div>
            )}

            {detail.approved_payment_date && (
              <div className="text-sm">
                <p className="text-[11px] text-gray-400 uppercase mb-1">Approved payment date</p>
                <p className="font-semibold text-emerald-700">{fmtDate(detail.approved_payment_date)}</p>
              </div>
            )}

            {detail.declaration_text && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase mb-1">
                  Declaration accepted · {detail.declaration_language?.toUpperCase()} · {detail.declaration_version}
                </p>
                <bdi dir="auto" className="block text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {detail.declaration_text}
                </bdi>
              </div>
            )}

            <div className="text-xs text-gray-400 flex flex-wrap gap-x-4">
              {detail.reviewer && <span>Reviewed by: {detail.reviewer.name}</span>}
              {detail.reviewed_at && <span>on {fmtDateTime(detail.reviewed_at)}</span>}
              {detail.creator && <span>Created by: {detail.creator.name}</span>}
              {detail.source && <span>Source: {detail.source}</span>}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ── Decision modal (approve / reject / modify / notes) ── */}
      <DecisionModal
        decision={decision}
        setDecision={setDecision}
        submitDecision={submitDecision}
        todayIso={todayIso}
        err={err}
        inputCls={inputCls}
      />

      {/* ── New request modal ────────────────────────── */}
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New Fee Extension Request"
        subtitle="Record a request on a family's behalf"
        maxWidth="sm:max-w-2xl"
        footer={
          <>
            <button onClick={() => setNewOpen(false)} className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              onClick={submitNew}
              disabled={newSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              {newSubmitting ? "Saving…" : "Record Request"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Student *</label>
            <Select2
              value={newForm.student_id}
              onChange={(v) => setNewForm({ ...newForm, student_id: v })}
              options={(formData?.students || []).map((s) => ({ value: s.id, label: s.label }))}
              placeholder="Search student by name or ID…"
              error={!!newErrors.student_id}
              size="md"
            />
            {err(newErrors, "student_id")}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Parent name *</label>
              <input value={newForm.parent_name} onChange={(e) => setNewForm({ ...newForm, parent_name: e.target.value })}
                className={inputCls(newErrors, "parent_name")} placeholder="Full name" />
              {err(newErrors, "parent_name")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Relation</label>
              <input value={newForm.parent_relation} onChange={(e) => setNewForm({ ...newForm, parent_relation: e.target.value })}
                className={inputCls(newErrors, "parent_relation")} placeholder="Father / Mother / Guardian" />
              {err(newErrors, "parent_relation")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <input value={newForm.parent_phone} onChange={(e) => setNewForm({ ...newForm, parent_phone: e.target.value })}
                className={inputCls(newErrors, "parent_phone")} placeholder="Phone number" />
              {err(newErrors, "parent_phone")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input value={newForm.parent_email} onChange={(e) => setNewForm({ ...newForm, parent_email: e.target.value })}
                className={inputCls(newErrors, "parent_email")} placeholder="parent@example.com" type="email" />
              {err(newErrors, "parent_email")}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Outstanding amount *</label>
              <input value={newForm.outstanding_amount} onChange={(e) => setNewForm({ ...newForm, outstanding_amount: e.target.value })}
                className={inputCls(newErrors, "outstanding_amount")} placeholder="0.00" type="number" min="0.01" step="0.01" />
              {err(newErrors, "outstanding_amount")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Currency</label>
              <input value={newForm.currency} onChange={(e) => setNewForm({ ...newForm, currency: e.target.value })}
                className={inputCls(newErrors, "currency")} placeholder="AFN" />
              {err(newErrors, "currency")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Requested payment date *</label>
              <input value={newForm.requested_payment_date} onChange={(e) => setNewForm({ ...newForm, requested_payment_date: e.target.value })}
                className={inputCls(newErrors, "requested_payment_date")} type="date" min={todayIso} />
              {err(newErrors, "requested_payment_date")}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason * (min 10 characters)</label>
            <textarea value={newForm.reason} onChange={(e) => setNewForm({ ...newForm, reason: e.target.value })}
              rows={3} className={inputCls(newErrors, "reason")} placeholder="Why is the parent asking for more time?" />
            {err(newErrors, "reason")}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea value={newForm.notes} onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
              rows={2} className={inputCls(newErrors, "notes")} placeholder="Anything the fee officer should know" />
            {err(newErrors, "notes")}
          </div>

          {declaration && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-[11px] font-semibold text-gray-600 mb-1">
                Declaration the parent must accept ({declaration.version})
              </p>
              <p className="text-xs text-gray-500">
                The parent confirms the six commitments in the declaration. The exact accepted wording is
                snapshotted onto the request when it is recorded.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Public link modal ────────────────────────── */}
      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Generate Secure Public Link"
        subtitle="A no-login form for the family — scoped to one student, expiring"
        maxWidth="sm:max-w-lg"
        footer={
          <>
            <button onClick={() => setLinkOpen(false)} className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
              Close
            </button>
            {!linkResult && (
              <button
                onClick={submitLink}
                disabled={linkSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
              >
                {linkSubmitting ? "Generating…" : "Generate Link"}
              </button>
            )}
          </>
        }
      >
        {linkResult ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs font-semibold text-emerald-800 mb-1">Link ready — share it with the family</p>
              <p className="text-[11px] text-emerald-700">
                Expires {linkResult.expires_at ? fmtDateTime(linkResult.expires_at) : "—"} · works without a login ·
                only lets the family submit for this one student.
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Shareable URL</label>
              <div className="flex gap-1">
                <input readOnly value={linkResult.url} onFocus={(e) => e.target.select()}
                  className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-lg bg-gray-50" />
                <button onClick={() => copyLink(linkResult.url)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700">
                  Copy
                </button>
              </div>
            </div>
            <button onClick={() => { setLinkResult(null); setLinkForm({ student_id: "", label: "", valid_days: 14 }); }}
              className="text-xs text-teal-700 hover:underline">
              Generate another link
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Student *</label>
              <Select2
                value={linkForm.student_id}
                onChange={(v) => setLinkForm({ ...linkForm, student_id: v })}
                options={(formData?.students || []).map((s) => ({ value: s.id, label: s.label }))}
                placeholder="Search student by name or ID…"
                error={!!linkErrors.student_id}
                size="md"
              />
              {err(linkErrors, "student_id")}
              <p className="text-[11px] text-gray-400 mt-1">
                The link is scoped to this student's family only — a visitor can never submit for another child.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Label (optional)</label>
              <input value={linkForm.label} onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
                className={inputCls(linkErrors, "label")} placeholder="e.g. Tuition extension — March" />
              {err(linkErrors, "label")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Valid for (days)</label>
              <input value={linkForm.valid_days} onChange={(e) => setLinkForm({ ...linkForm, valid_days: e.target.value })}
                className={inputCls(linkErrors, "valid_days")} type="number" min="1" max="90" />
              {err(linkErrors, "valid_days")}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Decision dialog ─────────────────────────────────────── */
function DecisionModal({ decision, setDecision, submitDecision, todayIso, err, inputCls }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (decision) {
      setValues({
        approved_payment_date: decision.row.approved_payment_date || "",
        response_message: decision.row.response_message || "",
        staff_notes: decision.row.staff_notes || "",
      });
      setErrors({});
      setSubmitting(false);
    }
  }, [decision]);

  if (!decision) return null;

  const { mode, row } = decision;
  const titles = {
    approve: { title: "Approve Extension", hint: "The parent is emailed the approval and the agreed date." },
    reject: { title: "Reject Extension", hint: "The parent is emailed the rejection and your message." },
    modify: { title: "Modify Payment Date", hint: "Set a new agreed date — the parent is emailed the change." },
    notes: { title: "Add Notes / Response", hint: "Record notes or a message without a decision." },
  };
  const t = titles[mode] || titles.notes;

  const submit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      // Client-side pre-checks so the common mistakes never hit the server.
      if ((mode === "approve" || mode === "modify") && !values.approved_payment_date) {
        setErrors({ approved_payment_date: ["The payment date is required."] });
        setSubmitting(false);
        return;
      }
      if (mode === "reject" && !values.response_message?.trim()) {
        setErrors({ response_message: ["A response message to the parent is required."] });
        setSubmitting(false);
        return;
      }
      await submitDecision(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => setDecision(null)}
      title={t.title}
      subtitle={`${row.request_code} · ${studentName(row)}`}
      footer={
        <>
          <button onClick={() => setDecision(null)} className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${
              mode === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {submitting ? "Saving…" : mode === "approve" ? "Approve" : mode === "reject" ? "Reject" : mode === "modify" ? "Save New Date" : "Save Notes"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-gray-500">{t.hint}</p>

        {(mode === "approve" || mode === "modify") && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {mode === "modify" ? "New payment date *" : "Approved payment date"}
            </label>
            <input
              type="date"
              min={todayIso}
              value={values.approved_payment_date}
              onChange={(e) => setValues({ ...values, approved_payment_date: e.target.value })}
              className={inputCls(errors, "approved_payment_date")}
            />
            {err(errors, "approved_payment_date")}
            {mode === "approve" && (
              <p className="text-[11px] text-gray-400 mt-1">
                Leave blank to keep the parent's requested date ({fmtDate(row.requested_payment_date)}).
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Response message {mode === "reject" ? "*" : "(optional)"}
          </label>
          <textarea
            rows={3}
            value={values.response_message}
            onChange={(e) => setValues({ ...values, response_message: e.target.value })}
            className={inputCls(errors, "response_message")}
            placeholder={mode === "reject" ? "Tell the parent why the request was declined…" : "A message to send the parent…"}
          />
          {err(errors, "response_message")}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Staff notes (internal, optional)</label>
          <textarea
            rows={2}
            value={values.staff_notes}
            onChange={(e) => setValues({ ...values, staff_notes: e.target.value })}
            className={inputCls(errors, "staff_notes")}
            placeholder="Internal note — not emailed to the parent"
          />
          {err(errors, "staff_notes")}
        </div>
      </div>
    </Modal>
  );
}
