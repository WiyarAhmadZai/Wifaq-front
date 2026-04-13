import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const STEPS = [
  { num: 1, label: "Personal Info", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { num: 2, label: "Academic Info", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" },
  { num: 3, label: "Fees & Discounts", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" },
];

const DISCOUNT_OPTIONS = [0, 15, 20, 25, 30, 35, 40, 45, 50];

const SPECIAL_STATUS_OPTIONS = [
  { value: "none", label: "None", color: "bg-gray-50 text-gray-700 border-gray-200" },
  { value: "orphan", label: "Orphan", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "employee_child", label: "Employee Child", color: "bg-blue-50 text-blue-700 border-blue-200" },
];

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer group">
    <div className="relative">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-teal-500 transition-colors" />
      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
    </div>
    <span className="text-xs font-medium text-gray-700">{label}</span>
  </label>
);

export default function StudentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const prefilledFamilyId = searchParams.get("family_id");
  const prefilledFamilyLabel = searchParams.get("family_label");

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    family_id: prefilledFamilyId || "",
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    school_class_id: "",
    academic_term_id: "",
    enrollment_date: new Date().toISOString().split("T")[0],
    enrollment_type: "new",
    uniform_required: false,
    transportation_required: false,
    is_fourth_child: false,
    child_order_in_family: "",
    special_status: "none",
    employee_parent_staff_id: "",
    discount_percent: 0,
    foundation_help_requested: false,
    foundation_help_requested_amount: "",
  });

  const [families, setFamilies] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);
  const [employeeParents, setEmployeeParents] = useState([]);
  const [feeBreakdown, setFeeBreakdown] = useState(null);

  const [familySearch, setFamilySearch] = useState(prefilledFamilyLabel || "");
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false);
  const familyRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load form data
  useEffect(() => {
    (async () => {
      try {
        const res = await get("/student-management/students/form-data");
        setFamilies(res.data?.families || []);
        setClasses(res.data?.classes || []);
        setAcademicTerms(res.data?.academic_terms || []);
        setEmployeeParents(res.data?.employee_parents || []);
        // Auto-select latest term
        if (res.data?.academic_terms?.length) {
          setForm((p) => ({ ...p, academic_term_id: res.data.academic_terms[0].id }));
        }
      } catch (error) {
        console.error("Failed to load form data", error);
      }
    })();
    if (isEdit) loadStudent();
  }, [id]);

  // Close family dropdown on outside click
  useEffect(() => {
    const close = (e) => {
      if (familyRef.current && !familyRef.current.contains(e.target)) setShowFamilyDropdown(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Live fee preview whenever fee-related fields change
  useEffect(() => {
    const timer = setTimeout(() => previewFee(), 300);
    return () => clearTimeout(timer);
  }, [
    form.family_id,
    form.school_class_id,
    form.is_fourth_child,
    form.special_status,
    form.employee_parent_staff_id,
    form.discount_percent,
  ]);

  const previewFee = async () => {
    if (!form.school_class_id) {
      setFeeBreakdown(null);
      return;
    }
    try {
      const res = await post("/student-management/students/preview-fee", {
        family_id: form.family_id || null,
        school_class_id: form.school_class_id,
        child_order_in_family: form.is_fourth_child ? 4 : null,
        special_status: form.special_status,
        employee_parent_staff_id: form.employee_parent_staff_id || null,
        discount_percent: form.discount_percent || 0,
      });
      setFeeBreakdown(res.data?.data || null);
    } catch (error) {
      console.error("Preview fee failed", error);
    }
  };

  const loadStudent = async () => {
    setLoading(true);
    try {
      const res = await get(`/student-management/students/show/${id}`);
      const d = res.data?.data;
      if (d) {
        setForm({
          family_id: d.family_id || "",
          first_name: d.first_name || "",
          last_name: d.last_name || "",
          date_of_birth: d.date_of_birth?.split("T")[0] || "",
          gender: d.gender || "",
          school_class_id: d.school_class_id || "",
          academic_term_id: d.academic_term_id || "",
          enrollment_date: d.enrollment_date?.split("T")[0] || "",
          enrollment_type: d.enrollment_type || "new",
          uniform_required: d.uniform_required || false,
          transportation_required: d.transportation_required || false,
          is_fourth_child: (d.child_order_in_family || 0) >= 4 || d.special_status === "fourth_child",
          child_order_in_family: d.child_order_in_family || "",
          special_status: d.special_status || "none",
          employee_parent_staff_id: d.employee_parent_staff_id || "",
          discount_percent: d.discount_percent || 0,
          foundation_help_requested: d.foundation_help_requested || false,
          foundation_help_requested_amount: d.foundation_help_requested_amount || "",
        });
        if (d.family) {
          setFamilySearch(`${d.family.family_id} - ${d.family.father_name}`);
        }
      }
    } catch {
      Swal.fire("Error", "Failed to load student", "error");
      navigate("/student-management/students");
    } finally {
      setLoading(false);
    }
  };

  const set = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    set(name, type === "checkbox" ? checked : value);
  };

  const selectFamily = (fam) => {
    set("family_id", fam.id);
    setFamilySearch(`${fam.family_id} - ${fam.father_name}`);
    setShowFamilyDropdown(false);
  };

  const clearFamily = () => {
    set("family_id", "");
    setFamilySearch("");
  };

  const filteredFamilies = families.filter((f) => {
    const q = familySearch.toLowerCase();
    if (!q) return true;
    return (f.family_id?.toLowerCase().includes(q) ||
            f.father_name?.toLowerCase().includes(q) ||
            f.mother_name?.toLowerCase().includes(q));
  });

  const canNext = () => {
    if (step === 1) return form.family_id && form.first_name && form.last_name && form.date_of_birth;
    if (step === 2) return form.school_class_id && form.enrollment_date;
    return true;
  };

  const submit = async () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        employee_parent_staff_id: form.special_status === "employee_child" ? form.employee_parent_staff_id : null,
        foundation_help_requested_amount: form.foundation_help_requested ? form.foundation_help_requested_amount : null,
        child_order_in_family: form.is_fourth_child ? 4 : null,
      };
      delete payload.is_fourth_child;

      if (isEdit) {
        await put(`/student-management/students/update/${id}`, payload);
      } else {
        await post("/student-management/students/store", payload);
      }
      await Swal.fire({
        icon: "success",
        title: isEdit ? "Student updated!" : "Student registered!",
        timer: 1800,
        showConfirmButton: false,
      });
      navigate("/student-management/students");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        Swal.fire("Validation failed", Object.values(error.response.data.errors).flat()[0] || "Please fix errors", "error");
      } else {
        Swal.fire("Error", error.response?.data?.message || "Failed to save student", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const err = (f) => errors[f]?.[0];
  const inp = (f) => `w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:outline-none transition-all ${err(f) ? "border-red-400 focus:ring-red-300 bg-red-50" : "border-gray-200 focus:ring-teal-400 bg-white"}`;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/student-management/students")}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? "Edit Student" : "New Student Registration"}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Phase 1 — Step {step} of {STEPS.length}: {STEPS[step - 1].label}</p>
          </div>
        </div>
      </div>

      {/* Step pills */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const done = step > s.num;
            const active = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => done && setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${active ? "bg-teal-600 text-white" : done ? "bg-teal-50 text-teal-700 cursor-pointer" : "bg-gray-100 text-gray-400"}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${active ? "bg-white/25 text-white" : done ? "bg-teal-600 text-white" : "bg-gray-300 text-white"}`}>
                    {done ? "✓" : s.num}
                  </span>
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`w-4 h-px ${done ? "bg-teal-400" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form body */}
      <form onSubmit={(e) => e.preventDefault()} className="px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-800">Personal Information</h3>

              {/* Family selector */}
              <div ref={familyRef} className="relative">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Family *</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" value={familySearch}
                    onChange={(e) => { setFamilySearch(e.target.value); setShowFamilyDropdown(true); }}
                    onFocus={() => setShowFamilyDropdown(true)}
                    placeholder="Search by family ID, father, or mother..."
                    className={`${inp("family_id")} pl-9 pr-10`} />
                  {form.family_id && (
                    <button type="button" onClick={clearFamily}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {showFamilyDropdown && !form.family_id && filteredFamilies.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {filteredFamilies.slice(0, 10).map((f) => (
                      <button key={f.id} type="button" onClick={() => selectFamily(f)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-teal-600">{f.family_id}</span>
                          <span className="text-xs font-medium text-gray-800">{f.father_name}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{f.father_phone}</p>
                      </button>
                    ))}
                  </div>
                )}
                {err("family_id") && <p className="text-red-500 text-[10px] mt-1">{err("family_id")}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">First Name *</label>
                  <input type="text" name="first_name" value={form.first_name} onChange={handle} className={inp("first_name")} />
                  {err("first_name") && <p className="text-red-500 text-[10px] mt-1">{err("first_name")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Last Name *</label>
                  <input type="text" name="last_name" value={form.last_name} onChange={handle} className={inp("last_name")} />
                  {err("last_name") && <p className="text-red-500 text-[10px] mt-1">{err("last_name")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Date of Birth *</label>
                  <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handle} className={inp("date_of_birth")} />
                  {err("date_of_birth") && <p className="text-red-500 text-[10px] mt-1">{err("date_of_birth")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Gender</label>
                  <select name="gender" value={form.gender} onChange={handle} className={inp("gender")}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Academic Info */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-800">Academic Information</h3>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Class *</label>
                <select name="school_class_id" value={form.school_class_id} onChange={handle} className={inp("school_class_id")}>
                  <option value="">Select class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name} ({c.shift === "morning" ? "AM" : "PM"}) — Base: {c.grade?.base_fee || 3500} AFN
                    </option>
                  ))}
                </select>
                {err("school_class_id") && <p className="text-red-500 text-[10px] mt-1">{err("school_class_id")}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Academic Term *</label>
                  <select name="academic_term_id" value={form.academic_term_id} onChange={handle} className={inp("academic_term_id")}>
                    <option value="">Select term...</option>
                    {academicTerms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Enrollment Date *</label>
                  <input type="date" name="enrollment_date" value={form.enrollment_date} onChange={handle} className={inp("enrollment_date")} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Enrollment Type</label>
                  <select name="enrollment_type" value={form.enrollment_type} onChange={handle} className={inp("enrollment_type")}>
                    <option value="new">New Admission</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">4th Child Free Policy</label>
                  <div className="p-3 rounded-xl border-2 border-gray-200 bg-white">
                    <Toggle
                      checked={form.is_fourth_child}
                      onChange={(e) => set("is_fourth_child", e.target.checked)}
                      label="This is the 4th+ child in the family"
                    />
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                      Requires 3+ active siblings already enrolled. Tuition becomes <strong>FREE</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <Toggle checked={form.uniform_required} onChange={(e) => set("uniform_required", e.target.checked)} label="Uniform Required" />
                <Toggle checked={form.transportation_required} onChange={(e) => set("transportation_required", e.target.checked)} label="Transportation Required" />
              </div>
            </div>
          )}

          {/* Step 3: Fees & Discounts */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-800">Fees & Discounts</h3>

              {/* Special Status */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-2">Special Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {SPECIAL_STATUS_OPTIONS.map((s) => (
                    <button key={s.value} type="button"
                      onClick={() => set("special_status", s.value)}
                      className={`p-3 rounded-xl border-2 text-xs font-semibold transition-all
                        ${form.special_status === s.value ? `${s.color} ring-2 ring-current/30` : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employee parent selector */}
              {form.special_status === "employee_child" && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Employee Parent *</label>
                  <select name="employee_parent_staff_id" value={form.employee_parent_staff_id} onChange={handle}
                    className={inp("employee_parent_staff_id")}>
                    <option value="">Select staff member...</option>
                    {employeeParents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {s.role || s.department}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">System will auto-apply discount based on years of service</p>
                </div>
              )}

              {/* Discount percent (only for 'none' status) */}
              {form.special_status === "none" && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-2">Regular Discount</label>
                  <div className="grid grid-cols-5 gap-2">
                    {DISCOUNT_OPTIONS.map((pct) => (
                      <button key={pct} type="button" onClick={() => set("discount_percent", pct)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all
                          ${Number(form.discount_percent) === pct ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
                        {pct === 0 ? "None" : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Foundation help */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <Toggle checked={form.foundation_help_requested}
                  onChange={(e) => set("foundation_help_requested", e.target.checked)}
                  label="Request Foundation Help (family cannot afford full fee)" />
                {form.foundation_help_requested && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Amount Family Needs Help With (AFN)</label>
                    <input type="number" name="foundation_help_requested_amount" value={form.foundation_help_requested_amount}
                      onChange={handle} placeholder="e.g. 450" min={0}
                      className={inp("foundation_help_requested_amount")} />
                    <p className="text-[10px] text-amber-600 mt-1">⚠ This will create a pending foundation request for admin review</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <button type="button"
              onClick={() => step > 1 ? setStep((s) => s - 1) : navigate("/student-management/students")}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              {step === 1 ? "Cancel" : "Back"}
            </button>
            {step < STEPS.length ? (
              <button type="button" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-40">
                Next →
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={saving}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                ) : (isEdit ? "Update Student" : "Register Student")}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar: Live fee breakdown */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-[80px]">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Fee Breakdown</h3>
            {feeBreakdown ? (
              <div className="space-y-2">
                {feeBreakdown.breakdown?.map((row, i) => {
                  const isFinal = row.label.toLowerCase().includes("final");
                  const isNegative = row.amount < 0;
                  return (
                    <div key={i} className={`flex items-center justify-between text-xs py-2 ${isFinal ? "pt-3 mt-2 border-t-2 border-teal-200 font-bold" : "border-b border-gray-50"}`}>
                      <span className={isFinal ? "text-gray-800" : "text-gray-600"}>{row.label}</span>
                      <span className={isFinal ? "text-teal-700 text-sm" : isNegative ? "text-red-500" : "text-gray-700"}>
                        {isNegative ? "- " : ""}{Math.abs(row.amount).toLocaleString()} AFN
                      </span>
                    </div>
                  );
                })}
                {feeBreakdown.discount_percent > 0 && (
                  <div className="mt-3 px-3 py-2 bg-teal-50 rounded-lg">
                    <p className="text-[10px] font-bold text-teal-700">TOTAL DISCOUNT</p>
                    <p className="text-sm font-black text-teal-900">{feeBreakdown.discount_percent}%</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Select a class to see the fee breakdown</p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
