import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put, del } from "../../api/axios";
import Swal from "sweetalert2";

const pipelineStages = [
  { key: "received", label: "Received", color: "bg-blue-500", light: "bg-blue-100 text-blue-700" },
  { key: "screening", label: "Screening", color: "bg-amber-500", light: "bg-amber-100 text-amber-700" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-purple-500", light: "bg-purple-100 text-purple-700" },
  { key: "interview", label: "Interview", color: "bg-cyan-500", light: "bg-cyan-100 text-cyan-700" },
  { key: "offer", label: "Offer", color: "bg-indigo-500", light: "bg-indigo-100 text-indigo-700" },
  { key: "hired", label: "Hired", color: "bg-emerald-500", light: "bg-emerald-100 text-emerald-700" },
];

// Stage guidance — tells the user what to do at each step
const stageGuide = {
  received: {
    title: "Application Received",
    description: "A new application has been received. Review the candidate's details and decide whether to begin screening.",
    nextAction: "Start Screening",
    nextStatus: "screening",
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    color: "blue",
  },
  screening: {
    title: "Screening in Progress",
    description: "Review the candidate's qualifications, experience, and background. Add your screening notes below and decide whether to shortlist.",
    nextAction: "Shortlist Candidate",
    nextStatus: "shortlisted",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    color: "amber",
  },
  shortlisted: {
    title: "Candidate Shortlisted",
    description: "This candidate has been shortlisted. Schedule an interview to evaluate them further. Fill in the interview details below.",
    nextAction: "Schedule & Move to Interview",
    nextStatus: "interview",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    color: "purple",
  },
  interview: {
    title: "Interview Stage",
    description: "Conduct interviews with the candidate. You can schedule multiple rounds. Once all interviews are done, proceed to make an offer or reject.",
    nextAction: "Move to Offer Stage",
    nextStatus: "offer",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    color: "cyan",
  },
  offer: {
    title: "Offer Stage",
    description: "Prepare and send a job offer to the candidate. Fill in the salary and start date below. Once the offer is accepted, record the final hiring decision.",
    nextAction: "Record Hiring Decision",
    nextStatus: "hired",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    color: "indigo",
  },
  hired: {
    title: "Candidate Hired!",
    description: "This candidate has been successfully hired. Below is a summary of their entire recruitment journey.",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "emerald",
  },
};

const colorMap = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", iconBg: "bg-blue-100 text-blue-600", btn: "bg-blue-600 hover:bg-blue-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", iconBg: "bg-amber-100 text-amber-600", btn: "bg-amber-600 hover:bg-amber-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", iconBg: "bg-purple-100 text-purple-600", btn: "bg-purple-600 hover:bg-purple-700" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", iconBg: "bg-cyan-100 text-cyan-600", btn: "bg-cyan-600 hover:bg-cyan-700" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", iconBg: "bg-indigo-100 text-indigo-600", btn: "bg-indigo-600 hover:bg-indigo-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", iconBg: "bg-emerald-100 text-emerald-600", btn: "bg-emerald-600 hover:bg-emerald-700" },
};

