import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put, peekCache } from "../../api/axios";
import Swal from "sweetalert2";

import { DateField } from "../../components/hr/HrUI";
import { AutoRemindPicker } from "../../components/hr/Reminders";
import RichTextField from "../../components/RichTextField";
const TASK_TYPES = [
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-700" },
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-600" },
];

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";

export default function StaffTaskForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dropdownRef = useRef(null);

  const [form, setForm] = useState({
    staff_id: "",       // used in edit mode
    title: "",
    task: "",
    task_type: "normal",
    // Bulk: a bulleted / numbered description becomes one task per item.
    split_into_tasks: false,
    estimate_value: "",
    estimate_unit: "hours",
    start_date: new Date().toISOString().split("T")[0],
    deadline: "",
    notes: "",
    // No date: the task waits in the assignee's Inbox and they pick the day.
    no_date: false,
    recurrence: "",
    recurrence_until: "",
    auto_reminders: [],
  });

  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  // Multi-staff (create mode)
  const [selectedStaffList, setSelectedStaffList] = useState([]);
  // Single staff (edit mode)
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // "Also send an email" — the assigner's call, per task. Ticked by default.
  const [emailToo, setEmailToo] = useState(true);

  useEffect(() => {
    fetchStaffList();
    if (isEdit) fetchTask();
  }, [id]);

  useEffect(() => {
    const close = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const q = searchTerm.toLowerCase();
    const base = searchTerm
      ? staffList.filter(s =>
          s.full_name?.toLowerCase().includes(q) ||
          s.employee_id?.toLowerCase().includes(q))
      : staffList;
    setFilteredStaff(base);
  }, [searchTerm, staffList]);

  const fetchStaffList = async () => {
    try {
      const res = await get("/hr/staff-tasks/staff-list");
      const data = res.data?.data || [];
      setStaffList(Array.isArray(data) ? data : []);
      setFilteredStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load staff", err);
    }
  };

  const fetchTask = async () => {
    setLoading(true);
    const __cached = peekCache(`/hr/staff-tasks/${id}`);
    if (__cached) {
      const d = __cached;
      setForm({
        staff_id: d.staff_id || "",
        title: d.title || "",
        task: d.task || "",
        task_type: d.task_type || "normal",
        start_date: d.start_date?.split("T")[0] || "",
        deadline: d.deadline?.split("T")[0] || "",
        notes: d.notes || "",
        no_date: !d.start_date,
        recurrence: d.recurrence || "",
        recurrence_until: d.recurrence_until?.split("T")[0] || "",
        auto_reminders: [],
      });
      if (d.staff) {
        setSelectedStaff({
          id: d.staff.id,
          full_name: d.staff.application?.full_name || d.staff_name,
          employee_id: d.staff.employee_id || "",
          department: d.staff.department || "",
          role_title: d.staff.role_title_en || "",
        });
      }
      setLoading(false);
    }
    try {
      const res = await get(`/hr/staff-tasks/${id}`);
      const d = res.data;
      setForm({
        staff_id: d.staff_id || "",
        title: d.title || "",
        task: d.task || "",
        task_type: d.task_type || "normal",
        start_date: d.start_date?.split("T")[0] || "",
        deadline: d.deadline?.split("T")[0] || "",
        notes: d.notes || "",
        no_date: !d.start_date,
        recurrence: d.recurrence || "",
        recurrence_until: d.recurrence_until?.split("T")[0] || "",
        auto_reminders: [],
      });
      if (d.staff) {
        setSelectedStaff({
          id: d.staff.id,
          full_name: d.staff.application?.full_name || d.staff_name,
          employee_id: d.staff.employee_id || "",
          department: d.staff.department || "",
          role_title: d.staff.role_title_en || "",
        });
      }
    } catch {
      Swal.fire("Error", "Failed to load task", "error");
      navigate("/hr/staff-task");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = (staff) => {
    if (isEdit) {
      setSelectedStaff(staff);
      setForm(prev => ({ ...prev, staff_id: staff.id }));
      setSearchTerm("");
      setShowDropdown(false);
      return;
    }
    // Multi-select toggle
    setSelectedStaffList(prev => {
      const exists = prev.some(s => s.id === staff.id);
      return exists ? prev.filter(s => s.id !== staff.id) : [...prev, staff];
    });
    setSearchTerm("");
  };

  const removeStaffChip = (staffId) => {
    setSelectedStaffList(prev => prev.filter(s => s.id !== staffId));
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEdit) {
      if (!form.staff_id) {
        Swal.fire("Error", "Please select a staff member", "error");
        return;
      }
    } else if (selectedStaffList.length === 0) {
      Swal.fire("Error", "Please select at least one staff member", "error");
      return;
    }

    // The rich-text box reports '' when blank; a required textarea used to catch this.
    if (!String(form.task || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()) {
      Swal.fire("Missing", "Please describe the task.", "warning");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const { no_date, auto_reminders: _r, estimate_value: _v, estimate_unit: _u, split_into_tasks: _s, ...submitData } = form;
        if (no_date) submitData.start_date = null;
        if (!submitData.deadline) delete submitData.deadline;
        if (!submitData.recurrence) { submitData.recurrence = null; submitData.recurrence_until = null; }
        await put(`/hr/staff-tasks/${id}`, submitData);
        Swal.fire({ icon: "success", title: "Task Updated!", timer: 1500, showConfirmButton: false });
      } else {
        const { staff_id: _ignored, no_date, ...rest } = form;
        const { estimate_value, estimate_unit, ...body } = rest;
        if (no_date) { body.start_date = null; body.recurrence = ""; }
        if (!body.recurrence) { delete body.recurrence; delete body.recurrence_until; }
        if (!body.recurrence_until) delete body.recurrence_until;
        if (!body.auto_reminders?.length) delete body.auto_reminders;
        const perUnit = { minutes: 1, hours: 60, days: 480 }[estimate_unit] || 60; // a working day is 8h
        const estimated_minutes = Number(estimate_value) > 0 ? Math.round(Number(estimate_value) * perUnit) : null;
        const submitData = { ...body, staff_ids: selectedStaffList.map(s => s.id), notify_by_email: emailToo, ...(estimated_minutes ? { estimated_minutes } : {}) };
        if (!submitData.deadline) delete submitData.deadline;
        await post("/hr/staff-tasks", submitData);
        Swal.fire({
          icon: "success",
          title: `Task Assigned to ${selectedStaffList.length} staff!`,
          timer: 1800,
          showConfirmButton: false,
        });
      }
      navigate("/hr/staff-task");
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(", ")
        : err.response?.data?.message || "Failed to save task";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const isSelected = (staffId) =>
    isEdit
      ? form.staff_id === staffId
      : selectedStaffList.some(s => s.id === staffId);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 py-4 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/hr/staff-task")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? "Edit Task" : "Assign New Task"}</h2>
          <p className="text-xs text-gray-500">{isEdit ? "Update task details" : "Assign a task to one or more staff members"}</p>
        </div>
      </div>

      {/* Selected Staff Info Card (edit mode - single) */}
      {isEdit && selectedStaff && (
        <div className="mb-5 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
              {selectedStaff.full_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">{selectedStaff.full_name}</p>
              <p className="text-xs text-teal-600">{selectedStaff.employee_id} {selectedStaff.department ? `· ${selectedStaff.department}` : ""}</p>
            </div>
            {selectedStaff.role_title && (
              <span className="px-2.5 py-1 bg-teal-600 text-white text-[10px] font-semibold rounded-full">
                {selectedStaff.role_title}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Selected Staff Chips (create mode - multi) */}
      {!isEdit && selectedStaffList.length > 0 && (
        <div className="mb-5 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">
              {selectedStaffList.length} Staff Selected
            </p>
            <button
              type="button"
              onClick={() => setSelectedStaffList([])}
              className="text-[11px] text-red-500 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedStaffList.map(s => (
              <div key={s.id} className="inline-flex items-center gap-2 pl-1 pr-2 py-1 bg-white border border-teal-300 rounded-full shadow-sm">
                <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {s.full_name?.charAt(0)}
                </div>
                <span className="text-xs font-medium text-gray-800">{s.full_name}</span>
                <span className="text-[10px] text-gray-400">{s.employee_id}</span>
                <button
                  type="button"
                  onClick={() => removeStaffChip(s.id)}
                  className="ml-1 w-4 h-4 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-500 flex items-center justify-center transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4" autoComplete="off">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Staff Select */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Staff Name * {!isEdit && <span className="text-gray-400 font-normal">(select multiple)</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={isEdit ? "Search staff by name or ID..." : "Search and click to add staff..."}
                value={searchTerm || (isEdit && selectedStaff ? `${selectedStaff.full_name} (${selectedStaff.employee_id})` : "")}
                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                onFocus={() => { setShowDropdown(true); if (isEdit && selectedStaff) setSearchTerm(""); }}
                className={inp}
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {showDropdown && (
              <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                {filteredStaff.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">No staff found</div>
                ) : (
                  filteredStaff.map((staff) => {
                    const selected = isSelected(staff.id);
                    return (
                      <div key={staff.id} onClick={() => handleStaffSelect(staff)}
                        className={`px-4 py-2.5 cursor-pointer hover:bg-teal-50 border-b border-gray-50 last:border-0 ${selected ? "bg-teal-50" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold flex-shrink-0">
                            {staff.full_name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{staff.full_name}</p>
                            <p className="text-[10px] text-gray-500">{staff.employee_id} · {staff.department || "No Dept"} {staff.role_title ? `· ${staff.role_title}` : ""}</p>
                          </div>
                          {selected && (
                            <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Task Type *</label>
            <div className="flex gap-2">
              {TASK_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm(prev => ({ ...prev, task_type: t.value }))}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${form.task_type === t.value ? `${t.color} border-current` : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date — or none: the assignee chooses the day on My Check-in. */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-700">Start Date</label>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={form.no_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, no_date: e.target.checked, ...(e.target.checked ? { recurrence: "" } : {}) }))}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                <span>No date — they choose</span>
              </label>
            </div>
            {form.no_date
              ? <p className="px-3.5 py-2.5 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-[11px] text-amber-800">It goes to their Inbox. They drag it onto a day (and time) on My Check-in.</p>
              : <DateField name="start_date" value={form.start_date} onChange={handleChange} className={inp} />}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Deadline <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <DateField name="deadline" value={form.deadline} onChange={handleChange} className={inp} />
          </div>
        </div>

        {/* Repeat — a copy of the task arrives on each day of the series. */}
        {!form.no_date && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Repeat</label>
              <select name="recurrence" value={form.recurrence} onChange={handleChange} className={inp}>
                <option value="">Does not repeat</option>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
            </div>
            {form.recurrence && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Repeat until <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <DateField name="recurrence_until" value={form.recurrence_until} onChange={handleChange} className={inp} />
              </div>
            )}
          </div>
        )}

        {/* Estimated time — workload planning; shows as a countdown once the clock starts. */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Estimated time to complete <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          {/* `inp` carries w-full. On the select, `w-32` lost to it (Tailwind
              emits w-full later), so the select went 100% wide and the number
              box collapsed. Flex-basis beats width inside a flex row, so the
              select is pinned to 8rem and the number takes the rest. */}
          <div className="flex gap-2">
            <input type="number" min="0" step="0.5" name="estimate_value" value={form.estimate_value} onChange={handleChange} placeholder="3" className={`${inp} flex-1 min-w-0`} />
            <select name="estimate_unit" value={form.estimate_unit} onChange={handleChange} className={`${inp} basis-32 grow-0 shrink-0`}>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Used for workload planning and shown next to the clock once the colleague starts the task.</p>
        </div>

        {/* Title — the short subject lists, calendars and notifications show. */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Task title <span className="text-gray-400 font-normal">(short subject)</span>
          </label>
          <input name="title" value={form.title} onChange={handleChange} maxLength={200} dir="auto"
            placeholder="e.g. Prepare the monthly report" className={inp} disabled={form.split_into_tasks} />
        </div>

        {/* Task Description — rich text: bullets, numbering, bold, colours. */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Task Description *</label>
          <RichTextField value={form.task} onChange={(html) => setForm((prev) => ({ ...prev, task: html }))}
            rows={6} placeholder="Describe the task — use the toolbar for bullet points and numbering" />
          {!isEdit && (
            <label className="mt-2 flex items-start gap-2 p-2.5 rounded-xl bg-teal-50/60 border border-teal-100 cursor-pointer select-none">
              <input type="checkbox" checked={form.split_into_tasks}
                onChange={(e) => setForm((prev) => ({ ...prev, split_into_tasks: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-xs text-gray-700">
                <span className="font-semibold">Make each bullet / line its own task</span>
                <span className="block text-[11px] text-gray-500">Write a list above — every item becomes a separate task with the same dates, priority and reminders.</span>
              </span>
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <RichTextField value={form.notes} onChange={(html) => setForm((prev) => ({ ...prev, notes: html }))}
            rows={3} placeholder="Any additional notes..." />
        </div>

        {/* Reminders for the assignee, counted back from the deadline (or the day they plan it for). */}
        {!isEdit && (
          <AutoRemindPicker value={form.auto_reminders} onChange={(v) => setForm((prev) => ({ ...prev, auto_reminders: v }))}
            hint="Counted back from the deadline — or, with no deadline, from the day they plan it for." />
        )}

        {/* Email as well as the bell — only when assigning; an edit notifies nobody. */}
        {!isEdit && (
          <div className="p-3 bg-gray-50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={emailToo} onChange={(e) => setEmailToo(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-xs text-gray-700">Also email the assigned staff a link to this task</span>
            </label>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate("/hr/staff-task")}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {isEdit ? "Update Task" : `Assign Task${!isEdit && selectedStaffList.length > 1 ? `s (${selectedStaffList.length})` : ""}`}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
