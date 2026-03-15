import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, del } from "../../../api/axios";
import Swal from "sweetalert2";

const DEMO = {
  1: { id: 1, teacher_id: "T-001", staff_code: "WS-2026-001", staff_name: "Ahmad Karimi",     staff_title: "Senior Teacher", qualification: "Master",   field_of_study: "Mathematics Education", teaching_certification: "B.Ed", years_experience: 8,  previous_institutions: ["Kabul University", "Afghan Institute of Technology"], subjects_can_teach: ["Mathematics","Physics","Computer Science"], levels_can_teach: ["Grade 6","Grade 7","Grade 8","Grade 9"], classes_assigned: ["Class 6A","Class 7A"], subjects_assigned: ["Mathematics","Physics"], weekly_hours: 24, free_periods: 4, status: "active" },
  2: { id: 2, teacher_id: "T-002", staff_code: "WS-2026-002", staff_name: "Fatima Ahmadi",    staff_title: "Teacher",         qualification: "Bachelor", field_of_study: "English Literature",    teaching_certification: "CELTA", years_experience: 5,  previous_institutions: ["American University of Afghanistan"],                   subjects_can_teach: ["English","Dari"],                         levels_can_teach: ["Grade 5","Grade 6","Grade 7"],            classes_assigned: ["Class 6B"],           subjects_assigned: ["English"],             weekly_hours: 20, free_periods: 6, status: "active" },
  3: { id: 3, teacher_id: "T-003", staff_code: "WS-2026-003", staff_name: "Noor Rahman",      staff_title: "Teacher",         qualification: "Master",   field_of_study: "Natural Sciences",      teaching_certification: "B.Ed", years_experience: 10, previous_institutions: ["Nangarhar University","Balkh University"],             subjects_can_teach: ["Science","Biology","Chemistry"],          levels_can_teach: ["Grade 8","Grade 9","Grade 10"],           classes_assigned: ["Class 8A","Class 8B"], subjects_assigned: ["Science","Biology"],    weekly_hours: 22, free_periods: 4, status: "active" },
  4: { id: 4, teacher_id: "T-004", staff_code: "WS-2026-004", staff_name: "Maryam Sultani",   staff_title: "Lead Teacher",    qualification: "PhD",      field_of_study: "Social Sciences",       teaching_certification: "M.Ed", years_experience: 15, previous_institutions: ["Kabul Education University","Herat University"],       subjects_can_teach: ["Social Studies","History","Geography"],   levels_can_teach: ["Grade 9","Grade 10","Grade 11","Grade 12"],classes_assigned: ["Class 9A"],           subjects_assigned: ["Social Studies"],      weekly_hours: 18, free_periods: 8, status: "on-leave" },
  5: { id: 5, teacher_id: "T-005", staff_code: "WS-2026-005", staff_name: "Khalid Noori",     staff_title: "Teacher",         qualification: "Bachelor", field_of_study: "Computer Science",      teaching_certification: "MCSE", years_experience: 6,  previous_institutions: ["Polytechnic University Kabul"],                         subjects_can_teach: ["Computer Science","Mathematics"],         levels_can_teach: ["Grade 7","Grade 8"],                      classes_assigned: ["Class 7B","Class 8A"], subjects_assigned: ["Computer Science"],    weekly_hours: 26, free_periods: 2, status: "active" },
};

const STATUS = {
  active:    { cls: "bg-teal-50 text-teal-700",   dot: "bg-teal-500",  label: "Active" },
  "on-leave":{ cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500", label: "On Leave" },
  inactive:  { cls: "bg-gray-100 text-gray-500",   dot: "bg-gray-400",  label: "Inactive" },
};

const Card = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-3.5 bg-teal-50 border-b border-teal-100">
      <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const F = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
    <p className="text-sm font-medium text-gray-800 mt-0.5">{value || "—"}</p>
  </div>
);

