import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post, put, del } from "../../api/axios";

const EXAM_TYPES = [
  { key: "weekly", label: "Weekly", sub: "One week view — period grid", color: "teal", rangeDays: 6, hasPeriods: true },
  { key: "monthly", label: "Monthly", sub: "Full month view — period grid", color: "blue", rangeDays: 30, hasPeriods: true },
  { key: "mid_term", label: "چهارنیم ماهه / Mid-Term", sub: "Mid-term exam schedule — list view", color: "violet", rangeDays: 14, hasPeriods: false },
  { key: "annual", label: "Annual / Final", sub: "Final exam schedule — list view", color: "amber", rangeDays: 14, hasPeriods: false },
];

const PERIODS = [
  { n: 1, label: "Period 1", start: "08:00", end: "09:00" },
  { n: 2, label: "Period 2", start: "09:00", end: "10:00" },
  { n: 3, label: "Period 3", start: "10:00", end: "11:00" },
  { n: 4, label: "Period 4", start: "11:00", end: "12:00" },
  { n: 5, label: "Period 5", start: "12:00", end: "13:00" },
  { n: 6, label: "Period 6", start: "13:00", end: "14:00" },
];

const STATUS_STYLES = {
  scheduled: { bg: "bg-blue-500", text: "text-white", label: "Scheduled" },
  ongoing: { bg: "bg-emerald-500", text: "text-white", label: "Ongoing" },
  completed: { bg: "bg-gray-500", text: "text-white", label: "Completed" },
  cancelled: { bg: "bg-red-500", text: "text-white", label: "Cancelled" },
};

