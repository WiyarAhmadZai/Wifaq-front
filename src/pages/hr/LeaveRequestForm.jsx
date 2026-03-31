import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const LEAVE_TYPES = [
  { value: "", label: "Select Leave Type" },
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "emergency", label: "Emergency Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "other", label: "Other" },
];

const leaveTypeInfo = {
  sick: { color: "red", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", desc: "For illness or medical appointments" },
  casual: { color: "blue", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", desc: "Personal day off for non-urgent matters" },
  annual: { color: "teal", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z", desc: "Scheduled vacation days" },
  emergency: { color: "orange", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z", desc: "Urgent unforeseen circumstances" },
  maternity: { color: "pink", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", desc: "Maternity/Paternity leave" },
  unpaid: { color: "gray", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", desc: "Leave without pay" },
  other: { color: "purple", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", desc: "Other type of leave" },
};

export default function LeaveRequestForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const dropdownRef = useRef(null);

  const [form, setForm] = useState({
    staff_id: "",
    leave_type: "",
    from_date: new Date().toISOString().split("T")[0],
    to_date: "",
    total_days: 1,
    reason: "",
    coverage_plan: "",
    status: "pending",
  });

  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStaff();
    if (isEdit) fetchLeaveRequest();
  }, [id]);

  // Auto-calculate total days
  useEffect(() => {
    if (form.from_date && form.to_date) {
      const from = new Date(form.from_date);
      const to = new Date(form.to_date);
      const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) {
        setForm((p) => ({ ...p, total_days: diff }));
      }
    }
  }, [form.from_date, form.to_date]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await get("/hr/staff/list?per_page=1000");
      const data = res.data?.data || res.data || [];
      setStaffList(Array.isArray(data) ? data : []);
      setFilteredStaff(Array.isArray(data) ? data : []);
    } catch {
      console.error("Failed to fetch staff");
    }
  };

  const fetchLeaveRequest = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/leave-requests/${id}`);
      const d = res.data?.data || res.data;
      setForm({
        staff_id: d.staff_id || "",
        leave_type: d.leave_type || "",
        from_date: d.from_date ? d.from_date.split("T")[0] : "",
        to_date: d.to_date ? d.to_date.split("T")[0] : "",
        total_days: d.total_days || 1,
        reason: d.reason || "",
        coverage_plan: d.coverage_plan || "",
        status: d.status || "pending",
      });
      // Set the selected staff for the info card
      if (d.staff) {
        setSelectedStaff(d.staff);
        setStaffSearch(d.staff.application?.full_name || d.staff.full_name || `Staff #${d.staff.employee_id}`);
      }
    } catch {
      Swal.fire("Error", "Failed to load leave request", "error");
      navigate("/hr/leave-request");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSearch = (e) => {
    const q = e.target.value.toLowerCase();
    setStaffSearch(e.target.value);
    setShowDropdown(true);
    setFilteredStaff(
      staffList.filter((s) => {
        const name = (s.application?.full_name || s.full_name || "").toLowerCase();
        const empId = (s.employee_id || "").toLowerCase();
        const dept = (s.department || "").toLowerCase();
        return name.includes(q) || empId.includes(q) || dept.includes(q);
      })
    );
  };

  const selectStaff = (staff) => {
    setSelectedStaff(staff);
    setForm((p) => ({ ...p, staff_id: staff.id }));
    setStaffSearch(staff.application?.full_name || staff.full_name || `Staff #${staff.employee_id}`);
    setShowDropdown(false);
    if (errors.staff_id) setErrors((p) => ({ ...p, staff_id: null }));
  };

  const clearStaff = () => {
    setSelectedStaff(null);
    setForm((p) => ({ ...p, staff_id: "" }));
    setStaffSearch("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate
    const errs = {};
    if (!form.staff_id) errs.staff_id = "Please select a staff member";
    if (!form.leave_type) errs.leave_type = "Leave type is required";
    if (!form.from_date) errs.from_date = "Start date is required";
    if (!form.total_days || form.total_days < 1) errs.total_days = "Must be at least 1 day";
    if (!form.coverage_plan) errs.coverage_plan = "Coverage plan is required";
    if (form.leave_type === "other" && !form.reason) errs.reason = "Reason is required for Other leave type";

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await put(`/hr/leave-requests/${id}`, form);
        Swal.fire("Updated!", "Leave request updated successfully.", "success");
      } else {
        await post("/hr/leave-requests", form);
        Swal.fire("Created!", "Leave request submitted successfully.", "success");
      }
      navigate("/hr/leave-request");
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const serverErrors = {};
        Object.entries(err.response.data.errors).forEach(([k, v]) => { serverErrors[k] = v[0]; });
        setErrors(serverErrors);
      } else {
        Swal.fire("Error", err.response?.data?.message || "Failed to save", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const staffName = (s) => s.application?.full_name || s.full_name || `Staff #${s.employee_id}`;
  const staffDept = (s) => s.department || "No department";
  const staffPosition = (s) => s.role_title_en || "No position";
  const staffEmpId = (s) => s.employee_id || "-";
  const staffInitials = (s) => {
    const name = staffName(s);
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  };

  const typeInfo = leaveTypeInfo[form.leave_type];
  const inputClass = (field) =>
    `w-full px-3 py-2.5 border rounded-xl text-xs transition-all focus:ring-2 focus:outline-none ${
      errors[field] ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-200 bg-white hover:border-gray-300 focus:ring-teal-400"
    }`;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header Bar */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/hr/leave-request")}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? "Edit Leave Request" : "New Leave Request"}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Submit a request for time off</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Staff Selection */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Staff Member</p>
              <p className="text-[10px] text-teal-600">Search and select the employee</p>
            </div>
          </div>

          <div className="p-5">
            {/* Search Input */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Select Staff *</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={staffSearch}
                  onChange={handleStaffSearch}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name, employee ID, or department..."
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-xl text-xs transition-all focus:ring-2 focus:outline-none ${errors.staff_id ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-200 bg-white hover:border-gray-300 focus:ring-teal-400"}`}
                />
                {selectedStaff && (
                  <button onClick={clearStaff} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {errors.staff_id && <p className="text-red-500 text-[10px] mt-1">{errors.staff_id}</p>}

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                  {filteredStaff.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-400">No staff found</div>
                  ) : (
                    filteredStaff.map((s) => (
                      <div key={s.id} onClick={() => selectStaff(s)}
                        className={`px-4 py-2.5 cursor-pointer hover:bg-teal-50 border-b border-gray-50 last:border-0 ${form.staff_id === s.id ? "bg-teal-50" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-[10px] font-bold flex-shrink-0">
                            {staffInitials(s)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{staffName(s)}</p>
                            <p className="text-[10px] text-gray-400">{staffEmpId(s)} &middot; {staffDept(s)} &middot; {staffPosition(s)}</p>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold capitalize ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{s.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Staff Info Card */}
            {selectedStaff && (
              <div className="mt-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-teal-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {staffInitials(selectedStaff)}
                  </div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[9px] font-semibold text-teal-600 uppercase tracking-wider">Employee ID</p>
                      <p className="text-xs font-bold text-gray-800">{staffEmpId(selectedStaff)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-teal-600 uppercase tracking-wider">Name</p>
                      <p className="text-xs font-bold text-gray-800">{staffName(selectedStaff)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-teal-600 uppercase tracking-wider">Position</p>
                      <p className="text-xs font-bold text-gray-800">{staffPosition(selectedStaff)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-teal-600 uppercase tracking-wider">Department</p>
                      <p className="text-xs font-bold text-gray-800">{staffDept(selectedStaff)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Leave Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Leave Details</p>
                <p className="text-[10px] text-teal-600">Type, dates, and duration</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Leave Type */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Leave Type *</label>
                <select name="leave_type" value={form.leave_type} onChange={handleChange} className={inputClass("leave_type")}>
                  {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {errors.leave_type && <p className="text-red-500 text-[10px] mt-1">{errors.leave_type}</p>}
              </div>

              {/* Leave type info banner */}
              {typeInfo && (
                <div className={`flex items-center gap-3 p-3 bg-${typeInfo.color}-50 border border-${typeInfo.color}-200 rounded-xl`}>
                  <svg className={`w-5 h-5 text-${typeInfo.color}-500 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeInfo.icon} />
                  </svg>
                  <p className={`text-xs text-${typeInfo.color}-700`}>{typeInfo.desc}</p>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">From Date *</label>
                  <input type="date" name="from_date" value={form.from_date} onChange={handleChange} className={inputClass("from_date")} />
                  {errors.from_date && <p className="text-red-500 text-[10px] mt-1">{errors.from_date}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">To Date</label>
                  <input type="date" name="to_date" value={form.to_date} onChange={handleChange} min={form.from_date} className={inputClass("to_date")} />
                  {errors.to_date && <p className="text-red-500 text-[10px] mt-1">{errors.to_date}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Total Days *</label>
                  <input type="number" name="total_days" value={form.total_days} onChange={handleChange} min={1}
                    className={inputClass("total_days")} readOnly={!!(form.from_date && form.to_date)} />
                  <p className="text-[9px] text-gray-400 mt-0.5">{form.from_date && form.to_date ? "Auto-calculated from dates" : "Enter manually or set both dates"}</p>
                  {errors.total_days && <p className="text-red-500 text-[10px] mt-1">{errors.total_days}</p>}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Reason {form.leave_type === "other" && <span className="text-red-500">*</span>}
                </label>
                <textarea name="reason" value={form.reason} onChange={handleChange} rows={3}
                  placeholder="Explain the reason for your leave request..."
                  className={inputClass("reason")} />
                {errors.reason && <p className="text-red-500 text-[10px] mt-1">{errors.reason}</p>}
              </div>
            </div>
          </div>

          {/* Coverage Plan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Coverage Plan</p>
                <p className="text-[10px] text-teal-600">Who will handle your responsibilities</p>
              </div>
            </div>

            <div className="p-5">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Coverage Plan *</label>
              <textarea name="coverage_plan" value={form.coverage_plan} onChange={handleChange} rows={3}
                placeholder="Describe who will cover your duties during your absence (e.g., Mr. Ahmad will handle classes, Ms. Sara will manage reports...)"
                className={inputClass("coverage_plan")} />
              {errors.coverage_plan && <p className="text-red-500 text-[10px] mt-1">{errors.coverage_plan}</p>}
            </div>
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Approval Status</p>
                  <p className="text-[10px] text-teal-600">Update the leave request status</p>
                </div>
              </div>

              <div className="p-5">
                <div className="flex gap-3">
                  {["pending", "approved", "rejected"].map((s) => {
                    const conf = { pending: { bg: "bg-amber-50 border-amber-300 ring-amber-200", dot: "bg-amber-500" }, approved: { bg: "bg-emerald-50 border-emerald-300 ring-emerald-200", dot: "bg-emerald-500" }, rejected: { bg: "bg-red-50 border-red-300 ring-red-200", dot: "bg-red-500" } };
                    const c = conf[s];
                    return (
                      <button key={s} type="button" onClick={() => setForm((p) => ({ ...p, status: s }))}
                        className={`flex-1 p-3 rounded-xl border-2 text-center transition-all capitalize text-xs font-semibold ${
                          form.status === s ? `${c.bg} ring-2 ${c.bg.split(" ")[0]}` : "bg-white border-gray-200 hover:border-gray-300"
                        }`}>
                        <div className={`w-2.5 h-2.5 ${c.dot} rounded-full mx-auto mb-1.5`} />
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Summary Card */}
          {selectedStaff && form.leave_type && form.from_date && (
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
              <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Request Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div><span className="text-teal-200 block text-[9px]">Employee</span><span className="font-medium">{staffName(selectedStaff)}</span></div>
                <div><span className="text-teal-200 block text-[9px]">Leave Type</span><span className="font-medium capitalize">{form.leave_type}</span></div>
                <div><span className="text-teal-200 block text-[9px]">Duration</span><span className="font-medium">{form.total_days} day{form.total_days > 1 ? "s" : ""}</span></div>
                <div><span className="text-teal-200 block text-[9px]">Dates</span><span className="font-medium">{form.from_date}{form.to_date ? ` to ${form.to_date}` : ""}</span></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={() => navigate("/hr/leave-request")}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{isEdit ? "Update Request" : "Submit Request"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