// ── Dummy data ──
const dummyApplications = {
  1: { id: 1, candidate_name: "Ahmad Rahimi", email: "ahmad.rahimi@email.com", phone: "+93 770 123 456", status: "interview", source: "website", notes: "Strong candidate with 5 years teaching experience.", job_posting: { id: 1, title: "Mathematics Teacher" }, screening_notes: "Qualifications verified. Teaching certificate confirmed.", created_at: "2026-02-15T09:30:00Z", updated_at: "2026-03-10T14:20:00Z" },
  2: { id: 2, candidate_name: "Fatima Noori", email: "fatima.noori@email.com", phone: "+93 772 456 789", status: "screening", source: "referral", notes: "Referred by current staff. Has Quran memorization certificate.", job_posting: { id: 2, title: "Quran Teacher" }, screening_notes: "", created_at: "2026-03-01T11:00:00Z", updated_at: "2026-03-05T16:45:00Z" },
  3: { id: 3, candidate_name: "Mohammad Karimi", email: "m.karimi@email.com", phone: "+93 775 789 012", status: "offer", source: "job_board", notes: "Excellent interview performance.", job_posting: { id: 3, title: "Science Teacher" }, screening_notes: "Strong academic background. Published research papers.", created_at: "2026-01-20T08:00:00Z", updated_at: "2026-03-12T10:30:00Z" },
  4: { id: 4, candidate_name: "Zahra Ahmadi", email: "zahra.a@email.com", phone: "+93 773 321 654", status: "hired", source: "internal", notes: "Successfully onboarded. Starting March 20th.", job_posting: { id: 4, title: "Administrative Assistant" }, screening_notes: "Internal candidate. Excellent track record.", created_at: "2026-01-05T10:15:00Z", updated_at: "2026-03-14T09:00:00Z" },
  5: { id: 5, candidate_name: "Ali Mohammadi", email: "ali.m@email.com", phone: "+93 774 654 987", status: "received", source: "website", notes: "", job_posting: { id: 2, title: "Quran Teacher" }, screening_notes: "", created_at: "2026-03-14T13:00:00Z", updated_at: "2026-03-14T13:00:00Z" },
  6: { id: 6, candidate_name: "Sara Hashimi", email: "sara.h@email.com", phone: "+93 776 111 222", status: "shortlisted", source: "website", notes: "Excellent academic background in Arabic literature.", job_posting: { id: 5, title: "Arabic Language Teacher" }, screening_notes: "Degree verified. 3 years experience. Highly recommended.", created_at: "2026-02-28T07:00:00Z", updated_at: "2026-03-08T11:00:00Z" },
};
const dummyInterviews = {
  1: [
    { id: 1, interview_type: "phone", scheduled_at: "2026-03-05T10:00:00Z", location: "Phone Call", status: "completed", notes: "Good communication. Proceed to in-person." },
    { id: 2, interview_type: "in_person", scheduled_at: "2026-03-12T14:00:00Z", location: "Main Office - Room 3", status: "scheduled", notes: "" },
  ],
  3: [
    { id: 3, interview_type: "phone", scheduled_at: "2026-02-10T09:00:00Z", location: "Phone Call", status: "completed", notes: "Very impressive background." },
    { id: 4, interview_type: "panel", scheduled_at: "2026-02-20T11:00:00Z", location: "Conference Room A", status: "completed", notes: "Panel unanimously approved." },
  ],
  4: [{ id: 5, interview_type: "in_person", scheduled_at: "2026-02-01T10:00:00Z", location: "HR Office", status: "completed", notes: "Great fit for the team." }],
};
const dummyOffers = {
  3: { id: 1, proposed_salary: 25000, start_date: "2026-04-01", offer_status: "sent", created_at: "2026-03-01T10:00:00Z" },
  4: { id: 2, proposed_salary: 18000, start_date: "2026-03-20", offer_status: "accepted", created_at: "2026-02-15T10:00:00Z" },
};
const dummyDecisions = {
  4: { id: 1, decision: "hired", decided_by: "Dr. Sayed Hassan", notes: "All checks passed. Welcome aboard!", created_at: "2026-03-14T09:00:00Z" },
};

