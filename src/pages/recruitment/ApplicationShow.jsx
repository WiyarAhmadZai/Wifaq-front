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

// ── Dummy data for demo mode ──
const dummyApplications = {
  1: {
    id: 1, candidate_name: "Ahmad Rahimi", email: "ahmad.rahimi@email.com", phone: "+93 770 123 456",
    status: "interview", source: "website", notes: "Strong candidate with 5 years teaching experience in mathematics.",
    job_posting: { id: 1, title: "Mathematics Teacher" },
    created_at: "2026-02-15T09:30:00Z", updated_at: "2026-03-10T14:20:00Z",
  },
  2: {
    id: 2, candidate_name: "Fatima Noori", email: "fatima.noori@email.com", phone: "+93 772 456 789",
    status: "screening", source: "referral", notes: "Referred by current staff. Has Quran memorization certificate.",
    job_posting: { id: 2, title: "Quran Teacher" },
    created_at: "2026-03-01T11:00:00Z", updated_at: "2026-03-05T16:45:00Z",
  },
  3: {
    id: 3, candidate_name: "Mohammad Karimi", email: "m.karimi@email.com", phone: "+93 775 789 012",
    status: "offer", source: "job_board", notes: "Excellent interview performance. Offered science teacher position.",
    job_posting: { id: 3, title: "Science Teacher" },
    created_at: "2026-01-20T08:00:00Z", updated_at: "2026-03-12T10:30:00Z",
  },
  4: {
    id: 4, candidate_name: "Zahra Ahmadi", email: "zahra.a@email.com", phone: "+93 773 321 654",
    status: "hired", source: "internal", notes: "Successfully onboarded. Starting March 20th.",
    job_posting: { id: 4, title: "Administrative Assistant" },
    created_at: "2026-01-05T10:15:00Z", updated_at: "2026-03-14T09:00:00Z",
  },
  5: {
    id: 5, candidate_name: "Ali Mohammadi", email: "ali.m@email.com", phone: "+93 774 654 987",
    status: "received", source: "website", notes: "",
    job_posting: { id: 2, title: "Quran Teacher" },
    created_at: "2026-03-14T13:00:00Z", updated_at: "2026-03-14T13:00:00Z",
  },
  6: {
    id: 6, candidate_name: "Sara Hashimi", email: "sara.h@email.com", phone: "+93 776 111 222",
    status: "shortlisted", source: "website", notes: "Excellent academic background in Arabic literature.",
    job_posting: { id: 5, title: "Arabic Language Teacher" },
    created_at: "2026-02-28T07:00:00Z", updated_at: "2026-03-08T11:00:00Z",
  },
};

