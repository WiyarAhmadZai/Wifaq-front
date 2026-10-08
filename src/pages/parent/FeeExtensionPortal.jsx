import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Modal from "../../components/Modal";
import { useAuth } from "../../admin/context/AuthContext";
import { fmtDate, fmtDateTime } from "../../utils/formErrors";
import { getMyFeeExtensions, submitFeeExtension } from "../../api/feeExtensions";

/**
 * Fee Payment Extension — the parent's own screen.
 *
 * A parent sees their children with outstanding balances, asks for
 * extra time on one of them, and reads the school's answer. The
 * server scopes everything to the caller's own family — a parent
 * can never see another family's data.
 */

const STATUS_META = {
  pending:   { label: "Pending",   chip: "bg-amber-100 text-amber-800" },
  approved:  { label: "Approved",  chip: "bg-emerald-100 text-emerald-800" },
  rejected:  { label: "Rejected",  chip: "bg-red-100 text-red-800" },
  modified:  { label: "Modified",  chip: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", chip: "bg-gray-100 text-gray-700" },
  overdue:   { label: "Overdue",   chip: "bg-purple-100 text-purple-800" },
};

const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const StatusChip = ({ status }) => {
  const meta = STATUS_META[status] || { label: status, chip: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.chip}`}>
      {meta.label}
    </span>
  );
};

export default function FeeExtensionPortal() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New-request form.
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  // Which child the form is for, and the declaration the parent reads.
  const [declaration, setDeclaration] = useState(null);
  const [declLang, setDeclLang] = useState("dr");
  const [accepted, setAccepted] = useState(false);

  const load = () => {
    setLoading(true);
    getMyFeeExtensions()
      .then((r) => {
        const d = r.data?.data || {};
        setData(d);
        setDeclaration(d.declaration || null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const children = data?.children || [];
  const requests = data?.requests || [];

  const openNew = (child) => {
    setForm({
      student_id: String(child.id),
      parent_name: child.parent_name || user?.name || "",
      parent_phone: child.parent_phone || "",
      parent_email: child.parent_email || user?.email || "",
      parent_relation: child.parent_relation || "",
      outstanding_amount: child.outstanding_balance != null ? String(child.outstanding_balance) : "",
      currency: child.currency || "AFN",
      reason: "",
      requested_payment_date: "",
      notes: "",
      declaration_language: declLang,
      declaration_version: declaration?.version || "v1",
    });
    setAccepted(false);
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        student_id: Number(form.student_id),
        outstanding_amount: Number(form.outstanding_amount),
        declaration_language: declLang,
        declaration_version: declaration?.version || "v1",
        declaration_accepted: true,
      };
      await submitFeeExtension(payload);
      Swal.fire("Submitted", "Your request has been sent. A confirmation email is on its way.", "success");
      setOpen(false);
      load();
    } catch (e) {
      if (e.response?.status === 422) setErrors(e.response.data?.errors || {});
      Swal.fire("Failed", e.response?.data?.message || "Could not submit the request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const err = (key) =>
    errors[key] ? <p className="text-[11px] text-red-600 mt-1">{errors[key][0]}</p> : null;
  const inputCls = (key) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-teal-500 ${
      errors[key] ? "border-red-300" : "border-gray-200"
    }`;

  const todayIso = new Date().toISOString().split("T")[0];

  // The declaration in the language the parent is reading.
  const declText = useMemo(() => {
    if (!declaration) return null;
    const lang = declaration.languages?.[declLang] || declaration.languages?.dr;
    return lang || null;
  }, [declaration, declLang]);

  const activeCount = requests.filter((r) => r.status === "pending" || r.status === "approved" || r.status === "modified").length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Fee Payment Extension</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ask for a few extra days on a school fee, and track the school's answer.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-teal-100 border-t-teal-600" />
        </div>
      ) : (
        <>
          {/* Children with balances */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-2">My children</h2>
            {children.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                No children with an outstanding balance right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {children.map((c) => (
                  <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <bdi dir="auto" className="block font-semibold text-gray-800">
                      {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                    </bdi>
                    <p className="text-[11px] text-gray-400">
                      {c.student_id}{c.class_name ? ` · ${c.class_name}` : ""}
                    </p>
                    <p className="mt-2 text-lg font-black text-gray-800">
                      {fmtMoney(c.outstanding_balance)} <span className="text-[11px] font-normal text-gray-400">{c.currency || "AFN"}</span>
                    </p>
                    <p className="text-[11px] text-gray-400">outstanding</p>
                    <button
                      onClick={() => openNew(c)}
                      className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100"
                    >
                      Request Extension
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Request history */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-700">My requests</h2>
              {activeCount > 0 && (
                <span className="text-[11px] text-gray-400">{activeCount} active</span>
              )}
            </div>
            {requests.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                You have not requested any fee extensions yet.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 text-left text-[11px] uppercase text-gray-500">
                        <th className="px-4 py-3 font-semibold">Request</th>
                        <th className="px-4 py-3 font-semibold">Student</th>
                        <th className="px-4 py-3 font-semibold text-right">Amount</th>
                        <th className="px-4 py-3 font-semibold">Requested date</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {requests.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-teal-700">{r.request_code}</td>
                          <td className="px-4 py-3">
                            <bdi dir="auto" className="block font-medium text-gray-800 truncate max-w-[180px]">
                              {r.student ? [r.student.first_name, r.student.last_name].filter(Boolean).join(" ") : "—"}
                            </bdi>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                            {fmtMoney(r.outstanding_amount)} <span className="text-[10px] font-normal text-gray-400">{r.currency || "AFN"}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">{fmtDate(r.requested_payment_date)}</td>
                          <td className="px-4 py-3"><StatusChip status={r.status} /></td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{fmtDateTime(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Decision detail for the most recent requests */}
          {requests.some((r) => r.response_message) && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-gray-700 mb-2">Responses from the school</h2>
              <div className="space-y-2">
                {requests.filter((r) => r.response_message).map((r) => (
                  <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-semibold text-teal-700">{r.request_code}</span>
                      <StatusChip status={r.status} />
                    </div>
                    <bdi dir="auto" className="block text-sm text-gray-700 whitespace-pre-wrap">{r.response_message}</bdi>
                    {r.approved_payment_date && (
                      <p className="text-xs text-emerald-700 font-semibold mt-1">
                        Agreed payment date: {fmtDate(r.approved_payment_date)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── New request modal ────────────────────────── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request a Fee Extension"
        subtitle="Tell the school you need a few more days"
        maxWidth="sm:max-w-2xl"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting || !accepted}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Parent name *</label>
              <input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                className={inputCls("parent_name")} />
              {err("parent_name")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Relation</label>
              <input value={form.parent_relation} onChange={(e) => setForm({ ...form, parent_relation: e.target.value })}
                className={inputCls("parent_relation")} placeholder="Father / Mother / Guardian" />
              {err("parent_relation")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                className={inputCls("parent_phone")} />
              {err("parent_phone")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                className={inputCls("parent_email")} type="email" />
              {err("parent_email")}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Outstanding amount *</label>
              <input value={form.outstanding_amount} onChange={(e) => setForm({ ...form, outstanding_amount: e.target.value })}
                className={inputCls("outstanding_amount")} type="number" min="0.01" step="0.01" />
              {err("outstanding_amount")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Currency</label>
              <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={inputCls("currency")} />
              {err("currency")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Requested payment date *</label>
              <input value={form.requested_payment_date} onChange={(e) => setForm({ ...form, requested_payment_date: e.target.value })}
                className={inputCls("requested_payment_date")} type="date" min={todayIso} />
              {err("requested_payment_date")}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason * (min 10 characters)</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3} className={inputCls("reason")}
              placeholder="Why do you need more time? (e.g. salary date, emergency expense…)" />
            {err("reason")}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className={inputCls("notes")}
              placeholder="Anything else the fee officer should know" />
            {err("notes")}
          </div>

          {/* Declaration — the parent reads and accepts it */}
          {declText && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-gray-800">{declText.title}</p>
                <select
                  value={declLang}
                  onChange={(e) => setDeclLang(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                >
                  <option value="dr">دری</option>
                  <option value="en">English</option>
                  <option value="ps">پښتو</option>
                </select>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
                {(declText.commitments || []).map((c, i) => (
                  <li key={i}><bdi dir="auto">{c}</bdi></li>
                ))}
              </ol>
              {declText.closing && (
                <p className="text-sm text-gray-700 mt-2"><bdi dir="auto">{declText.closing}</bdi></p>
              )}
              <label className="mt-3 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">
                  <bdi dir="auto">{declText.signatureLabel}</bdi>
                </span>
              </label>
              {!accepted && (
                <p className="text-[11px] text-amber-600 mt-1">
                  You must accept the declaration before submitting.
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