const TYPE_COLOR = {
  teal: { grad: "from-teal-500 to-teal-600", soft: "bg-teal-50", border: "border-teal-200", ring: "ring-teal-400", text: "text-teal-700", cellBg: "bg-teal-100 hover:bg-teal-200 border-teal-300", cellText: "text-teal-900" },
  blue: { grad: "from-blue-500 to-blue-600", soft: "bg-blue-50", border: "border-blue-200", ring: "ring-blue-400", text: "text-blue-700", cellBg: "bg-blue-100 hover:bg-blue-200 border-blue-300", cellText: "text-blue-900" },
  violet: { grad: "from-violet-500 to-violet-600", soft: "bg-violet-50", border: "border-violet-200", ring: "ring-violet-400", text: "text-violet-700", cellBg: "bg-violet-100 hover:bg-violet-200 border-violet-300", cellText: "text-violet-900" },
  amber: { grad: "from-amber-500 to-amber-600", soft: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-400", text: "text-amber-700", cellBg: "bg-amber-100 hover:bg-amber-200 border-amber-300", cellText: "text-amber-900" },
};

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const getWeekStart = (date) => {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 6 ? 0 : dow + 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getPeriodForExam = (startTime) => {
  if (!startTime) return null;
  const [h, m] = startTime.split(":").map(Number);
  const mins = h * 60 + m;
  for (const p of PERIODS) {
    const [ph, pm] = p.start.split(":").map(Number);
    const [eh, em] = p.end.split(":").map(Number);
    if (mins >= ph * 60 + pm && mins < eh * 60 + em) return p.n;
  }
  return 1;
};

export default function Exams() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("weekly");
  const [exams, setExams] = useState([]);
  const [formData, setFormData] = useState({ classes: [], terms: [], subjects: [], teachers: [], gradeSubjects: [] });
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedShift, setSelectedShift] = useState(""); // "", "morning", "afternoon"
  const [loading, setLoading] = useState(false);
  const [anchor, setAnchor] = useState(() => getWeekStart(new Date()));
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ start_date: ymd(new Date()), duration_minutes: 60, total_marks: 100, replace_existing: false, all_classes: false });
  const [generating, setGenerating] = useState(false);
  const [dragExam, setDragExam] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);

  // Quick-add modal (for period grid tabs)
  const [quickAdd, setQuickAdd] = useState(null);
  const [quickForm, setQuickForm] = useState({ school_class_id: "", subject_id: "", teacher_id: "", room: "", total_marks: 100, passing_marks: 40 });
  const [quickTeachers, setQuickTeachers] = useState([]);
  const [quickSaving, setQuickSaving] = useState(false);

  // Manual-add modal for list view (mid-term/annual) + "New Exam" button
  const [listAdd, setListAdd] = useState(null);
  const [listForm, setListForm] = useState({ school_class_id: "", subject_id: "", teacher_id: "", exam_date: "", period: 1, room: "", total_marks: 100, passing_marks: 40 });
  const [listTeachers, setListTeachers] = useState([]);
  const [listSaving, setListSaving] = useState(false);
  const [listShowAllTeachers, setListShowAllTeachers] = useState(false);

  // Edit modal
  const [editAdd, setEditAdd] = useState(null);
  const [editForm, setEditForm] = useState({ school_class_id: "", subject_id: "", teacher_id: "", exam_date: "", period: 1, room: "", total_marks: 100, passing_marks: 40, status: "scheduled" });
  const [editTeachers, setEditTeachers] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editShowAllTeachers, setEditShowAllTeachers] = useState(false);

  // Quick-add show-all flag
  const [quickShowAllTeachers, setQuickShowAllTeachers] = useState(false);

  useEffect(() => { fetchFormData(); }, []);
  useEffect(() => { fetchExams(); }, [activeTab, selectedClass, selectedTerm, anchor]);

  // Auto-open edit modal when ?edit=id is in URL
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && formData.classes.length > 0) {
      (async () => {
        try {
          const res = await get(`/class-management/exams/show/${editId}`);
          const exam = res.data?.data || res.data;
          if (exam) {
            // Switch to the exam's type tab
            if (exam.exam_type && exam.exam_type !== activeTab) {
              setActiveTab(exam.exam_type);
            }
            openEdit(exam);
            searchParams.delete("edit");
            setSearchParams(searchParams, { replace: true });
          }
        } catch (err) {
          console.error("Failed to load exam for edit", err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.classes, searchParams]);

  useEffect(() => {
    const type = EXAM_TYPES.find((t) => t.key === activeTab);
    if (!type) return;
    if (activeTab === "monthly") {
      const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
      setAnchor(d);
    } else {
      setAnchor(getWeekStart(new Date()));
    }
  }, [activeTab]);

  const fetchFormData = async () => {
    try {
      const res = await get("/class-management/exams/form-data");
      const d = res.data?.data || {};
      setFormData(d);
      const currentTerm = (d.terms || []).find((t) => t.is_current) || d.terms?.[0];
      if (currentTerm) setSelectedTerm(currentTerm.id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExams = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams({ exam_type: activeTab });
      if (selectedClass) params.append("school_class_id", selectedClass);
      if (selectedTerm) params.append("academic_term_id", selectedTerm);
      const res = await get(`/class-management/exams/list?${params.toString()}`);
      setExams(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const activeType = EXAM_TYPES.find((t) => t.key === activeTab);
  const activeColor = TYPE_COLOR[activeType.color];

  // View dates for grid tabs
  const viewDates = useMemo(() => {
    if (!activeType.hasPeriods) return [];
    const dates = [];
    if (activeTab === "monthly") {
      const start = new Date(anchor); start.setDate(1);
      const month = start.getMonth();
      const cursor = new Date(start);
      while (cursor.getMonth() === month) {
        if (cursor.getDay() !== 5) dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      for (let i = 0; i < activeType.rangeDays; i++) {
        const d = addDays(anchor, i);
        if (d.getDay() !== 5) dates.push(d);
      }
    }
    return dates;
  }, [activeTab, anchor, activeType]);

  // Filter classes by selectedClass + selectedShift
  const filteredClasses = useMemo(() => {
    let list = formData.classes;
    if (selectedClass) list = list.filter((c) => String(c.id) === String(selectedClass));
    if (selectedShift) list = list.filter((c) => (c.shift || "morning") === selectedShift);
    return list;
  }, [formData.classes, selectedClass, selectedShift]);

  // Build per-class info { id → { className, grade, ..., exams[] } }
  const buildClassMap = (classes) => {
    const grouped = {};
    classes.forEach((c) => {
      grouped[c.id] = {
        id: c.id,
        className: c.class_name,
        grade: c.grade?.name || "",
        gradeId: c.grade_id,
        roomNumber: c.room_number || "",
        capacity: c.capacity || null,
        section: c.section || "",
        shift: c.shift || "morning",
        exams: [],
      };
    });
    exams.forEach((e) => {
      if (grouped[e.school_class_id]) grouped[e.school_class_id].exams.push(e);
    });
    return grouped;
  };

  // Split filtered classes by shift
  const shiftGroups = useMemo(() => {
    const morning = filteredClasses.filter((c) => (c.shift || "morning") === "morning");
    const afternoon = filteredClasses.filter((c) => c.shift === "afternoon");
    return {
      morning: buildClassMap(morning),
      afternoon: buildClassMap(afternoon),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClasses, exams]);

  const viewLabel = useMemo(() => {
    if (viewDates.length === 0) return "";
    if (activeTab === "monthly") return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const first = viewDates[0], last = viewDates[viewDates.length - 1];
    const opts = { month: "short", day: "numeric" };
    return `${first.toLocaleDateString("en-US", opts)} – ${last.toLocaleDateString("en-US", opts)}, ${last.getFullYear()}`;
  }, [viewDates, anchor, activeTab]);

  const navigatePeriod = (dir) => {
    if (activeTab === "monthly") {
      const d = new Date(anchor); d.setMonth(d.getMonth() + dir); d.setDate(1); setAnchor(d);
    } else {
      setAnchor(addDays(anchor, dir * activeType.rangeDays));
    }
  };

  const jumpToToday = () => {
    if (activeTab === "monthly") {
      const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setAnchor(d);
    } else {
      setAnchor(getWeekStart(new Date()));
    }
  };

  const handleDelete = async (exam) => {
    const ok = await Swal.fire({
      title: "Delete this exam?",
      text: `${exam.subject?.subject_name} — ${new Date(exam.exam_date).toLocaleDateString()}`,
      icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Yes, delete",
    });
    if (!ok.isConfirmed) return;
    try {
      await del(`/class-management/exams/delete/${exam.id}`);
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Delete failed", "error");
    }
  };

  const handleGenerate = async () => {
    if (!selectedTerm) {
      Swal.fire("Select term", "Pick an academic term before generating", "warning"); return;
    }
    const canAllClasses = !activeType.hasPeriods; // mid_term or annual
    if (!canAllClasses && !selectedClass) {
      Swal.fire("Select class", "Pick a class for weekly/monthly auto-generate", "warning"); return;
    }
    setGenerating(true);
    try {
      const payload = {
        exam_type: activeTab,
        academic_term_id: selectedTerm,
        start_date: genForm.start_date,
        duration_minutes: genForm.duration_minutes,
        total_marks: genForm.total_marks,
        replace_existing: genForm.replace_existing,
      };
      if (!canAllClasses || !genForm.all_classes) {
        if (selectedClass) payload.school_class_id = selectedClass;
      }
      const res = await post("/class-management/exams/generate", payload);
      Swal.fire({ icon: "success", title: res.data?.message || "Generated", timer: 1500, showConfirmButton: false });
      setShowGenerate(false);
      fetchExams(false);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Generation failed", "error");
    } finally {
      setGenerating(false);
    }
  };

  // ── Teacher filtering for quick / list add ──
  const fetchAvailableTeachers = async (params) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await get(`/class-management/exams/available-teachers?${qs}`);
      return res.data?.data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  // ── Drag & drop for period-grid cells ──
  const handleDrop = async (targetDate, targetPeriod) => {
    if (!dragExam) return;
    const target = PERIODS.find((p) => p.n === targetPeriod);
    if (!target) return;
    const targetYmd = ymd(targetDate);
    const currentPeriod = getPeriodForExam(dragExam.start_time);
    if (targetYmd === (dragExam.exam_date || "").split("T")[0] && currentPeriod === targetPeriod) {
      setDragExam(null); return;
    }
    const original = { date: dragExam.exam_date, start: dragExam.start_time, end: dragExam.end_time };
    setExams((prev) => prev.map((e) => e.id === dragExam.id ? { ...e, exam_date: targetYmd, start_time: target.start + ":00", end_time: target.end + ":00" } : e));
    try {
      await put(`/class-management/exams/reschedule/${dragExam.id}`, { exam_date: targetYmd, start_time: target.start, end_time: target.end });
      // Silent refetch (no loading spinner) so state matches DB without hiding the grid
      fetchExams(false);
    } catch (err) {
      setExams((prev) => prev.map((e) => e.id === dragExam.id ? { ...e, exam_date: original.date, start_time: original.start, end_time: original.end } : e));
      Swal.fire({ icon: "error", title: "Cannot move exam", text: err.response?.data?.message || "This slot conflicts with another exam." });
    } finally {
      setDragExam(null);
    }
  };

  // ── Quick Add (period grid) ──
  const openQuickAdd = (classId, date, period) => {
    const cls = formData.classes.find((c) => String(c.id) === String(classId));
    setQuickForm({
      school_class_id: classId || "",
      subject_id: "",
      teacher_id: "",
      room: cls?.room_number || "",
      total_marks: 100,
      passing_marks: 40,
    });
    setQuickTeachers([]);
    setQuickShowAllTeachers(false);
    setQuickAdd({ date: ymd(date), period });
  };

  // When class or subject changes in quick-add, refresh room + teacher list
  useEffect(() => {
    if (!quickAdd) return;
    const cls = formData.classes.find((c) => String(c.id) === String(quickForm.school_class_id));
    if (cls && cls.room_number && !quickForm.room) {
      setQuickForm((p) => ({ ...p, room: cls.room_number }));
    }
    if (quickAdd.date && quickAdd.period) {
      const period = PERIODS.find((p) => p.n === quickAdd.period);
      const params = {
        exam_date: quickAdd.date,
        start_time: period.start,
        end_time: period.end,
        show_all: quickShowAllTeachers ? 1 : 0,
      };
      if (quickForm.subject_id) params.subject_id = quickForm.subject_id;
      if (quickForm.school_class_id) params.school_class_id = quickForm.school_class_id;
      if (cls?.grade_id) params.grade_id = cls.grade_id;
      fetchAvailableTeachers(params).then(setQuickTeachers);
    } else {
      setQuickTeachers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickForm.school_class_id, quickForm.subject_id, quickAdd, quickShowAllTeachers]);

  const submitQuickAdd = async () => {
    if (!quickForm.school_class_id || !quickForm.subject_id || !selectedTerm) {
      Swal.fire("Missing fields", "Select class, subject, and make sure an academic term is chosen", "warning"); return;
    }
    const period = PERIODS.find((p) => p.n === quickAdd.period);
    setQuickSaving(true);
    try {
      await post("/class-management/exams/store", {
        exam_type: activeTab,
        academic_term_id: selectedTerm,
        exam_date: quickAdd.date,
        start_time: period.start,
        end_time: period.end,
        ...quickForm,
      });
      Swal.fire({ icon: "success", title: "Exam scheduled", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
      setQuickAdd(null); fetchExams(false);
    } catch (err) {
      if (err.response?.status === 422) {
        Swal.fire({ icon: "error", title: "Time slot conflict", text: err.response.data?.message || "Another exam already exists at this period for this class or teacher." });
      } else {
        Swal.fire("Error", err.response?.data?.message || "Save failed", "error");
      }
    } finally {
      setQuickSaving(false);
    }
  };

  // ── List Add (for mid_term / annual) ──
  const openListAdd = (prefDate = null) => {
    const cls = formData.classes.find((c) => String(c.id) === String(selectedClass));
    setListForm({
      school_class_id: selectedClass || "",
      subject_id: "",
      teacher_id: "",
      exam_date: prefDate ? ymd(prefDate) : ymd(new Date()),
      period: 1,
      room: cls?.room_number || "",
      total_marks: 100,
      passing_marks: 40,
    });
    setListTeachers([]);
    setListShowAllTeachers(false);
    setListAdd({});
  };

  useEffect(() => {
    if (!listAdd) return;
    const cls = formData.classes.find((c) => String(c.id) === String(listForm.school_class_id));
    if (cls && cls.room_number && !listForm.room) {
      setListForm((p) => ({ ...p, room: cls.room_number }));
    }
    if (listForm.exam_date && listForm.period) {
      const period = PERIODS.find((p) => p.n === Number(listForm.period));
      const params = {
        exam_date: listForm.exam_date,
        start_time: period.start,
        end_time: period.end,
        show_all: listShowAllTeachers ? 1 : 0,
      };
      if (listForm.subject_id) params.subject_id = listForm.subject_id;
      if (listForm.school_class_id) params.school_class_id = listForm.school_class_id;
      if (cls?.grade_id) params.grade_id = cls.grade_id;
      fetchAvailableTeachers(params).then(setListTeachers);
    } else {
      setListTeachers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listForm.school_class_id, listForm.subject_id, listForm.exam_date, listForm.period, listAdd, listShowAllTeachers]);

  const submitListAdd = async () => {
    if (!listForm.school_class_id || !listForm.subject_id || !selectedTerm || !listForm.exam_date || !listForm.period) {
      Swal.fire("Missing fields", "Fill all required fields", "warning"); return;
    }
    setListSaving(true);
    try {
      const period = PERIODS.find((p) => p.n === Number(listForm.period));
      const { period: _, ...rest } = listForm;
      await post("/class-management/exams/store", {
        exam_type: activeTab,
        academic_term_id: selectedTerm,
        ...rest,
        start_time: period.start,
        end_time: period.end,
      });
      Swal.fire({ icon: "success", title: "Exam scheduled", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
      setListAdd(null); fetchExams(false);
    } catch (err) {
      if (err.response?.status === 422) {
        Swal.fire({ icon: "error", title: "Time slot conflict", text: err.response.data?.message || "Another exam already exists at this time for this class or teacher." });
      } else {
        Swal.fire("Error", err.response?.data?.message || "Save failed", "error");
      }
    } finally {
      setListSaving(false);
    }
  };

  // ── Edit Exam Modal ──
  const openEdit = (exam) => {
    const cls = formData.classes.find((c) => String(c.id) === String(exam.school_class_id));
    const currentPeriod = getPeriodForExam((exam.start_time || "").substring(0, 5));
    setEditForm({
      school_class_id: exam.school_class_id || "",
      subject_id: exam.subject_id || "",
      teacher_id: exam.teacher_id || "",
      exam_date: exam.exam_date ? (exam.exam_date.split("T")[0]) : "",
      period: currentPeriod || 1,
      room: exam.room || cls?.room_number || "",
      total_marks: exam.total_marks || 100,
      passing_marks: exam.passing_marks || 40,
      status: exam.status || "scheduled",
    });
    setEditTeachers([]);
    setEditShowAllTeachers(false);
    setEditAdd(exam);
  };

  useEffect(() => {
    if (!editAdd) return;
    const cls = formData.classes.find((c) => String(c.id) === String(editForm.school_class_id));
    if (cls && cls.room_number && !editForm.room) {
      setEditForm((p) => ({ ...p, room: cls.room_number }));
    }
    if (editForm.exam_date && editForm.period) {
      const period = PERIODS.find((p) => p.n === Number(editForm.period));
      const params = {
        exam_date: editForm.exam_date,
        start_time: period.start,
        end_time: period.end,
        exclude_exam_id: editAdd.id,
        show_all: editShowAllTeachers ? 1 : 0,
      };
      if (editForm.subject_id) params.subject_id = editForm.subject_id;
      if (editForm.school_class_id) params.school_class_id = editForm.school_class_id;
      if (cls?.grade_id) params.grade_id = cls.grade_id;
      fetchAvailableTeachers(params).then(setEditTeachers);
    } else {
      setEditTeachers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.school_class_id, editForm.subject_id, editForm.exam_date, editForm.period, editAdd, editShowAllTeachers]);

  const submitEdit = async () => {
    if (!editForm.school_class_id || !editForm.subject_id || !editForm.exam_date || !editForm.period) {
      Swal.fire("Missing fields", "Fill all required fields", "warning"); return;
    }
    setEditSaving(true);
    try {
      const period = PERIODS.find((p) => p.n === Number(editForm.period));
      const { period: _, ...rest } = editForm;
      await put(`/class-management/exams/update/${editAdd.id}`, {
        exam_type: editAdd.exam_type,
        academic_term_id: editAdd.academic_term_id,
        ...rest,
        start_time: period.start,
        end_time: period.end,
      });
      Swal.fire({ icon: "success", title: "Exam updated", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
      setEditAdd(null); fetchExams(false);
    } catch (err) {
      if (err.response?.status === 422) {
        Swal.fire({ icon: "error", title: "Conflict", text: err.response.data?.message || "This slot conflicts with another exam." });
      } else {
        Swal.fire("Error", err.response?.data?.message || "Save failed", "error");
      }
    } finally {
      setEditSaving(false);
    }
  };

  const today = new Date();
  const isToday = (d) => ymd(d) === ymd(today);

  // ── Print handler ──
  const handlePrint = () => {
    const printWin = window.open("", "_blank", "width=1200,height=900");
    if (!printWin) {
      Swal.fire("Blocked", "Please allow popups to print.", "warning");
      return;
    }

    const fmtTimeFn = (t) => {
      if (!t) return "";
      const [h, m] = t.split(":");
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    };

    const title = `${activeType.label} Exam Schedule`;
    const subtitle = [
      selectedTerm ? formData.terms.find((t) => String(t.id) === String(selectedTerm))?.name : "All Terms",
      selectedShift ? `${selectedShift.charAt(0).toUpperCase() + selectedShift.slice(1)} Shift` : "All Shifts",
    ].filter(Boolean).join(" · ");

    let body = "";
    const renderOneClass = (info) => {
      const examsSorted = [...info.exams].sort((a, b) =>
        (a.exam_date + a.start_time).localeCompare(b.exam_date + b.start_time)
      );

      body += `
        <div class="class-block">
          <div class="class-header">
            <div class="class-name">${info.className}</div>
            <div class="class-meta">
              ${info.grade ? info.grade : ""}
              ${info.roomNumber ? ` · Room ${info.roomNumber}` : ""}
              ${info.shift ? ` · ${info.shift} shift` : ""}
              · ${info.exams.length} exam${info.exams.length !== 1 ? "s" : ""}
            </div>
          </div>`;

      if (activeType.hasPeriods) {
        // Day×Period grid
        body += `<table class="exam-table"><thead><tr><th>Day / Date</th>`;
        PERIODS.forEach((p) => {
          body += `<th>${p.label}</th>`;
        });
        body += `</tr></thead><tbody>`;

        const grid = {};
        viewDates.forEach((d) => { grid[ymd(d)] = {}; });
        info.exams.forEach((e) => {
          const dateKey = (e.exam_date || "").split("T")[0];
          if (!grid[dateKey]) return;
          const period = getPeriodForExam(e.start_time);
          if (!grid[dateKey][period]) grid[dateKey][period] = [];
          grid[dateKey][period].push(e);
        });

        viewDates.forEach((date) => {
          const dateKey = ymd(date);
          body += `<tr><td class="day-cell"><strong>${DAY_FULL[date.getDay()]}</strong><br/><span class="date-small">${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></td>`;
          PERIODS.forEach((p) => {
            const list = grid[dateKey]?.[p.n] || [];
            if (list.length === 0) {
              body += `<td class="empty-cell">—</td>`;
            } else {
              body += `<td class="exam-cell">`;
              list.forEach((ex) => {
                body += `
                  <div class="exam-item">
                    <div class="exam-subject">${ex.subject?.subject_name || "—"}</div>
                    ${ex.teacher?.staff?.application?.full_name ? `<div class="exam-meta">${ex.teacher.staff.application.full_name}</div>` : ""}
                    ${ex.room ? `<div class="exam-meta">Room ${ex.room}</div>` : ""}
                  </div>`;
              });
              body += `</td>`;
            }
          });
          body += `</tr>`;
        });
        body += `</tbody></table>`;
      } else {
        // Flat list
        body += `<table class="exam-table"><thead><tr><th>Date</th><th>Day</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th><th>Marks</th></tr></thead><tbody>`;
        examsSorted.forEach((ex) => {
          const d = new Date(ex.exam_date);
          body += `
            <tr>
              <td>${d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
              <td>${DAY_FULL[d.getDay()]}</td>
              <td>${fmtTimeFn(ex.start_time)} – ${fmtTimeFn(ex.end_time)}</td>
              <td>${ex.subject?.subject_name || "—"}</td>
              <td>${ex.teacher?.staff?.application?.full_name || "—"}</td>
              <td>${ex.room || "—"}</td>
              <td>${ex.total_marks || "—"}</td>
            </tr>`;
        });
        if (examsSorted.length === 0) {
          body += `<tr><td colspan="7" class="no-exams">No exams scheduled</td></tr>`;
        }
        body += `</tbody></table>`;
      }

      body += `</div>`;
    };

    const groups = [
      { label: "Morning Shift", classes: Object.values(shiftGroups.morning) },
      { label: "Afternoon Shift", classes: Object.values(shiftGroups.afternoon) },
    ];
    groups.forEach((g) => {
      if (g.classes.length === 0) return;
      if (!selectedShift) {
        body += `<h2 class="shift-heading">${g.label}</h2>`;
      }
      g.classes.forEach((c) => renderOneClass(c));
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 20px; color: #1f2937; }
    .school-header { text-align: center; padding: 20px 0 10px; border-bottom: 3px double #0f766e; margin-bottom: 20px; }
    .school-name { font-size: 28px; font-weight: bold; color: #0f766e; margin: 0; letter-spacing: 1px; }
    .school-tagline { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .doc-title { font-size: 20px; font-weight: bold; margin: 15px 0 5px; text-align: center; }
    .doc-subtitle { font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 25px; }
    .shift-heading { font-size: 16px; font-weight: bold; color: #1f2937; margin: 25px 0 10px; padding: 8px 12px; background: #f3f4f6; border-left: 4px solid #0f766e; }
    .class-block { margin-bottom: 25px; page-break-inside: avoid; }
    .class-header { padding: 10px 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px 4px 0 0; }
    .class-name { font-size: 14px; font-weight: bold; color: #065f46; }
    .class-meta { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .exam-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .exam-table th { background: #f3f4f6; color: #374151; padding: 8px 6px; text-align: center; border: 1px solid #d1d5db; font-weight: bold; }
    .exam-table td { padding: 6px; border: 1px solid #e5e7eb; vertical-align: top; }
    .period-time { font-weight: normal; font-size: 9px; color: #6b7280; }
    .day-cell { background: #f9fafb; font-size: 11px; }
    .date-small { font-size: 10px; color: #6b7280; }
    .empty-cell { text-align: center; color: #d1d5db; }
    .exam-cell { background: #f0fdfa; }
    .exam-item { padding: 3px 0; border-bottom: 1px dotted #d1d5db; }
    .exam-item:last-child { border-bottom: none; }
    .exam-subject { font-weight: bold; font-size: 11px; color: #0f766e; }
    .exam-meta { font-size: 9px; color: #6b7280; }
    .no-exams { text-align: center; color: #9ca3af; padding: 20px !important; }
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 15px; }
      .class-block { page-break-inside: avoid; }
      @page { size: A4 landscape; margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="school-header">
    <div class="school-name">WIFAQ SCHOOLS</div>
    <div class="school-tagline">Excellence in Education</div>
  </div>
  <div class="doc-title">${title}</div>
  <div class="doc-subtitle">${subtitle}</div>
  ${body}
  <div class="footer">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 250);
  };

  // Render period grid for a single class
  const renderClassGrid = (classId, classInfo) => {
    // Build per-class grid
    const grid = {};
    viewDates.forEach((d) => { grid[ymd(d)] = {}; });
    classInfo.exams.forEach((e) => {
      const dateKey = (e.exam_date || "").split("T")[0];
      if (!grid[dateKey]) return;
      const period = getPeriodForExam(e.start_time);
      if (!grid[dateKey][period]) grid[dateKey][period] = [];
      grid[dateKey][period].push(e);
    });

    return (
      <div key={classId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        <div className={`px-5 py-3.5 ${activeColor.soft} border-b ${activeColor.border} flex items-center justify-between flex-wrap gap-2`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeColor.grad} flex items-center justify-center text-white shadow-sm`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{classInfo.className}</p>
              <p className="text-[11px] text-gray-500">
                {classInfo.grade && <span>{classInfo.grade}</span>}
                {classInfo.roomNumber && <span> · Room {classInfo.roomNumber}</span>}
                {classInfo.capacity && <span> · {classInfo.capacity} seats</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${classInfo.exams.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
              {classInfo.exams.length} exam{classInfo.exams.length !== 1 ? "s" : ""} scheduled
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 w-40 sticky left-0 bg-gray-50 z-10">Day / Date</th>
                {PERIODS.map((p) => (
                  <th key={p.n} className="px-2 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 last:border-r-0">
                    <div>{p.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viewDates.map((date, rowIdx) => {
                const dateKey = ymd(date);
                const rowIsToday = isToday(date);
                return (
                  <tr key={dateKey} className={rowIsToday ? activeColor.soft : rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                    <td className={`px-3 py-2 border-b border-r border-gray-200 sticky left-0 z-10 ${rowIsToday ? `bg-gradient-to-r ${activeColor.grad} text-white` : rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center ${rowIsToday ? "bg-white/20 text-white" : `${activeColor.soft} ${activeColor.text}`}`}>
                          <span className="text-[9px] font-semibold leading-none">{date.toLocaleDateString("en-US", { month: "short" })}</span>
                          <span className="text-sm font-bold leading-none">{date.getDate()}</span>
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${rowIsToday ? "text-white" : "text-gray-800"}`}>{DAY_FULL[date.getDay()]}</p>
                          <p className={`text-[10px] ${rowIsToday ? "text-white/80" : "text-gray-500"}`}>{date.toLocaleDateString("en-US", { year: "numeric" })}</p>
                        </div>
                      </div>
                    </td>
                    {PERIODS.map((p) => {
                      const cellExams = grid[dateKey]?.[p.n] || [];
                      const cellKey = `${classId}|${dateKey}|${p.n}`;
                      const isHover = hoverCell === cellKey;
                      return (
                        <td
                          key={p.n}
                          onDragOver={(e) => { e.preventDefault(); setHoverCell(cellKey); }}
                          onDragLeave={() => setHoverCell(null)}
                          onDrop={() => { setHoverCell(null); handleDrop(date, p.n); }}
                          className={`p-1.5 border-b border-r border-gray-200 last:border-r-0 align-top transition-colors ${isHover ? `${activeColor.soft} ring-2 ${activeColor.ring} ring-inset` : ""}`}
                          style={{ minWidth: 130, height: 90 }}
                        >
                          {cellExams.length > 0 ? (
                            <div className="space-y-1.5 h-full">
                              {cellExams.map((exam) => {
                                const st = STATUS_STYLES[exam.status] || STATUS_STYLES.scheduled;
                                return (
                                  <div
                                    key={exam.id}
                                    draggable
                                    onDragStart={() => setDragExam(exam)}
                                    onDragEnd={() => setDragExam(null)}
                                    onClick={() => navigate(`/class-management/exams/show/${exam.id}`)}
                                    className={`group relative p-2 rounded-lg border-2 ${activeColor.cellBg} ${activeColor.cellText} cursor-pointer hover:shadow-md transition-all h-full flex flex-col ${dragExam?.id === exam.id ? "opacity-50 scale-95" : ""}`}
                                  >
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                      <p className="text-xs font-bold leading-snug line-clamp-2 flex-1">{exam.subject?.subject_name || "—"}</p>
                                      {exam.status && exam.status !== "scheduled" && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${st.bg} ${st.text} flex-shrink-0`}>{st.label}</span>
                                      )}
                                    </div>
                                    <div className="mt-auto space-y-0.5">
                                      {exam.room && (
                                        <div className="flex items-center gap-1 text-[10px] opacity-80">
                                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                          <span className="truncate">{exam.room}</span>
                                        </div>
                                      )}
                                      {exam.teacher?.staff?.application?.full_name && (
                                        <div className="flex items-center gap-1 text-[10px] opacity-80">
                                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                          <span className="truncate">{exam.teacher.staff.application.full_name}</span>
                                        </div>
                                      )}
                                      {exam.total_marks && (
                                        <div className="flex items-center gap-1 text-[10px] opacity-80">
                                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                          <span>{exam.total_marks} marks</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-white rounded shadow-md">
                                      <button onClick={(e) => { e.stopPropagation(); openEdit(exam); }} className="p-1 text-gray-500 hover:text-teal-600" title="Edit">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDelete(exam); }} className="p-1 text-gray-500 hover:text-red-600" title="Delete">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <button
                              onClick={() => openQuickAdd(classId, date, p.n)}
                              className="w-full h-full min-h-[80px] border-2 border-dashed border-gray-200 rounded-lg text-gray-300 hover:text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-1 group"
                              title="Add exam"
                            >
                              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              <span className="text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Add exam</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render flat list view for mid_term / annual
  const renderListView = () => {
    const morningClasses = Object.entries(shiftGroups.morning);
    const afternoonClasses = Object.entries(shiftGroups.afternoon);
    const hasMorning = morningClasses.length > 0;
    const hasAfternoon = afternoonClasses.length > 0;

    const renderTable = (classId, info) => (
      <div key={classId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        <div className={`px-5 py-3.5 ${activeColor.soft} border-b ${activeColor.border} flex items-center justify-between flex-wrap gap-2`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeColor.grad} flex items-center justify-center text-white shadow-sm`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{info.className}</p>
              <p className="text-[11px] text-gray-500">
                {info.grade && <span>{info.grade}</span>}
                {info.roomNumber && <span> · Room {info.roomNumber}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedClass(classId); openListAdd(); }} className={`px-3 py-1.5 text-[11px] font-semibold text-white rounded-lg bg-gradient-to-r ${activeColor.grad} hover:opacity-90 flex items-center gap-1.5`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Exam
            </button>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${info.exams.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
              {info.exams.length} exam{info.exams.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Teacher</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {info.exams.sort((a, b) => (a.exam_date + a.start_time).localeCompare(b.exam_date + b.start_time)).map((exam) => {
                const st = STATUS_STYLES[exam.status] || STATUS_STYLES.scheduled;
                return (
                  <tr key={exam.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/class-management/exams/show/${exam.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-lg ${activeColor.soft} flex flex-col items-center justify-center ${activeColor.text}`}>
                          <span className="text-[9px] font-semibold leading-none">{new Date(exam.exam_date).toLocaleDateString("en-US", { month: "short" })}</span>
                          <span className="text-sm font-bold leading-none">{new Date(exam.exam_date).getDate()}</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{DAY_FULL[new Date(exam.exam_date).getDay()]}</p>
                          <p className="text-[10px] text-gray-500">{new Date(exam.exam_date).getFullYear()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{fmtTime(exam.start_time)} – {fmtTime(exam.end_time)}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-800">{exam.subject?.subject_name || "—"}</p>
                      {exam.subject?.subject_code && <p className="text-[10px] text-gray-500">{exam.subject.subject_code}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {exam.teacher?.staff?.application?.full_name || <span className="text-gray-400 italic">Not assigned</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{exam.room || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(exam); }} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(exam); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {info.exams.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-gray-400">No exams yet for this class.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );

    if (!hasMorning && !hasAfternoon) {
      return (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <div className={`w-16 h-16 mx-auto rounded-2xl ${activeColor.soft} flex items-center justify-center mb-4`}>
            <svg className={`w-8 h-8 ${activeColor.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">No classes found</p>
          <p className="text-xs text-gray-500">Create classes first to schedule exams.</p>
        </div>
      );
    }

    return (
      <>
        {hasMorning && !selectedShift && (
          <ShiftBanner label="Morning Shift" icon="sun" count={morningClasses.length} />
        )}
        {hasMorning && morningClasses.map(([cid, info]) => renderTable(cid, info))}
        {hasAfternoon && !selectedShift && (
          <ShiftBanner label="Afternoon Shift" icon="moon" count={afternoonClasses.length} />
        )}
        {hasAfternoon && afternoonClasses.map(([cid, info]) => renderTable(cid, info))}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className={`bg-gradient-to-r ${activeColor.grad} px-5 py-5 transition-colors`}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">Examinations Schedule</h1>
            <p className="text-xs text-white/80 mt-0.5">{activeType.sub}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold flex items-center gap-2 backdrop-blur border border-white/30" title="Print filtered tables">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
            {!activeType.hasPeriods && (
              <button onClick={() => setShowGenerate(true)} className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold flex items-center gap-2 backdrop-blur border border-white/30">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Auto Generate
              </button>
            )}
            <button onClick={() => openListAdd()} className="px-4 py-2 bg-white text-gray-700 rounded-xl hover:bg-gray-50 text-xs font-semibold flex items-center gap-2 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Exam
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 mb-4 flex gap-1 overflow-x-auto">
          {EXAM_TYPES.map((t) => {
            const c = TYPE_COLOR[t.color];
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${isActive ? `bg-gradient-to-r ${c.grad} text-white shadow-sm` : "text-gray-500 hover:bg-gray-50"
                  }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Filters + Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Shift</label>
            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
              <button onClick={() => setSelectedShift("")} className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedShift === "" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}>All</button>
              <button onClick={() => setSelectedShift("morning")} className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${selectedShift === "morning" ? "bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm" : "text-gray-500"}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Morning
              </button>
              <button onClick={() => setSelectedShift("afternoon")} className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${selectedShift === "afternoon" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm" : "text-gray-500"}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                Afternoon
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white">
              <option value="">All Classes</option>
              {formData.classes.filter((c) => !selectedShift || (c.shift || "morning") === selectedShift).map((c) => <option key={c.id} value={c.id}>{c.class_name}{c.shift ? ` (${c.shift})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Term</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white">
              <option value="">All Terms</option>
              {formData.terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (Current)" : ""}</option>)}
            </select>
          </div>
          {activeType.hasPeriods && (
            <div className="flex items-center gap-1">
              <button onClick={() => navigatePeriod(-1)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
              <button onClick={jumpToToday} className="px-3 py-2 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">Today</button>
              <button onClick={() => navigatePeriod(1)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            </div>
          )}
        </div>

        {/* View label (grid tabs) */}
        {activeType.hasPeriods && (
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 ${activeColor.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              <span className="text-sm font-bold text-gray-800">{viewLabel}</span>
              <span className="text-[10px] text-gray-500">· {viewDates.length} days</span>
            </div>
            <span className="text-[10px] text-gray-500">Click empty cells to add · Drag cards to reschedule</span>
          </div>
        )}

        {/* Main content */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-100 border-t-teal-600"></div></div>
        ) : activeType.hasPeriods ? (
          (() => {
            const morning = Object.entries(shiftGroups.morning);
            const afternoon = Object.entries(shiftGroups.afternoon);
            if (morning.length === 0 && afternoon.length === 0) {
              return (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                  <div className={`w-16 h-16 mx-auto rounded-2xl ${activeColor.soft} flex items-center justify-center mb-4`}>
                    <svg className={`w-8 h-8 ${activeColor.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">No classes found</p>
                  <p className="text-xs text-gray-500">Create active classes first to schedule exams.</p>
                </div>
              );
            }
            return (
              <>
                {morning.length > 0 && !selectedShift && <ShiftBanner label="Morning Shift" icon="sun" count={morning.length} />}
                {morning.map(([cid, info]) => renderClassGrid(cid, info))}
                {afternoon.length > 0 && !selectedShift && <ShiftBanner label="Afternoon Shift" icon="moon" count={afternoon.length} />}
                {afternoon.map(([cid, info]) => renderClassGrid(cid, info))}
              </>
            );
          })()
        ) : (
          renderListView()
        )}
      </div>

      {/* Quick Add Modal (period grid) */}
      {quickAdd && (() => {
        const usedIds = exams
          .filter((e) => String(e.school_class_id) === String(quickForm.school_class_id))
          .filter((e) => e.exam_type === activeTab)
          .filter((e) => (typeof e.exam_date === "string" ? e.exam_date.split("T")[0] : "") === quickAdd.date)
          .map((e) => e.subject_id);
        return (
          <ExamModal
            title={`Schedule ${activeType.label} Exam`}
            subtitle={`${new Date(quickAdd.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · ${PERIODS.find((p) => p.n === quickAdd.period)?.label}`}
            colorClass={activeColor}
            form={quickForm}
            setForm={setQuickForm}
            classes={formData.classes}
            subjects={formData.subjects}
            gradeSubjects={formData.gradeSubjects}
            teachers={quickTeachers}
            usedSubjectIds={usedIds}
            lockClass={true}
            showDateAndPeriod={false}
            showAllTeachers={quickShowAllTeachers}
            setShowAllTeachers={setQuickShowAllTeachers}
            onClose={() => setQuickAdd(null)}
            onSubmit={submitQuickAdd}
            saving={quickSaving}
          />
        );
      })()}

      {/* List Add Modal (mid-term / annual) */}
      {listAdd && (() => {
        const usedIds = exams
          .filter((e) => String(e.school_class_id) === String(listForm.school_class_id))
          .filter((e) => e.exam_type === activeTab)
          .filter((e) => (typeof e.exam_date === "string" ? e.exam_date.split("T")[0] : "") === listForm.exam_date)
          .map((e) => e.subject_id);
        return (
          <ExamModal
            title={`Add ${activeType.label} Exam`}
            subtitle="Pick date, class, period, subject, teacher"
            colorClass={activeColor}
            form={listForm}
            setForm={setListForm}
            classes={formData.classes}
            subjects={formData.subjects}
            gradeSubjects={formData.gradeSubjects}
            teachers={listTeachers}
            usedSubjectIds={usedIds}
            showDateAndPeriod={true}
            showAllTeachers={listShowAllTeachers}
            setShowAllTeachers={setListShowAllTeachers}
            onClose={() => setListAdd(null)}
            onSubmit={submitListAdd}
            saving={listSaving}
          />
        );
      })()}

      {/* Edit Exam Modal */}
      {editAdd && (() => {
        const usedIds = exams
          .filter((e) => e.id !== editAdd.id)  // exclude the exam we're editing
          .filter((e) => String(e.school_class_id) === String(editForm.school_class_id))
          .filter((e) => e.exam_type === editAdd.exam_type)
          .filter((e) => (typeof e.exam_date === "string" ? e.exam_date.split("T")[0] : "") === editForm.exam_date)
          .map((e) => e.subject_id);
        return (
          <ExamModal
            title="Edit Exam"
            subtitle={`${editAdd.subject?.subject_name || ""} · ${editAdd.school_class?.class_name || ""}`}
            colorClass={activeColor}
            form={editForm}
            setForm={setEditForm}
            classes={formData.classes}
            subjects={formData.subjects}
            gradeSubjects={formData.gradeSubjects}
            teachers={editTeachers}
            usedSubjectIds={usedIds}
            showDateAndPeriod={true}
            showStatus={true}
            showAllTeachers={editShowAllTeachers}
            setShowAllTeachers={setEditShowAllTeachers}
            onClose={() => setEditAdd(null)}
            onSubmit={submitEdit}
            saving={editSaving}
            submitLabel="Update Exam"
          />
        );
      })()}

      {/* Auto-Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGenerate(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className={`px-5 py-4 bg-gradient-to-r ${activeColor.grad}`}>
              <h3 className="text-sm font-bold text-white">Auto Generate {activeType.label} Exams</h3>
              <p className="text-[11px] text-white/80 mt-0.5">Creates one exam per subject with global standards</p>
            </div>
            <div className="p-5 space-y-3">
              {!activeType.hasPeriods && (
                <label className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={genForm.all_classes} onChange={(e) => setGenForm({ ...genForm, all_classes: e.target.checked })} className="mt-0.5 rounded text-amber-600 focus:ring-amber-400" />
                  <div>
                    <p className="text-[11px] font-semibold text-amber-800">Generate for ALL classes</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">Creates mid-term/annual schedules for every active class automatically using standard timing and marks.</p>
                  </div>
                </label>
              )}
              {!genForm.all_classes && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Class *</label>
                  <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white">
                    <option value="">Select class…</option>
                    {formData.classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Academic Term *</label>
                <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white">
                  <option value="">Select term…</option>
                  {formData.terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Start Date *</label>
                <input type="date" value={genForm.start_date} onChange={(e) => setGenForm({ ...genForm, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Duration (min)</label>
                  <input type="number" min="30" max="180" value={genForm.duration_minutes} onChange={(e) => setGenForm({ ...genForm, duration_minutes: parseInt(e.target.value) || 60 })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Total Marks</label>
                  <input type="number" min="10" max="1000" value={genForm.total_marks} onChange={(e) => setGenForm({ ...genForm, total_marks: parseInt(e.target.value) || 100 })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={genForm.replace_existing} onChange={(e) => setGenForm({ ...genForm, replace_existing: e.target.checked })} className="rounded text-teal-600 focus:ring-teal-400" />
                <span className="text-[11px] text-gray-600">Replace existing {activeType.label.toLowerCase()} exams</span>
              </label>
              <p className="text-[10px] text-gray-500 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                One exam per subject. Fridays are skipped. Teacher conflicts across classes are auto-detected; busy teachers are left unassigned so you can pick another one manually.
              </p>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowGenerate(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleGenerate} disabled={generating} className={`px-5 py-2 text-xs font-semibold text-white rounded-xl bg-gradient-to-r ${activeColor.grad} hover:opacity-90 disabled:opacity-50 flex items-center gap-2`}>
                {generating ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Generating…</> : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shift divider banner ── */
function ShiftBanner({ label, icon, count }) {
  const iconSvg = icon === "sun" ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
  );
  const gradient = icon === "sun" ? "from-amber-400 to-orange-400" : "from-indigo-500 to-purple-500";
  return (
    <div className={`mb-3 mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${gradient} text-white flex items-center gap-2 shadow-sm`}>
      {iconSvg}
      <span className="text-sm font-bold">{label}</span>
      <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">{count} class{count !== 1 ? "es" : ""}</span>
    </div>
  );
}

/* ── Reusable Exam Modal ── */
function ExamModal({ title, subtitle, colorClass, form, setForm, classes, subjects, teachers, gradeSubjects = [], usedSubjectIds = [], lockClass = false, showDateAndPeriod, showStatus, showAllTeachers, setShowAllTeachers, onClose, onSubmit, saving, submitLabel }) {
  const handle = (k, v) => setForm((p) => {
    const next = { ...p, [k]: v };
    // When class changes: auto-fill room AND reset subject (since grade may differ)
    if (k === "school_class_id") {
      const cls = classes.find((c) => String(c.id) === String(v));
      if (cls && cls.room_number) next.room = cls.room_number;
      // Reset subject if current one isn't in the new class's grade
      if (next.subject_id && gradeSubjects.length > 0 && cls) {
        const hasSubject = gradeSubjects.some((gs) =>
          String(gs.grade_id) === String(cls.grade_id) && String(gs.subject_id) === String(next.subject_id)
        );
        if (!hasSubject) next.subject_id = "";
      }
    }
    return next;
  });

  // Subjects filtered by selected class's grade (via grade_subjects)
  const selectedClass = classes.find((c) => String(c.id) === String(form.school_class_id));
  const filteredSubjects = (() => {
    if (!selectedClass || gradeSubjects.length === 0) return subjects;
    const subjectIdsForGrade = new Set(
      gradeSubjects
        .filter((gs) => String(gs.grade_id) === String(selectedClass.grade_id))
        .map((gs) => gs.subject_id)
    );
    return subjects.filter((s) => subjectIdsForGrade.has(s.id));
  })();
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className={`px-5 py-4 bg-gradient-to-r ${colorClass.grad}`}>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-[11px] text-white/80 mt-0.5">{subtitle}</p>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Class *
              {lockClass && <span className="text-gray-400 ml-1 font-normal">(fixed from the cell you clicked)</span>}
            </label>
            {lockClass ? (
              <div className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 text-gray-700 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span className="font-semibold">{selectedClass?.class_name || "—"}</span>
                {selectedClass?.grade?.name && <span className="text-gray-400">· {selectedClass.grade.name}</span>}
              </div>
            ) : (
              <select value={form.school_class_id} onChange={(e) => handle("school_class_id", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white">
                <option value="">Select class…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Subject *
              {form.school_class_id && filteredSubjects.length === 0 && <span className="text-amber-600 ml-1 font-normal">(no subjects assigned to this class's grade)</span>}
            </label>
            <select value={form.subject_id} onChange={(e) => handle("subject_id", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" disabled={!form.school_class_id}>
              <option value="">{form.school_class_id ? "Select subject…" : "Pick a class first"}</option>
              {filteredSubjects.map((s) => {
                const isUsed = usedSubjectIds.includes(s.id);
                return (
                  <option key={s.id} value={s.id} disabled={isUsed} style={isUsed ? { color: "#9ca3af" } : {}}>
                    {s.subject_name}{isUsed ? " — already scheduled this day" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          {showDateAndPeriod && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Exam Date *</label>
                <input type="date" value={form.exam_date} onChange={(e) => handle("exam_date", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Period *</label>
                <select value={form.period} onChange={(e) => handle("period", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white">
                  {PERIODS.map((p) => <option key={p.n} value={p.n}>{p.label}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-gray-600">
                Teacher *
                <span className="text-gray-400 ml-1 font-normal">
                  {showAllTeachers ? "(any free teacher)" : "(from class timetable)"}
                </span>
              </label>
              {setShowAllTeachers && (
                <button
                  type="button"
                  onClick={() => setShowAllTeachers(!showAllTeachers)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${showAllTeachers ? "bg-teal-100 text-teal-700" : "text-teal-600 hover:bg-teal-50"}`}
                >
                  {showAllTeachers ? "← Show assigned only" : "Pick another teacher →"}
                </button>
              )}
            </div>
            <select value={form.teacher_id} onChange={(e) => handle("teacher_id", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" disabled={!form.subject_id}>
              <option value="">{form.subject_id ? "Select teacher…" : "Pick a subject first"}</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id} disabled={t.busy} style={t.busy ? { color: "#9ca3af" } : {}}>
                  {t.assigned && showAllTeachers ? "★ " : ""}{t.name}
                  {t.busy ? " — has exam at this time" : ""}
                </option>
              ))}
            </select>
            {form.subject_id && teachers.length === 0 && !showAllTeachers && (
              <p className="text-[10px] text-amber-600 mt-1">No teacher assigned to this subject. Click "Pick another teacher" to choose from all available.</p>
            )}
            {form.subject_id && teachers.length === 0 && showAllTeachers && (
              <p className="text-[10px] text-amber-600 mt-1">No active teachers in this branch.</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Room</label>
              <input type="text" value={form.room} onChange={(e) => handle("room", e.target.value)} placeholder="Auto-filled" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Marks</label>
              <input type="number" value={form.total_marks} onChange={(e) => handle("total_marks", e.target.value)} min="1" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Pass</label>
              <input type="number" value={form.passing_marks} onChange={(e) => handle("passing_marks", e.target.value)} min="0" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>
          </div>
          {showStatus && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => handle("status", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white">
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={onSubmit} disabled={saving} className={`px-5 py-2 text-xs font-semibold text-white rounded-xl bg-gradient-to-r ${colorClass.grad} hover:opacity-90 disabled:opacity-50 flex items-center gap-2`}>
            {saving ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving…</> : (submitLabel || "Schedule Exam")}
          </button>
        </div>
      </div>
    </div>
  );
}
