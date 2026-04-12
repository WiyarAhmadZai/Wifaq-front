import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del, put } from "../../api/axios";
import Swal from "sweetalert2";

const Icons = {
  Plus: () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>),
  Eye: () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>),
  Edit: () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>),
  Trash: () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>),
  Renew: () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>),
  Status: () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
};

const statusBadge = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-700",
  terminated: "bg-red-100 text-red-700",
  renewed: "bg-blue-100 text-blue-700",
};

const partnerBadge = {
  institution: "bg-emerald-100 text-emerald-700",
  school: "bg-blue-100 text-blue-700",
  course_center: "bg-purple-100 text-purple-700",
  university: "bg-cyan-100 text-cyan-700",
  ngo: "bg-amber-100 text-amber-700",
  government: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
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

// Returns the total period length (start → end) as a colored chip.
// Color reflects urgency of the *remaining* time so "expiring soon" still
// shows in red/amber.
const getPeriodInfo = (item) => {
  if (!item.start_date || !item.end_date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = parseDate(item.start_date);
  const end = parseDate(item.end_date);
  if (!start || !end) return null;

  const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.round((end - today) / (1000 * 60 * 60 * 24));
  const text = formatDuration(totalDays);

  let color = "bg-gray-100 text-gray-600";
  if (daysLeft < 0) color = "bg-red-100 text-red-700";
  else if (daysLeft === 0) color = "bg-red-500 text-white animate-pulse";
  else if (daysLeft <= 7) color = "bg-red-100 text-red-700 animate-pulse";
  else if (daysLeft <= 30) color = "bg-amber-100 text-amber-700";

  const expiringSoon = daysLeft <= 30;
  return { text, color, daysLeft, expiringSoon };
};

export default function Agreements() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: "", partner_type: "", collaboration_area: "", search: "" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [renewModal, setRenewModal] = useState({ open: false, agreement: null, end_date: "" });
  const [savingRenew, setSavingRenew] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await get("/hr/agreements/list");
      const data = res.data?.data || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter((it) => {
    if (filters.status && it.status !== filters.status) return false;
    if (filters.partner_type && it.partner_type !== filters.partner_type) return false;
    if (filters.collaboration_area && it.collaboration_area !== filters.collaboration_area) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${it.partner_name || ""} ${it.agreement_number || ""} ${it.purpose || ""} ${it.representative_name || ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const stats = [
    { label: "Total Agreements", value: items.length, icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { label: "Active", value: items.filter((i) => i.status === "active").length, icon: "M5 13l4 4L19 7" },
    { label: "Expiring Soon", value: items.filter((i) => { const info = getPeriodInfo(i); return info && info.expiringSoon && info.daysLeft >= 0; }).length, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Expired", value: items.filter((i) => i.status === "expired").length, icon: "M6 18L18 6M6 6l12 12" },
  ];

  const handleStatusUpdate = async (e, item) => {
    e.stopPropagation();
    const { value: newStatus } = await Swal.fire({
      title: "Update Status",
      input: "select",
      inputOptions: { draft: "Draft", active: "Active", expired: "Expired", terminated: "Terminated", renewed: "Renewed" },
      inputValue: item.status,
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
    });
    if (newStatus && newStatus !== item.status) {
      try {
        await put(`/hr/agreements/update-status/${item.id}`, { status: newStatus });
        Swal.fire({ icon: "success", title: `Status: ${newStatus}`, timer: 1500, showConfirmButton: false });
        fetchItems();
      } catch (err) {
        Swal.fire("Error", err.response?.data?.message || "Failed to update status", "error");
      }
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const result = await Swal.fire({ title: "Delete this agreement?", text: "This action cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Delete" });
    if (result.isConfirmed) {
      try { await del(`/hr/agreements/delete/${id}`); } catch {}
      fetchItems();
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
    }
  };

  const openRenew = (agreement) => setRenewModal({ open: true, agreement, end_date: "" });

  const submitRenew = async () => {
    if (!renewModal.end_date) {
      Swal.fire("Error", "Please pick a new end date", "error");
      return;
    }
    setSavingRenew(true);
    try {
      await put(`/hr/agreements/renew/${renewModal.agreement.id}`, { end_date: renewModal.end_date });
      Swal.fire({ icon: "success", title: "Agreement renewed", timer: 1500, showConfirmButton: false });
      setRenewModal({ open: false, agreement: null, end_date: "" });
      fetchItems();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to renew", "error");
    } finally {
      setSavingRenew(false);
    }
  };

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Agreements</h1>
          <p className="text-xs text-gray-400 mt-0.5">Collaboration agreements (تفاهم نامه) with partner institutions, schools, and organizations</p>
        </div>
        <button onClick={() => navigate("/hr/agreements/create")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
          <Icons.Plus /> New Agreement
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${i === 0 ? "bg-teal-600 border-teal-600" : "bg-white border-teal-100"}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-white/20" : "bg-teal-50"}`}>
              <svg className={`w-4 h-4 ${i === 0 ? "text-white" : "text-teal-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
            </div>
            <div>
              <p className={`text-[10px] font-medium ${i === 0 ? "text-teal-100" : "text-gray-500"}`}>{s.label}</p>
              <p className={`text-xl font-bold leading-tight ${i === 0 ? "text-white" : "text-gray-800"}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Search by partner, agreement number, purpose..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white" />
          </div>
          <button onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${filterOpen || filters.status || filters.partner_type || filters.collaboration_area ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters
          </button>
          {(filters.search || filters.status || filters.partner_type || filters.collaboration_area) && (
            <button onClick={() => setFilters({ status: "", partner_type: "", collaboration_area: "", search: "" })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">Clear</button>
          )}
        </div>
        {filterOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-gray-100">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
                <option value="renewed">Renewed</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Partner Type</label>
              <select value={filters.partner_type} onChange={(e) => setFilters((f) => ({ ...f, partner_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All Types</option>
                <option value="institution">Institution</option>
                <option value="school">School</option>
                <option value="course_center">Course Center</option>
                <option value="university">University</option>
                <option value="ngo">NGO</option>
                <option value="government">Government</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Area</label>
              <select value={filters.collaboration_area} onChange={(e) => setFilters((f) => ({ ...f, collaboration_area: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All Areas</option>
                <option value="education">Education</option>
                <option value="training">Training</option>
                <option value="research">Research</option>
                <option value="sports">Sports</option>
                <option value="exchange">Exchange</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Agreement #</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Partner</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Area</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item) => {
                  const periodInfo = getPeriodInfo(item);
                  const showRenew = periodInfo && (periodInfo.expiringSoon || periodInfo.daysLeft < 0) && (item.status === "active" || item.status === "expired");
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3"><p className="text-sm font-bold text-teal-700">{item.agreement_number}</p></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">{item.partner_name?.charAt(0)?.toUpperCase() || "?"}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{item.partner_name}</p>
                            {item.representative_name && <p className="text-[11px] text-gray-400">{item.representative_name}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${partnerBadge[item.partner_type] || "bg-gray-100 text-gray-600"}`}>
                          {item.partner_type?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-cyan-50 text-cyan-700 border border-cyan-100">
                          {item.collaboration_area}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700">{formatDate(item.start_date)} → {formatDate(item.end_date)}</p>
                        {periodInfo && (
                          <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${periodInfo.color}`}>
                            {periodInfo.daysLeft < 0
                              ? `Ended (${periodInfo.text})`
                              : `${periodInfo.text}${periodInfo.expiringSoon ? ` · ${periodInfo.daysLeft}d left` : ""}`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${statusBadge[item.status] || "bg-gray-100 text-gray-600"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {showRenew && (
                            <button onClick={() => openRenew(item)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Renew / Extend">
                              <Icons.Renew />
                            </button>
                          )}
                          <button onClick={(e) => handleStatusUpdate(e, item)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Update Status">
                            <Icons.Status />
                          </button>
                          <button onClick={() => navigate(`/hr/agreements/show/${item.id}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                            <Icons.Eye />
                          </button>
                          <button onClick={() => navigate(`/hr/agreements/edit/${item.id}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                            <Icons.Edit />
                          </button>
                          <button onClick={(e) => handleDelete(e, item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Icons.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-sm font-medium text-gray-600">No agreements found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
              <button onClick={() => navigate("/hr/agreements/create")}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
                <Icons.Plus /> Create First Agreement
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">Showing {filtered.length} of {items.length} agreements</p>
            </div>
          )}
        </div>
      )}

      {renewModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-gray-800 mb-1">Renew Agreement</h3>
            <p className="text-xs text-gray-500 mb-4">{renewModal.agreement?.agreement_number} — {renewModal.agreement?.partner_name}</p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">New End Date *</label>
              <input type="date" value={renewModal.end_date}
                onChange={(e) => setRenewModal((m) => ({ ...m, end_date: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none" />
              <p className="text-[10px] text-gray-400 mt-1">Current end date: {formatDate(renewModal.agreement?.end_date)}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenewModal({ open: false, agreement: null, end_date: "" })}
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
