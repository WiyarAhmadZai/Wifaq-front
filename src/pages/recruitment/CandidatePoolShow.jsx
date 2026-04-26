import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put, del } from "../../api/axios";
import Swal from "sweetalert2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

const CATEGORY_COLORS = {
  teaching: "bg-blue-100 text-blue-700",
  administration: "bg-purple-100 text-purple-700",
  finance: "bg-emerald-100 text-emerald-700",
  hr: "bg-pink-100 text-pink-700",
  it: "bg-cyan-100 text-cyan-700",
  maintenance: "bg-amber-100 text-amber-700",
  other: "bg-gray-100 text-gray-700",
};

const STATUS_COLORS = {
  received: "bg-blue-100 text-blue-700",
  screening: "bg-amber-100 text-amber-700",
  shortlisted: "bg-purple-100 text-purple-700",
  interview: "bg-cyan-100 text-cyan-700",
  offer: "bg-indigo-100 text-indigo-700",
  hired: "bg-emerald-100 text-emerald-700",
  waiting_list: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

export default function CandidatePoolShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate, canDelete } = useResourcePermissions("candidate-pool");
  const [pool, setPool] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addNotes, setAddNotes] = useState("");
  const [editingMember, setEditingMember] = useState(null);
  const [editNotes, setEditNotes] = useState("");
  const [editRating, setEditRating] = useState(0);

  useEffect(() => { fetchPool(); }, [id]);

  const fetchPool = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/candidate-pool/${id}`);
      setPool(response.data?.data || response.data);
      setMembers(response.data?.members || []);
    } catch {
      Swal.fire("Error", "Failed to load pool", "error");
      navigate("/recruitment/candidate-pool");
    } finally {
      setLoading(false);
    }
  };

  // Search applications for add modal
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await get(`/recruitment/applications?search=${encodeURIComponent(searchQuery)}`);
        const apps = res.data?.data || [];
        const existingIds = members.map((m) => m.application_id);
        setSearchResults(apps.filter((a) => !existingIds.includes(a.id)));
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddCandidate = async (applicationId) => {
    try {
      await post(`/recruitment/candidate-pool/${id}/members`, {
        application_id: applicationId,
        notes: addNotes,
      });
      Swal.fire({ icon: "success", title: "Candidate added", timer: 1500, showConfirmButton: false });
      setShowAddModal(false);
      setSearchQuery("");
      setAddNotes("");
      setSearchResults([]);
      fetchPool();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to add candidate", "error");
    }
  };

  const handleRemoveMember = async (memberId) => {
    const result = await Swal.fire({
      title: "Remove from pool?", text: "This won't affect the original application.",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Remove",
    });
    if (result.isConfirmed) {
      try {
        await del(`/recruitment/candidate-pool/${id}/members/${memberId}`);
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        Swal.fire({ icon: "success", title: "Removed", timer: 1200, showConfirmButton: false });
      } catch { Swal.fire("Error", "Failed to remove", "error"); }
    }
  };

  const openEditMember = (member) => {
    setEditingMember(member);
    setEditNotes(member.notes || "");
    setEditRating(member.rating || 0);
  };

  const handleUpdateMember = async () => {
    try {
      await put(`/recruitment/candidate-pool/${id}/members/${editingMember.id}`, {
        notes: editNotes,
        rating: editRating || null,
      });
      setMembers((prev) => prev.map((m) => m.id === editingMember.id ? { ...m, notes: editNotes, rating: editRating || null } : m));
      setEditingMember(null);
      Swal.fire({ icon: "success", title: "Updated", timer: 1200, showConfirmButton: false });
    } catch { Swal.fire("Error", "Failed to update", "error"); }
  };

  const StarRating = ({ value, onChange, readonly = false }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" disabled={readonly}
          onClick={() => onChange && onChange(star === value ? 0 : star)}
          className={`${readonly ? "" : "cursor-pointer hover:scale-110"} transition-transform`}>
          <svg className={`w-4 h-4 ${star <= value ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
      </div>
    );
  }

  if (!pool) return null;

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/recruitment/candidate-pool")}
            className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800">{pool.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${CATEGORY_COLORS[pool.category] || CATEGORY_COLORS.other}`}>
                {pool.category}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${pool.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {pool.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {pool.description && <p className="text-xs text-gray-500 mt-1">{pool.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {canUpdate && (
            <button onClick={() => navigate(`/recruitment/candidate-pool/edit/${id}`)}
              className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Pool
            </button>
          )}
          <button onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all flex items-center gap-1.5 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Candidate
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Total Candidates</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{members.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Avg Rating</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {members.filter((m) => m.rating).length > 0
              ? (members.filter((m) => m.rating).reduce((a, m) => a + m.rating, 0) / members.filter((m) => m.rating).length).toFixed(1)
              : "-"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">With Notes</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{members.filter((m) => m.notes).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Category</p>
          <p className="text-lg font-bold text-gray-800 mt-1 capitalize">{pool.category}</p>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Pool Members</h3>
          <span className="text-xs text-gray-400">{members.length} candidates</span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No candidates in this pool yet</p>
            <p className="text-xs text-gray-400 mt-1">Add candidates from applications to build your talent pipeline</p>
            <button onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add First Candidate
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Position Applied</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Experience</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Added</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((member) => {
                  const app = member.application;
                  if (!app) return null;
                  return (
                    <tr key={member.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-[10px] flex-shrink-0">
                            {app.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{app.full_name}</p>
                            <p className="text-[10px] text-gray-400">{app.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{app.job_posting?.title || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_COLORS[app.status] || STATUS_COLORS.withdrawn}`}>
                          {app.status?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{app.total_experience_years ? `${app.total_experience_years} yrs` : "-"}</td>
                      <td className="px-4 py-3">
                        <StarRating value={member.rating || 0} readonly />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate" title={member.notes}>
                        {member.notes || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {member.created_at ? new Date(member.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/recruitment/applications/show/${app.id}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View Application">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button onClick={() => openEditMember(member)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Notes/Rating">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Add Candidate to Pool</h3>
              <button onClick={() => { setShowAddModal(false); setSearchQuery(""); setSearchResults([]); setAddNotes(""); }}
                className="p-1 hover:bg-teal-100 rounded-lg transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Search Applications</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or contact..."
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                </div>
              </div>

              {/* Search Results */}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {searching && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-teal-600 border-t-transparent"></div>
                  </div>
                )}
                {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <p className="text-xs text-gray-400 text-center py-4">No matching applications found</p>
                )}
                {searchResults.map((app) => (
                  <div key={app.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-[10px]">
                        {app.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{app.full_name}</p>
                        <p className="text-[10px] text-gray-400">{app.job_posting?.title || "N/A"} &middot; <span className="capitalize">{app.status?.replace(/_/g, " ")}</span></p>
                      </div>
                    </div>
                    <button onClick={() => handleAddCandidate(app.id)}
                      className="px-3 py-1.5 bg-teal-600 text-white text-[10px] font-semibold rounded-lg hover:bg-teal-700 transition-colors">
                      Add
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                <textarea value={addNotes} onChange={(e) => setAddNotes(e.target.value)} rows={2}
                  placeholder="Why is this candidate being added to the pool?"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100">
              <h3 className="text-sm font-bold text-gray-800">Edit Member Details</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">{editingMember.application?.full_name}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Rating</label>
                <StarRating value={editRating} onChange={setEditRating} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3}
                  placeholder="HR notes about this candidate..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button onClick={() => setEditingMember(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleUpdateMember}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
