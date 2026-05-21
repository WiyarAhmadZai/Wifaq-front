import { useState, useEffect } from "react";
import { get, post } from "../../api/axios";
import Swal from "sweetalert2";
import { DateField } from "../../components/hr/HrUI";

const STEPS = [
  { num: 1, label: "Position", desc: "Choose the role you're applying for", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { num: 2, label: "About You", desc: "Personal information & introduction", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { num: 3, label: "Social", desc: "Social media profiles (optional)", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { num: 4, label: "Motivation", desc: "Why this role and what you bring", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { num: 5, label: "Education", desc: "Your educational background", icon: "M12 14l9-5-9-5-9 5 9 5z" },
  { num: 6, label: "Experience", desc: "Work history & responsibilities", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { num: 7, label: "Documents", desc: "Upload your CV and credentials", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
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
  { key: "cv_resume", label: "CV / Resume", required: true },
  { key: "educational_document", label: "Educational Documents", required: true },
  { key: "identity_document", label: "ID Card or Passport", required: true },
  { key: "work_samples", label: "Work Samples", required: false },
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
    <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100 flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">{step.label}</p>
        <p className="text-xs text-teal-700">{step.desc}</p>
      </div>
    </div>
    <div className="p-5 space-y-5">{children}</div>
  </div>
);

export default function PublicApplicationForm() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState(null);
  const [jobPostings, setJobPostings] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    job_posting_id: "",
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

  const [metRequirements, setMetRequirements] = useState([]);

  const [documents, setDocuments] = useState({
    work_samples: null,
    identity_document: null,
    educational_document: null,
    cv_resume: null,
  });

  const cur = STEPS.find((s) => s.num === step) || STEPS[0];

  useEffect(() => {
    fetchJobPostings();
    const params = new URLSearchParams(window.location.search);
    const preselected = params.get("job");
    if (preselected) {
      setFormData((prev) => ({ ...prev, job_posting_id: preselected }));
    }
  }, []);

  const fetchJobPostings = async () => {
    setLoading(true);
    try {
      const response = await get("/public/recruitment/job-postings");
      const data = response.data?.data || [];
      setJobPostings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch job postings", error);
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

  const addSkill = () => setFormData((prev) => ({ ...prev, unique_skill: [...prev.unique_skill, ""] }));

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
        Swal.fire("File too large", "Maximum file size is 10MB.", "error");
        return;
      }
      setDocuments((prev) => ({ ...prev, [docKey]: file }));
    }
  };

  const validateStep = () => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.job_posting_id) newErrors.job_posting_id = "Please select a job posting";
    }
    if (step === 2) {
      if (!formData.full_name) newErrors.full_name = "Full name is required";
      if (!formData.contact_number) newErrors.contact_number = "Contact number is required";
      if (!formData.email) newErrors.email = "Email is required";
      if (!formData.date_of_birth) newErrors.date_of_birth = "Date of birth is required";
      if (!formData.current_address) newErrors.current_address = "Current address is required";
      if (!formData.place_of_origin) newErrors.place_of_origin = "Place of origin is required";
      if (!formData.introduction) newErrors.introduction = "Please introduce yourself";
    }
    if (step === 4) {
      if (!formData.motivation) newErrors.motivation = "Motivation is required";
    }
    if (step === 5) {
      if (!formData.education_level) newErrors.education_level = "Education level is required";
      if (!formData.field_of_study) newErrors.field_of_study = "Field of study is required";
      if (!formData.institution_name) newErrors.institution_name = "Institution name is required";
    }
    if (step === 7) {
      DOCUMENT_TYPES.forEach((d) => {
        if (d.required && !documents[d.key]) newErrors[d.key] = `${d.label} is required`;
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canNext = () => {
    if (step === 1) return !!formData.job_posting_id;
    if (step === 2) return formData.full_name && formData.contact_number && formData.email && formData.date_of_birth && formData.current_address && formData.place_of_origin && formData.introduction;
    if (step === 4) return !!formData.motivation;
    if (step === 5) return formData.education_level && formData.field_of_study && formData.institution_name;
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);
    setErrors({});

    try {
      const dataToSend = {
        ...formData,
        unique_skill: formData.unique_skill.filter((s) => s.trim() !== ""),
        met_requirements: metRequirements,
        work_experiences: workExperiences.filter((exp) => exp.company_name.trim() !== "" || exp.job_title.trim() !== ""),
        status: "received",
        source: "public_link",
      };

      const response = await post("/public/recruitment/applications", dataToSend);
      const applicationId = response.data?.data?.id;

      const docEntries = Object.entries(documents).filter(([_, file]) => file !== null);
      if (docEntries.length > 0 && applicationId) {
        for (const [docType, file] of docEntries) {
          const formDataUpload = new FormData();
          formDataUpload.append("document_type", docType);
          formDataUpload.append("file", file);
          formDataUpload.append("application_id", applicationId);
          try {
            await post("/public/recruitment/application-documents", formDataUpload, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          } catch (e) {
            console.error(`Failed to upload ${docType}`, e);
          }
        }
      }

      setReferenceId(applicationId);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const status = error.response?.status;
      if (status === 422 && error.response?.data?.errors) {
        const errs = error.response.data.errors;
        setErrors(errs);
        const stepMap = {
          1: ['job_posting_id'],
          2: ['full_name','contact_number','email','date_of_birth','current_address','place_of_origin','introduction'],
          3: ['facebook','instagram','twitter_x','youtube'],
          4: ['motivation'],
          5: ['education_level','field_of_study','institution_name'],
          6: ['total_experience_years'],
        };
        const firstField = Object.keys(errs)[0];
        for (const [s, fields] of Object.entries(stepMap)) {
          if (fields.includes(firstField)) { setStep(Number(s)); break; }
        }
      } else {
        Swal.fire("Submission failed", error.response?.data?.message || "Something went wrong. Please try again.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading career opportunities…</span>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
        <PublicHeader />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-teal-600 to-cyan-600 px-8 py-12 text-center">
              <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mt-6">Application Received</h1>
              <p className="text-teal-50 text-sm mt-2">Thank you for applying to Wifaq School.</p>
            </div>
            <div className="p-8 space-y-5">
              <p className="text-gray-700 text-sm leading-relaxed">
                We've received your application and our recruitment team will review it shortly.
                If your profile is a match, we'll reach out to you by email or phone to schedule the next steps.
              </p>
              {referenceId && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">Reference ID</p>
                    <p className="text-lg font-bold text-teal-800">#{referenceId}</p>
                  </div>
                  <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-5 py-3 text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
                >
                  Submit Another Application
                </button>
              </div>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      <PublicHeader />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero strip */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9V7h2v6z" /></svg>
            Now Hiring
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-4">Join the Wifaq School Family</h1>
          <p className="text-gray-600 mt-2 text-sm max-w-xl mx-auto">
            We're building a team that inspires the next generation. Complete the form below
            and our recruitment team will be in touch with the next steps.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s.num === step ? "bg-gradient-to-br from-teal-600 to-cyan-600 text-white ring-4 ring-teal-100 shadow-md" :
                    s.num < step ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"
                  }`}>
                    {s.num < step ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : s.num}
                  </div>
                  <span className={`text-[9px] font-medium mt-1 hidden sm:block ${s.num === step ? "text-teal-700" : s.num < step ? "text-teal-500" : "text-gray-400"}`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 rounded-full ${s.num < step ? "bg-teal-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-500 mt-3 sm:hidden">
            Step {step} of {STEPS.length}: <span className="font-semibold text-teal-700">{cur.label}</span>
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); step === STEPS.length ? handleSubmit() : handleNext(); }}>
          {step === 1 && (
            <StepCard step={cur}>
              <JobPicker
                jobPostings={jobPostings}
                selectedId={formData.job_posting_id}
                onSelect={(id) => {
                  setFormData((prev) => ({ ...prev, job_posting_id: id }));
                  if (errors.job_posting_id) setErrors((prev) => ({ ...prev, job_posting_id: null }));
                }}
                error={errors.job_posting_id}
              />
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
                  <DateField name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={errors.date_of_birth ? inpError : inp} />
                  {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label required>Current Address</Label>
                  <input type="text" name="current_address" value={formData.current_address} onChange={handleChange} placeholder="Full address" className={errors.current_address ? inpError : inp} />
                  {errors.current_address && <p className="text-red-500 text-xs mt-1">{errors.current_address}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label required>Place of Origin</Label>
                  <input type="text" name="place_of_origin" value={formData.place_of_origin} onChange={handleChange} placeholder="City / Province" className={errors.place_of_origin ? inpError : inp} />
                  {errors.place_of_origin && <p className="text-red-500 text-xs mt-1">{errors.place_of_origin}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label required>Brief Introduction</Label>
                  <textarea name="introduction" value={formData.introduction} onChange={handleChange} rows={4} placeholder="Tell us a little about yourself…" className={errors.introduction ? inpError : inp} />
                  {errors.introduction && <p className="text-red-500 text-xs mt-1">{errors.introduction}</p>}
                </div>
              </div>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard step={cur}>
              <p className="text-xs text-gray-500 -mt-2">These fields are optional. Share what you're comfortable with.</p>
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
                  <Label>Twitter / X</Label>
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
                <Label required>Why do you want this role?</Label>
                <textarea name="motivation" value={formData.motivation} onChange={handleChange} rows={6} placeholder="Share your motivation, what excites you about the role, and what makes you a great fit…" className={errors.motivation ? inpError : inp} />
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
                  <input type="text" name="institution_name" value={formData.institution_name} onChange={handleChange} placeholder="University / School name" className={errors.institution_name ? inpError : inp} />
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
                      <input type="text" value={exp.duration} onChange={(e) => handleWorkExperienceChange(index, "duration", e.target.value)} placeholder="Duration (e.g. 2020 - 2022)" className={inp} />
                    </div>
                    <textarea value={exp.responsibilities} onChange={(e) => handleWorkExperienceChange(index, "responsibilities", e.target.value)} placeholder="Key responsibilities" rows={2} className={inp} />
                  </div>
                ))}
                <button type="button" onClick={addWorkExperience} className="w-full py-2.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-teal-400 hover:text-teal-600 transition-colors text-sm font-medium">
                  + Add Work Experience
                </button>

                {(() => {
                  const selected = jobPostings.find(jp => jp.id === parseInt(formData.job_posting_id));
                  if (!selected || !selected.requirements || selected.requirements.length === 0) return null;
                  const reqs = selected.requirements;
                  const toggleReq = (req) => {
                    setMetRequirements((prev) => prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req]);
                  };
                  return (
                    <div className="mt-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <p className="text-xs font-bold text-gray-800">Job Requirements</p>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] text-gray-500 mb-3">Check the requirements you meet for this position.</p>
                        <div className="space-y-1.5">
                          {reqs.map((req, i) => {
                            const checked = metRequirements.includes(req);
                            return (
                              <button key={i} type="button" onClick={() => toggleReq(req)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${checked ? "bg-teal-50 border-teal-200" : "bg-white border-gray-200 hover:border-teal-300"}`}>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "bg-teal-600 border-teal-600" : "border-gray-300"}`}>
                                  {checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className={`text-xs ${checked ? "text-teal-700 font-medium" : "text-gray-700"}`}>{req}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </StepCard>
          )}

          {step === 7 && (
            <StepCard step={cur}>
              <div className="space-y-3">
                {DOCUMENT_TYPES.map((doc) => (
                  <div key={doc.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${documents[doc.key] ? 'bg-teal-50/50 border-teal-200' : errors[doc.key] ? 'bg-red-50 border-red-200' : 'border-gray-200 hover:border-teal-200'}`}>
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
                        <p className="text-[10px] text-gray-400">Max 10MB — PDF, JPG, PNG</p>
                      )}
                      {errors[doc.key] && !documents[doc.key] && <p className="text-red-500 text-[10px] mt-0.5">{errors[doc.key]}</p>}
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
                  { label: "Applicant", value: formData.full_name || "—" },
                  { label: "Email", value: formData.email || "—" },
                  { label: "Contact", value: formData.contact_number || "—" },
                  { label: "Education", value: EDUCATION_LEVELS.find(e => e.value === formData.education_level)?.label || "—" },
                  { label: "Experience", value: `${formData.total_experience_years || 0} years` },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className="text-xs font-semibold text-gray-800 text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </StepCard>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => step > 1 && setStep((s) => s - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex gap-1">
                {STEPS.map((s) => (
                  <div key={s.num} className={`h-1.5 rounded-full transition-all ${s.num === step ? "w-6 bg-teal-600" : s.num < step ? "w-3 bg-teal-300" : "w-3 bg-gray-200"}`} />
                ))}
              </div>
              {step < STEPS.length ? (
                <button type="button" disabled={!canNext()} onClick={handleNext}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-sm">
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Submitting…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Submit Application
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <PublicFooter />
    </div>
  );
}

function JobPicker({ jobPostings, selectedId, onSelect, error }) {
  const [query, setQuery] = useState("");

  if (jobPostings.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700 mt-4">No open positions at the moment</p>
        <p className="text-xs text-gray-500 mt-1">Please check back soon — we post new opportunities regularly.</p>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? jobPostings.filter((jp) =>
        [jp.title, jp.location, jp.position_title, jp.department, jp.employment_type]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    : jobPostings;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-800">{jobPostings.length} Open {jobPostings.length === 1 ? "Position" : "Positions"}</p>
          <p className="text-xs text-gray-500">Choose the role that matches your skills.</p>
        </div>
        {jobPostings.length > 3 && (
          <div className="relative w-full sm:w-72">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search positions…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-sm text-gray-500">No positions match "{query}"</p>
          <button type="button" onClick={() => setQuery("")} className="text-xs text-teal-600 font-medium mt-1 hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((jp) => (
            <JobCard
              key={jp.id}
              job={jp}
              selected={parseInt(selectedId) === jp.id}
              onClick={() => onSelect(jp.id)}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {error}
        </p>
      )}
    </div>
  );
}

function JobCard({ job, selected, onClick }) {
  const dept = job.department?.replace(/_/g, " ");
  const empType = job.employment_type?.replace(/_/g, " ");

  let deadlineLabel = null;
  let deadlineUrgent = false;
  if (job.deadline_date) {
    const d = new Date(job.deadline_date);
    if (!isNaN(d.getTime())) {
      const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
      if (days < 0) deadlineLabel = "Closed";
      else if (days === 0) { deadlineLabel = "Closes today"; deadlineUrgent = true; }
      else if (days <= 7) { deadlineLabel = `${days} day${days === 1 ? "" : "s"} left`; deadlineUrgent = true; }
      else deadlineLabel = `Closes ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left rounded-2xl border-2 bg-white overflow-hidden transition-all hover:shadow-md ${
        selected
          ? "border-teal-500 ring-4 ring-teal-100 shadow-md"
          : "border-gray-200 hover:border-teal-300"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center shadow-md z-10">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <div className={`h-1.5 ${selected ? "bg-gradient-to-r from-teal-500 to-cyan-500" : "bg-gray-100 group-hover:bg-teal-200"}`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            selected ? "bg-gradient-to-br from-teal-600 to-cyan-600 text-white" : "bg-teal-50 text-teal-600 group-hover:bg-teal-100"
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight pr-8">{job.title}</p>
            {job.position_title && job.position_title !== job.title && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{job.position_title}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {dept && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md text-[10px] font-semibold capitalize">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              {dept}
            </span>
          )}
          {empType && (
            <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-semibold capitalize">
              {empType}
            </span>
          )}
          {job.location && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded-md text-[10px] font-semibold">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {job.location}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            {job.number_of_positions ? (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {job.number_of_positions} open
              </span>
            ) : null}
            {job.experience_years ? (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {job.experience_years}+ yrs
              </span>
            ) : null}
          </div>
          {deadlineLabel && (
            <span className={`text-[11px] font-semibold ${deadlineUrgent ? "text-red-600" : "text-gray-500"}`}>
              {deadlineLabel}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function PublicHeader() {
  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Wifaq School</p>
            <p className="text-[11px] text-gray-500">Careers · Application Portal</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secure & private
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-gray-100 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} Wifaq School. All rights reserved.</p>
        <p className="text-[11px] text-gray-400">Your information is handled in confidence and used only for recruitment.</p>
      </div>
    </footer>
  );
}