const interviewTypeIcons = {
  phone: { label: "Phone", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", bg: "bg-blue-100 text-blue-600" },
  in_person: { label: "In Person", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", bg: "bg-emerald-100 text-emerald-600" },
  video: { label: "Video", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", bg: "bg-purple-100 text-purple-600" },
  panel: { label: "Panel", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", bg: "bg-amber-100 text-amber-600" },
};

export default function ApplicationShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [offer, setOffer] = useState(null);
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inline form states
  const [screeningNotes, setScreeningNotes] = useState("");
  const [interviewForm, setInterviewForm] = useState({ interview_type: "phone", scheduled_at: "", location: "", notes: "" });
  const [offerForm, setOfferForm] = useState({ proposed_salary: "", start_date: "", offer_status: "draft" });
  const [decisionForm, setDecisionForm] = useState({ decision: "hired", decided_by: "", notes: "" });

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/applications/${id}`);
      setData(response.data);
      try { const r = await get(`/recruitment/applications/${id}/interviews`); setInterviews(r.data?.data || r.data || []); } catch { setInterviews([]); }
      try { const r = await get(`/recruitment/applications/${id}/offer`); setOffer(r.data); } catch { setOffer(null); }
      try { const r = await get(`/recruitment/applications/${id}/decision`); setDecision(r.data); } catch { setDecision(null); }
    } catch {
      const dummy = dummyApplications[id];
      if (dummy) {
        setData(dummy);
        setScreeningNotes(dummy.screening_notes || "");
        setInterviews(dummyInterviews[id] || []);
        setOffer(dummyOffers[id] || null);
        setDecision(dummyDecisions[id] || null);
      } else { setData(null); }
    } finally { setLoading(false); }
  };

  const handleStatusChange = async (newStatus) => {
    try { await put(`/recruitment/applications/${id}`, { ...data, status: newStatus }); } catch { /* demo */ }
    setData((prev) => ({ ...prev, status: newStatus }));
    Swal.fire({ title: "Updated!", text: `Moved to "${newStatus}"`, icon: "success", timer: 1500, showConfirmButton: false });
  };

  const handleAddInterview = async () => {
    if (!interviewForm.scheduled_at) { Swal.fire("Required", "Please select a date and time", "warning"); return; }
    try {
      const res = await post("/recruitment/interviews", { ...interviewForm, application_id: id });
      setInterviews((prev) => [...prev, res.data]);
    } catch {
      setInterviews((prev) => [...prev, { id: Date.now(), ...interviewForm, status: "scheduled" }]);
    }
    setInterviewForm({ interview_type: "phone", scheduled_at: "", location: "", notes: "" });
    Swal.fire({ title: "Scheduled!", text: "Interview has been scheduled", icon: "success", timer: 1500, showConfirmButton: false });
  };

  const handleCreateOffer = async () => {
    if (!offerForm.proposed_salary || !offerForm.start_date) { Swal.fire("Required", "Please fill salary and start date", "warning"); return; }
    try {
      const res = await post("/recruitment/job-offers", { ...offerForm, application_id: id });
      setOffer(res.data);
    } catch {
      setOffer({ id: Date.now(), ...offerForm, created_at: new Date().toISOString() });
    }
    setOfferForm({ proposed_salary: "", start_date: "", offer_status: "draft" });
    Swal.fire({ title: "Offer Created!", text: "Job offer has been created", icon: "success", timer: 1500, showConfirmButton: false });
  };

  const handleRecordDecision = async () => {
    try {
      const res = await post("/recruitment/hiring-decisions", { ...decisionForm, application_id: id });
      setDecision(res.data);
    } catch {
      setDecision({ id: Date.now(), ...decisionForm, created_at: new Date().toISOString() });
    }
    if (decisionForm.decision === "hired") handleStatusChange("hired");
    else if (decisionForm.decision === "rejected") handleStatusChange("rejected");
    setDecisionForm({ decision: "hired", decided_by: "", notes: "" });
  };

  const handleDelete = async () => {
    const result = await Swal.fire({ title: "Are you sure?", text: "This action cannot be undone", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280", confirmButtonText: "Yes, delete" });
    if (result.isConfirmed) {
      try { await del(`/recruitment/applications/${id}`); } catch { /* demo */ }
      Swal.fire("Deleted", "Application deleted", "success");
      navigate("/recruitment/applications");
    }
  };

  const getCurrentStageIndex = () => {
    if (!data) return -1;
    if (data.status === "rejected" || data.status === "withdrawn") return -1;
    return pipelineStages.findIndex((s) => s.key === data.status);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>;
  if (!data) return <div className="text-center py-12"><p className="text-gray-500">Application not found</p><button onClick={() => navigate("/recruitment/applications")} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Back to Applications</button></div>;

  const stageIndex = getCurrentStageIndex();
  const isRejected = data.status === "rejected";
  const isWithdrawn = data.status === "withdrawn";
  const guide = stageGuide[data.status] || stageGuide.received;
  const colors = colorMap[guide.color] || colorMap.blue;

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/recruitment/applications")} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
              {data.candidate_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{data.candidate_name}</h2>
              <p className="text-xs text-gray-500">{data.job_posting?.title || "Application"} &middot; #{String(data.id).padStart(4, "0")}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/recruitment/applications/edit/${id}`)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </button>
          <button onClick={handleDelete} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs font-medium flex items-center gap-1.5 border border-red-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete
          </button>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5">
        {(isRejected || isWithdrawn) ? (
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 p-2.5 rounded-lg ${isRejected ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
              <div className={`w-3 h-3 rounded-full ${isRejected ? "bg-red-500" : "bg-amber-500"}`} />
              <span className={`text-sm font-semibold ${isRejected ? "text-red-700" : "text-amber-700"}`}>{isRejected ? "Rejected" : "Withdrawn"}</span>
            </div>
            <button onClick={() => handleStatusChange("received")} className="text-xs text-teal-600 hover:text-teal-700 font-medium px-3 py-1.5 rounded-lg hover:bg-teal-50">Reopen Application</button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {pipelineStages.map((stage, idx) => {
              const isPast = idx < stageIndex;
              const isCurrent = idx === stageIndex;
              return (
                <div key={stage.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isCurrent ? `${stage.color} text-white border-transparent shadow-lg scale-110` :
                      isPast ? "bg-teal-100 border-teal-400 text-teal-700" :
                      "bg-gray-100 border-gray-200 text-gray-400"
                    }`}>
                      {isPast ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : (idx + 1)}
                    </div>
                    <span className={`text-[9px] font-semibold mt-1 ${isCurrent ? "text-gray-800" : isPast ? "text-teal-600" : "text-gray-400"}`}>{stage.label}</span>
                  </div>
                  {idx < pipelineStages.length - 1 && (
                    <div className={`h-0.5 w-full mx-1 rounded-full mb-4 ${isPast ? "bg-teal-300" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stage Guidance Card */}
      {!isRejected && !isWithdrawn && (
        <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 mb-5 flex items-start gap-3`}>
          <div className={`w-9 h-9 rounded-lg ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={guide.icon} /></svg>
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-bold ${colors.text}`}>{guide.title}</h3>
            <p className="text-xs text-gray-600 mt-0.5">{guide.description}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left: Stage-specific content ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* RECEIVED: Review candidate info */}
          {data.status === "received" && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Candidate Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[{ l: "Email", v: data.email }, { l: "Phone", v: data.phone }, { l: "Source", v: data.source?.replace(/_/g, " ") }, { l: "Applied On", v: data.created_at ? new Date(data.created_at).toLocaleDateString() : "-" }].map((i) => (
                    <div key={i.l} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">{i.l}</p>
                      <p className="text-sm text-gray-800 capitalize">{i.v || "-"}</p>
                    </div>
                  ))}
                </div>
                {data.notes && <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100"><p className="text-[10px] text-blue-600 uppercase font-semibold mb-1">Application Notes</p><p className="text-sm text-gray-700">{data.notes}</p></div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleStatusChange("screening")} className={`flex-1 py-2.5 ${colors.btn} text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  Start Screening
                </button>
                <button onClick={() => handleStatusChange("rejected")} className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium">Reject</button>
              </div>
            </>
          )}

          {/* SCREENING: Add screening notes */}
          {data.status === "screening" && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Screening Checklist</h3>
                <div className="space-y-2 mb-4">
                  {["Qualifications verified", "Experience matches requirements", "References checked", "Background check completed"].map((item) => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Screening Notes</label>
                  <textarea value={screeningNotes} onChange={(e) => setScreeningNotes(e.target.value)} rows={3}
                    placeholder="Add your notes about the candidate's qualifications, strengths, concerns..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleStatusChange("shortlisted")} className={`flex-1 py-2.5 ${colors.btn} text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  Shortlist Candidate
                </button>
                <button onClick={() => handleStatusChange("rejected")} className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium">Reject</button>
              </div>
            </>
          )}

          {/* SHORTLISTED: Schedule interview */}
          {data.status === "shortlisted" && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Schedule an Interview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Interview Type</label>
                    <select value={interviewForm.interview_type} onChange={(e) => setInterviewForm((p) => ({ ...p, interview_type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="phone">Phone</option><option value="in_person">In Person</option><option value="video">Video</option><option value="panel">Panel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date & Time *</label>
                    <input type="datetime-local" value={interviewForm.scheduled_at} onChange={(e) => setInterviewForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" value={interviewForm.location} onChange={(e) => setInterviewForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder="e.g. Main Office, Zoom link..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <input type="text" value={interviewForm.notes} onChange={(e) => setInterviewForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Any preparation notes..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { handleAddInterview(); handleStatusChange("interview"); }} className={`flex-1 py-2.5 ${colors.btn} text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Schedule & Move to Interview
                </button>
                <button onClick={() => handleStatusChange("rejected")} className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium">Reject</button>
              </div>
            </>
          )}

          {/* INTERVIEW: Manage interviews */}
          {data.status === "interview" && (
            <>
              {/* Existing interviews */}
              {interviews.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-800">Interviews ({interviews.length})</h3>
                  {interviews.map((intv) => {
                    const typeInfo = interviewTypeIcons[intv.interview_type] || interviewTypeIcons.in_person;
                    const date = intv.scheduled_at ? new Date(intv.scheduled_at) : null;
                    return (
                      <div key={intv.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeInfo.icon} /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-800">{typeInfo.label} Interview</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${intv.status === "completed" ? "bg-emerald-100 text-emerald-700" : intv.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{intv.status}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            {date && <span>{date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                            {intv.location && <span>{intv.location}</span>}
                          </div>
                          {intv.notes && <p className="text-xs text-gray-600 mt-2">{intv.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Add another interview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Schedule Another Interview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Interview Type</label>
                    <select value={interviewForm.interview_type} onChange={(e) => setInterviewForm((p) => ({ ...p, interview_type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="phone">Phone</option><option value="in_person">In Person</option><option value="video">Video</option><option value="panel">Panel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date & Time</label>
                    <input type="datetime-local" value={interviewForm.scheduled_at} onChange={(e) => setInterviewForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" value={interviewForm.location} onChange={(e) => setInterviewForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder="e.g. Main Office, Zoom..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <input type="text" value={interviewForm.notes} onChange={(e) => setInterviewForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Preparation notes..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <button onClick={handleAddInterview} className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Interview
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleStatusChange("offer")} className={`flex-1 py-2.5 ${colors.btn} text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  Move to Offer Stage
                </button>
                <button onClick={() => handleStatusChange("rejected")} className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium">Reject</button>
              </div>
            </>
          )}

          {/* OFFER: Create/view offer */}
          {data.status === "offer" && (
            <>
              {!offer ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Create Job Offer</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Proposed Salary (AFN) *</label>
                      <input type="number" value={offerForm.proposed_salary} onChange={(e) => setOfferForm((p) => ({ ...p, proposed_salary: e.target.value }))}
                        placeholder="e.g. 25000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
                      <input type="date" value={offerForm.start_date} onChange={(e) => setOfferForm((p) => ({ ...p, start_date: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Offer Status</label>
                      <select value={offerForm.offer_status} onChange={(e) => setOfferForm((p) => ({ ...p, offer_status: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleCreateOffer} className={`mt-4 w-full py-2.5 ${colors.btn} text-white rounded-lg text-xs font-medium`}>Create Offer</button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Job Offer Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                      <p className="text-[10px] text-teal-600 uppercase font-semibold mb-1">Proposed Salary</p>
                      <p className="text-xl font-bold text-teal-700">{Number(offer.proposed_salary).toLocaleString()} AFN</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Start Date</p>
                      <p className="text-sm font-medium text-gray-800">{offer.start_date ? new Date(offer.start_date).toLocaleDateString() : "-"}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Offer Status</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${offer.offer_status === "accepted" ? "bg-emerald-100 text-emerald-700" : offer.offer_status === "declined" ? "bg-red-100 text-red-700" : offer.offer_status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{offer.offer_status}</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Hiring decision form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Record Final Decision</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { value: "hired", label: "Hire", bg: "bg-emerald-100 border-emerald-400 text-emerald-700" },
                    { value: "rejected", label: "Reject", bg: "bg-red-100 border-red-400 text-red-700" },
                    { value: "candidate_withdrew", label: "Withdrew", bg: "bg-amber-100 border-amber-400 text-amber-700" },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => setDecisionForm((p) => ({ ...p, decision: opt.value }))}
                      className={`p-2.5 rounded-lg border-2 text-xs font-semibold transition-all ${decisionForm.decision === opt.value ? opt.bg : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>{opt.label}</button>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Decision Notes</label>
                  <textarea value={decisionForm.notes} onChange={(e) => setDecisionForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2} placeholder="Reason for decision..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <button onClick={handleRecordDecision} className={`w-full py-2.5 ${colors.btn} text-white rounded-lg text-xs font-medium`}>Confirm Decision</button>
              </div>
            </>
          )}

          {/* HIRED: Summary */}
          {data.status === "hired" && (
            <>
              {decision && (
                <div className="bg-emerald-50 rounded-xl border-2 border-emerald-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-700">Hired</p>
                      {decision.decided_by && <p className="text-xs text-gray-500">Decision by {decision.decided_by}</p>}
                    </div>
                  </div>
                  {decision.notes && <p className="text-sm text-gray-700">{decision.notes}</p>}
                  {decision.created_at && <p className="text-xs text-gray-400 mt-2">{new Date(decision.created_at).toLocaleString()}</p>}
                </div>
              )}
              {offer && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Offer Summary</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <p className="text-[10px] text-teal-600 uppercase font-semibold mb-1">Salary</p>
                      <p className="text-lg font-bold text-teal-700">{Number(offer.proposed_salary).toLocaleString()} AFN</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Start Date</p>
                      <p className="text-sm font-medium text-gray-800">{offer.start_date ? new Date(offer.start_date).toLocaleDateString() : "-"}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Status</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 capitalize">{offer.offer_status}</span>
                    </div>
                  </div>
                </div>
              )}
              {interviews.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Interview History</h3>
                  <div className="space-y-2">
                    {interviews.map((intv) => {
                      const typeInfo = interviewTypeIcons[intv.interview_type] || interviewTypeIcons.in_person;
                      const date = intv.scheduled_at ? new Date(intv.scheduled_at) : null;
                      return (
                        <div key={intv.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className={`w-7 h-7 rounded ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeInfo.icon} /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800">{typeInfo.label}</p>
                            <p className="text-[10px] text-gray-500">{date ? date.toLocaleDateString() : ""} {intv.location ? `- ${intv.location}` : ""}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${intv.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{intv.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-5">
          {/* Contact Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Contact Info</h3>
            <div className="space-y-2">
              {[{ l: "Email", v: data.email, icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
                { l: "Phone", v: data.phone, icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
              ].map((i) => (
                <div key={i.l} className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={i.icon} /></svg>
                  <span className="text-xs text-gray-700">{i.v || "-"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Progress</h3>
            <div className="space-y-3">
              {[
                { label: "Status", value: <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${data.status === "hired" ? "bg-emerald-100 text-emerald-700" : data.status === "rejected" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{data.status?.replace(/_/g, " ")}</span> },
                { label: "Interviews", value: <span className="text-xs font-medium text-gray-800">{interviews.length}</span> },
                { label: "Offer", value: <span className="text-xs font-medium text-gray-800">{offer ? offer.offer_status : "None"}</span> },
                { label: "Decision", value: <span className="text-xs font-medium text-gray-800 capitalize">{decision?.decision || "Pending"}</span> },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{row.label}</span>
                  {row.value}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-sm p-5 text-white">
            <h3 className="text-sm font-semibold mb-3">Timeline</h3>
            <div className="space-y-2">
              {[
                { label: "Applied", value: data.created_at ? new Date(data.created_at).toLocaleDateString() : "-" },
                { label: "Last Update", value: data.updated_at ? new Date(data.updated_at).toLocaleDateString() : "-" },
                { label: "Record ID", value: `#${String(data.id).padStart(4, "0")}` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-teal-100">{row.label}</span>
                  <span className="text-xs font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
