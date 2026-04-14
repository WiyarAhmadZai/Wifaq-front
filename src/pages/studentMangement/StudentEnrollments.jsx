import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";
import TransferStepsModal from "./TransferStepsModal";

const statusStyles = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  graduated: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Graduated" },
  withdrawn: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400", label: "Withdrawn" },
  transferred: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Transferred" },
};

export default function StudentEnrollments() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterTerm, setFilterTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });

  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [transferStudent, setTransferStudent] = useState(null);

  const fetchItems = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("registration_status", "phase_2");
        if (search) params.append("search", search);
        if (filterClass) params.append("class_id", filterClass);
        if (filterTerm) params.append("academic_term_id", filterTerm);
        if (filterStatus) params.append("status", filterStatus);

        const res = await get(`/student-management/students/list?${params.toString()}`);
        setItems(res.data?.data || []);
        if (res.data?.meta) setMeta(res.data.meta);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [search, filterClass, filterTerm, filterStatus],
  );

  useEffect(() => {
    const t = setTimeout(() => fetchItems(1), 400);
    return () => clearTimeout(t);
  }, [search, filterClass, filterTerm, filterStatus]);

  useEffect(() => {
    (async () => {
      try {
        const r1 = await get("/class-management/classes/list?per_page=1000");
        setClasses(r1.data?.data || []);
      } catch {}
      try {
        const r2 = await get("/academic-terms/list");
        setTerms(r2.data?.data || []);
      } catch {}
    })();
  }, []);

  const activeFilters = [filterClass, filterTerm, filterStatus].filter(Boolean).length;

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const res = await Swal.fire({
      title: "Remove this enrollment?",
      text: "This cannot be undone — the student record will be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
    });
    if (res.isConfirmed) {
      try {
        await del(`/student-management/students/delete/${id}`);
      } catch {}
      fetchItems(meta.current_page);
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
    }
  };

  const stats = [
    { label: "Total Enrollments", value: meta.total, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Active", value: items.filter((i) => i.status === "active").length, icon: "M5 13l4 4L19 7" },
    { label: "Total Monthly Fee", value: items.reduce((s, i) => s + Number(i.final_fee || 0), 0).toLocaleString() + " AFN", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Phase 2 Enrollments</h1>
          <p className="text-xs text-gray-400 mt-0.5">Officially enrolled students — Phase 2 completed</p>
        </div>
        <button
          onClick={() => navigate("/student-management/student-enrollments/create")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Enrollment
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${i === 0 ? "bg-teal-600 border-teal-600" : "bg-white border-teal-100"}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-white/20" : "bg-teal-50"}`}>
              <svg className={`w-4 h-4 ${i === 0 ? "text-white" : "text-teal-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
              </svg>
            </div>
            <div>
              <p className={`text-[10px] font-medium ${i === 0 ? "text-teal-100" : "text-gray-500"}`}>{s.label}</p>
              <p className={`text-xl font-bold leading-tight ${i === 0 ? "text-white" : "text-gray-800"}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or student ID..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            />
          </div>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${filterOpen || activeFilters ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFilters > 0 && <span className="w-4 h-4 rounded-full bg-white text-teal-700 text-[10px] font-bold flex items-center justify-center">{activeFilters}</span>}
          </button>
          {(activeFilters > 0 || search) && (
            <button
              onClick={() => { setSearch(""); setFilterClass(""); setFilterTerm(""); setFilterStatus(""); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
        {filterOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-gray-100">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Class</label>
              <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All Classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Academic Term</label>
              <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All Terms</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="graduated">Graduated</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
          <p className="mt-2 text-gray-400 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Family</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Enrolled</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Transfer</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const st = statusStyles[item.status] || statusStyles.active;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => navigate(`/student-management/student-enrollments/show/${item.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(item.first_name || "?").charAt(0)}{(item.last_name || "").charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{item.first_name} {item.last_name}</p>
                            <p className="text-[10px] font-mono text-gray-400">{item.student_id || `#${item.id}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{item.school_class?.class_name || "—"}</p>
                        <p className="text-[10px] text-gray-400">{item.academic_term?.name || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{item.family?.father_name || "—"}</p>
                        <p className="text-[10px] text-gray-400">{item.family?.father_phone || ""}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-semibold text-gray-800">
                          {item.final_fee ? `${Number(item.final_fee).toLocaleString()} AFN` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[11px] text-gray-500">
                          {item.phase_2_completed_at ? new Date(item.phase_2_completed_at).toLocaleDateString() : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.bg} ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.enrollment_type !== "transfer" ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : item.transfer_case_status === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            ok — completed
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setTransferStudent(item); }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full"
                          >
                            {item.transfer_case_status === "in_progress" ? "In Progress" : "Start"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {item.enrollment_type === "transfer" && (
                            <button
                              onClick={() => setTransferStudent(item)}
                              className={`p-1.5 rounded-lg ${
                                item.transfer_case_status === "completed"
                                  ? "text-emerald-600 hover:bg-emerald-50"
                                  : "text-amber-600 hover:bg-amber-50"
                              }`}
                              title={
                                item.transfer_case_status === "completed"
                                  ? "Transfer: completed"
                                  : `Transfer: ${item.transfer_case_status || "pending"}`
                              }
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/student-management/student-enrollments/show/${item.id}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg"
                            title="View"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => navigate(`/student-management/student-enrollments/edit/${item.id}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
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

          {items.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">No Phase 2 enrollments found</p>
              <p className="text-xs text-gray-400 mt-1">Complete Phase 2 for a Phase 1 student to see them here</p>
            </div>
          )}

          {transferStudent && (
            <TransferStepsModal
              student={transferStudent}
              onClose={() => setTransferStudent(null)}
              onSaved={() => fetchItems(meta.current_page)}
            />
          )}

          {meta.last_page > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing {(meta.current_page - 1) * meta.per_page + 1}-{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchItems(meta.current_page - 1)}
                  disabled={meta.current_page <= 1}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchItems(meta.current_page + 1)}
                  disabled={meta.current_page >= meta.last_page}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