const dummyInterviews = {
  1: [
    { id: 1, interview_type: "phone", scheduled_at: "2026-03-05T10:00:00Z", location: "Phone Call", status: "completed", notes: "Good communication skills. Proceed to in-person." },
    { id: 2, interview_type: "in_person", scheduled_at: "2026-03-12T14:00:00Z", location: "Main Office - Room 3", status: "scheduled", notes: "" },
  ],
  3: [
    { id: 3, interview_type: "phone", scheduled_at: "2026-02-10T09:00:00Z", location: "Phone Call", status: "completed", notes: "Very impressive background." },
    { id: 4, interview_type: "panel", scheduled_at: "2026-02-20T11:00:00Z", location: "Conference Room A", status: "completed", notes: "Panel unanimously approved. Moving to offer." },
  ],
  4: [
    { id: 5, interview_type: "in_person", scheduled_at: "2026-02-01T10:00:00Z", location: "HR Office", status: "completed", notes: "Great fit for the team." },
  ],
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
  const [activeTab, setActiveTab] = useState("overview");

  // Modal states
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [interviewForm, setInterviewForm] = useState({ interview_type: "phone", scheduled_at: "", location: "", notes: "" });
  const [offerForm, setOfferForm] = useState({ proposed_salary: "", start_date: "", offer_status: "draft" });
  const [decisionForm, setDecisionForm] = useState({ decision: "hired", notes: "" });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/applications/${id}`);
      const appData = response.data;
      setData(appData);
      try { const r = await get(`/recruitment/applications/${id}/interviews`); setInterviews(r.data?.data || r.data || []); } catch { setInterviews([]); }
      try { const r = await get(`/recruitment/applications/${id}/offer`); setOffer(r.data); } catch { setOffer(null); }
      try { const r = await get(`/recruitment/applications/${id}/decision`); setDecision(r.data); } catch { setDecision(null); }
    } catch {
      // Demo mode — use dummy data
      const dummy = dummyApplications[id];
      if (dummy) {
        setData(dummy);
        setInterviews(dummyInterviews[id] || []);
        setOffer(dummyOffers[id] || null);
        setDecision(dummyDecisions[id] || null);
      } else {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await put(`/recruitment/applications/${id}`, { ...data, status: newStatus });
    } catch { /* demo mode */ }
    setData((prev) => ({ ...prev, status: newStatus }));
    Swal.fire({ title: "Updated!", text: `Status changed to ${newStatus}`, icon: "success", timer: 1500, showConfirmButton: false });
  };

  const handleAddInterview = async () => {
    if (!interviewForm.scheduled_at) { Swal.fire("Required", "Please select a date and time", "warning"); return; }
    try {
      const res = await post("/recruitment/interviews", { ...interviewForm, application_id: id });
      setInterviews((prev) => [...prev, res.data]);
    } catch {
      setInterviews((prev) => [...prev, { id: Date.now(), ...interviewForm, status: "scheduled" }]);
    }
    setShowInterviewModal(false);
    setInterviewForm({ interview_type: "phone", scheduled_at: "", location: "", notes: "" });
    if (data.status === "shortlisted" || data.status === "screening") handleStatusChange("interview");
  };

  const handleAddOffer = async () => {
    if (!offerForm.proposed_salary || !offerForm.start_date) { Swal.fire("Required", "Please fill salary and start date", "warning"); return; }
    try {
      const res = await post("/recruitment/job-offers", { ...offerForm, application_id: id });
      setOffer(res.data);
    } catch {
      setOffer({ id: Date.now(), ...offerForm, created_at: new Date().toISOString() });
    }
    setShowOfferModal(false);
    setOfferForm({ proposed_salary: "", start_date: "", offer_status: "draft" });
    if (data.status === "interview") handleStatusChange("offer");
  };

  const handleAddDecision = async () => {
    try {
      const res = await post("/recruitment/hiring-decisions", { ...decisionForm, application_id: id });
      setDecision(res.data);
    } catch {
      setDecision({ id: Date.now(), ...decisionForm, created_at: new Date().toISOString() });
    }
    setShowDecisionModal(false);
    if (decisionForm.decision === "hired") handleStatusChange("hired");
    else if (decisionForm.decision === "rejected") handleStatusChange("rejected");
    setDecisionForm({ decision: "hired", notes: "" });
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Are you sure?", text: "This action cannot be undone", icon: "warning",
      showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280", confirmButtonText: "Yes, delete",
    });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Application not found</p>
        <button onClick={() => navigate("/recruitment/applications")} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Back to Applications</button>
      </div>
    );
  }

  const stageIndex = getCurrentStageIndex();
  const isRejected = data.status === "rejected";
  const isWithdrawn = data.status === "withdrawn";
  const isTerminal = isRejected || isWithdrawn || data.status === "hired";

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "interviews", label: "Interviews", count: interviews.length },
    { key: "offer", label: "Job Offer", dot: !!offer },
    { key: "decision", label: "Decision", dot: !!decision },
  ];

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

      {/* Pipeline Progress — Clickable */}
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
              const canClick = !isTerminal && idx <= stageIndex + 1;
              return (
                <div key={stage.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      onClick={() => canClick && handleStatusChange(stage.key)}
                      disabled={!canClick}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        isCurrent ? `${stage.color} text-white border-transparent shadow-lg scale-110` :
                        isPast ? "bg-teal-100 border-teal-400 text-teal-700" :
                        "bg-gray-100 border-gray-200 text-gray-400"
                      } ${canClick && !isCurrent ? "cursor-pointer hover:scale-105" : ""}`}
                      title={canClick ? `Move to ${stage.label}` : ""}
                    >
                      {isPast ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : ( idx + 1 )}
                    </button>
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

      {/* Quick Actions */}
      {!isTerminal && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button onClick={() => setShowInterviewModal(true)} className="px-3 py-1.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100 text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Schedule Interview
          </button>
          <button onClick={() => setShowOfferModal(true)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Make Offer
          </button>
          <button onClick={() => setShowDecisionModal(true)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Record Decision
          </button>
          <button onClick={() => handleStatusChange("rejected")} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            Reject
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {tab.label}
            {tab.count > 0 && <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{tab.count}</span>}
            {tab.dot && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Contact Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Email", value: data.email },
                  { label: "Phone", value: data.phone },
                  { label: "Source", value: data.source?.replace(/_/g, " ") },
                  { label: "Applied On", value: data.created_at ? new Date(data.created_at).toLocaleDateString() : null },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">{item.label}</p>
                    <p className="text-sm text-gray-800 capitalize">{item.value || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
            {data.notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  HR Notes
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}
          </div>
          <div className="space-y-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Quick Summary</h3>
              <div className="space-y-3">
                {[
                  { label: "Status", value: <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${data.status === "hired" ? "bg-emerald-100 text-emerald-700" : data.status === "rejected" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{data.status?.replace(/_/g, " ")}</span> },
                  { label: "Interviews", value: <span className="text-xs font-medium text-gray-800">{interviews.length}</span> },
                  { label: "Offer", value: <span className="text-xs font-medium text-gray-800">{offer ? (offer.offer_status === "accepted" ? "Accepted" : "Pending") : "None"}</span> },
                  { label: "Decision", value: <span className="text-xs font-medium text-gray-800 capitalize">{decision?.decision || "Pending"}</span> },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    {row.value}
                  </div>
                ))}
              </div>
            </div>
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
      )}

      {/* ── TAB: Interviews ── */}
      {activeTab === "interviews" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Interviews ({interviews.length})</h3>
            {!isTerminal && (
              <button onClick={() => setShowInterviewModal(true)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Schedule Interview
              </button>
            )}
          </div>
          {interviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-sm text-gray-500">No interviews scheduled yet</p>
              {!isTerminal && <p className="text-xs text-gray-400 mt-1">Click "Schedule Interview" to add one</p>}
            </div>
          ) : (
            <div className="space-y-3">
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          intv.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                          intv.status === "cancelled" ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>{intv.status}</span>
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
        </div>
      )}

      {/* ── TAB: Job Offer ── */}
      {activeTab === "offer" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Job Offer</h3>
            {!offer && !isTerminal && (
              <button onClick={() => setShowOfferModal(true)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create Offer
              </button>
            )}
          </div>
          {!offer ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm text-gray-500">No offer created yet</p>
              {!isTerminal && <p className="text-xs text-gray-400 mt-1">Click "Create Offer" to send one</p>}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                    offer.offer_status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                    offer.offer_status === "declined" ? "bg-red-100 text-red-700" :
                    offer.offer_status === "sent" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{offer.offer_status}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Decision ── */}
      {activeTab === "decision" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Hiring Decision</h3>
            {!decision && !isTerminal && (
              <button onClick={() => setShowDecisionModal(true)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Record Decision
              </button>
            )}
          </div>
          {!decision ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm text-gray-500">No decision recorded yet</p>
              {!isTerminal && <p className="text-xs text-gray-400 mt-1">Record the final hiring decision</p>}
            </div>
          ) : (
            <div className={`rounded-xl border-2 p-5 ${
              decision.decision === "hired" ? "bg-emerald-50 border-emerald-200" :
              decision.decision === "rejected" ? "bg-red-50 border-red-200" :
              "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  decision.decision === "hired" ? "bg-emerald-200 text-emerald-700" :
                  decision.decision === "rejected" ? "bg-red-200 text-red-700" :
                  "bg-amber-200 text-amber-700"
                }`}>
                  {decision.decision === "hired" ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
                <div>
                  <p className={`text-lg font-bold capitalize ${
                    decision.decision === "hired" ? "text-emerald-700" : decision.decision === "rejected" ? "text-red-700" : "text-amber-700"
                  }`}>{decision.decision?.replace(/_/g, " ")}</p>
                  {decision.decided_by && <p className="text-xs text-gray-500">by {decision.decided_by}</p>}
                </div>
              </div>
              {decision.notes && <p className="text-sm text-gray-700">{decision.notes}</p>}
              {decision.created_at && <p className="text-xs text-gray-400 mt-2">{new Date(decision.created_at).toLocaleString()}</p>}
            </div>
          )}
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════ */}

      {/* Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowInterviewModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Schedule Interview</h3>
              <p className="text-xs text-gray-500 mt-0.5">for {data.candidate_name}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Interview Type</label>
                <select value={interviewForm.interview_type} onChange={(e) => setInterviewForm((p) => ({ ...p, interview_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="phone">Phone</option>
                  <option value="in_person">In Person</option>
                  <option value="video">Video</option>
                  <option value="panel">Panel</option>
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
                <textarea value={interviewForm.notes} onChange={(e) => setInterviewForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Any preparation notes..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowInterviewModal(false)} className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleAddInterview} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium">Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowOfferModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Create Job Offer</h3>
              <p className="text-xs text-gray-500 mt-0.5">for {data.candidate_name}</p>
            </div>
            <div className="p-5 space-y-4">
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
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Offer Status</label>
                <select value={offerForm.offer_status} onChange={(e) => setOfferForm((p) => ({ ...p, offer_status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowOfferModal(false)} className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleAddOffer} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium">Create Offer</button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDecisionModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Record Hiring Decision</h3>
              <p className="text-xs text-gray-500 mt-0.5">for {data.candidate_name}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Decision</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "hired", label: "Hire", bg: "bg-emerald-100 border-emerald-400 text-emerald-700" },
                    { value: "rejected", label: "Reject", bg: "bg-red-100 border-red-400 text-red-700" },
                    { value: "candidate_withdrew", label: "Withdrew", bg: "bg-amber-100 border-amber-400 text-amber-700" },
                  ].map((opt) => (
                    <button key={opt.value}
                      onClick={() => setDecisionForm((p) => ({ ...p, decision: opt.value }))}
                      className={`p-2.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                        decisionForm.decision === opt.value ? opt.bg : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={decisionForm.notes} onChange={(e) => setDecisionForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3} placeholder="Reason for decision..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowDecisionModal(false)} className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleAddDecision} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium">Confirm Decision</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
