import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

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
  {
    id: 7,
    title: "Transfer System",
    shortTitle: "Transfer",
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
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
  const isEdit = Boolean(id);

  const [currentStep, setCurrentStep] = useState(1);
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
    transport_route: "",
    transport_pickup_point: "",
    transport_pickup_time: "",
    transport_dropoff_point: "",
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
    questionnaire_status: "not_sent",
    parental_consent: false,
    // Step 7: Transfer System
    transfer_agreement_notes: "",
    transfer_case_status: "pending",
    transfer_additional_notes: "",
  });

  const [files, setFiles] = useState({
    // Step 5: Documents
    doc_student_tazkira: null,
    doc_father_tazkira: null,
    doc_birth_certificate: null,
    doc_previous_school_documents: null,
    doc_student_photo: null,
    // Step 7: Transfer System docs
    transfer_agreement: null,
    transfer_first_parcha: null,
    transfer_sawabiq: null,
    transfer_assurance_request: null,
    transfer_itminaniya: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) fetchStudent();
  }, [id]);

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
        transport_route: data.transport_route || "",
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
        questionnaire_status: data.questionnaire_status || "not_sent",
        parental_consent: data.parental_consent || false,
        transfer_agreement_notes: data.transfer_agreement_notes || "",
        transfer_case_status: data.transfer_case_status || "pending",
        transfer_additional_notes: data.transfer_additional_notes || "",
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
    setSaving(true);
    setErrors({});
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        payload.append(key, val === null || val === undefined ? "" : val);
      });
      Object.entries(files).forEach(([key, file]) => {
        if (file) payload.append(key, file);
      });

      if (isEdit) {
        await put(`/student-management/students/update/${id}`, payload);
        Swal.fire("Success", "Student updated successfully", "success");
      } else {
        await post("/student-management/students/store", payload);
        Swal.fire("Success", "Student created successfully", "success");
      }
      navigate("/student-management/students");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire("Error", error.response?.data?.message || "Failed to save student", "error");
      }
    } finally {
      setSaving(false);
    }
  };

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
          onClick={() => navigate("/student-management/students")}
          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? "Edit Student" : "Enroll New Student"}
          </h2>
          <p className="text-[11px] text-gray-400">
            Step {currentStep} of {steps.length} — {steps[currentStep - 1].title}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex items-center min-w-max px-2">
          {steps.map((step, i) => (
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
                    step.id
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
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 mb-4 rounded-full transition-all`}
                  style={{ backgroundColor: currentStep > step.id ? "#5eead4" : "#f3f4f6" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <SectionHeader
              gradient="from-teal-50 to-cyan-50"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              icon={steps[2].icon}
              title="Transport"
              subtitle="Bus route and pickup/drop-off details"
            />
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Bus Route</label>
                  <input
                    type="text"
                    name="transport_route"
                    value={formData.transport_route}
                    onChange={handleChange}
                    placeholder="e.g. Route A – Karte Naw"
                    className={inputClass("transport_route")}
                  />
                  {getFieldError("transport_route") && (
                    <p className="text-[10px] text-red-500 mt-1">{getFieldError("transport_route")}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Pickup Time</label>
                  <input
                    type="time"
                    name="transport_pickup_time"
                    value={formData.transport_pickup_time}
                    onChange={handleChange}
                    className={inputClass("transport_pickup_time")}
                  />
                  {getFieldError("transport_pickup_time") && (
                    <p className="text-[10px] text-red-500 mt-1">{getFieldError("transport_pickup_time")}</p>
                  )}
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
                  {getFieldError("transport_pickup_point") && (
                    <p className="text-[10px] text-red-500 mt-1">{getFieldError("transport_pickup_point")}</p>
                  )}
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
                  {getFieldError("transport_dropoff_point") && (
                    <p className="text-[10px] text-red-500 mt-1">{getFieldError("transport_dropoff_point")}</p>
                  )}
                </div>
              </div>

              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Transport Summary
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-[9px] text-teal-600 font-bold uppercase">Route</p>
                    <p className="text-xs font-semibold text-gray-700 mt-1">{formData.transport_route || "—"}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-[9px] text-teal-600 font-bold uppercase">Pickup Time</p>
                    <p className="text-xs font-semibold text-gray-700 mt-1">{formData.transport_pickup_time || "—"}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-[9px] text-teal-600 font-bold uppercase">Pickup Stop</p>
                    <p className="text-xs font-semibold text-gray-700 mt-1">{formData.transport_pickup_point || "—"}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-[9px] text-teal-600 font-bold uppercase">Drop-off</p>
                    <p className="text-xs font-semibold text-gray-700 mt-1">{formData.transport_dropoff_point || "—"}</p>
                  </div>
                </div>
              </div>
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
              <div className="flex items-center justify-between p-4 bg-teal-50 rounded-xl border border-teal-100">
                <div>
                  <p className="text-xs font-bold text-teal-800">Need a Uniform?</p>
                  <p className="text-[10px] text-teal-600 mt-0.5">Enable if the student needs a school uniform</p>
                </div>
                <Toggle
                  name="need_uniform"
                  id="need_uniform"
                  checked={formData.need_uniform}
                  onChange={handleChange}
                  label=""
                />
              </div>

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

        {/* ── Step 6: Family Questionnaire ── */}
        {currentStep === 6 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <SectionHeader
              gradient="from-teal-50 to-cyan-50"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              icon={steps[5].icon}
              title="Family Questionnaire"
              subtitle="Questionnaire status and parental consent"
            />
            <div className="p-5 space-y-5">
              {/* Info notice */}
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-teal-800 mb-1">About the Questionnaire</p>
                <p className="text-[11px] text-teal-700 leading-relaxed">
                  The questionnaire will be given to the family (printed or linked). It will be returned
                  after completion.
                </p>
                <p className="text-[11px] text-amber-700 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  The fee can be paid without completing the questionnaire — the system will remind you.
                </p>
              </div>

              {/* Questionnaire Status */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-2">
                  Questionnaire Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: "not_sent", label: "Not Sent", color: "border-gray-200 bg-gray-50 text-gray-600", selected: "ring-2 ring-gray-400 border-gray-400 bg-gray-50" },
                    { value: "sent", label: "Sent", color: "border-blue-200 bg-blue-50 text-blue-700", selected: "ring-2 ring-blue-400 border-blue-400 bg-blue-50" },
                    { value: "completed", label: "Completed", color: "border-teal-200 bg-teal-50 text-teal-700", selected: "ring-2 ring-teal-400 border-teal-400 bg-teal-50" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, questionnaire_status: opt.value }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all font-semibold text-xs ${
                        formData.questionnaire_status === opt.value ? opt.selected : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Send Questionnaire Actions */}
              <div>
                <p className="text-[11px] font-semibold text-gray-600 mb-2">Send Questionnaire</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                    onClick={() => Swal.fire("WhatsApp", "WhatsApp sending feature coming soon.", "info")}
                  >
                    <span>📱</span>
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                    onClick={() => Swal.fire("Email", "Email sending feature coming soon.", "info")}
                  >
                    <span>📧</span>
                    Email
                  </button>
                </div>
              </div>

              {/* Parental Consent */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Commitment — Parental Consent
                </p>
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
                  <div>
                    <p className={`text-xs font-semibold ${formData.parental_consent ? "text-teal-800" : "text-gray-700"}`}>
                      Yes, I agree to school terms
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      The parent/guardian confirms agreement to the school's rules and conditions.
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
          </div>
        )}

        {/* ── Step 7: Transfer System (Government) ── */}
        {currentStep === 7 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <SectionHeader
              gradient="from-teal-50 to-cyan-50"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              icon={steps[6].icon}
              title="Transfer System (Government)"
              subtitle="Official government transfer documents and case status"
            />
            <div className="p-5 space-y-5">
              {/* Document uploads */}
              <div>
                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-3">
                  Transfer Documents
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FileInput
                    label="Agreement / Muwafaqa Namadhe"
                    name="transfer_agreement"
                    onChange={handleFileChange}
                    file={files.transfer_agreement}
                  />
                  <FileInput
                    label="First Parcha"
                    name="transfer_first_parcha"
                    onChange={handleFileChange}
                    file={files.transfer_first_parcha}
                  />
                  <FileInput
                    label="Records / Sawabiq (2nd Parcha + Karte Sawani)"
                    name="transfer_sawabiq"
                    onChange={handleFileChange}
                    file={files.transfer_sawabiq}
                  />
                  <FileInput
                    label="Assurance Request"
                    name="transfer_assurance_request"
                    onChange={handleFileChange}
                    file={files.transfer_assurance_request}
                  />
                  <div className="sm:col-span-2">
                    <FileInput
                      label="Itminaniya"
                      name="transfer_itminaniya"
                      onChange={handleFileChange}
                      file={files.transfer_itminaniya}
                    />
                  </div>
                </div>
              </div>

              {/* Case Status */}
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-[11px] font-semibold text-gray-600 mb-2">
                  Case Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: "pending", label: "Pending", color: "border-amber-200 bg-amber-50 text-amber-700", selected: "ring-2 ring-amber-400 border-amber-400 bg-amber-50" },
                    { value: "in_progress", label: "In Progress", color: "border-blue-200 bg-blue-50 text-blue-700", selected: "ring-2 ring-blue-400 border-blue-400 bg-blue-50" },
                    { value: "completed", label: "Completed", color: "border-teal-200 bg-teal-50 text-teal-700", selected: "ring-2 ring-teal-400 border-teal-400 bg-teal-50" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, transfer_case_status: opt.value }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all font-semibold text-xs ${
                        formData.transfer_case_status === opt.value
                          ? opt.selected
                          : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  name="transfer_additional_notes"
                  value={formData.transfer_additional_notes}
                  onChange={handleChange}
                  placeholder="Any additional notes about the transfer process, pending items, or follow-ups..."
                  rows={4}
                  className={`${inputClass("transfer_additional_notes")} resize-none`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() =>
              currentStep === 1
                ? navigate("/student-management/students")
                : setCurrentStep(currentStep - 1)
            }
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {currentStep === 1 ? "Cancel" : "Back"}
          </button>

          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="hidden sm:flex items-center gap-1">
              {steps.map((s) => (
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

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-sm flex items-center gap-1.5"
              >
                Next
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
