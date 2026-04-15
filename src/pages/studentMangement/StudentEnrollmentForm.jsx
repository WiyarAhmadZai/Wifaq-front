import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { get, put } from "../../api/axios";
import Swal from "sweetalert2";
import { handleValidationErrors } from "../../utils/formErrors";

const steps = [
  {
    id: 1,
    title: "Education History",
    shortTitle: "Education",
    icon: "M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z",
  },
  {
    id: 2,
    title: "Health & References",
    shortTitle: "Health",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  },
  {
    id: 3,
    title: "Transport",
    shortTitle: "Transport",
    icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  },
  {
    id: 4,
    title: "Uniform",
    shortTitle: "Uniform",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  },
  {
    id: 5,
    title: "Documents",
    shortTitle: "Docs",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    id: 6,
    title: "Family Questionnaire",
    shortTitle: "Questionnaire",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
];

function Toggle({ name, id, checked, onChange, label }) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          name={name}
          id={id}
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-teal-500 transition-colors"></div>
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform"></div>
      </div>
      <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
    </label>
  );
}

function SectionHeader({ gradient, iconBg, iconColor, icon, title, subtitle }) {
  return (
    <div className={`px-5 py-4 bg-gradient-to-r ${gradient} border-b border-gray-100`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
          <svg className={`w-4 h-4 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
          <p className="text-[10px] text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function FileInput({ label, name, onChange, file }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">{label}</label>
      <label className="flex items-center gap-3 w-full px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-teal-300 hover:bg-teal-50 transition-all">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-xs text-gray-500 truncate">
          {file ? file.name : "Click to upload file"}
        </span>
        <input
          type="file"
          name={name}
          onChange={onChange}
          className="sr-only"
        />
      </label>
      {file && (
        <p className="text-[10px] text-teal-600 mt-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {file.name}
        </p>
      )}
    </div>
  );
}

export default function StudentEnrollmentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isEdit = Boolean(id);
  const isShow = isEdit && location.pathname.includes("/show/");
  const readOnly = isShow;

  // Student selection (Phase 2 target)
  const prefilledStudentId = searchParams.get("student_id");
  const [selectedStudentId, setSelectedStudentId] = useState(prefilledStudentId || "");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [phase1Students, setPhase1Students] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [studentLocked, setStudentLocked] = useState(Boolean(prefilledStudentId));
  const studentRef = useRef(null);

  // Transport route & vehicle state
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routeSearch, setRouteSearch] = useState("");
  const [showRouteDropdown, setShowRouteDropdown] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const routeRef = useRef(null);
  const vehicleRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(2);
  const [formData, setFormData] = useState({
    // Step 1: Education History
    previous_school_name: "",
    school_type: "",
    last_class_completed: "",
    last_years_result: "",
    result_percentage: "",
    reason_for_change: "",
    // Step 2: Health & References
    how_did_you_hear: "",
    introducer_name: "",
    introducer_contact: "",
    motivation_to_join: "",
    has_special_health_condition: false,
    has_special_needs: false,
    health_details: "",
    // Step 3: Transport
    transport_route_id: "",
    transport_vehicle_id: "",
    transport_pickup_point: "",
    transport_pickup_time: "",
    transport_dropoff_point: "",
    transport_monthly_fee: "",
    // Step 4: Uniform
    need_uniform: false,
    uniform_price: "",
    uniform_chest: "",
    uniform_waist: "",
    uniform_height: "",
    uniform_shoulder: "",
    uniform_sleeve: "",
    tailor_note: "",
    // Step 6: Family Questionnaire
    parental_consent: false,
  });

  const [files, setFiles] = useState({
    // Step 5: Documents
    doc_student_tazkira: null,
    doc_father_tazkira: null,
    doc_birth_certificate: null,
    doc_previous_school_documents: null,
    doc_student_photo: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) fetchStudent();
  }, [id]);

  // Fetch phase 1 students list for selection (always, so user can change choice)
  useEffect(() => {
    if (!isEdit) {
      fetchPhase1Students();
    }
  }, []);

  // When a student id is set (from URL param or query), fetch full student data
  useEffect(() => {
    const targetId = prefilledStudentId || (isEdit ? id : null);
    if (targetId) {
      fetchSelectedStudent(targetId);
      setSelectedStudentId(targetId);
      setStudentLocked(true);
    }
  }, [prefilledStudentId, id, isEdit]);

  // Close student dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (studentRef.current && !studentRef.current.contains(e.target)) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPhase1Students = async () => {
    try {
      const response = await get("/student-management/students/list?registration_status=phase_1&per_page=1000");
      const data = response.data?.data || [];
      setPhase1Students(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch phase 1 students", error);
    }
  };

  const fetchSelectedStudent = async (studentId) => {
    try {
      const response = await get(`/student-management/students/show/${studentId}`);
      const data = response.data?.data || response.data;
      setSelectedStudent(data);
    } catch (error) {
      console.error("Failed to fetch student", error);
    }
  };

  const filteredStudents = phase1Students.filter((s) => {
    const q = studentSearch.toLowerCase();
    if (!q) return true;
    return (
      (s.student_id && s.student_id.toLowerCase().includes(q)) ||
      (s.first_name && s.first_name.toLowerCase().includes(q)) ||
      (s.last_name && s.last_name.toLowerCase().includes(q)) ||
      `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase().includes(q) ||
      String(s.id).includes(q)
    );
  });

  const selectStudent = (student) => {
    setSelectedStudentId(student.id);
    setSelectedStudent(student);
    setStudentSearch(`${student.student_id || "#" + student.id} - ${student.first_name} ${student.last_name}`);
    setShowStudentDropdown(false);
    setStudentLocked(true);
    // Always refetch full student record so fields like `enrollment_type`
    // (which the list endpoint may not include, or may be stale after a
    // Phase 1 update) reflect the current backend state.
    fetchSelectedStudent(student.id);
  };

  const clearStudent = () => {
    setSelectedStudentId("");
    setSelectedStudent(null);
    setStudentSearch("");
    setStudentLocked(false);
  };

  // Fetch active routes once on mount — step 3 is always available now
  useEffect(() => {
    (async () => {
      try {
        const res = await get("/transportation/routes/active/list");
        const data = res.data?.data || res.data || [];
        setRoutes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch routes", err);
      }
    })();
  }, []);

  // Fetch vehicles for the selected route
  useEffect(() => {
    if (formData.transport_route_id) {
      (async () => {
        try {
          const res = await get(`/transportation/vehicles/by-route/${formData.transport_route_id}`);
          const data = res.data?.data || res.data || [];
          setVehicles(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error("Failed to fetch vehicles", err);
          setVehicles([]);
        }
      })();
    } else {
      setVehicles([]);
    }
  }, [formData.transport_route_id]);

  // Click outside handlers for route/vehicle dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (routeRef.current && !routeRef.current.contains(e.target)) setShowRouteDropdown(false);
      if (vehicleRef.current && !vehicleRef.current.contains(e.target)) setShowVehicleDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedRoute = routes.find((r) => r.id == formData.transport_route_id);
  const selectedVehicle = vehicles.find((v) => v.id == formData.transport_vehicle_id);

  const filteredRoutes = routes.filter((r) => {
    const q = routeSearch.toLowerCase();
    if (!q) return true;
    return (
      (r.route_name && r.route_name.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  const filteredVehicles = vehicles.filter((v) => {
    const q = vehicleSearch.toLowerCase();
    if (!q) return true;
    return (
      (v.plate_number && v.plate_number.toLowerCase().includes(q)) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(q))
    );
  });

  const pickRoute = (route) => {
    setFormData((prev) => ({
      ...prev,
      transport_route_id: route.id,
      transport_vehicle_id: "",
      transport_monthly_fee: "",
    }));
    setRouteSearch(route.route_name);
    setShowRouteDropdown(false);
  };

  const clearRoute = () => {
    setFormData((prev) => ({
      ...prev,
      transport_route_id: "",
      transport_vehicle_id: "",
      transport_monthly_fee: "",
    }));
    setRouteSearch("");
    setVehicleSearch("");
  };

  const pickVehicle = (vehicle) => {
    setFormData((prev) => ({
      ...prev,
      transport_vehicle_id: vehicle.id,
      transport_monthly_fee: vehicle.monthly_fee || "",
    }));
    setVehicleSearch(`${vehicle.plate_number} — ${vehicle.driver_name || "No driver"}`);
    setShowVehicleDropdown(false);
  };

  const clearVehicle = () => {
    setFormData((prev) => ({ ...prev, transport_vehicle_id: "" }));
    setVehicleSearch("");
  };

  const fetchStudent = async () => {
    setLoading(true);
    try {
      const response = await get(`/student-management/students/show/${id}`);
      const data = response.data;
      setFormData((prev) => ({
        ...prev,
        previous_school_name: data.previous_school_name || "",
        school_type: data.school_type || "",
        last_class_completed: data.last_class_completed || "",
        last_years_result: data.last_years_result || "",
        result_percentage: data.result_percentage || "",
        reason_for_change: data.reason_for_change || "",
        how_did_you_hear: data.how_did_you_hear || "",
        introducer_name: data.introducer_name || "",
        introducer_contact: data.introducer_contact || "",
        motivation_to_join: data.motivation_to_join || "",
        has_special_health_condition: data.has_special_health_condition || false,
        has_special_needs: data.has_special_needs || false,
        health_details: data.health_details || "",
        transport_route_id: data.transport_route_id || "",
        transport_vehicle_id: data.transport_vehicle_id || "",
        transport_monthly_fee: data.transport_monthly_fee || "",
        transport_pickup_point: data.transport_pickup_point || "",
        transport_pickup_time: data.transport_pickup_time || "",
        transport_dropoff_point: data.transport_dropoff_point || "",
        need_uniform: data.need_uniform || false,
        uniform_price: data.uniform_price || "",
        uniform_chest: data.uniform_chest || "",
        uniform_waist: data.uniform_waist || "",
        uniform_height: data.uniform_height || "",
        uniform_shoulder: data.uniform_shoulder || "",
        uniform_sleeve: data.uniform_sleeve || "",
        tailor_note: data.tailor_note || "",
        parental_consent: data.parental_consent || false,
      }));
    } catch (error) {
      Swal.fire("Error", "Failed to load student data", "error");
      navigate("/student-management/students");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    if (fileList && fileList[0]) {
      setFiles((prev) => ({ ...prev, [name]: fileList[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    // Only allow submit from the final step — prevents accidental Enter-key submits
    if (!isLastVisibleStep) return;
    if (!isEdit && !selectedStudentId) {
      Swal.fire("Error", "Please select a student to enroll (Phase 2)", "error");
      return;
    }
    if (!formData.parental_consent) {
      Swal.fire("Consent required", "Please tick the parental consent checkbox before submitting.", "warning");
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const targetId = isEdit ? id : selectedStudentId;

      // If user changed transport/uniform opt-in during Phase 2, sync back to the Phase 1 student record
      const phase1Patch = {};
      if (selectedStudent) {
        if (Boolean(selectedStudent.transportation_required) !== wantsTransport) {
          phase1Patch.transportation_required = wantsTransport;
        }
        if (Boolean(selectedStudent.uniform_required) !== Boolean(formData.need_uniform)) {
          phase1Patch.uniform_required = Boolean(formData.need_uniform);
        }
      }
      if (Object.keys(phase1Patch).length > 0) {
        await put(`/student-management/students/update/${targetId}`, phase1Patch);
      }

      // Mark the student as phase_2 complete — transitions to enrolled list
      await put(`/student-management/students/${targetId}/complete-phase-2`);
      Swal.fire("Success", "Student officially enrolled (Phase 2 complete)", "success");
      navigate("/student-management/student-enrollments");
    } catch (error) {
      if (!handleValidationErrors(error.response, setErrors)) {
        Swal.fire("Error", error.response?.data?.message || "Failed to save student", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // Step 1 (Education History) is only relevant for transfer students.
  // For new-enrollment students it is hidden entirely.
  const isTransferStudent = selectedStudent?.enrollment_type === "transfer";
  const visibleSteps = isTransferStudent ? steps : steps.filter((s) => s.id !== 1);

  // Keep currentStep inside visibleSteps. When a transfer student is selected,
  // jump to step 1 so the admin starts at Education History.
  useEffect(() => {
    if (isTransferStudent) {
      setCurrentStep(1);
    } else if (currentStep === 1) {
      setCurrentStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransferStudent]);
  const needsTransport = Boolean(selectedStudent?.transportation_required);

  // User's current intent for transport/uniform (can differ from Phase 1 choice)
  const [wantsTransport, setWantsTransport] = useState(false);

  // Sync wantsTransport + need_uniform with the selected student on load
  useEffect(() => {
    if (selectedStudent) {
      setWantsTransport(Boolean(selectedStudent.transportation_required));
      setFormData((prev) => ({
        ...prev,
        need_uniform: Boolean(selectedStudent.uniform_required),
      }));
    }
  }, [selectedStudent]);

  const goToNextStep = () => {
    const currentIdx = visibleSteps.findIndex((s) => s.id === currentStep);
    if (currentIdx < visibleSteps.length - 1) {
      setCurrentStep(visibleSteps[currentIdx + 1].id);
    }
  };
  const goToPrevStep = () => {
    const currentIdx = visibleSteps.findIndex((s) => s.id === currentStep);
    if (currentIdx > 0) {
      setCurrentStep(visibleSteps[currentIdx - 1].id);
    }
  };
  const isFirstVisibleStep = visibleSteps[0]?.id === currentStep;
  const isLastVisibleStep = visibleSteps[visibleSteps.length - 1]?.id === currentStep;

  const getFieldError = (fieldName) => errors[fieldName]?.[0];
  const inputClass = (fieldName) => {
    const base =
      "w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:outline-none text-xs transition-all";
    return `${base} ${
      getFieldError(fieldName)
        ? "border-red-400 focus:ring-red-300 bg-red-50"
        : "border-gray-200 focus:ring-teal-400 hover:border-gray-300"
    }`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading student data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(isEdit ? "/student-management/student-enrollments" : "/student-management/students")}
          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {isShow ? "View Enrollment" : isEdit ? "Edit Student Enrollment" : "Phase 2 — Official Enrollment"}
          </h2>
          <p className="text-[11px] text-gray-400">
            Step {currentStep} of {visibleSteps.length} — {steps.find(s => s.id === currentStep)?.title}
          </p>
        </div>
        {isShow && (
          <button
            type="button"
            onClick={() => navigate(`/student-management/student-enrollments/edit/${id}`)}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        )}
      </div>

      {/* ── Student Selector (Phase 2 target) ── */}
      {!isEdit && (
        <div className="mb-5 bg-white rounded-2xl shadow-sm border border-gray-100 relative z-40">
          <SectionHeader
            gradient="from-emerald-50 to-teal-50"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            title="Select Student for Phase 2 Enrollment"
            subtitle="Choose a Phase 1 registered student to officially enroll"
          />
          <div ref={studentRef} className="p-5 relative">
            {studentLocked && selectedStudent ? (
              <div className="flex items-center gap-3 p-4 bg-teal-50 border-2 border-teal-200 rounded-xl">
                <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(selectedStudent.first_name || "?").charAt(0)}{(selectedStudent.last_name || "").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  <p className="text-[11px] text-teal-700 font-mono">{selectedStudent.student_id || `#${selectedStudent.id}`}</p>
                </div>
                <button
                  type="button"
                  onClick={clearStudent}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Change student"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => { setStudentSearch(e.target.value); setShowStudentDropdown(true); }}
                    onFocus={() => setShowStudentDropdown(true)}
                    placeholder="Search student by ID or name..."
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                  />
                </div>
                {showStudentDropdown && (
                  <div className="absolute z-50 left-5 right-5 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <div className="px-4 py-4 text-xs text-gray-400 text-center">No Phase 1 students found</div>
                    ) : (
                      filteredStudents.slice(0, 30).map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => selectStudent(student)}
                          className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3"
                        >
                          <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(student.first_name || "?").charAt(0)}{(student.last_name || "").charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {student.first_name} {student.last_name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">{student.student_id || `#${student.id}`}</span>
                              {student.school_class?.class_name && (
                                <span className="text-[10px] text-gray-500">{student.school_class.class_name}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Student Info Review Card (above form, all steps) ── */}
      {selectedStudent && (
        <div className="mb-5 bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 rounded-2xl border border-teal-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Phase 1 Student Information</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[9px] font-semibold text-gray-500 uppercase">Name</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">{selectedStudent.first_name} {selectedStudent.last_name}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-gray-500 uppercase">Student ID</p>
              <p className="text-xs font-bold text-teal-700 font-mono mt-0.5">{selectedStudent.student_id || `#${selectedStudent.id}`}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-gray-500 uppercase">Class</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">{selectedStudent.school_class?.class_name || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-gray-500 uppercase">DOB</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">
                {selectedStudent.date_of_birth ? new Date(selectedStudent.date_of_birth).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-gray-500 uppercase">Father</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5 truncate">{selectedStudent.family?.father_name || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-gray-500 uppercase">Phone</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">{selectedStudent.family?.father_phone || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-gray-500 uppercase">Fee</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">
                {selectedStudent.final_fee ? `${Number(selectedStudent.final_fee).toLocaleString()} AFN` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-gray-500 uppercase">Transport</p>
              <p className={`text-xs font-bold mt-0.5 ${needsTransport ? "text-emerald-700" : "text-gray-500"}`}>
                {needsTransport ? "Required" : "Not Required"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex items-center min-w-max px-2">
          {visibleSteps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className="flex flex-col items-center gap-1 group"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                    currentStep === step.id
                      ? "bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-200"
                      : currentStep > step.id
                      ? "bg-teal-100 border-teal-400 text-teal-700"
                      : "bg-white border-gray-200 text-gray-400"
                  }`}
                >
                  {currentStep > step.id ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-[9px] font-semibold whitespace-nowrap transition-colors ${
                    currentStep === step.id
                      ? "text-teal-700"
                      : currentStep > step.id
                      ? "text-teal-500"
                      : "text-gray-400"
                  }`}
                >
                  {step.shortTitle}
                </span>
              </button>
              {i < visibleSteps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 mb-4 rounded-full transition-all`}
                  style={{ backgroundColor: currentStep > step.id ? "#5eead4" : "#f3f4f6" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          // Prevent Enter key from submitting the form unless on the last step
          if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && !isLastVisibleStep) {
            e.preventDefault();
          }
        }}
      >
        <fieldset disabled={readOnly} className={readOnly ? "opacity-95" : ""}>
        {/* ── Step 1: Education History ── */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <SectionHeader
              gradient="from-teal-50 to-cyan-50"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              icon={steps[0].icon}
              title="Education History"
              subtitle="Previous school and academic background"
            />
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Previous School Name
                </label>
                <input
                  type="text"
                  name="previous_school_name"
                  value={formData.previous_school_name}
                  onChange={handleChange}
                  placeholder="e.g. Al-Farabi Primary School"
                  className={inputClass("previous_school_name")}
                />
                {getFieldError("previous_school_name") && (
                  <p className="text-[10px] text-red-500 mt-1">{getFieldError("previous_school_name")}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  School Type
                </label>
                <select
                  name="school_type"
                  value={formData.school_type}
                  onChange={handleChange}
                  className={inputClass("school_type")}
                >
                  <option value="">Select type</option>
                  <option value="government">Government</option>
                  <option value="private">Private</option>
                  <option value="religious">Religious (Madrassa)</option>
                  <option value="international">International</option>
                  <option value="other">Other</option>
                </select>
                {getFieldError("school_type") && (
                  <p className="text-[10px] text-red-500 mt-1">{getFieldError("school_type")}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Last Class Completed
                </label>
                <input
                  type="text"
                  name="last_class_completed"
                  value={formData.last_class_completed}
                  onChange={handleChange}
                  placeholder="e.g. Grade 5, Class 3"
                  className={inputClass("last_class_completed")}
                />
                {getFieldError("last_class_completed") && (
                  <p className="text-[10px] text-red-500 mt-1">{getFieldError("last_class_completed")}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Last Year's Result
                </label>
                <select
                  name="last_years_result"
                  value={formData.last_years_result}
                  onChange={handleChange}
                  className={inputClass("last_years_result")}
                >
                  <option value="">Select result</option>
                  <option value="excellent">Excellent</option>
                  <option value="very_good">Very Good</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="failed">Failed</option>
                </select>
                {getFieldError("last_years_result") && (
                  <p className="text-[10px] text-red-500 mt-1">{getFieldError("last_years_result")}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Result Percentage (%)
                </label>
                <input
                  type="number"
                  name="result_percentage"
                  value={formData.result_percentage}
                  onChange={handleChange}
                  placeholder="e.g. 78"
                  min="0"
                  max="100"
                  step="0.1"
                  className={inputClass("result_percentage")}
                />
                {getFieldError("result_percentage") && (
                  <p className="text-[10px] text-red-500 mt-1">{getFieldError("result_percentage")}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Reason for Change
                </label>
                <textarea
                  name="reason_for_change"
                  value={formData.reason_for_change}
                  onChange={handleChange}
                  placeholder="Why is the student changing school?"
                  rows={3}
                  className={`${inputClass("reason_for_change")} resize-none`}
                />
                {getFieldError("reason_for_change") && (
                  <p className="text-[10px] text-red-500 mt-1">{getFieldError("reason_for_change")}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Health & References ── */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <SectionHeader
              gradient="from-teal-50 to-cyan-50"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              icon={steps[1].icon}
              title="Health & References"
              subtitle="Referral information and health details"
            />
            <div className="p-5 space-y-5">
              {/* References */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                    How did you hear about the school?
                  </label>
                  <select
                    name="how_did_you_hear"
                    value={formData.how_did_you_hear}
                    onChange={handleChange}
                    className={inputClass("how_did_you_hear")}
                  >
                    <option value="">Select source</option>
                    <option value="friend_acquaintance">Friend / Acquaintance</option>
                    <option value="media">Media</option>
                    <option value="ads">Ads</option>
                    <option value="other">Other</option>
                  </select>
                  {getFieldError("how_did_you_hear") && (
                    <p className="text-[10px] text-red-500 mt-1">{getFieldError("how_did_you_hear")}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                    Name of the Introducer
                  </label>
                  <input
                    type="text"
                    name="introducer_name"
                    value={formData.introducer_name}
                    onChange={handleChange}
                    placeholder="Full name"
                    className={inputClass("introducer_name")}
                  />
                  {getFieldError("introducer_name") && (
                    <p className="text-[10px] text-red-500 mt-1">{getFieldError("introducer_name")}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                    Contact Number of the Introducer
                  </label>
                  <input
                    type="text"
                    name="introducer_contact"
                    value={formData.introducer_contact}
                    onChange={handleChange}
                    placeholder="+93 7XX XXX XXXX"
                    className={inputClass("introducer_contact")}
                  />
                  {getFieldError("introducer_contact") && (
                    <p className="text-[10px] text-red-500 mt-1">{getFieldError("introducer_contact")}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                    Motivation to Join the Wifaq
                  </label>
                  <textarea
                    name="motivation_to_join"
                    value={formData.motivation_to_join}
                    onChange={handleChange}
                    placeholder="What motivated the family to join Wifaq school?"
                    rows={3}
                    className={`${inputClass("motivation_to_join")} resize-none`}
                  />
                  {getFieldError("motivation_to_join") && (
                    <p className="text-[10px] text-red-500 mt-1">{getFieldError("motivation_to_join")}</p>
                  )}
                </div>
              </div>

              {/* Health */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Health Information
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl border border-teal-100">
                    <div>
                      <p className="text-xs font-semibold text-teal-800">
                        Does he/she have any special health conditions?
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="has_special_health_condition"
                          value="true"
                          checked={formData.has_special_health_condition === true}
                          onChange={() =>
                            setFormData((prev) => ({ ...prev, has_special_health_condition: true }))
                          }
                          className="accent-teal-500"
                        />
                        <span className="text-xs text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="has_special_health_condition"
                          value="false"
                          checked={formData.has_special_health_condition === false}
                          onChange={() =>
                            setFormData((prev) => ({ ...prev, has_special_health_condition: false }))
                          }
                          className="accent-teal-500"
                        />
                        <span className="text-xs text-gray-700">No</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl border border-teal-100">
                    <div>
                      <p className="text-xs font-semibold text-teal-800">Special needs?</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="has_special_needs"
                          value="true"
                          checked={formData.has_special_needs === true}
                          onChange={() =>
                            setFormData((prev) => ({ ...prev, has_special_needs: true }))
                          }
                          className="accent-teal-500"
                        />
                        <span className="text-xs text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="has_special_needs"
                          value="false"
                          checked={formData.has_special_needs === false}
                          onChange={() =>
                            setFormData((prev) => ({ ...prev, has_special_needs: false }))
                          }
                          className="accent-teal-500"
                        />
                        <span className="text-xs text-gray-700">No</span>
                      </label>
                    </div>
                  </div>

                  {(formData.has_special_health_condition || formData.has_special_needs) && (
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                        Health Details
                      </label>
                      <textarea
                        name="health_details"
                        value={formData.health_details}
                        onChange={handleChange}
                        placeholder="Describe health conditions, special needs, medications, or required accommodations..."
                        rows={3}
                        className={`${inputClass("health_details")} resize-none`}
                      />
                      {getFieldError("health_details") && (
                        <p className="text-[10px] text-red-500 mt-1">{getFieldError("health_details")}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Transport ── */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 relative z-30">
            <SectionHeader
              gradient="from-teal-50 to-cyan-50"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              icon={steps[2].icon}
              title="Transport"
              subtitle="Select route, vehicle and pickup/drop-off details"
            />
            <div className="p-5 space-y-5">
              {/* Opt-in toggle */}
              <div className={`flex items-center justify-between p-4 rounded-xl border ${wantsTransport ? "bg-teal-50 border-teal-200" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex-1">
                  <p className={`text-xs font-bold ${wantsTransport ? "text-teal-800" : "text-amber-800"}`}>
                    {needsTransport ? "Student requested transport in Phase 1" : "Student did NOT request transport in Phase 1"}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${wantsTransport ? "text-teal-600" : "text-amber-600"}`}>
                    {needsTransport
                      ? "You can still change this choice before finalizing enrollment"
                      : "Toggle ON if the student now wants transport — the Phase 1 status will be updated"}
                  </p>
                </div>
                <Toggle
                  name="wantsTransport"
                  id="wantsTransport"
                  checked={wantsTransport}
                  onChange={(e) => setWantsTransport(e.target.checked)}
                  label=""
                />
              </div>

              {/* Gated fields: only when user opted in */}
              {!wantsTransport && (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <p className="text-xs text-gray-500 font-medium">Transport is disabled for this student</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Enable the toggle above to configure route and vehicle</p>
                </div>
              )}

              {wantsTransport && (
              <>
              {/* Route Selector (Select2) */}
              <div ref={routeRef} className="relative">
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Bus Route <span className="text-red-400">*</span>
                </label>
                {formData.transport_route_id && selectedRoute ? (
                  <div className="flex items-center gap-3 p-3 bg-teal-50 border-2 border-teal-200 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{selectedRoute.route_name}</p>
                      {selectedRoute.description && (
                        <p className="text-[10px] text-teal-700 truncate">{selectedRoute.description}</p>
                      )}
                    </div>
                    <button type="button" onClick={clearRoute} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={routeSearch}
                        onChange={(e) => { setRouteSearch(e.target.value); setShowRouteDropdown(true); }}
                        onFocus={() => setShowRouteDropdown(true)}
                        placeholder="Search active routes..."
                        className={`${inputClass("transport_route_id")} pl-9`}
                      />
                    </div>
                    {showRouteDropdown && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {filteredRoutes.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-gray-400 text-center">No active routes found</div>
                        ) : (
                          filteredRoutes.map((route) => (
                            <button
                              key={route.id}
                              type="button"
                              onClick={() => pickRoute(route)}
                              className="w-full text-left px-4 py-2.5 hover:bg-teal-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-800">{route.route_name}</span>
                                {route.vehicles_count != null && (
                                  <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                                    {route.vehicles_count} vehicle{route.vehicles_count === 1 ? "" : "s"}
                                  </span>
                                )}
                              </div>
                              {route.description && (
                                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{route.description}</p>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Vehicle Selector (only when route is chosen) */}
              {formData.transport_route_id && (
                <div ref={vehicleRef} className="relative">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                    Vehicle (Bus) <span className="text-red-400">*</span>
                  </label>
                  {formData.transport_vehicle_id && selectedVehicle ? (
                    <div className="flex items-center gap-3 p-3 bg-cyan-50 border-2 border-cyan-200 rounded-xl">
                      <div className="w-9 h-9 rounded-lg bg-cyan-600 flex items-center justify-center text-white flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {selectedVehicle.plate_number}
                          {selectedVehicle.driver_name && (
                            <span className="text-[10px] text-gray-500 font-normal ml-1.5">· {selectedVehicle.driver_name}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-cyan-700">
                            Seats: {selectedVehicle.available_seat}/{selectedVehicle.total_seats}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700">
                            · {selectedVehicle.monthly_fee != null ? `${Number(selectedVehicle.monthly_fee).toLocaleString()} AFN/month` : "Fee: —"}
                          </span>
                        </div>
                      </div>
                      <button type="button" onClick={clearVehicle} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          value={vehicleSearch}
                          onChange={(e) => { setVehicleSearch(e.target.value); setShowVehicleDropdown(true); }}
                          onFocus={() => setShowVehicleDropdown(true)}
                          placeholder="Search vehicle by plate or driver..."
                          className={`${inputClass("transport_vehicle_id")} pl-9`}
                        />
                      </div>
                      {showVehicleDropdown && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                          {filteredVehicles.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-gray-400 text-center">No vehicles found for this route</div>
                          ) : (
                            filteredVehicles.map((vehicle) => {
                              const full = vehicle.available_seat <= 0;
                              return (
                                <button
                                  key={vehicle.id}
                                  type="button"
                                  disabled={full}
                                  onClick={() => !full && pickVehicle(vehicle)}
                                  className={`w-full text-left px-4 py-2.5 transition-colors border-b border-gray-50 last:border-0 ${full ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:bg-teal-50"}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-gray-800">{vehicle.plate_number}</p>
                                      {vehicle.driver_name && (
                                        <p className="text-[10px] text-gray-500 truncate">{vehicle.driver_name}{vehicle.driver_contact ? ` · ${vehicle.driver_contact}` : ""}</p>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                        {vehicle.monthly_fee != null ? `${Number(vehicle.monthly_fee).toLocaleString()} AFN/mo` : "—"}
                                      </span>
                                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${full ? "text-red-600 bg-red-50" : "text-teal-700 bg-teal-50"}`}>
                                        {vehicle.available_seat}/{vehicle.total_seats} seats
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Remaining transport detail fields (only after vehicle chosen) */}
              {formData.transport_vehicle_id && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Pickup Time</label>
                    <input
                      type="time"
                      name="transport_pickup_time"
                      value={formData.transport_pickup_time}
                      onChange={handleChange}
                      className={inputClass("transport_pickup_time")}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                      Monthly Fee (AFN)
                      <span className="ml-1 text-[9px] text-emerald-600 font-normal">(auto from vehicle)</span>
                    </label>
                    <input
                      type="number"
                      name="transport_monthly_fee"
                      value={formData.transport_monthly_fee}
                      readOnly
                      className={`${inputClass("transport_monthly_fee")} bg-emerald-50 text-emerald-800 font-bold cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Pickup Point / Stop</label>
                    <input
                      type="text"
                      name="transport_pickup_point"
                      value={formData.transport_pickup_point}
                      onChange={handleChange}
                      placeholder="e.g. Main street near mosque"
                      className={inputClass("transport_pickup_point")}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Drop-off Point</label>
                    <input
                      type="text"
                      name="transport_dropoff_point"
                      value={formData.transport_dropoff_point}
                      onChange={handleChange}
                      placeholder="e.g. Same as pickup"
                      className={inputClass("transport_dropoff_point")}
                    />
                  </div>
                </div>
              )}

              {/* Summary */}
              {formData.transport_vehicle_id && (
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                  <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-3">Transport Summary</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-teal-100">
                      <p className="text-[9px] text-teal-600 font-bold uppercase">Route</p>
                      <p className="text-xs font-semibold text-gray-700 mt-1 truncate">{selectedRoute?.route_name || "—"}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-teal-100">
                      <p className="text-[9px] text-teal-600 font-bold uppercase">Vehicle</p>
                      <p className="text-xs font-semibold text-gray-700 mt-1 truncate">{selectedVehicle?.plate_number || "—"}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-teal-100">
                      <p className="text-[9px] text-teal-600 font-bold uppercase">Pickup Time</p>
                      <p className="text-xs font-semibold text-gray-700 mt-1">{formData.transport_pickup_time || "—"}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-teal-100">
                      <p className="text-[9px] text-teal-600 font-bold uppercase">Monthly Fee</p>
                      <p className="text-xs font-semibold text-gray-700 mt-1">
                        {formData.transport_monthly_fee ? `${Number(formData.transport_monthly_fee).toLocaleString()} AFN` : "—"}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-teal-100">
                      <p className="text-[9px] text-teal-600 font-bold uppercase">Pickup Stop</p>
                      <p className="text-xs font-semibold text-gray-700 mt-1 truncate">{formData.transport_pickup_point || "—"}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-teal-100">
                      <p className="text-[9px] text-teal-600 font-bold uppercase">Drop-off</p>
                      <p className="text-xs font-semibold text-gray-700 mt-1 truncate">{formData.transport_dropoff_point || "—"}</p>
                    </div>
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Uniform ── */}
        {currentStep === 4 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <SectionHeader
              gradient="from-teal-50 to-cyan-50"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              icon={steps[3].icon}
              title="Uniform"
              subtitle="Uniform measurements and requirements"
            />
            <div className="p-5 space-y-5">
              <div className={`flex items-center justify-between p-4 rounded-xl border ${formData.need_uniform ? "bg-teal-50 border-teal-200" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex-1">
                  <p className={`text-xs font-bold ${formData.need_uniform ? "text-teal-800" : "text-amber-800"}`}>
                    {selectedStudent?.uniform_required
                      ? "Student requested uniform in Phase 1"
                      : "Student did NOT request uniform in Phase 1"}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${formData.need_uniform ? "text-teal-600" : "text-amber-600"}`}>
                    {selectedStudent?.uniform_required
                      ? "You can still change this choice before finalizing enrollment"
                      : "Toggle ON if the student now wants a uniform — the Phase 1 status will be updated"}
                  </p>
                </div>
                <Toggle
                  name="need_uniform"
                  id="need_uniform"
                  checked={formData.need_uniform}
                  onChange={handleChange}
                  label=""
                />
              </div>

              {!formData.need_uniform && (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="text-xs text-gray-500 font-medium">Uniform is disabled for this student</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Enable the toggle above to enter uniform details</p>
                </div>
              )}

              {formData.need_uniform && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                        Price (Afghani)
                      </label>
                      <input
                        type="number"
                        name="uniform_price"
                        value={formData.uniform_price}
                        onChange={handleChange}
                        placeholder="e.g. 1500"
                        min="0"
                        className={inputClass("uniform_price")}
                      />
                      {getFieldError("uniform_price") && (
                        <p className="text-[10px] text-red-500 mt-1">{getFieldError("uniform_price")}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                        Chest (cm)
                      </label>
                      <input
                        type="number"
                        name="uniform_chest"
                        value={formData.uniform_chest}
                        onChange={handleChange}
                        placeholder="e.g. 72"
                        min="0"
                        className={inputClass("uniform_chest")}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                        Waist (cm)
                      </label>
                      <input
                        type="number"
                        name="uniform_waist"
                        value={formData.uniform_waist}
                        onChange={handleChange}
                        placeholder="e.g. 64"
                        min="0"
                        className={inputClass("uniform_waist")}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        name="uniform_height"
                        value={formData.uniform_height}
                        onChange={handleChange}
                        placeholder="e.g. 140"
                        min="0"
                        className={inputClass("uniform_height")}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                        Shoulder (cm)
                      </label>
                      <input
                        type="number"
                        name="uniform_shoulder"
                        value={formData.uniform_shoulder}
                        onChange={handleChange}
                        placeholder="e.g. 38"
                        min="0"
                        className={inputClass("uniform_shoulder")}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                        Sleeve (cm)
                      </label>
                      <input
                        type="number"
                        name="uniform_sleeve"
                        value={formData.uniform_sleeve}
                        onChange={handleChange}
                        placeholder="e.g. 55"
                        min="0"
                        className={inputClass("uniform_sleeve")}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                        Tailor's Note
                      </label>
                      <textarea
                        name="tailor_note"
                        value={formData.tailor_note}
                        onChange={handleChange}
                        placeholder="Any special tailoring instructions or notes..."
                        rows={3}
                        className={`${inputClass("tailor_note")} resize-none`}
                      />
                    </div>
                  </div>
                </>
              )}

              {!formData.need_uniform && (
                <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[11px] text-gray-500">
                    Toggle the switch above to enable uniform measurements.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 5: Documents ── */}
        {currentStep === 5 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <SectionHeader
              gradient="from-teal-50 to-cyan-50"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              icon={steps[4].icon}
              title="Documents"
              subtitle="Upload required enrollment documents"
            />
            <div className="p-5 space-y-4">
              <p className="text-[11px] text-gray-500">
                Upload the required documents for student enrollment.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileInput
                  label="Student Tazkira"
                  name="doc_student_tazkira"
                  onChange={handleFileChange}
                  file={files.doc_student_tazkira}
                />
                <FileInput
                  label="Father Tazkira"
                  name="doc_father_tazkira"
                  onChange={handleFileChange}
                  file={files.doc_father_tazkira}
                />
                <FileInput
                  label="Birth Certificate"
                  name="doc_birth_certificate"
                  onChange={handleFileChange}
                  file={files.doc_birth_certificate}
                />
                <FileInput
                  label="Previous School Documents"
                  name="doc_previous_school_documents"
                  onChange={handleFileChange}
                  file={files.doc_previous_school_documents}
                />
                <div className="sm:col-span-2">
                  <FileInput
                    label="Student Official Photo"
                    name="doc_student_photo"
                    onChange={handleFileChange}
                    file={files.doc_student_photo}
                  />
                </div>
              </div>

              {/* Progress */}
              <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-teal-700">Documents Uploaded</p>
                  <p className="text-[10px] font-bold text-teal-800">
                    {Object.values(files).filter((f) => f !== null && [
                      "doc_student_tazkira",
                      "doc_father_tazkira",
                      "doc_birth_certificate",
                      "doc_previous_school_documents",
                      "doc_student_photo",
                    ].includes(
                      Object.keys(files).find((k) => files[k] === f)
                    )).length} /{" "}
                    {[
                      files.doc_student_tazkira,
                      files.doc_father_tazkira,
                      files.doc_birth_certificate,
                      files.doc_previous_school_documents,
                      files.doc_student_photo,
                    ].filter(Boolean).length} / 5
                  </p>
                </div>
                <div className="h-1.5 bg-teal-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{
                      width: `${
                        ([
                          files.doc_student_tazkira,
                          files.doc_father_tazkira,
                          files.doc_birth_certificate,
                          files.doc_previous_school_documents,
                          files.doc_student_photo,
                        ].filter(Boolean).length /
                          5) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-teal-600 mt-1.5">
                  {[
                    files.doc_student_tazkira,
                    files.doc_father_tazkira,
                    files.doc_birth_certificate,
                    files.doc_previous_school_documents,
                    files.doc_student_photo,
                  ].filter(Boolean).length}{" "}
                  of 5 documents uploaded
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 6: Family Questionnaire / Commitment ── */}
        {currentStep === 6 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <SectionHeader
              gradient="from-teal-50 to-cyan-50"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              icon={steps[5].icon}
              title="Family Questionnaire"
              subtitle="Review the commitment document and confirm parental consent"
            />
            <div className="p-5 space-y-5">
              {/* Document viewer */}
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-700">تعهدنامه اولیای شاگردان مکتب وفاق</p>
                    <p className="text-[10px] text-gray-400">Parent / Guardian Agreement — please review before signing</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="/documents/ws-parent-contract.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open in new tab
                    </a>
                    <a
                      href="/documents/ws-parent-contract.pdf"
                      download="ws-parent-contract.pdf"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <iframe
                    src="/documents/ws-parent-contract.pdf"
                    title="Family Commitment Document"
                    className="w-full h-[560px]"
                  />
                </div>
              </div>

              {/* Parental consent checkbox */}
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.parental_consent
                    ? "border-teal-300 bg-teal-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  name="parental_consent"
                  checked={formData.parental_consent}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 accent-teal-600 rounded"
                />
                <div className="flex-1">
                  <p className={`text-xs font-semibold ${formData.parental_consent ? "text-teal-800" : "text-gray-700"}`}>
                    The parent has read and signed the commitment document
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Tick this box to confirm the parent/guardian has reviewed and agreed to the terms above.
                  </p>
                </div>
                {formData.parental_consent && (
                  <div className="ml-auto flex-shrink-0">
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </label>
            </div>
          </div>
        )}

        </fieldset>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() =>
              isFirstVisibleStep
                ? navigate(isEdit ? "/student-management/student-enrollments" : "/student-management/students")
                : goToPrevStep()
            }
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isFirstVisibleStep ? "Cancel" : "Back"}
          </button>

          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="hidden sm:flex items-center gap-1">
              {visibleSteps.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-full transition-all ${
                    s.id === currentStep
                      ? "w-4 h-1.5 bg-teal-600"
                      : s.id < currentStep
                      ? "w-1.5 h-1.5 bg-teal-300"
                      : "w-1.5 h-1.5 bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {!isLastVisibleStep ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-sm flex items-center gap-1.5"
              >
                {isShow ? "Next" : "Next"}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEdit ? "Update Student" : "Enroll Student"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
