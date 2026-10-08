import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getPublicFeeExtension, submitPublicFeeExtension } from "../../api/feeExtensions";

/**
 * Fee Payment Extension — the public, no-login form.
 *
 * A fee officer generates a link scoped to ONE student's family
 * and sends it to the parent. The parent opens it on a phone,
 * reads the declaration, and asks for more time — without ever
 * signing in. The token in the URL is the only credential, and
 * it pins the request to that one student.
 */

const TEAL = "#0d9488";
const FA = "Vazirmatn, Tahoma, Arial, sans-serif";

const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function PublicFeeExtension() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [declLang, setDeclLang] = useState("dr");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) { setError("No link token."); setLoading(false); return; }
    getPublicFeeExtension(token)
      .then((r) => {
        const d = r.data?.data || {};
        setFormData(d);
        setForm({
          parent_name: d.family?.father_name || d.family?.mother_name || "",
          parent_phone: d.family?.father_phone || d.family?.mother_phone || "",
          parent_email: d.family?.email || "",
          parent_relation: "",
          outstanding_amount: d.outstanding_balance != null ? String(d.outstanding_balance) : "",
          currency: d.currency || "AFN",
          reason: "",
          requested_payment_date: "",
          notes: "",
        });
      })
      .catch((e) => {
        const status = e.response?.status;
        if (status === 404 || status === 410) {
          setError("This link is invalid or has expired. Please ask the school for a new one.");
        } else {
          setError("Could not load the form. Please check the link and try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const declaration = formData?.declaration;
  const declText = useMemo(() => {
    if (!declaration) return null;
    return declaration.languages?.[declLang] || declaration.languages?.dr || null;
  }, [declaration, declLang]);

  const todayIso = new Date().toISOString().split("T")[0];

  const submit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        token,
        student_id: formData?.student?.id,
        parent_name: form.parent_name,
        parent_phone: form.parent_phone,
        parent_email: form.parent_email,
        parent_relation: form.parent_relation,
        outstanding_amount: Number(form.outstanding_amount),
        currency: form.currency,
        reason: form.reason,
        requested_payment_date: form.requested_payment_date,
        notes: form.notes,
        declaration_language: declLang,
        declaration_version: declaration?.version || "v1",
        declaration_accepted: true,
      };
      await submitPublicFeeExtension(payload);
      setDone(true);
    } catch (e) {
      if (e.response?.status === 422) setErrors(e.response.data?.errors || {});
      Swal.fire("Error", e.response?.data?.message || "Could not submit the request.", "error");
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

  /* ── states ─────────────────────────────────────── */
  if (loading) {
    return (
      <Shell>
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-teal-100 border-t-teal-600" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">Link unavailable</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{error}</p>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">Request submitted</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Thank you. Your fee extension request has been sent to the school, and a confirmation
            email is on its way. The fee officer will reply by email.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Header */}
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-lg font-black text-gray-800">Fee Payment Extension</h1>
        <p className="text-xs text-gray-500 mt-1">
          Ask the school for a few extra days on a fee. No sign-in needed — this link is for
          {formData?.student ? (
            <> <bdi dir="auto" className="font-semibold text-gray-700">{[formData.student.first_name, formData.student.last_name].filter(Boolean).join(" ")}</bdi> ({formData.student.student_id})</>
          ) : " your student"}.
        </p>
        {formData?.label && (
          <p className="text-[11px] text-teal-700 font-semibold mt-1"><bdi dir="auto">{formData.label}</bdi></p>
        )}
      </div>

      {/* Student + balance summary */}
      <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] text-teal-700 font-semibold uppercase">Outstanding balance</p>
            <p className="text-2xl font-black text-gray-800">
              {fmtMoney(formData?.outstanding_balance)} <span className="text-xs font-normal text-gray-400">{formData?.currency || "AFN"}</span>
            </p>
          </div>
          {formData?.expires_at && (
            <p className="text-[11px] text-gray-400">
              This link expires {new Date(formData.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Your name *</label>
            <input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
              className={inputCls("parent_name")} />
            {err("parent_name")}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Relation to student</label>
            <input value={form.parent_relation} onChange={(e) => setForm({ ...form, parent_relation: e.target.value })}
              className={inputCls("parent_relation")} placeholder="Father / Mother / Guardian" />
            {err("parent_relation")}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Phone</label>
            <input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
              className={inputCls("parent_phone")} dir="ltr" />
            {err("parent_phone")}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Email (for the reply)</label>
            <input value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
              className={inputCls("parent_email")} type="email" dir="ltr" />
            {err("parent_email")}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Outstanding amount *</label>
            <input value={form.outstanding_amount} onChange={(e) => setForm({ ...form, outstanding_amount: e.target.value })}
              className={inputCls("outstanding_amount")} type="number" min="0.01" step="0.01" dir="ltr" />
            {err("outstanding_amount")}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Currency</label>
            <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className={inputCls("currency")} dir="ltr" />
            {err("currency")}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Requested payment date *</label>
            <input value={form.requested_payment_date} onChange={(e) => setForm({ ...form, requested_payment_date: e.target.value })}
              className={inputCls("requested_payment_date")} type="date" min={todayIso} dir="ltr" />
            {err("requested_payment_date")}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">Reason * (min 10 characters)</label>
          <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows={3} className={inputCls("reason")}
            placeholder="Why do you need more time? (e.g. salary date, emergency expense…)" />
          {err("reason")}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">Notes (optional)</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2} className={inputCls("notes")}
            placeholder="Anything else the fee officer should know" />
          {err("notes")}
        </div>

        {/* Declaration — read and accept */}
        {declText && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-bold text-gray-800"><bdi dir="auto">{declText.title}</bdi></p>
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
              <span className="text-sm text-gray-700"><bdi dir="auto">{declText.signatureLabel}</bdi></span>
            </label>
            {!accepted && (
              <p className="text-[11px] text-amber-600 mt-1">You must accept the declaration before submitting.</p>
            )}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting || !accepted}
          className="mt-2 w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50"
          style={{ background: TEAL }}
        >
          {submitting ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-gray-100 py-8 px-4" style={{ fontFamily: FA }}>
      <div className="max-w-2xl mx-auto">
        {/* Brand */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/25 mb-2">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "Poppins, sans-serif", color: "#0f766e" }}>Wifaq Educational Network</h2>
          <p className="text-xs text-gray-500">Fee Payment Extension</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-7">{children}</div>
        <p className="text-center text-[10px] text-gray-400 mt-4" style={{ fontFamily: "Poppins, sans-serif" }}>© Wifaq Educational Network</p>
      </div>
    </div>
  );
}
