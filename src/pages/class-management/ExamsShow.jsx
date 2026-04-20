import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get, del } from "../../api/axios";

const TYPE_LABELS = {
  weekly: { label: "Weekly Exam", color: "teal" },
  monthly: { label: "Monthly Exam", color: "blue" },
  mid_term: { label: "چهارنیم ماهه / Mid-Term Exam", color: "violet" },
  annual: { label: "Annual / Final Exam", color: "amber" },
};

const STATUS_STYLES = {
  scheduled: { bg: "bg-blue-100", text: "text-blue-700", label: "Scheduled" },
  ongoing: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Ongoing" },
  completed: { bg: "bg-gray-200", text: "text-gray-700", label: "Completed" },
  cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
};

const COLOR = {
  teal: { grad: "from-teal-500 to-teal-600", soft: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
  blue: { grad: "from-blue-500 to-blue-600", soft: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  violet: { grad: "from-violet-500 to-violet-600", soft: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" },
  amber: { grad: "from-amber-500 to-amber-600", soft: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
};

const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export default function ExamsShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExam();
  }, [id]);

  const fetchExam = async () => {
    setLoading(true);
    try {
      const res = await get(`/class-management/exams/show/${id}`);
      setExam(res.data?.data || res.data);
    } catch (err) {
      Swal.fire("Error", "Failed to load exam", "error");
      navigate("/class-management/exams");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await Swal.fire({
      title: "Delete this exam?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });
    if (!ok.isConfirmed) return;
    try {
      await del(`/class-management/exams/delete/${id}`);
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      navigate("/class-management/exams");
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Delete failed", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-100 border-t-teal-600"></div>
      </div>
    );
  }

  if (!exam) return null;

  const typeInfo = TYPE_LABELS[exam.exam_type] || TYPE_LABELS.weekly;
  const c = COLOR[typeInfo.color];
  const st = STATUS_STYLES[exam.status] || STATUS_STYLES.scheduled;
  const duration = (() => {
    if (!exam.start_time || !exam.end_time) return "—";
    const [sh, sm] = exam.start_time.split(":").map(Number);
    const [eh, em] = exam.end_time.split(":").map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m ? m + "m" : ""}`.trim() : `${m}m`;
  })();

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/class-management/exams")} className="p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Exam Details</h1>
            <p className="text-xs text-gray-500 mt-0.5">{typeInfo.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/class-management/exams/edit/${id}`)} className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-xs font-semibold flex items-center gap-2 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 text-xs font-semibold flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Banner */}
        <div className={`bg-gradient-to-r ${c.grad} px-6 py-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <div>
                <p className="text-white/80 text-xs font-medium">{typeInfo.label}</p>
                <h2 className="text-2xl font-bold text-white">{exam.subject?.subject_name || "—"}</h2>
                <p className="text-white/90 text-sm mt-0.5">{exam.school_class?.class_name || "—"}{exam.school_class?.grade?.name ? ` · ${exam.school_class.grade.name}` : ""}</p>
              </div>
            </div>
            <span className={`${st.bg} ${st.text} px-3 py-1.5 rounded-full text-xs font-bold`}>{st.label}</span>
          </div>
        </div>

        <div className="p-6">
          {/* Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`${c.soft} rounded-xl p-4 border ${c.border}`}>
              <p className={`text-[10px] font-semibold ${c.text} uppercase tracking-wide mb-1`}>Date</p>
              <p className="text-sm font-bold text-gray-800">{fmtDate(exam.exam_date)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">Time</p>
              <p className="text-sm font-bold text-gray-800">{fmtTime(exam.start_time)} – {fmtTime(exam.end_time)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wide mb-1">Duration</p>
              <p className="text-sm font-bold text-gray-800">{duration}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Marks</p>
              <p className="text-sm font-bold text-gray-800">{exam.total_marks} <span className="text-[10px] text-gray-500 font-normal">(pass: {exam.passing_marks})</span></p>
            </div>
          </div>

          {/* Details */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Subject</label>
                <p className="text-sm font-semibold text-gray-800 mt-1">{exam.subject?.subject_name || "—"}</p>
                {exam.subject?.subject_code && <p className="text-[11px] text-gray-500">Code: {exam.subject.subject_code}</p>}
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Class</label>
                <p className="text-sm font-semibold text-gray-800 mt-1">{exam.school_class?.class_name || "—"}</p>
                <p className="text-[11px] text-gray-500">
                  {exam.school_class?.grade?.name && <span>{exam.school_class.grade.name}</span>}
                  {exam.school_class?.section && <span> · Section {exam.school_class.section}</span>}
                  {exam.school_class?.shift && <span> · {exam.school_class.shift}</span>}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Invigilator</label>
                <p className="text-sm font-semibold text-gray-800 mt-1">
                  {exam.teacher?.staff?.application?.full_name || "Not assigned"}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Academic Term</label>
                <p className="text-sm font-semibold text-gray-800 mt-1">{exam.academic_term?.name || "—"}</p>
                {exam.academic_term?.is_current && <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">CURRENT</span>}
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Room</label>
                <p className="text-sm font-semibold text-gray-800 mt-1">{exam.room || exam.school_class?.room_number || "Not assigned"}</p>
                {exam.school_class?.capacity && <p className="text-[11px] text-gray-500">Capacity: {exam.school_class.capacity} students</p>}
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Exam Type</label>
                <p className="text-sm font-semibold text-gray-800 mt-1">{typeInfo.label}</p>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                <p className="text-sm font-semibold text-gray-800 mt-1">{st.label}</p>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Passing Score</label>
                <p className="text-sm font-semibold text-gray-800 mt-1">{exam.passing_marks} / {exam.total_marks} marks</p>
                <p className="text-[11px] text-gray-500">{exam.total_marks ? Math.round((exam.passing_marks / exam.total_marks) * 100) : 0}% pass threshold</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {exam.notes && (
            <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
              <label className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Notes</label>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{exam.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap gap-6 text-[11px] text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            <span>Created: {exam.created_at ? new Date(exam.created_at).toLocaleDateString() : "—"}</span>
          </div>
          {exam.updated_at && exam.updated_at !== exam.created_at && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
              <span>Updated: {new Date(exam.updated_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
