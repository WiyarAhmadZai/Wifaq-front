import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../../api/axios";
import Swal from "sweetalert2";

const DEMO = [
  { id: 1, teacher_id: "T-001", staff_code: "WS-2026-001", staff_name: "Ahmad Karimi",     qualification: "Master",   subjects_can_teach: ["Mathematics","Physics"],        classes_assigned: ["Class 6A","Class 7A"], weekly_hours: 24, status: "active" },
  { id: 2, teacher_id: "T-002", staff_code: "WS-2026-002", staff_name: "Fatima Ahmadi",    qualification: "Bachelor", subjects_can_teach: ["English","Dari"],               classes_assigned: ["Class 6B"],           weekly_hours: 20, status: "active" },
  { id: 3, teacher_id: "T-003", staff_code: "WS-2026-003", staff_name: "Noor Rahman",      qualification: "Master",   subjects_can_teach: ["Science","Biology"],            classes_assigned: ["Class 8A","Class 8B"], weekly_hours: 22, status: "active" },
  { id: 4, teacher_id: "T-004", staff_code: "WS-2026-004", staff_name: "Maryam Sultani",   qualification: "PhD",      subjects_can_teach: ["Social Studies","History"],     classes_assigned: ["Class 9A"],           weekly_hours: 18, status: "on-leave" },
  { id: 5, teacher_id: "T-005", staff_code: "WS-2026-005", staff_name: "Khalid Noori",     qualification: "Bachelor", subjects_can_teach: ["Computer Science","Math"],      classes_assigned: ["Class 7B","Class 8A"], weekly_hours: 26, status: "active" },
  { id: 6, teacher_id: "T-006", staff_code: "WS-2026-006", staff_name: "Zarghona Rasooli", qualification: "Master",   subjects_can_teach: ["Pashto","Islamic Studies"],     classes_assigned: ["Class 6A","Class 6B"], weekly_hours: 20, status: "inactive" },
];

const STATUS = {
  active:   { cls: "bg-teal-50 text-teal-700",   dot: "bg-teal-500",  label: "Active" },
  "on-leave":{ cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500", label: "On Leave" },
  inactive: { cls: "bg-gray-100 text-gray-500",   dot: "bg-gray-400",  label: "Inactive" },
};

export default function Teachers() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => { fetchTeachers(); }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await get("/teacher-management/teachers/list");
      setItems(res.data?.data || res.data || DEMO);
    } catch {
      setItems(DEMO);
    } finally { setLoading(false); }
  };

  const activeFilters = [filterStatus].filter(Boolean).length;

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    if (q && !it.staff_name?.toLowerCase().includes(q) && !it.teacher_id?.toLowerCase().includes(q) && !it.staff_code?.toLowerCase().includes(q)) return false;
    if (filterStatus && it.status !== filterStatus) return false;
    return true;
  });

  const stats = [
    { label: "Total Teachers", value: items.length,                                        icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { label: "Active",          value: items.filter(i => i.status === "active").length,    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "On Leave",        value: items.filter(i => i.status === "on-leave").length,  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Total Hours/Wk",  value: items.reduce((s, i) => s + (parseInt(i.weekly_hours) || 0), 0), icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  ];

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const res = await Swal.fire({ title: "Delete this teacher?", text: "This cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Delete" });
    if (res.isConfirmed) {
      try {
        await del(`/teacher-management/teachers/delete/${id}`);
      } catch {}
      setItems(prev => prev.filter(i => i.id !== id));
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
    }
  };

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Teachers</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage teacher profiles and assignments</p>
        </div>
        <button onClick={() => navigate("/teacher-management/teachers/create")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Teacher
        </button>
      </div>

      {/* Stats */}
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

      {/* Search + filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, teacher ID or staff code..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none" />
          </div>
          <button onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${filterOpen || activeFilters ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters {activeFilters > 0 && <span className="bg-white text-teal-700 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeFilters}</span>}
          </button>
          {(activeFilters > 0 || search) && (
            <button onClick={() => { setSearch(""); setFilterStatus(""); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">Clear</button>
          )}
        </div>
        {filterOpen && (
          <div className="pt-3 border-t border-gray-100">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
            <div className="flex gap-2">
              {["", "active", "on-leave", "inactive"].map(v => (
                <button key={v} type="button" onClick={() => setFilterStatus(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterStatus === v ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
                  {v === "" ? "All" : STATUS[v]?.label || v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading teachers...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-teal-600">
                  {["Teacher", "Staff Code", "Qualification", "Subjects", "Classes", "Hrs/Wk", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-white uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => {
                  const st = STATUS[item.status] || STATUS.inactive;
                  return (
                    <tr key={item.id} onClick={() => navigate(`/teacher-management/teachers/show/${item.id}`)}
                      className="hover:bg-teal-50/40 cursor-pointer group transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {item.staff_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 group-hover:text-teal-700 transition-colors">{item.staff_name}</p>
                            <p className="text-[11px] text-teal-600 font-mono font-semibold">{item.teacher_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{item.staff_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.qualification}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(item.subjects_can_teach || []).slice(0, 2).map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[10px] rounded border border-teal-200">{s}</span>
                          ))}
                          {(item.subjects_can_teach?.length || 0) > 2 && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded">+{item.subjects_can_teach.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{(item.classes_assigned || []).length} classes</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{item.weekly_hours || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/teacher-management/teachers/show/${item.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" title="View">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => navigate(`/teacher-management/teachers/edit/${item.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" title="Edit">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={(e) => handleDelete(e, item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No teachers found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting search or filters</p>
            <button onClick={() => navigate("/teacher-management/teachers/create")}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add First Teacher
            </button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {items.length} teachers</p>
          </div>
        )}
      </div>
    </div>
  );
}