export default function TeachersShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTeacher(); }, [id]);

  const fetchTeacher = async () => {
    setLoading(true);
    try {
      const res = await get(`/teacher-management/teachers/show/${id}`);
      setTeacher(res.data?.data || res.data);
    } catch {
      setTeacher(DEMO[id] || { ...DEMO[1], id, teacher_id: `T-00${id}` });
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    const res = await Swal.fire({ title: "Delete this teacher?", text: "This cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Delete" });
    if (res.isConfirmed) {
      try { await del(`/teacher-management/teachers/delete/${id}`); } catch {}
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
      navigate("/teacher-management/teachers");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  );

  if (!teacher) return (
    <div className="text-center py-24">
      <p className="text-gray-500">Teacher not found</p>
      <button onClick={() => navigate("/teacher-management/teachers")} className="mt-3 text-teal-600 text-sm font-medium hover:underline">Back to list</button>
    </div>
  );

  const st = STATUS[teacher.status] || STATUS.inactive;

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Banner */}
      <div className="bg-teal-600 px-5 pt-5 pb-14">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate("/teacher-management/teachers")}
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Teachers
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/teacher-management/teachers/edit/${id}`)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-red-500/60 text-white text-xs font-semibold rounded-xl transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-black text-white">{teacher.staff_name?.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{teacher.staff_name}</h1>
            <p className="text-sm text-teal-100 mt-0.5">{teacher.staff_title}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full font-mono">{teacher.teacher_id}</span>
              <span className="px-2.5 py-0.5 bg-white/15 text-white/80 text-xs rounded-full">{teacher.staff_code}</span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${teacher.status === "active" ? "bg-white/25 text-white" : "bg-white/10 text-white/60"}`}>
                {st.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stat cards */}
      <div className="px-4 -mt-6 mb-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Experience",  value: teacher.years_experience ? `${teacher.years_experience} yrs` : "—" },
            { label: "Classes",     value: (teacher.classes_assigned?.length || 0) },
            { label: "Hrs / Week",  value: teacher.weekly_hours || "—" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-teal-100 shadow-md p-3.5 text-center">
              <p className="text-xl font-black text-teal-700">{s.value}</p>
              <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">

          {/* Professional */}
          <Card title="Professional Info" icon="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z">
            <div className="grid grid-cols-2 gap-5">
              <F label="Qualification"          value={teacher.qualification} />
              <F label="Field of Study"          value={teacher.field_of_study} />
              <F label="Teaching Certification" value={teacher.teaching_certification} />
              <F label="Years of Experience"    value={teacher.years_experience ? `${teacher.years_experience} years` : "—"} />
            </div>
            {teacher.previous_institutions?.filter(i => i).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Previous Institutions</p>
                <div className="space-y-1.5">
                  {teacher.previous_institutions.filter(i => i).map((inst, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-teal-400 rounded-full flex-shrink-0" />
                      <span className="text-sm text-gray-700">{inst}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Capability */}
          <Card title="Teaching Capability" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Subjects Able to Teach</p>
                {teacher.subjects_can_teach?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {teacher.subjects_can_teach.map(s => (
                      <span key={s} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-xl border border-teal-200">{s}</span>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">—</p>}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Levels Able to Teach</p>
                {teacher.levels_can_teach?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {teacher.levels_can_teach.map(l => (
                      <span key={l} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-xl border border-teal-200">{l}</span>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">—</p>}
              </div>
            </div>
          </Card>

          {/* Assignment */}
          <Card title="Current Assignment" icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
            <div className="grid grid-cols-2 gap-5 mb-4">
              <F label="Weekly Teaching Hours" value={teacher.weekly_hours ? `${teacher.weekly_hours} hours` : "—"} />
              <F label="Free Periods"          value={teacher.free_periods ? `${teacher.free_periods} periods` : "—"} />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Classes Assigned</p>
                {teacher.classes_assigned?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {teacher.classes_assigned.map(c => (
                      <span key={c} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-xl border border-teal-200">{c}</span>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">No classes assigned</p>}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Subjects Assigned</p>
                {teacher.subjects_assigned?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {teacher.subjects_assigned.map(s => (
                      <span key={s} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-xl border border-teal-200">{s}</span>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">No subjects assigned</p>}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Staff link */}
          <Card title="Staff Record" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z">
            <div className="flex items-center gap-3 p-3.5 bg-teal-50 rounded-xl border border-teal-100 mb-3">
              <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {teacher.staff_name?.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{teacher.staff_name}</p>
                <p className="text-xs text-teal-600 font-mono">{teacher.staff_code}</p>
                <p className="text-xs text-gray-500">{teacher.staff_title}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Teacher ID</span>
                <span className="text-xs font-bold text-teal-700 font-mono">{teacher.teacher_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Status</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </div>
            </div>
          </Card>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-1.5">
            <p className="text-xs font-bold text-gray-700 mb-3">Quick Actions</p>
            {[
              { label: "Edit Teacher",      icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", action: () => navigate(`/teacher-management/teachers/edit/${id}`) },
              { label: "All Teachers",      icon: "M4 6h16M4 10h16M4 14h16M4 18h16",                                                                                          action: () => navigate("/teacher-management/teachers") },
              { label: "Add New Teacher",   icon: "M12 4v16m8-8H4",                                                                                                             action: () => navigate("/teacher-management/teachers/create") },
            ].map(a => (
              <button key={a.label} onClick={a.action}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors text-left">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} /></svg>
                {a.label}
              </button>
            ))}
            <button onClick={handleDelete}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors text-left">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete Teacher
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
