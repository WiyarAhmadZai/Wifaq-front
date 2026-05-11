import { useState } from "react";

/**
 * Modal that captures a required rejection reason before rejecting a leave request.
 * onConfirm(reason: string) should return a Promise — the modal stays open during the
 * round-trip and closes itself on success.
 */
export default function LeaveRejectModal({ staffName, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-red-50 rounded-t-2xl flex items-center gap-2">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <div>
            <h3 className="text-sm font-bold text-red-800">Reject Leave Request</h3>
            <p className="text-[11px] text-red-600 mt-0.5">
              {staffName ? `For ${staffName} — they will see this reason.` : "The staff member will see this reason."}
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <label className="block">
            <span className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Reason *</span>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Overlaps with exam week — please reschedule"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none"
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || saving}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
