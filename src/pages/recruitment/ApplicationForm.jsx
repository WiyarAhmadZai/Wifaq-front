import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const STEPS = [
  { num: 1, label: "Job Selection", desc: "Select job posting & desired role", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { num: 2, label: "Personal Info", desc: "Basic information & introduction", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { num: 3, label: "Social Media", desc: "Social media profiles (optional)", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { num: 4, label: "Motivation", desc: "Your motivation for this role", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { num: 5, label: "Education", desc: "Educational background", icon: "M12 14l9-5-9-5-9 5 9 5z" },
  { num: 6, label: "Experience", desc: "Work history", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { num: 7, label: "Documents", desc: "Upload required documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

const DESIRED_ROLES = [
  { value: "", label: "Select Desired Role" },
  { value: "motion_graphics_designer", label: "Motion Graphics Designer" },
  { value: "curriculum_expert", label: "Curriculum Expert" },
  { value: "visual_learning_specialist", label: "Visual Learning Specialist" },
  { value: "school_psychology_counselor", label: "School Psychology Counselor" },
  { value: "social_religious_studies_teacher", label: "Social & Religious Studies Teacher" },
  { value: "chief_science_teacher_lab_manager", label: "Chief Science Teacher & Lab Manager" },
  { value: "dari_pashto_teacher", label: "Dari-Pashto Teacher" },
  { value: "coding_teacher_computer_lab_manager", label: "Coding Teacher & Computer Lab Manager" },
  { value: "arabic_teacher_wisal", label: "Arabic Teacher (WISAL)" },
  { value: "educational_videographer", label: "Educational Videographer" },
  { value: "security_guard", label: "Security Guard" },
  { value: "other", label: "Other" },
];

const EDUCATION_LEVELS = [
  { value: "", label: "Select Education Level" },
  { value: "grade_12_baccalaureate", label: "Grade 12 / Baccalaureate" },
  { value: "diploma_post_baccalaureate", label: "Diploma / Post-baccalaureate" },
  { value: "bachelors_degree", label: "Bachelor's Degree" },
  { value: "masters_degree", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate" },
  { value: "other", label: "Other" },
];

const DOCUMENT_TYPES = [
  { key: "work_samples", label: "Work Samples", required: false },
  { key: "identity_document", label: "ID Card or Passport", required: true },
  { key: "educational_document", label: "Educational Documents", required: true },
  { key: "cv_resume", label: "CV / Resume", required: true },
];

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";
const inpError = "w-full px-3.5 py-2.5 border border-red-400 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 bg-red-50 outline-none transition-colors";

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const StepCard = ({ step, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
      <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">{step.label}</p>
        <p className="text-xs text-teal-600">{step.desc}</p>
      </div>
    </div>
    <div className="p-5 space-y-5">{children}</div>
  </div>
);

export default function ApplicationForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobPostings, setJobPostings] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    job_posting_id: "",
    desired_role: "",
    full_name: "",
    contact_number: "",
    email: "",
    date_of_birth: "",
    current_address: "",
    place_of_origin: "",
    introduction: "",
    facebook: "",
    instagram: "",
    twitter_x: "",
    youtube: "",
    motivation: "",
    education_level: "",
    field_of_study: "",
    institution_name: "",
    total_experience_years: 0,
    unique_skill: [""],
  });

  const [workExperiences, setWorkExperiences] = useState([
    { company_name: "", job_title: "", duration: "", responsibilities: "" },
  ]);

  const [documents, setDocuments] = useState({
    work_samples: null,
    identity_document: null,
    educational_document: null,
    cv_resume: null,
  });

  const cur = STEPS.find((s) => s.num === step) || STEPS[0];

  useEffect(() => {
    fetchJobPostings();
    if (isEdit) fetchApplication();
  }, [id]);

  const fetchJobPostings = async () => {
    try {
      const response = await get("/recruitment/applications/job-postings");
      const data = response.data?.data || [];
      setJobPostings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch job postings", error);
    }
  };

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/applications/${id}`);
      const d = response.data?.data || response.data;
      
      let formattedDate = "";
      if (d.date_of_birth) {
        const date = new Date(d.date_of_birth);
        formattedDate = date.toISOString().split('T')[0];
      }

      setFormData({
        job_posting_id: d.job_posting_id || "",
        desired_role: d.desired_role || "",
        full_name: d.full_name || "",
        contact_number: d.contact_number || "",
        email: d.email || "",
        date_of_birth: formattedDate,
        current_address: d.current_address || "",
        place_of_origin: d.place_of_origin || "",
        introduction: d.introduction || "",
        facebook: d.facebook || "",
        instagram: d.instagram || "",
        twitter_x: d.twitter_x || "",
        youtube: d.youtube || "",
        motivation: d.motivation || "",
        education_level: d.education_level || "",
        field_of_study: d.field_of_study || "",
        institution_name: d.institution_name || "",
        total_experience_years: d.total_experience_years || 0,
        unique_skill: d.unique_skill?.length > 0 ? d.unique_skill : [""],
      });

      if (d.work_experiences && d.work_experiences.length > 0) {
        setWorkExperiences(d.work_experiences);
      }
    } catch (error) {
      Swal.fire("Error", "Failed to load application", "error");
      navigate("/recruitment/applications");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : parseInt(value)) : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSkillChange = (index, value) => {
    const newSkills = [...formData.unique_skill];
    newSkills[index] = value;
    setFormData((prev) => ({ ...prev, unique_skill: newSkills }));
  };

  const addSkill = () => {
    setFormData((prev) => ({ ...prev, unique_skill: [...prev.unique_skill, ""] }));
  };

  const removeSkill = (index) => {
    if (formData.unique_skill.length === 1) {
      setFormData((prev) => ({ ...prev, unique_skill: [""] }));
      return;
    }
    setFormData((prev) => ({ ...prev, unique_skill: prev.unique_skill.filter((_, i) => i !== index) }));
  };

  const handleWorkExperienceChange = (index, field, value) => {
    const newExperiences = [...workExperiences];
    newExperiences[index][field] = value;
    setWorkExperiences(newExperiences);
  };

  const addWorkExperience = () => {
    setWorkExperiences((prev) => [...prev, { company_name: "", job_title: "", duration: "", responsibilities: "" }]);
  };

  const removeWorkExperience = (index) => {
    if (workExperiences.length === 1) {
      setWorkExperiences([{ company_name: "", job_title: "", duration: "", responsibilities: "" }]);
      return;
    }
    setWorkExperiences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e, docKey) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire("Error", "File size must be less than 10MB", "error");
        return;
      }
      setDocuments((prev) => ({ ...prev, [docKey]: file }));
    }
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.job_posting_id) newErrors.job_posting_id = "Please select a job posting";
      if (!formData.desired_role) newErrors.desired_role = "Please select a desired role";
    }
    
    if (step === 2) {
      if (!formData.full_name) newErrors.full_name = "Full name is required";
      if (!formData.contact_number) newErrors.contact_number = "Contact number is required";
      if (!formData.email) newErrors.email = "Email is required";
      if (!formData.date_of_birth) newErrors.date_of_birth = "Date of birth is required";
      if (!formData.current_address) newErrors.current_address = "Current address is required";
      if (!formData.place_of_origin) newErrors.place_of_origin = "Place of origin is required";
      if (!formData.introduction) newErrors.introduction = "Introduction is required";
    }
    
    if (step === 5) {
      if (!formData.education_level) newErrors.education_level = "Education level is required";
      if (!formData.field_of_study) newErrors.field_of_study = "Field of study is required";
      if (!formData.institution_name) newErrors.institution_name = "Institution name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canNext = () => {
    if (step === 1) return formData.job_posting_id && formData.desired_role;
    if (step === 2) return formData.full_name && formData.contact_number && formData.email && formData.date_of_birth && formData.current_address && formData.place_of_origin && formData.introduction;
    if (step === 5) return formData.education_level && formData.field_of_study && formData.institution_name;
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, STEPS.length));
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrors({});

    try {
      const dataToSend = {
        ...formData,
        unique_skill: formData.unique_skill.filter((s) => s.trim() !== ""),
        work_experiences: workExperiences.filter((exp) => exp.company_name.trim() !== "" || exp.job_title.trim() !== ""),
        status: "received",
      };

      if (isEdit) {
        await put(`/recruitment/applications/${id}`, dataToSend);
        Swal.fire("Success", "Application updated successfully", "success");
      } else {
        const response = await post("/recruitment/applications", dataToSend);
        const applicationId = response.data?.data?.id;
        
        const docEntries = Object.entries(documents).filter(([_, file]) => file !== null);
        if (docEntries.length > 0 && applicationId) {
          for (const [docType, file] of docEntries) {
            const formDataUpload = new FormData();
            formDataUpload.append("document_type", docType);
            formDataUpload.append("file", file);
            formDataUpload.append("application_id", applicationId);
            try {
              await post("/recruitment/application-documents", formDataUpload, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            } catch (e) {
              console.error(`Failed to upload ${docType}`, e);
            }
          }
        }
        
        Swal.fire("Success", "Application submitted successfully", "success");
      }
      navigate("/recruitment/applications");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        Swal.fire("Validation Error", "Please check the form for errors", "error");
      } else {
        Swal.fire("Error", error.response?.data?.message || "Failed to save application", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading application...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/recruitment/applications")} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? "Edit Application" : "New Application"}</h2>
          <p className="text-[11px] text-gray-400">Step {step} of {STEPS.length}: {cur.label}</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s.num === step ? "bg-teal-600 text-white ring-2 ring-teal-200" :
                  s.num < step ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"
                }`}>
                  {s.num < step ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s.num}
                </div>
                <span className={`text-[9px] font-medium mt-1 hidden sm:block ${s.num === step ? "text-teal-600" : s.num < step ? "text-teal-500" : "text-gray-400"}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded-full ${s.num < step ? "bg-teal-300" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); step === STEPS.length ? handleSubmit() : handleNext(); }}>
        {step === 1 && (
          <StepCard step={cur}>
            <div className="grid grid-cols-1 gap-5">
              <div>
                <Label required>Job Posting</Label>
                <select name="job_posting_id" value={formData.job_posting_id} onChange={handleChange} className={errors.job_posting_id ? inpError : inp}>
                  <option value="">Select Job Posting</option>
                  {jobPostings.map((jp) => (
                    <option key={jp.id} value={jp.id}>{jp.title} - {jp.location}</option>
                  ))}
                </select>
                {errors.job_posting_id && <p className="text-red-500 text-xs mt-1">{errors.job_posting_id}</p>}
              </div>
              <div>
                <Label required>Desired Role</Label>
                <select name="desired_role" value={formData.desired_role} onChange={handleChange} className={errors.desired_role ? inpError : inp}>
                  {DESIRED_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                {errors.desired_role && <p className="text-red-500 text-xs mt-1">{errors.desired_role}</p>}
              </div>
            </div>
          </StepCard>
        )}

        {step === 2 && (
          <StepCard step={cur}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label required>Full Name</Label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="e.g. Ahmad Rahimi" className={errors.full_name ? inpError : inp} />
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <Label required>Contact Number</Label>
                <input type="text" name="contact_number" value={formData.contact_number} onChange={handleChange} placeholder="e.g. +93 770 123 456" className={errors.contact_number ? inpError : inp} />
                {errors.contact_number && <p className="text-red-500 text-xs mt-1">{errors.contact_number}</p>}
              </div>
              <div>
                <Label required>Email</Label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="e.g. ahmad@example.com" className={errors.email ? inpError : inp} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <Label required>Date of Birth</Label>
                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={errors.date_of_birth ? inpError : inp} />
                {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label required>Current Address</Label>
                <input type="text" name="current_address" value={formData.current_address} onChange={handleChange} placeholder="Full address" className={errors.current_address ? inpError : inp} />
                {errors.current_address && <p className="text-red-500 text-xs mt-1">{errors.current_address}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label required>Place of Origin</Label>
                <input type="text" name="place_of_origin" value={formData.place_of_origin} onChange={handleChange} placeholder="City/Province" className={errors.place_of_origin ? inpError : inp} />
                {errors.place_of_origin && <p className="text-red-500 text-xs mt-1">{errors.place_of_origin}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label required>Introduction</Label>
                <textarea name="introduction" value={formData.introduction} onChange={handleChange} rows={4} placeholder="Briefly introduce yourself..." className={errors.introduction ? inpError : inp} />
                {errors.introduction && <p className="text-red-500 text-xs mt-1">{errors.introduction}</p>}
              </div>
            </div>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard step={cur}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Facebook</Label>
                <input type="text" name="facebook" value={formData.facebook} onChange={handleChange} placeholder="Profile URL" className={inp} />
              </div>
              <div>
                <Label>Instagram</Label>
                <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@username" className={inp} />
              </div>
              <div>
                <Label>Twitter/X</Label>
                <input type="text" name="twitter_x" value={formData.twitter_x} onChange={handleChange} placeholder="@username" className={inp} />
              </div>
              <div>
                <Label>YouTube</Label>
                <input type="text" name="youtube" value={formData.youtube} onChange={handleChange} placeholder="Channel URL" className={inp} />
              </div>
            </div>
          </StepCard>
        )}

        {step === 4 && (
          <StepCard step={cur}>
            <div>
              <Label required>Motivation</Label>
              <textarea name="motivation" value={formData.motivation} onChange={handleChange} rows={6} placeholder="Why do you want this position? Describe your motivation and what makes you a good fit..." className={errors.motivation ? inpError : inp} />
              {errors.motivation && <p className="text-red-500 text-xs mt-1">{errors.motivation}</p>}
            </div>
            <div>
              <Label>Unique Skills</Label>
              <div className="space-y-2">
                {formData.unique_skill.map((skill, index) => (
                  <div key={index} className="flex gap-2">
                    <input type="text" value={skill} onChange={(e) => handleSkillChange(index, e.target.value)} placeholder={`Skill ${index + 1}`} className={`${inp} flex-1`} />
                    <button type="button" onClick={() => removeSkill(index)} className="px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addSkill} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Skill
                </button>
              </div>
            </div>
          </StepCard>
        )}

        {step === 5 && (
          <StepCard step={cur}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Education Level</Label>
                <select name="education_level" value={formData.education_level} onChange={handleChange} className={errors.education_level ? inpError : inp}>
                  {EDUCATION_LEVELS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
                {errors.education_level && <p className="text-red-500 text-xs mt-1">{errors.education_level}</p>}
              </div>
              <div>
                <Label required>Field of Study</Label>
                <input type="text" name="field_of_study" value={formData.field_of_study} onChange={handleChange} placeholder="e.g. Computer Science" className={errors.field_of_study ? inpError : inp} />
                {errors.field_of_study && <p className="text-red-500 text-xs mt-1">{errors.field_of_study}</p>}
              </div>
              <div>
                <Label required>Institution Name</Label>
                <input type="text" name="institution_name" value={formData.institution_name} onChange={handleChange} placeholder="University/School name" className={errors.institution_name ? inpError : inp} />
                {errors.institution_name && <p className="text-red-500 text-xs mt-1">{errors.institution_name}</p>}
              </div>
              <div>
                <Label>Total Experience (Years)</Label>
                <input type="number" name="total_experience_years" value={formData.total_experience_years} onChange={handleChange} min={0} className={inp} />
              </div>
            </div>
          </StepCard>
        )}

        {step === 6 && (
          <StepCard step={cur}>
            <div className="space-y-4">
              {workExperiences.map((exp, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Experience {index + 1}</span>
                    <button type="button" onClick={() => removeWorkExperience(index)} className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" value={exp.company_name} onChange={(e) => handleWorkExperienceChange(index, "company_name", e.target.value)} placeholder="Company Name" className={inp} />
                    <input type="text" value={exp.job_title} onChange={(e) => handleWorkExperienceChange(index, "job_title", e.target.value)} placeholder="Job Title" className={inp} />
                    <input type="text" value={exp.duration} onChange={(e) => handleWorkExperienceChange(index, "duration", e.target.value)} placeholder="Duration (e.g. 2020-2022)" className={inp} />
                  </div>
                  <textarea value={exp.responsibilities} onChange={(e) => handleWorkExperienceChange(index, "responsibilities", e.target.value)} placeholder="Responsibilities" rows={2} className={inp} />
                </div>
              ))}
              <button type="button" onClick={addWorkExperience} className="w-full py-2.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-teal-400 hover:text-teal-600 transition-colors text-sm font-medium">
                + Add Work Experience
              </button>
            </div>
          </StepCard>
        )}

        {step === 7 && (
          <StepCard step={cur}>
            <div className="space-y-3">
              {DOCUMENT_TYPES.map((doc) => (
                <div key={doc.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${documents[doc.key] ? 'bg-teal-50/50 border-teal-200' : 'border-gray-200 hover:border-teal-200'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${documents[doc.key] ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-400"}`}>
                    {documents[doc.key] ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{doc.label} {doc.required && <span className="text-red-400">*</span>}</p>
                    {documents[doc.key] ? (
                      <p className="text-[10px] text-teal-600 font-medium truncate">{documents[doc.key].name}</p>
                    ) : (
                      <p className="text-[10px] text-gray-400">Max 10MB - PDF, JPG, PNG</p>
                    )}
                  </div>
                  <label className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-teal-100 transition-all flex-shrink-0">
                    {documents[doc.key] ? "Change" : "Upload"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, doc.key)} className="hidden" />
                  </label>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5 mt-4">
              <p className="text-xs font-bold text-gray-700">Review Summary</p>
              {[
                { label: "Job Posting", value: jobPostings.find(jp => jp.id === parseInt(formData.job_posting_id))?.title || "—" },
                { label: "Desired Role", value: DESIRED_ROLES.find(r => r.value === formData.desired_role)?.label || "—" },
                { label: "Applicant", value: formData.full_name || "—" },
                { label: "Email", value: formData.email || "—" },
                { label: "Contact", value: formData.contact_number || "—" },
                { label: "Education", value: EDUCATION_LEVELS.find(e => e.value === formData.education_level)?.label || "—" },
                { label: "Experience", value: `${formData.total_experience_years || 0} years` },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-500">{r.label}</span>
                  <span className="text-xs font-semibold text-gray-800">{r.value}</span>
                </div>
              ))}
            </div>
          </StepCard>
        )}

        <div className="flex items-center justify-between mt-6">
          <button type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/recruitment/applications")}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            {step === 1 ? "Cancel" : "Back"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {STEPS.map(s => (
                <div key={s.num} className={`h-1.5 rounded-full transition-all ${s.num === step ? "w-6 bg-teal-600" : s.num < step ? "w-3 bg-teal-300" : "w-3 bg-gray-200"}`} />
              ))}
            </div>
            {step < STEPS.length ? (
              <button type="button" disabled={!canNext()} onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {saving ? "Submitting..." : isEdit ? "Update Application" : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
