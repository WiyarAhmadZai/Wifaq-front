import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, put, post, del } from "../../api/axios";
import Swal from "sweetalert2";
import { API_BASE_URL } from "../../api/axios";

const STEPS = [
  { key: "received", label: "Received", desc: "Application received", color: "blue", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { key: "screening", label: "Screening", desc: "Under review", color: "teal", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { key: "shortlisted", label: "Shortlisted", desc: "Candidate selected", color: "teal", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { key: "interview", label: "Interview", desc: "Interview stage", color: "cyan", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { key: "offer", label: "Offer", desc: "Job offer sent", color: "teal", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { key: "hired", label: "Hired", desc: "Successfully hired", color: "emerald", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
];

const COLOR_STYLES = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "bg-blue-100 text-blue-600", btn: "bg-blue-600 hover:bg-blue-700", light: "bg-blue-100 text-blue-700" },
  teal: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", icon: "bg-teal-100 text-teal-600", btn: "bg-teal-600 hover:bg-teal-700", light: "bg-teal-100 text-teal-700" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", icon: "bg-cyan-100 text-cyan-600", btn: "bg-cyan-600 hover:bg-cyan-700", light: "bg-cyan-100 text-cyan-700" },
  indigo: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", icon: "bg-teal-100 text-teal-600", btn: "bg-teal-600 hover:bg-teal-700", light: "bg-teal-100 text-teal-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "bg-emerald-100 text-emerald-600", btn: "bg-emerald-600 hover:bg-emerald-700", light: "bg-emerald-100 text-emerald-700" },
  gray: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon: "bg-gray-100 text-gray-600", btn: "bg-gray-600 hover:bg-gray-700", light: "bg-gray-100 text-gray-700" },
};

const DOCUMENT_TYPES = {
  cv_resume: { label: "CV/Resume", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "blue" },
  identity_document: { label: "Identity Document", icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2", color: "teal" },
  educational_document: { label: "Educational Document", icon: "M12 14l9-5-9-5-9 5 9 5z", color: "teal" },
  work_samples: { label: "Work Samples", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", color: "cyan" },
};

const SCREENING_CHECKLIST = [
  { id: "cv_reviewed", label: "CV/Resume reviewed and verified", docType: "cv_resume" },
  { id: "identity_verified", label: "Identity document verified", docType: "identity_document" },
  { id: "education_verified", label: "Educational documents verified", docType: "educational_document" },
  { id: "work_samples_reviewed", label: "Work samples/portfolio reviewed", docType: "work_samples" },
  { id: "qualifications_match", label: "Qualifications match job requirements" },
  { id: "experience_relevant", label: "Work experience is relevant to role" },
];

export default function ApplicationShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewingDoc, setViewingDoc] = useState(null); // Document being viewed in modal
  const [documents, setDocuments] = useState([]); // Separate state for documents

  // Interview scheduling state for Shortlisted stage
  const [interviewData, setInterviewData] = useState({
    interview_type: "technical",
    interview_date: "",
    interview_time: "",
    location: "",
    notes: "",
  });
  const [isScheduling, setIsScheduling] = useState(false);

  // Interview feedback state for Interview stage
  const [interviewSchedule, setInterviewSchedule] = useState(null);
  const [feedbackData, setFeedbackData] = useState({
    feedback_notes: "",
    rating: 0,
    interview_result: "pending",
  });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Offer state
  const [offerData, setOfferData] = useState({
    salary_amount: "",
    salary_currency: "AFN",
    start_date: "",
    additional_terms: "",
    job_responsibilities: "",
  });
  const [existingOffer, setExistingOffer] = useState(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerMode, setOfferMode] = useState("form"); // "form" | "view"
  const [pendingResponsibilityFile, setPendingResponsibilityFile] = useState(null);

  // Email logs state
  const [emailLogs, setEmailLogs] = useState([]);

  useEffect(() => {
    fetchData();
    fetchDocuments();
    fetchEmailLogs();
    if (data?.status === "interview") {
      fetchInterviewSchedule();
    }
  }, [id]);

  useEffect(() => {
    if (data?.status === "interview") {
      fetchInterviewSchedule();
    }
    if (data?.status === "offer" || data?.status === "hired") {
      fetchOffer();
    }
  }, [data?.status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/applications/${id}`);
      const appData = response.data?.data || response.data;
      setData(appData);
      if (appData?.documents) {
        setDocuments(appData.documents);
      }
    } catch (error) {
      Swal.fire("Error", "Failed to load application", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      console.log("Fetching documents for application ID:", id);
      const response = await get(`/recruitment/application-documents/${id}`);
      console.log("Documents response:", response.data);
      const docsData = response.data?.data || response.data || [];
      console.log("Parsed documents:", docsData);
      setDocuments(docsData);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const response = await get(`/email-logs/application/${id}`);
      if (response.data?.success) {
        setEmailLogs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching email logs:", error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    // Confirmation dialog for reject actions
    if (newStatus === "rejected") {
      const result = await Swal.fire({
        title: "Reject Application?",
        text: `Are you sure you want to reject ${data.full_name}'s application? This action cannot be easily undone.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, Reject",
        cancelButtonText: "Cancel",
      });
      if (!result.isConfirmed) return;
    }

    setIsUpdating(true);
    try {
      await put(`/recruitment/applications/${id}`, { ...data, status: newStatus});
      setData((prev) => ({ ...prev, status: newStatus }));
      Swal.fire({
        title: "Updated!",
        text: `Application moved to "${newStatus}"`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire("Error", "Failed to update status", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleScheduleInterview = async () => {
    // Validate required fields
    if (!interviewData.interview_date || !interviewData.interview_time) {
      Swal.fire("Error", "Please select interview date and time", "error");
      return;
    }

    setIsScheduling(true);
    try {
      const response = await post(`/recruitment/applications/${id}/schedule-interview`, {
        interview_type: interviewData.interview_type,
        interview_date: interviewData.interview_date,
        interview_time: interviewData.interview_time,
        location: interviewData.location,
        notes: interviewData.notes,
        send_email: true,
      });

      if (response.data?.success) {
        setData((prev) => ({ ...prev, status: "interview" }));
        Swal.fire({
          title: "Success!",
          text: "Interview scheduled and email sent to candidate",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.data?.message || "Failed to schedule interview");
      }
    } catch (error) {
      console.error("Schedule interview error:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      Swal.fire("Error", error.response?.data?.message || "Failed to schedule interview", "error");
    } finally {
      setIsScheduling(false);
    }
  };

  const fetchInterviewSchedule = async () => {
    try {
      const response = await get(`/recruitment/applications/${id}/interview-schedule`);
      if (response.data?.success) {
        setInterviewSchedule(response.data.data);
        setFeedbackData({
          feedback_notes: response.data.data.feedback_notes || "",
          rating: response.data.data.rating || 0,
          interview_result: response.data.data.interview_result || "pending",
        });
      }
    } catch (error) {
      console.error("Error fetching interview schedule:", error);
    }
  };

  // ==================== OFFER FUNCTIONS ====================

  const fetchOffer = async () => {
    try {
      const response = await get(`/recruitment/applications/${id}/offer`);
      if (response.data?.success) {
        const offer = response.data.data;
        setExistingOffer(offer);
        setOfferData({
          salary_amount: offer.salary_amount || "",
          salary_currency: offer.salary_currency || "AFN",
          start_date: offer.start_date?.split("T")[0] || "",
          additional_terms: offer.additional_terms || "",
          job_responsibilities: offer.job_responsibilities || "",
        });
        setOfferMode("view");
      }
    } catch (error) {
      // No offer yet - show form
      setOfferMode("form");
    }
  };

  const handleCreateOffer = async (sendEmail = false) => {
    if (!offerData.salary_amount || !offerData.start_date) {
      Swal.fire("Error", "Please fill in salary and start date", "error");
      return;
    }

    setIsSubmittingOffer(true);
    try {
      // STEP 1: Create the offer first (without sending email yet if there's a file)
      const createResponse = await post(`/recruitment/applications/${id}/offer`, {
        ...offerData,
        send_email: false, // Always false initially - we'll send after file upload
      });

      if (!createResponse.data?.success) {
        throw new Error(createResponse.data?.message || "Failed to create offer");
      }

      let offerResult = createResponse.data.data;

      // STEP 2: Upload pending responsibility file if selected (before sending email)
      if (pendingResponsibilityFile) {
        try {
          const formData = new FormData();
          formData.append("responsibility_file", pendingResponsibilityFile);
          const fileRes = await post(`/recruitment/applications/${id}/offer/responsibility-file`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (fileRes.data?.success) {
            offerResult = fileRes.data.data;
          }
        } catch (fileErr) {
          console.error("Failed to upload responsibility file:", fileErr);
          Swal.fire("Warning", "Offer created but file upload failed", "warning");
        }
        setPendingResponsibilityFile(null);
      }

      // STEP 3: Now send the email if requested (file is now attached)
      if (sendEmail) {
        try {
          await post(`/recruitment/applications/${id}/offer/send-email`);
          offerResult = { ...offerResult, status: "sent", sent_at: new Date().toISOString() };
        } catch (emailErr) {
          console.error("Failed to send offer email:", emailErr);
          Swal.fire("Warning", "Offer created but email failed to send", "warning");
        }
      }

      setExistingOffer(offerResult);
      setOfferMode("view");
      Swal.fire({
        title: "Success!",
        text: sendEmail ? "Offer created and email sent to candidate" : "Offer created successfully",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || error.message || "Failed to create offer", "error");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleUpdateOffer = async (sendEmail = false) => {
    setIsSubmittingOffer(true);
    try {
      const response = await put(`/recruitment/applications/${id}/offer`, {
        ...offerData,
        send_email: false, 
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to update offer");
      }

      let offerResult = response.data.data;

      // STEP 2: Upload pending responsibility file if selected (before sending email)
      if (pendingResponsibilityFile) {
        try {
          const formData = new FormData();
          formData.append("responsibility_file", pendingResponsibilityFile);
          const fileRes = await post(`/recruitment/applications/${id}/offer/responsibility-file`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (fileRes.data?.success) {
            offerResult = fileRes.data.data;
          }
        } catch (fileErr) {
          console.error("Failed to upload responsibility file:", fileErr);
          Swal.fire("Warning", "Offer updated but file upload failed", "warning");
        }
        setPendingResponsibilityFile(null);
      }

      // STEP 3: Now send the email if requested (file is now attached)
      if (sendEmail) {
        try {
          await post(`/recruitment/applications/${id}/offer/send-email`);
          offerResult = { ...offerResult, status: "sent", sent_at: new Date().toISOString() };
        } catch (emailErr) {
          console.error("Failed to send offer email:", emailErr);
          Swal.fire("Warning", "Offer updated but email failed to send", "warning");
        }
      }

      setExistingOffer(offerResult);
      setOfferMode("view");
      Swal.fire({
        title: "Success!",
        text: sendEmail ? "Offer updated and email sent" : "Offer updated successfully",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || error.message || "Failed to update offer", "error");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleOfferResponse = async (response) => {
    const messages = {
      accepted: { title: "Confirm Hiring", text: `Are you sure you want to hire ${data.full_name}? This will finalize the recruitment process and send a welcome email.`, confirmText: "Yes, Hire", color: "#059669" },
    };

    const msg = messages[response];
    const confirmResult = await Swal.fire({
      title: msg.title,
      text: msg.text,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: msg.color,
      cancelButtonColor: "#6b7280",
      confirmButtonText: msg.confirmText,
      cancelButtonText: "Cancel",
    });

    if (!confirmResult.isConfirmed) return;

    setIsSubmittingOffer(true);
    try {
      const res = await put(`/recruitment/applications/${id}/offer/respond`, {
        response,
        candidate_notes: "",
      });

      if (res.data?.success) {
        setData((prev) => ({ ...prev, status: "hired" }));
        setExistingOffer(res.data.data);

        Swal.fire({
          title: "Hired!",
          text: `${data.full_name} has been successfully hired. A welcome email has been sent.`,
          icon: "success",
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to record response", "error");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleSendOfferEmail = async () => {
    setIsSubmittingOffer(true);
    try {
      const response = await post(`/recruitment/applications/${id}/offer/send-email`);
      if (response.data?.success) {
        setExistingOffer((prev) => ({ ...prev, status: "sent", sent_at: new Date().toISOString() }));
        Swal.fire({
          title: "Sent!",
          text: "Offer email sent to candidate",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to send email", "error");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleUploadResponsibilityFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("responsibility_file", file);

    setIsSubmittingOffer(true);
    try {
      const response = await post(`/recruitment/applications/${id}/offer/responsibility-file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data?.success) {
        setExistingOffer(response.data.data);
        Swal.fire({ title: "Uploaded!", text: "Responsibility file uploaded", icon: "success", timer: 1500, showConfirmButton: false });
      }
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to upload file", "error");
    } finally {
      setIsSubmittingOffer(false);
      e.target.value = "";
    }
  };

  const handleDeleteResponsibilityFile = async () => {
    const result = await Swal.fire({
      title: "Delete File?",
      text: "Are you sure you want to remove the responsibility file?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
    });
    if (!result.isConfirmed) return;

    setIsSubmittingOffer(true);
    try {
      const response = await del(`/recruitment/applications/${id}/offer/responsibility-file`);
      if (response.data?.success) {
        setExistingOffer(response.data.data);
        Swal.fire({ title: "Deleted!", text: "File removed", icon: "success", timer: 1500, showConfirmButton: false });
      }
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to delete file", "error");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const getResponsibilityFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http")) return fileUrl;
    const storageBaseUrl = API_BASE_URL.replace(/\/api$/, "");
    return `${storageBaseUrl}/storage/${fileUrl}`;
  };

  const handleInterviewFeedback = async (result) => {
    // Confirmation dialog for reject-type actions
    if (result === "failed" || result === "no_show") {
      const confirmResult = await Swal.fire({
        title: result === "failed" ? "Reject Candidate?" : "Mark as No Show?",
        text: result === "failed"
          ? `Are you sure you want to reject ${data.full_name}? This will move the application to rejected status.`
          : `Mark ${data.full_name} as a no-show? This will reject the application.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: result === "failed" ? "Yes, Reject" : "Yes, No Show",
        cancelButtonText: "Cancel",
      });
      if (!confirmResult.isConfirmed) return;
    }

    setIsSubmittingFeedback(true);
    try {
      const response = await put(`/recruitment/applications/${id}/interview-feedback`, {
        ...feedbackData,
        interview_result: result,
      });

      if (response.data?.success) {
        const resultMessages = {
          passed: { status: "offer", text: "Candidate passed - moving to Offer stage" },
          failed: { status: "rejected", text: "Candidate rejected" },
          no_show: { status: "rejected", text: "Candidate marked as No Show" },
          pending: { status: "interview", text: "Feedback saved" },
        };
        const resultInfo = resultMessages[result];
        setData((prev) => ({ ...prev, status: resultInfo.status }));
        Swal.fire({
          title: "Success!",
          text: resultInfo.text,
          icon: result === "passed" ? "success" : result === "pending" ? "info" : "warning",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.data?.message || "Failed to save feedback");
      }
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to save feedback", "error");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const toggleChecklist = (id) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getDocumentUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http")) return fileUrl;
    // Remove /api from base URL to get storage base URL
    const storageBaseUrl = API_BASE_URL.replace(/\/api$/, "");
    return `${storageBaseUrl}/storage/${fileUrl}`;
  };

  const openDocument = (doc) => {
    setViewingDoc(doc);
  };

  const closeDocument = () => {
    setViewingDoc(null);
  };

  const getCurrentStepIndex = () => STEPS.findIndex((s) => s.key === data?.status);
  const currentStep = STEPS[getCurrentStepIndex()] || STEPS[0];
  const colors = COLOR_STYLES[currentStep.color] || COLOR_STYLES.teal;

  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : "—";
  const formatDateTime = (date) => date ? new Date(date).toLocaleString() : "—";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading application...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Application not found</p>
          <button onClick={() => navigate("/recruitment/applications")} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  const isReceived = data.status === "received";
  const isScreening = data.status === "screening";
  const isShortlisted = data.status === "shortlisted";
  const isInterview = data.status === "interview";
  const isOffer = data.status === "offer";
  const isHired = data.status === "hired";

  // Tab Navigation Component
  const TabButton = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
        activeTab === tab
          ? "bg-teal-600 text-white shadow-md"
          : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
      {label}
    </button>
  );

  return (
    <div className="px-4 py-6 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/recruitment/applications")} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
            {data.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{data.full_name}</h1>
            <p className="text-sm text-gray-500">{data.job_posting?.title || "Application"} #{String(data.id).padStart(4, "0")}</p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${colors.light}`}>
            {data.status?.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isActive = step.key === data.status;
            const isPast = idx < getCurrentStepIndex();
            const stepColors = COLOR_STYLES[step.color];

            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? `${stepColors.btn} text-white shadow-lg` :
                    isPast ? `${stepColors.icon} shadow-sm` : "bg-gray-100 text-gray-400"
                  }`}>
                    {isPast ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs font-medium mt-2 ${isActive ? stepColors.text : isPast ? "text-gray-600" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-1 flex-1 mx-4 rounded-full ${isPast ? `bg-${step.color}-300` : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <TabButton tab="overview" label="Overview" icon="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        <TabButton tab="full-info" label="Full Application" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <TabButton tab="documents" label={`Documents (${documents?.length || 0})`} icon="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* RECEIVED STAGE */}
            {isReceived && (
              <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-white/50 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">New Application Received</h2>
                    <p className="text-sm text-gray-600">Review the candidate details below</p>
                  </div>
                </div>
                
                <div className="p-6 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Applied For</p>
                      <p className="text-sm font-medium text-gray-800">{data.job_posting?.title || "—"}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Contact</p>
                      <p className="text-sm font-medium text-gray-800">{data.contact_number || "—"}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Date of Birth</p>
                      <p className="text-sm font-medium text-gray-800">{formatDate(data.date_of_birth)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Email</p>
                      <p className="text-sm font-medium text-gray-800">{data.email || "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Introduction</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{data.introduction || "No introduction provided"}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Motivation</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{data.motivation || "No motivation provided"}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
                    <button
                      onClick={() => handleStatusChange("screening")}
                      disabled={isUpdating}
                      className={`flex-1 py-3 px-4 ${colors.btn} text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      {isUpdating ? "Processing..." : "Start Screening"}
                    </button>
                    <button
                      onClick={() => handleStatusChange("rejected")}
                      disabled={isUpdating}
                      className="px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SCREENING STAGE */}
            {isScreening && (
              <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-white/50 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Screening in Progress</h2>
                    <p className="text-sm text-gray-600">Review documents and complete checklist</p>
                  </div>
                </div>

                <div className="p-6 bg-white space-y-6">
                  {/* Documents Section in Screening */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Uploaded Documents ({documents?.length || 0})
                    </h3>
                    {documents && documents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {documents.map((doc) => {
                          const docType = DOCUMENT_TYPES[doc.document_type] || { label: doc.document_type, icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", color: "gray" };
                          return (
                            <div key={doc.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg bg-${docType.color}-100 text-${docType.color}-600 flex items-center justify-center`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={docType.icon} />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{docType.label}</p>
                                <p className="text-xs text-gray-500">{formatDateTime(doc.uploaded_at)}</p>
                              </div>
                              <button
                                onClick={() => openDocument(doc)}
                                className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                title="View Document"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                        <p className="text-sm text-gray-500">No documents uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* Screening Checklist - Document Focused */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Document Review Checklist</h3>
                    <div className="space-y-2">
                      {SCREENING_CHECKLIST.map((item) => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            checklist[item.id] ? "bg-teal-50 border-teal-200" : "bg-gray-50 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            checklist[item.id] ? "bg-teal-500 border-teal-500" : "border-gray-300"
                          }`}>
                            {checklist[item.id] && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={checklist[item.id] || false}
                            onChange={() => toggleChecklist(item.id)}
                          />
                          <span className={`text-sm ${checklist[item.id] ? "text-teal-700 font-medium" : "text-gray-700"}`}>
                            {item.label}
                          </span>
                          {item.docType && documents?.some(d => d.document_type === item.docType) && (
                            <span className="ml-auto text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                              Uploaded
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleStatusChange("shortlisted")}
                      disabled={isUpdating}
                      className={`flex-1 py-3 px-4 ${colors.btn} text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isUpdating ? "Processing..." : "Shortlist Candidate"}
                    </button>
                    <button
                      onClick={() => handleStatusChange("rejected")}
                      disabled={isUpdating}
                      className="px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SHORTLISTED STAGE */}
            {isShortlisted && (
              <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-white/50 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Candidate Shortlisted</h2>
                    <p className="text-sm text-gray-600">Schedule interview to proceed</p>
                  </div>
                </div>

                <div className="p-6 bg-white space-y-6">
                  {/* Candidate Summary Card */}
                  <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-semibold">
                        {data.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{data.full_name}</p>
                        <p className="text-sm text-gray-600">{data.total_experience_years || 0} years exp</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-white rounded text-xs text-teal-700 border border-teal-200">
                        {data.education_level?.replace(/_/g, " ")}
                      </span>
                      <span className="px-2 py-1 bg-white rounded text-xs text-teal-700 border border-teal-200">
                        {data.field_of_study}
                      </span>
                    </div>
                  </div>

                  {/* Interview Scheduling Form */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule Interview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Interview Type */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Interview Type</label>
                        <select
                          value={interviewData.interview_type}
                          onChange={(e) => setInterviewData({ ...interviewData, interview_type: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        >
                          <option value="phone">Phone Screen</option>
                          <option value="technical">Technical Interview</option>
                          <option value="hr">HR Interview</option>
                          <option value="panel">Panel Interview</option>
                          <option value="final">Final Round</option>
                        </select>
                      </div>

                      {/* Interview Date */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Interview Date</label>
                        <input
                          type="date"
                          value={interviewData.interview_date}
                          onChange={(e) => setInterviewData({ ...interviewData, interview_date: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        />
                      </div>

                      {/* Interview Time */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Interview Time</label>
                        <input
                          type="time"
                          value={interviewData.interview_time}
                          onChange={(e) => setInterviewData({ ...interviewData, interview_time: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        />
                      </div>

                      {/* Location/Mode */}
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 mb-1.5 block">Location / Meeting Link</label>
                        <input
                          type="text"
                          value={interviewData.location}
                          onChange={(e) => setInterviewData({ ...interviewData, location: e.target.value })}
                          placeholder="Office address, Zoom link, Google Meet, etc."
                          className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        />
                      </div>

                      {/* Interview Notes */}
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 mb-1.5 block">Interview Notes / Preparation</label>
                        <textarea
                          value={interviewData.notes}
                          onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })}
                          rows={3}
                          placeholder="Topics to cover, questions to ask, candidate strengths to verify..."
                          className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={handleScheduleInterview}
                      disabled={isUpdating || isScheduling}
                      className={`flex-1 py-3 px-4 ${colors.btn} text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {isScheduling ? "Scheduling..." : "Schedule Interview"}
                    </button>
                    <button
                      onClick={() => handleStatusChange("screening")}
                      disabled={isUpdating}
                      className="px-4 py-3 bg-gray-100 text-gray-600 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                      Back to Screening
                    </button>
                    <button
                      onClick={() => handleStatusChange("rejected")}
                      disabled={isUpdating}
                      className="px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* INTERVIEW STAGE */}
            {isInterview && (
              <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-white/50 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Interview Stage</h2>
                    <p className="text-sm text-gray-600">Conduct interview and provide feedback</p>
                  </div>
                </div>

                <div className="p-6 bg-white space-y-6">
                  {/* Interview Details Card */}
                  {interviewSchedule && (
                    <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                      <h3 className="text-sm font-semibold text-cyan-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Scheduled Interview
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-cyan-600 mb-1">Type</p>
                          <p className="text-sm font-medium text-gray-800 capitalize">{interviewSchedule.interview_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-cyan-600 mb-1">Date</p>
                          <p className="text-sm font-medium text-gray-800">{interviewSchedule.interview_date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-cyan-600 mb-1">Time</p>
                          <p className="text-sm font-medium text-gray-800">{interviewSchedule.interview_time}</p>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-xs text-cyan-600 mb-1">Location</p>
                          <p className="text-sm font-medium text-gray-800 truncate">{interviewSchedule.location || "Not specified"}</p>
                        </div>
                      </div>
                      {interviewSchedule.notes && (
                        <div className="mt-3 pt-3 border-t border-cyan-200">
                          <p className="text-xs text-cyan-600 mb-1">Notes</p>
                          <p className="text-sm text-gray-700">{interviewSchedule.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interview Feedback Form */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Interview Feedback
                    </h3>

                    {/* Rating */}
                    <div className="mb-4">
                      <label className="text-xs text-gray-500 mb-2 block">Rating (1-5 stars)</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setFeedbackData({ ...feedbackData, rating: star })}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                              feedbackData.rating >= star
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feedback Notes */}
                    <div className="mb-4">
                      <label className="text-xs text-gray-500 mb-2 block">Feedback Notes</label>
                      <textarea
                        value={feedbackData.feedback_notes}
                        onChange={(e) => setFeedbackData({ ...feedbackData, feedback_notes: e.target.value })}
                        rows={4}
                        placeholder="Enter your interview observations, strengths, weaknesses, overall impression..."
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleInterviewFeedback("passed")}
                        disabled={isSubmittingFeedback}
                        className="flex-1 min-w-[140px] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isSubmittingFeedback ? "Saving..." : "Pass - Make Offer"}
                      </button>
                      <button
                        onClick={() => handleInterviewFeedback("failed")}
                        disabled={isSubmittingFeedback}
                        className="flex-1 min-w-[140px] py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {isSubmittingFeedback ? "Saving..." : "Fail - Reject"}
                      </button>
                      {/* <button
                        onClick={() => handleInterviewFeedback("no_show")}
                        disabled={isSubmittingFeedback}
                        className="flex-1 min-w-[140px] py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {isSubmittingFeedback ? "Saving..." : "No Show"}
                      </button> */}
                      {/* <button
                        onClick={() => handleInterviewFeedback("pending")}
                        disabled={isSubmittingFeedback}
                        className="py-3 px-4 bg-gray-100 text-gray-600 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                      >
                        {isSubmittingFeedback ? "Saving..." : "Save Feedback"}
                      </button> */}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OFFER STAGE */}
            {isOffer && (
              <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-white/50 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Offer Management</h2>
                    <p className="text-sm text-gray-600">
                      {existingOffer ? `Offer Status: ${existingOffer.status?.replace(/_/g, " ")}` : "Create and send offer to candidate"}
                    </p>
                  </div>
                  {existingOffer && offerMode === "view" && (
                    <div className="ml-auto flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        existingOffer.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                        existingOffer.status === "declined" ? "bg-red-100 text-red-700" :
                        existingOffer.status === "negotiated" ? "bg-amber-100 text-amber-700" :
                        existingOffer.status === "sent" ? "bg-blue-100 text-blue-700" :
                        existingOffer.status === "expired" ? "bg-gray-100 text-gray-700" :
                        "bg-teal-100 text-teal-700"
                      }`}>
                        {existingOffer.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white space-y-6">

                  {/* ===== OFFER VIEW MODE ===== */}
                  {offerMode === "view" && existingOffer && (
                    <>
                      {/* Offer Details Card */}
                      <div className="p-5 bg-teal-50 rounded-xl border border-teal-200">
                        <h3 className="text-sm font-semibold text-teal-800 mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Offer Details
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-teal-600 mb-1">Position</p>
                            <p className="text-sm font-medium text-gray-800">{data.job_posting?.requisition?.position_title || data.job_posting?.title || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600 mb-1">Department</p>
                            <p className="text-sm font-medium text-gray-800 capitalize">{data.job_posting?.requisition?.department?.replace(/_/g, " ") || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600 mb-1">Employment Type</p>
                            <p className="text-sm font-medium text-gray-800 capitalize">{data.job_posting?.requisition?.employment_type?.replace(/_/g, " ") || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600 mb-1">Salary</p>
                            <p className="text-sm font-bold text-gray-800">
                              {Number(existingOffer.salary_amount).toLocaleString()} {existingOffer.salary_currency}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600 mb-1">Start Date</p>
                            <p className="text-sm font-medium text-gray-800">{formatDate(existingOffer.start_date)}</p>
                          </div>
                        </div>

                        {/* Job Responsibilities */}
                        {existingOffer.job_responsibilities && (
                          <div className="mt-4 pt-4 border-t border-teal-200">
                            <p className="text-xs text-teal-600 mb-1">Job Responsibilities</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{existingOffer.job_responsibilities}</p>
                          </div>
                        )}

                        {/* Additional Terms */}
                        {existingOffer.additional_terms && (
                          <div className="mt-4 pt-4 border-t border-teal-200">
                            <p className="text-xs text-teal-600 mb-1">Additional Terms</p>
                            <p className="text-sm text-gray-700">{existingOffer.additional_terms}</p>
                          </div>
                        )}

                        {/* Responsibility File */}
                        {existingOffer.responsibility_file_url ? (
                          <div className="mt-4 pt-4 border-t border-teal-200">
                            <p className="text-xs text-teal-600 mb-2">Responsibility File</p>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-teal-100">
                              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <span className="text-sm text-gray-700 flex-1 truncate">{existingOffer.responsibility_file_url.split("/").pop()}</span>
                              <a
                                href={getResponsibilityFileUrl(existingOffer.responsibility_file_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-all flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 pt-4 border-t border-teal-200">
                            <p className="text-xs text-teal-600 mb-2">Responsibility File</p>
                            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-teal-200 rounded-lg cursor-pointer hover:border-teal-400 hover:bg-white transition-all">
                              <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span className="text-xs text-teal-500">Upload responsibility file</span>
                              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleUploadResponsibilityFile} />
                            </label>
                          </div>
                        )}

                        {/* Candidate Notes (if responded) */}
                        {existingOffer.candidate_notes && (
                          <div className="mt-4 pt-4 border-t border-teal-200">
                            <p className="text-xs text-teal-600 mb-1">Candidate Notes</p>
                            <p className="text-sm text-gray-700 italic">{existingOffer.candidate_notes}</p>
                          </div>
                        )}

                        {/* Sent info */}
                        {existingOffer.sent_at && (
                          <div className="mt-4 pt-4 border-t border-teal-200">
                            <p className="text-xs text-gray-500">
                              Email sent: {formatDateTime(existingOffer.sent_at)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                        {/* Send/Resend email - only for draft or sent */}
                        {(existingOffer.status === "draft" || existingOffer.status === "sent") && (
                          <button
                            onClick={handleSendOfferEmail}
                            disabled={isSubmittingOffer}
                            className="flex-1 min-w-[140px] py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {isSubmittingOffer ? "Sending..." : existingOffer.sent_at ? "Resend Email" : "Send Offer Email"}
                          </button>
                        )}

                        {/* Edit offer - for draft, sent, or negotiated */}
                        {["draft", "sent", "negotiated"].includes(existingOffer.status) && (
                          <button
                            onClick={() => setOfferMode("form")}
                            className="flex-1 min-w-[140px] py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {existingOffer.status === "negotiated" ? "Revise Offer" : "Edit Offer"}
                          </button>
                        )}

                        {/* Accept & Confirm Hiring - only for sent or draft */}
                        {["draft", "sent"].includes(existingOffer.status) && (
                          <button
                            onClick={() => handleOfferResponse("accepted")}
                            disabled={isSubmittingOffer}
                            className="flex-1 min-w-[200px] py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {isSubmittingOffer ? "Processing..." : "Accept & Confirm Hiring"}
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* ===== OFFER FORM MODE ===== */}
                  {offerMode === "form" && (
                    <>
                      {existingOffer?.status === "negotiated" && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <p className="text-sm font-semibold text-amber-800">Candidate Requested Negotiation</p>
                          </div>
                          {existingOffer.candidate_notes && (
                            <p className="text-sm text-amber-700 italic">"{existingOffer.candidate_notes}"</p>
                          )}
                        </div>
                      )}

                      {/* Job Info from Requisition (read-only) */}
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Position</p>
                            <p className="text-sm font-medium text-gray-800">{data.job_posting?.requisition?.position_title || data.job_posting?.title || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Department</p>
                            <p className="text-sm font-medium text-gray-800 capitalize">{data.job_posting?.requisition?.department?.replace(/_/g, " ") || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Employment Type</p>
                            <p className="text-sm font-medium text-gray-800 capitalize">{data.job_posting?.requisition?.employment_type?.replace(/_/g, " ") || "—"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Salary */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1.5 block">Proposed Salary *</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={offerData.salary_amount}
                              onChange={(e) => setOfferData({ ...offerData, salary_amount: e.target.value })}
                              placeholder="e.g. 25000"
                              className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                            />
                            <select
                              value={offerData.salary_currency}
                              onChange={(e) => setOfferData({ ...offerData, salary_currency: e.target.value })}
                              className="w-28 p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                            >
                              <option value="AFN">AFN</option>
                              <option value="USDT">USDT</option>
                            </select>
                          </div>
                        </div>

                        {/* Start Date */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1.5 block">Start Date *</label>
                          <input
                            type="date"
                            value={offerData.start_date}
                            onChange={(e) => setOfferData({ ...offerData, start_date: e.target.value })}
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                          />
                        </div>

                        {/* Job Responsibilities */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-500 mb-1.5 block">Job Responsibilities</label>
                          <textarea
                            value={offerData.job_responsibilities}
                            onChange={(e) => setOfferData({ ...offerData, job_responsibilities: e.target.value })}
                            rows={4}
                            placeholder="List the key responsibilities and duties for this role..."
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                          />
                        </div>

                        {/* Additional Terms */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-500 mb-1.5 block">Additional Terms / Notes</label>
                          <textarea
                            value={offerData.additional_terms}
                            onChange={(e) => setOfferData({ ...offerData, additional_terms: e.target.value })}
                            rows={3}
                            placeholder="Probation period, working hours, reporting structure, special conditions..."
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                          />
                        </div>
                      </div>

                      {/* Responsibility File Upload */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Responsibility File</label>
                        <p className="text-xs text-gray-400 mb-2">Upload a document describing the candidate's responsibilities in your organization</p>

                        {/* Case 1: Existing offer with uploaded file */}
                        {existingOffer?.responsibility_file_url ? (
                          <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-200">
                            <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{existingOffer.responsibility_file_url.split("/").pop()}</p>
                              <p className="text-xs text-gray-500">Responsibility file uploaded</p>
                            </div>
                            <a
                              href={getResponsibilityFileUrl(existingOffer.responsibility_file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-all"
                              title="View File"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </a>
                            <button
                              onClick={handleDeleteResponsibilityFile}
                              disabled={isSubmittingOffer}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                              title="Delete File"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <label className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-all cursor-pointer" title="Replace File">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleUploadResponsibilityFile} />
                            </label>
                          </div>

                        ) : pendingResponsibilityFile ? (
                          /* Case 2: New offer - file selected but not yet uploaded */
                          <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-200">
                            <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{pendingResponsibilityFile.name}</p>
                              <p className="text-xs text-teal-500">Will be uploaded when offer is created</p>
                            </div>
                            <button
                              onClick={() => setPendingResponsibilityFile(null)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Remove"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                        ) : (
                          /* Case 3: No file yet - show upload area */
                          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-all">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="text-sm text-gray-500">Click to upload responsibility file</span>
                            <span className="text-xs text-gray-400">(PDF, DOC, DOCX, JPG, PNG - max 10MB)</span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                if (existingOffer) {
                                  handleUploadResponsibilityFile(e);
                                } else {
                                  setPendingResponsibilityFile(e.target.files[0]);
                                  e.target.value = "";
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Form Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                        {existingOffer ? (
                          <>
                            <button
                              onClick={() => handleUpdateOffer(true)}
                              disabled={isSubmittingOffer}
                              className="flex-1 min-w-[160px] py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {isSubmittingOffer ? "Saving..." : "Update & Send Email"}
                            </button>
                            <button
                              onClick={() => handleUpdateOffer(false)}
                              disabled={isSubmittingOffer}
                              className="py-3 px-4 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                            >
                              {isSubmittingOffer ? "Saving..." : "Save Draft"}
                            </button>
                            <button
                              onClick={() => setOfferMode("view")}
                              className="py-3 px-4 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleCreateOffer(true)}
                              disabled={isSubmittingOffer}
                              className="flex-1 min-w-[160px] py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {isSubmittingOffer ? "Creating..." : "Create & Send Offer"}
                            </button>
                            {/* <button
                              onClick={() => handleCreateOffer(false)}
                              disabled={isSubmittingOffer}
                              className="py-3 px-4 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                            >
                              {isSubmittingOffer ? "Creating..." : "Save as Draft"}
                            </button> */}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* HIRED STAGE */}
            {isHired && (
              <div className="space-y-6">
                {/* Success Card */}
                <div className="rounded-2xl overflow-hidden border border-emerald-200">
                  <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 px-6 py-10 text-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-5">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Successfully Hired!</h2>
                    <p className="text-white/90 text-sm mb-4">{data.full_name} has been officially welcomed to the team</p>
                    <span className="inline-block px-5 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold">
                      {data.job_posting?.requisition?.position_title?.replace(/_/g, " ") || data.job_posting?.title || "—"}
                    </span>
                  </div>
                </div>

                {/* Hiring Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
                  {/* Candidate Card */}
                  <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {data.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{data.full_name}</h3>
                      <p className="text-sm text-emerald-700 font-medium">
                        {data.job_posting?.requisition?.position_title?.replace(/_/g, " ") || data.job_posting?.title || "—"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{data.email}</p>
                    </div>
                    <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wide">
                      Hired
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {existingOffer && (
                      <>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Salary</p>
                          <p className="text-sm font-bold text-gray-800">
                            {Number(existingOffer.salary_amount).toLocaleString()} {existingOffer.salary_currency}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Start Date</p>
                          <p className="text-sm font-bold text-gray-800">{formatDate(existingOffer.start_date)}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Department</p>
                          <p className="text-sm font-medium text-gray-800 capitalize">
                            {data.job_posting?.requisition?.department?.replace(/_/g, " ") || "—"}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Employment Type</p>
                          <p className="text-sm font-medium text-gray-800 capitalize">
                            {data.job_posting?.requisition?.employment_type?.replace(/_/g, " ") || "—"}
                          </p>
                        </div>
                      </>
                    )}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Hired Date</p>
                      <p className="text-sm font-bold text-gray-800">{formatDate(existingOffer?.responded_at || data.updated_at)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Application ID</p>
                      <p className="text-sm font-medium text-gray-800">#{String(data.id).padStart(4, "0")}</p>
                    </div>
                  </div>

                  {/* Job Responsibilities */}
                  {existingOffer?.job_responsibilities && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-xs text-blue-700 uppercase font-semibold mb-2">Job Responsibilities</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{existingOffer.job_responsibilities}</p>
                    </div>
                  )}

                  {/* Additional Terms */}
                  {existingOffer?.additional_terms && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-xs text-amber-700 uppercase font-semibold mb-2">Additional Terms</p>
                      <p className="text-sm text-gray-700">{existingOffer.additional_terms}</p>
                    </div>
                  )}

                  {/* Email Notice */}
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Welcome email sent to candidate</p>
                      <p className="text-xs text-emerald-600">A congratulations email has been sent to {data.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Stages */}
            {!isReceived && !isScreening && !isShortlisted && !isInterview && !isOffer && !isHired && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">{currentStep.label} Stage</h2>
                <p className="text-sm text-gray-500">Application is in {data.status?.replace(/_/g, " ")} stage</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Documents Quick Access */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Documents</h3>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                  {documents?.length || 0}
                </span>
              </div>
              {documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.slice(0, 3).map((doc) => {
                    const docType = DOCUMENT_TYPES[doc.document_type] || { label: doc.document_type, color: "gray" };
                    const docColors = COLOR_STYLES[docType.color];
                    return (
                      <button
                        key={doc.id}
                        onClick={() => openDocument(doc)}
                        className="w-full p-2 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-all text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg ${docColors.icon} flex items-center justify-center flex-shrink-0`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={docType.icon || "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"} />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-700 truncate flex-1">{docType.label}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    );
                  })}
                  {documents.length > 3 && (
                    <button
                      onClick={() => setActiveTab("documents")}
                      className="w-full py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                    >
                      View all {documents.length} documents →
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No documents uploaded</p>
                </div>
              )}
            </div>

            {/* Candidate Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Candidate Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Full Name</p>
                  <p className="text-sm font-medium text-gray-800">{data.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Contact</p>
                  <p className="text-sm font-medium text-gray-800">{data.contact_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-800">{data.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Address</p>
                  <p className="text-sm text-gray-700">{data.current_address || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Origin</p>
                  <p className="text-sm text-gray-700">{data.place_of_origin || "—"}</p>
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Education</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Level</p>
                  <p className="text-sm font-medium text-gray-800 capitalize">{data.education_level?.replace(/_/g, " ") || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Field of Study</p>
                  <p className="text-sm text-gray-700">{data.field_of_study || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Institution</p>
                  <p className="text-sm text-gray-700">{data.institution_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Experience</p>
                  <p className="text-sm font-medium text-gray-800">{data.total_experience_years || 0} years</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-sm p-5 text-white">
              <h3 className="text-sm font-semibold mb-4">Timeline</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-teal-100">Applied</span>
                  <span className="text-xs font-medium">{formatDate(data.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-teal-100">Last Updated</span>
                  <span className="text-xs font-medium">{formatDate(data.updated_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-teal-100">Application ID</span>
                  <span className="text-xs font-medium">#{String(data.id).padStart(4, "0")}</span>
                </div>
              </div>
            </div>

            {/* Email Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Email Status</h3>
                <button onClick={fetchEmailLogs} className="text-xs text-teal-600 hover:text-teal-700 transition-all" title="Refresh">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {emailLogs.length > 0 ? (
                <div className="space-y-2.5">
                  {emailLogs.map((log) => (
                    <div key={log.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-gray-800 leading-tight flex-1 truncate" title={log.subject}>
                          {log.subject || log.mailable_class?.split("\\").pop()}
                        </p>
                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.status === "sent" ? "bg-emerald-100 text-emerald-700" :
                          log.status === "failed" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {log.status === "sent" ? "Sent" : log.status === "failed" ? "Failed" : "Queued"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {log.status === "sent" && (
                          <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {log.status === "failed" && (
                          <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {log.status === "queued" && (
                          <svg className="w-3 h-3 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <p className="text-[10px] text-gray-500">
                          {log.status === "sent" && log.sent_at ? formatDateTime(log.sent_at) :
                           log.status === "failed" && log.failed_at ? formatDateTime(log.failed_at) :
                           formatDateTime(log.created_at)}
                        </p>
                      </div>
                      {log.status === "failed" && log.error_message && (
                        <p className="text-[10px] text-red-500 mt-1 truncate" title={log.error_message}>{log.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-400">No emails sent yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL INFO TAB */}
      {activeTab === "full-info" && (
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Personal Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Full Name</p>
                  <p className="text-sm font-medium text-gray-800">{data.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Contact Number</p>
                  <p className="text-sm font-medium text-gray-800">{data.contact_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-800">{data.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Date of Birth</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(data.date_of_birth)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Place of Origin</p>
                  <p className="text-sm text-gray-700">{data.place_of_origin || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Current Address</p>
                  <p className="text-sm text-gray-700">{data.current_address || "—"}</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Introduction</p>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-700 leading-relaxed">{data.introduction || "No introduction provided"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Social Media</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Facebook", value: data.facebook, icon: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" },
                  { label: "Instagram", value: data.instagram, icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
                  { label: "Twitter/X", value: data.twitter_x, icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                  { label: "YouTube", value: data.youtube, icon: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d={item.icon} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-sm font-medium text-gray-800">{item.value || "Not provided"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Motivation & Skills */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Motivation & Skills</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Motivation for This Role</p>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-700 leading-relaxed">{data.motivation || "No motivation provided"}</p>
                </div>
              </div>
              {data.unique_skill && data.unique_skill.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Unique Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {data.unique_skill.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Education</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Education Level</p>
                  <p className="text-sm font-medium text-gray-800 capitalize">{data.education_level?.replace(/_/g, " ") || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Field of Study</p>
                  <p className="text-sm text-gray-700">{data.field_of_study || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Institution Name</p>
                  <p className="text-sm text-gray-700">{data.institution_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Experience</p>
                  <p className="text-sm font-medium text-gray-800">{data.total_experience_years || 0} years</p>
                </div>
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Work Experience</h2>
            </div>
            <div className="p-6">
              {data.work_experiences && data.work_experiences.length > 0 ? (
                <div className="space-y-4">
                  {data.work_experiences.map((exp, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{exp.job_title}</p>
                          <p className="text-sm text-gray-600">{exp.company_name}</p>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{exp.duration}</span>
                      </div>
                      <p className="text-sm text-gray-700">{exp.responsibilities}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No work experience provided</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {activeTab === "documents" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Uploaded Documents</h2>
            </div>
            <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
              {documents?.length || 0} documents
            </span>
          </div>
          <div className="p-6">
            {documents && documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => {
                  const docType = DOCUMENT_TYPES[doc.document_type] || { label: doc.document_type, icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", color: "gray" };
                  const docColors = COLOR_STYLES[docType.color];
                  return (
                    <div key={doc.id} className={`p-4 rounded-xl border ${docColors.border} ${docColors.bg} hover:shadow-md transition-all`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl ${docColors.icon} flex items-center justify-center flex-shrink-0`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={docType.icon} />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{docType.label}</p>
                          <p className="text-xs text-gray-500 mt-1">Uploaded: {formatDateTime(doc.uploaded_at)}</p>
                          <button
                            onClick={() => openDocument(doc)}
                            className={`mt-3 w-full py-2 px-3 ${docColors.btn} text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Document
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-1">No Documents</h3>
                <p className="text-sm text-gray-500">No documents have been uploaded for this application</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const docType = DOCUMENT_TYPES[viewingDoc.document_type] || { label: viewingDoc.document_type, color: "gray" };
                  const docColors = COLOR_STYLES[docType.color];
                  return (
                    <div className={`w-10 h-10 rounded-lg ${docColors.icon} flex items-center justify-center`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={docType.icon || "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"} />
                      </svg>
                    </div>
                  );
                })()}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {(() => {
                      const docType = DOCUMENT_TYPES[viewingDoc.document_type];
                      return docType?.label || viewingDoc.document_type;
                    })()}
                  </h3>
                  <p className="text-sm text-gray-500">Uploaded: {formatDateTime(viewingDoc.uploaded_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getDocumentUrl(viewingDoc.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </a>
                <button
                  onClick={closeDocument}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body - Document Preview */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center">
              {viewingDoc.file_url?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={getDocumentUrl(viewingDoc.file_url)}
                  className="w-full h-full min-h-[500px] rounded-lg bg-white"
                  title="Document Preview"
                />
              ) : viewingDoc.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img
                  src={getDocumentUrl(viewingDoc.file_url)}
                  alt="Document"
                  className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center p-8">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">This file type cannot be previewed directly</p>
                  <a
                    href={getDocumentUrl(viewingDoc.file_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all"
                  >
                    Download/View File
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                File: {viewingDoc.file_url?.split('/').pop()}
              </p>
              <button
                onClick={closeDocument}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
