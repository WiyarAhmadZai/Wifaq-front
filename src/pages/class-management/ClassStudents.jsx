import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get } from "../../api/axios";
import { fmtDate } from "../../utils/formErrors";

const STATUS = {
  active: "bg-teal-50 text-teal-700",
  pending: "bg-amber-50 text-amber-700",
  graduated: "bg-blue-50 text-blue-700",
  withdrawn: "bg-gray-100 text-gray-500",
  transferred: "bg-violet-50 text-violet-700",
};

export default function ClassStudents() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [info, setInfo] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    get(`/class-management/classes/students/${id}`)
      .then((r) => { setInfo(r.data?.class || null); setRows(r.data?.data || []); })
      .catch((e) => { if (e.response?.status === 403) setForbidden(true); })
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) => s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.father_name?.toLowerCase().includes(q));
  }, [rows, search]);

  if (forbidden) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-semibold text-gray-600">You don't teach this class.</p>
        <button onClick={() => navigate("/class-management/classes")} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600">← Back to classes</button>
      </div>
    );
  }

  const males = rows.filter((s) => s.gender === "male").length;
  const females = rows.filter((s) => s.gender === "female").length;

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/class-management/classes")} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-800">{info?.class_name || "Class"} — Students</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {info?.grade || ""}{info?.shift ? ` · ${info.shift === "morning" ? "Morning" : "Afternoon"}` : ""}{info?.academic_term ? ` · ${info.academic_term}` : ""}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Enrolled" value={`${rows.length}${info?.capacity ? ` / ${info.capacity}` : ""}`} primary />
        <Stat label="Boys" value={males} />
        <Stat label="Girls" value={females} />
        <Stat label="Active" value={rows.filter((s) => s.status === "active").length} />
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, or father…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <Th>Student</Th><Th>Gender</Th><Th>Age</Th><Th>Father</Th><Th center>Status</Th><Th center>Enrollment</Th><Th right>Monthly Fee</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                    onClick={() => navigate(`/student-management/students/profile/${s.id}`)} title="Open شناسنامه">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(s.full_name?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{s.full_name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{s.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.gender === "female" ? "bg-pink-50 text-pink-600" : "bg-blue-50 text-blue-600"}`}>
                        {s.gender || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{s.age ?? "—"}<span className="text-[11px] text-gray-400 ml-1">{s.date_of_birth ? `· ${fmtDate(s.date_of_birth)}` : ""}</span></td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{s.father_name || "—"}</p>
                      <p className="text-[11px] text-gray-400">{s.father_phone || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS[s.status] || "bg-gray-100 text-gray-600"}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.registration_status === "phase_2"
                        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">Enrolled</span>
                        : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">Phase 1</span>}
                      {s.enrollment_type === "transfer" && <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700">Transfer</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">{s.final_fee ? `${Number(s.final_fee).toLocaleString()} AFN` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm font-medium text-gray-600">No students in this class{search ? " match your search" : ""}.</p>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100"><p className="text-xs text-gray-400">Showing {filtered.length} student{filtered.length !== 1 ? "s" : ""}</p></div>
          )}
        </div>
      )}
    </div>
  );
}

const Th = ({ children, center, right }) => (
  <th className={`px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider ${center ? "text-center" : right ? "text-right" : "text-left"}`}>{children}</th>
);
const Stat = ({ label, value, primary }) => (
  <div className={`flex items-center gap-3 p-4 rounded-2xl border ${primary ? "bg-teal-600 border-teal-600" : "bg-white border-teal-100"}`}>
    <div>
      <p className={`text-[10px] font-medium ${primary ? "text-teal-100" : "text-gray-500"}`}>{label}</p>
      <p className={`text-xl font-bold leading-tight ${primary ? "text-white" : "text-gray-800"}`}>{value}</p>
    </div>
  </div>
);
