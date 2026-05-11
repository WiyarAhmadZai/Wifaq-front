import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, del, put } from "../../api/axios";
import Swal from "sweetalert2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

const statusBadge = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  expired: "bg-red-100 text-red-700 border-red-200",
  terminated: "bg-red-100 text-red-700 border-red-200",
  renewed: "bg-blue-100 text-blue-700 border-blue-200",
};

const formatDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};

const parseDate = (s) => {
  if (!s) return null;
  const p = s.split("T")[0].split("-");
  const d = new Date(p[0], p[1] - 1, p[2]);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDuration = (days) => {
  if (days <= 0) return "0d";
  if (days >= 365) {
    const y = Math.floor(days / 365);
    const m = Math.floor((days % 365) / 30);
    return m > 0 ? `${y}y ${m}m` : `${y}y`;
  }
  if (days >= 60) return `${Math.floor(days / 30)}m`;
  return `${days}d`;
};

const Field = ({ label, value, full = false }) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{value || "—"}</p>
  </div>
);

export default function AgreementsShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate, canDelete } = useResourcePermissions("agreements");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewModal, setRenewModal] = useState({ open: false, end_date: "" });
  const [savingRenew, setSavingRenew] = useState(false);

  useEffect(() => { fetchItem(); }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/agreements/show/${id}`);
      setData(res.data);
    } catch {
      Swal.fire("Error", "Failed to load agreement", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete",
    });
    if (result.isConfirmed) {
      try {
        await del(`/hr/agreements/delete/${id}`);
        Swal.fire("Deleted", "Agreement deleted", "success");
        navigate("/hr/agreements");
      } catch {
        Swal.fire("Error", "Failed to delete", "error");
      }
    }
  };

  const submitRenew = async () => {
    if (!renewModal.end_date) {
      Swal.fire("Error", "Please pick a new end date", "error");
      return;
    }
    setSavingRenew(true);
    try {
      await put(`/hr/agreements/renew/${id}`, { end_date: renewModal.end_date });
      Swal.fire({ icon: "success", title: "Agreement renewed", timer: 1500, showConfirmButton: false });
      setRenewModal({ open: false, end_date: "" });
      fetchItem();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to renew", "error");
    } finally {
      setSavingRenew(false);
    }
  };

  const getPeriodInfo = () => {
    if (!data?.start_date || !data?.end_date) return null;
    const start = parseDate(data.start_date);
    const end = parseDate(data.end_date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!start || !end) return null;
    const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.round((end - today) / (1000 * 60 * 60 * 24));
    const startsIn = Math.round((start - today) / (1000 * 60 * 60 * 24));
    return { totalDays, daysLeft, startsIn, totalLabel: formatDuration(totalDays) };
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-12">
      <p className="text-gray-500">Agreement not found</p>
      <button onClick={() => navigate("/hr/agreements")}
        className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Back to List</button>
    </div>
  );

  const period = getPeriodInfo();
  const daysLeft = period?.daysLeft ?? null;
  // Renew button only when the contract has actually started and is near the end
  const showRenewBtn = period && period.startsIn <= 0 && (daysLeft <= 30 || daysLeft < 0)
    && data.status !== "terminated" && data.status !== "renewed";

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/hr/agreements")}
            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{data.agreement_number}</h2>
            <p className="text-xs text-gray-500">Agreement Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {showRenewBtn && canUpdate && (
            <button onClick={() => setRenewModal({ open: true, end_date: "" })}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Renew / Extend
            </button>
          )}
          {canUpdate && (
            <button onClick={() => navigate(`/hr/agreements/edit/${id}`)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold border capitalize ${statusBadge[data.status] || statusBadge.draft}`}>
          {data.status}
        </span>
        {period && (
          <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            Total: {period.totalLabel}
          </span>
        )}
        {period && period.startsIn > 0 && (
          <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            Starts in {period.startsIn} days
          </span>
        )}
        {period && period.startsIn <= 0 && (
          <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${
            daysLeft < 0 ? "bg-red-100 text-red-700"
            : daysLeft <= 7 ? "bg-red-100 text-red-700 animate-pulse"
            : daysLeft <= 30 ? "bg-amber-100 text-amber-700"
            : "bg-gray-100 text-gray-600"
          }`}>
            {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : daysLeft === 0 ? "Ends today" : `${daysLeft} days remaining`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Partner card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              Partner Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Partner Name" value={data.partner_name} />
              <Field label="Partner Type" value={data.partner_type?.replace("_", " ")} />
              <Field label="Representative" value={data.representative_name} />
              <Field label="Position" value={data.representative_position} />
              <Field label="Phone" value={data.contact_phone} />
              <Field label="Email" value={data.contact_email} />
              <Field label="Address" value={data.partner_address} full />
            </div>
          </div>

          {/* Collaboration card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Collaboration Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Agreement Number" value={data.agreement_number} />
              <Field label="Collaboration Area" value={data.collaboration_area} />
              <Field label="Start Date" value={formatDate(data.start_date)} />
              <Field label="End Date" value={formatDate(data.end_date)} />
              <Field label="Created By" value={data.creator?.name} />
              <Field label="Purpose" value={data.purpose} full />
              {data.scope && <Field label="Scope" value={data.scope} full />}
              {data.terms && <Field label="Terms & Conditions" value={data.terms} full />}
              {data.benefits && <Field label="Benefits to WEN" value={data.benefits} />}
              {data.obligations && <Field label="WEN Obligations" value={data.obligations} />}
              {data.notes && <Field label="Notes" value={data.notes} full />}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-sm p-5 text-white">
            <h3 className="text-sm font-semibold mb-3">Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Agreement ID</span>
                <span className="text-xs font-medium">#{String(data.id).padStart(4, "0")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Status</span>
                <span className="text-xs font-medium capitalize">{data.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Partner Type</span>
                <span className="text-xs font-medium capitalize">{data.partner_type?.replace("_", " ")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Created</span>
                <span className="text-xs font-medium">{data.created_at ? new Date(data.created_at).toLocaleDateString() : "—"}</span>
              </div>
            </div>
          </div>

          {data.renewal_alert_sent && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                  <p className="text-xs font-semibold text-amber-800">Renewal Alert Sent</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">Notification was sent on {formatDate(data.renewal_alert_date)}. Renew or extend the agreement to dismiss.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {renewModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-gray-800 mb-1">Renew Agreement</h3>
            <p className="text-xs text-gray-500 mb-4">{data.agreement_number} — {data.partner_name}</p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">New End Date *</label>
              <input type="date" value={renewModal.end_date}
                onChange={(e) => setRenewModal((m) => ({ ...m, end_date: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none" />
              <p className="text-[10px] text-gray-400 mt-1">Current end date: {formatDate(data.end_date)}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenewModal({ open: false, end_date: "" })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 text-sm font-medium">Cancel</button>
              <button onClick={submitRenew} disabled={savingRenew}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-sm font-medium disabled:opacity-50">
                {savingRenew ? "Saving..." : "Renew"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
