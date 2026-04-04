import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

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
    staff_id: "",
    task: "",
    task_type: "normal",
    start_date: new Date().toISOString().split("T")[0],
    deadline: "",
    notes: "",
  });

  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (searchTerm) {
      setFilteredStaff(staffList.filter(s =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredStaff(staffList);
    }
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
    try {
      const res = await get(`/hr/staff-tasks/${id}`);
      const d = res.data;
      setForm({
        staff_id: d.staff_id || "",
        task: d.task || "",
        task_type: d.task_type || "normal",
        start_date: d.start_date?.split("T")[0] || "",
        deadline: d.deadline?.split("T")[0] || "",
        notes: d.notes || "",
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
    setSelectedStaff(staff);
    setForm(prev => ({ ...prev, staff_id: staff.id }));
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.staff_id) {
      Swal.fire("Error", "Please select a staff member", "error");
      return;
    }
    setSaving(true);
    try {
      const submitData = { ...form };
      if (!submitData.deadline) delete submitData.deadline;

      if (isEdit) {
        await put(`/hr/staff-tasks/${id}`, submitData);
        Swal.fire({ icon: "success", title: "Task Updated!", timer: 1500, showConfirmButton: false });
      } else {
        await post("/hr/staff-tasks", submitData);
        Swal.fire({ icon: "success", title: "Task Assigned!", timer: 1500, showConfirmButton: false });
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
          <p className="text-xs text-gray-500">{isEdit ? "Update task details" : "Assign a task to a staff member"}</p>
        </div>
      </div>

      {/* Selected Staff Info Card */}
      {selectedStaff && (
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

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4" autoComplete="off">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Staff Select */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Staff Name *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search staff by name or ID..."
                value={searchTerm || (selectedStaff ? `${selectedStaff.full_name} (${selectedStaff.employee_id})` : "")}
                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                onFocus={() => { setShowDropdown(true); if (selectedStaff) setSearchTerm(""); }}
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
                  filteredStaff.map((staff) => (
                    <div key={staff.id} onClick={() => handleStaffSelect(staff)}
                      className={`px-4 py-2.5 cursor-pointer hover:bg-teal-50 border-b border-gray-50 last:border-0 ${form.staff_id === staff.id ? "bg-teal-50" : ""}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold flex-shrink-0">
                          {staff.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{staff.full_name}</p>
                          <p className="text-[10px] text-gray-500">{staff.employee_id} · {staff.department || "No Dept"} {staff.role_title ? `· ${staff.role_title}` : ""}</p>
                        </div>
                      </div>
                    </div>
                  ))
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

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
            <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required className={inp} />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Deadline <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="date" name="deadline" value={form.deadline} onChange={handleChange} className={inp} />
          </div>
        </div>

        {/* Task Description */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Task Description *</label>
          <textarea name="task" value={form.task} onChange={handleChange} required rows={4} placeholder="Describe the task in detail..."
            className={inp} />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Any additional notes..."
            className={inp} />
        </div>

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
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {isEdit ? "Update Task" : "Assign Task"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
