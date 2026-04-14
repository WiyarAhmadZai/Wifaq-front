import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, put } from "../../api/axios";
import Swal from "sweetalert2";

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function FoundationRequestShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approveAmount, setApproveAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await get(`/student-management/foundation-requests/show/${id}`);
      const d = res.data?.data;
      setItem(d);
      setApproveAmount(d?.help_requested || "");
    } catch {
      Swal.fire("Error", "Failed to load request", "error");
      navigate("/student-management/foundation-requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveAmount || Number(approveAmount) <= 0) {
      Swal.fire("Error", "Please enter the approved amount", "error");
      return;
    }

    const confirm = await Swal.fire({
      title: "Approve this request?",
      html: `<p class="text-sm">Approve <strong>${Number(approveAmount).toLocaleString()} AFN</strong> per month for ${item.student?.first_name} ${item.student?.last_name}?</p>
             <p class="text-xs text-gray-500 mt-2">All pending invoices will be updated automatically.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Approve",
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    try {
      await put(`/student-management/foundation-requests/${id}/approve`, {
        help_approved: approveAmount,
        admin_note: adminNote || null,
      });
      Swal.fire({ icon: "success", title: "Approved", text: "Foundation help approved and invoices updated.", timer: 2000, showConfirmButton: false });
      fetchItem();
    } catch (error) {
      const errs = error.response?.data?.errors;
      const msg = errs ? Object.values(errs).flat()[0] : (error.response?.data?.message || "Failed to approve");
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    const { value: note } = await Swal.fire({
      title: "Reject Request",
      input: "textarea",
      inputLabel: "Reason for rejection (required)",
      inputPlaceholder: "Explain why this request is being rejected...",
      inputAttributes: { maxlength: "500" },
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Reject",
      inputValidator: (v) => !v || v.length < 5 ? "Please provide at least 5 characters" : null,
    });
    if (!note) return;

    setSaving(true);
    try {
      await put(`/student-management/foundation-requests/${id}/reject`, { admin_note: note });
      Swal.fire({ icon: "success", title: "Rejected", timer: 1500, showConfirmButton: false });
      fetchItem();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to reject", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) return null;

  const isPending = item.status === "pending";

  return (
    <div className="px-4 py-5 mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/student-management/foundation-requests")}
          className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">Foundation Help Request</h1>
          <p className="text-xs text-gray-400">Review and decide on this assistance request</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${STATUS_BADGE[item.status]}`}>
          {item.status}
        </span>
      </div>

      {/* Student info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Student Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Student Name</p>
            <p className="text-gray-800 font-medium">{item.student?.first_name} {item.student?.last_name}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Student ID</p>
            <p className="text-gray-800 font-medium">{item.student?.student_id}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Class</p>
            <p className="text-gray-800 font-medium">{item.student?.school_class?.class_name || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Family</p>
            <p className="text-gray-800 font-medium">{item.student?.family?.father_name}</p>
            <p className="text-[10px] text-teal-600">{item.student?.family?.family_id}</p>
          </div>
        </div>
      </div>

      {/* Financial breakdown */}
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl">
        <h3 className="text-sm font-bold mb-4 text-teal-100 uppercase tracking-wider">Financial Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-teal-100">Monthly tuition (after discounts)</span>
            <span className="text-lg font-bold">{Number(item.expected_monthly_fee).toLocaleString()} AFN</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-teal-100">Family can pay</span>
            <span className="text-lg font-bold">{Number(item.family_can_pay).toLocaleString()} AFN</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-white/20">
            <span className="text-sm font-bold">Help requested</span>
            <span className="text-2xl font-black">{Number(item.help_requested).toLocaleString()} AFN</span>
          </div>
          {item.status === "approved" && (
            <div className="flex items-center justify-between pt-3 border-t border-white/20 bg-emerald-500/30 -mx-6 px-6 py-3">
              <span className="text-sm font-bold">Approved</span>
              <span className="text-2xl font-black">{Number(item.help_approved || 0).toLocaleString()} AFN</span>
            </div>
          )}
        </div>
      </div>

      {/* Admin note (if reviewed) */}
      {item.admin_note && (
        <div className={`p-4 rounded-2xl border ${item.status === "approved" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-600">Admin Note</p>
          <p className="text-xs text-gray-700">{item.admin_note}</p>
          {item.reviewer && item.reviewed_at && (
            <p className="text-[10px] text-gray-400 mt-2">
              By {item.reviewer.name} on {new Date(item.reviewed_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Approve/Reject form (only if pending) */}
      {isPending && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Decision</h3>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Approved Amount (AFN)</label>
            <input type="number" value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)}
              min={0} max={item.expected_monthly_fee}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500" />
            <p className="text-[10px] text-gray-400 mt-1">
              Max: {Number(item.expected_monthly_fee).toLocaleString()} AFN. You can approve a partial amount.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Admin Note (optional)</label>
            <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3}
              placeholder="Internal notes about this decision..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500" />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleReject} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-50">
              Reject
            </button>
            <button onClick={handleApprove} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Processing..." : "Approve"}
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center">
        Submitted {new Date(item.created_at).toLocaleString()}
      </p>
    </div>
  );
}
