import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, del, API_BASE_URL as _API, peekCache } from '../../api/axios';
const STORAGE_URL = _API.replace(/\/api\/?$/, '');
import Swal from 'sweetalert2';
import { useResourcePermissions } from '../../admin/utils/useResourcePermissions';
import WelcomeLetterModal from '../../components/WelcomeLetterModal';
import ExperienceLetterModal from '../../components/ExperienceLetterModal';
import OnboardingWelcomeModal from '../../components/OnboardingWelcomeModal';
import { getStaffOnboarding } from '../../api/onboarding';

import { fmtDate } from "../../utils/formErrors";

const DOCUMENT_TYPES = {
  cv_resume: { label: "CV/Resume", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "blue" },
  identity_document: { label: "Identity Document", icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2", color: "teal" },
  educational_document: { label: "Educational Document", icon: "M12 14l9-5-9-5-9 5 9 5z", color: "emerald" },
  work_samples: { label: "Work Samples", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", color: "cyan" },
};

const DOC_COLORS = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "bg-blue-100 text-blue-600", btn: "bg-blue-600 hover:bg-blue-700" },
  teal: { bg: "bg-teal-50", border: "border-teal-200", icon: "bg-teal-100 text-teal-600", btn: "bg-teal-600 hover:bg-teal-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "bg-emerald-100 text-emerald-600", btn: "bg-emerald-600 hover:bg-emerald-700" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-200", icon: "bg-cyan-100 text-cyan-600", btn: "bg-cyan-600 hover:bg-cyan-700" },
  gray: { bg: "bg-gray-50", border: "border-gray-200", icon: "bg-gray-100 text-gray-600", btn: "bg-gray-600 hover:bg-gray-700" },
};

const CONTRACT_LABELS = { FT: "Full Time", PT: "Part Time", TEMP: "Temporary", CONTRACT: "Contract", INTERNSHIP: "Internship", full_time: "Full Time", part_time: "Part Time", contract: "Contract", temporary: "Temporary", internship: "Internship" };

export default function StaffShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate, canDelete } = useResourcePermissions("staff");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => { fetchItem(); }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    const __cached = peekCache(`/hr/staff/show/${id}`);
    if (__cached) {
      setData(__cached?.data || __cached);
      setLoading(false);
    }
    try {
      const response = await get(`/hr/staff/show/${id}`);
      setData(response.data?.data || response.data);
    } catch {
      Swal.fire("Error", "Failed to load staff data", "error");
      navigate('/hr/staff');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({ title: 'Delete Staff?', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0d9488', cancelButtonColor: '#ef4444', confirmButtonText: 'Yes, delete' });
    if (result.isConfirmed) {
      try { await del(`/hr/staff/delete/${id}`); } catch {}
      Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
      navigate('/hr/staff');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-sm text-gray-400">Staff not found</p>
    </div>
  );

  const app = data.application;
  const name = app?.full_name || `Staff #${data.employee_id}`;
  const branchName = data.branch?.name || '—';
  const role = data.role_title_en || '—';
  const status = data.status || '';

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-5">
        <div className="max-w-full mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/hr/staff')}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="flex-1">
              <h1 className="text-sm font-bold text-white">Staff Details</h1>
              <p className="text-xs text-teal-100 mt-0.5">Viewing staff record</p>
            </div>
            <div className="flex gap-2">
              {canUpdate && (
                <button onClick={() => navigate(`/hr/staff/edit/${id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit
                </button>
              )}
              {canDelete && (
                <button onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-white text-xs font-semibold rounded-xl transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Profile banner */}
          <div className="flex items-center gap-4">
            {data.profile_photo ? (
              <img src={`${STORAGE_URL}/storage/${data.profile_photo}`} alt={name} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0">
                {name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-black text-white">{name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{data.employee_id}</span>
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{branchName}</span>
                <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full capitalize ${status === 'active' ? 'bg-white/30 text-white' : 'bg-red-400/30 text-white'}`}>
                  {status}
                </span>
                {data.current_leave && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-400 text-amber-900 text-[11px] font-bold rounded-full"
                    title={`On ${data.current_leave.leave_type} leave${data.current_leave.to_date ? ` until ${data.current_leave.to_date}` : ""}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    ON LEAVE
                    {data.current_leave.to_date && data.current_leave.to_date !== data.current_leave.from_date && (
                      <span className="font-medium opacity-80">· until {fmtDate(data.current_leave.to_date)}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* On-leave callout — only while the leave period is active */}
      {data.current_leave && (
        <div className="max-w-full mx-auto px-4 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-900 capitalize">
                Currently on {data.current_leave.leave_type} leave
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {fmtDate(data.current_leave.from_date)}
                {data.current_leave.to_date && data.current_leave.to_date !== data.current_leave.from_date
                  ? ` → ${fmtDate(data.current_leave.to_date)}` : ""}
                {data.current_leave.reason ? ` · ${data.current_leave.reason}` : ""}
              </p>
            </div>
            <button onClick={() => navigate(`/hr/leave-request/show/${data.current_leave.id}`)}
              className="px-3 py-1.5 text-[11px] font-semibold text-amber-700 bg-white border border-amber-200 rounded-lg hover:bg-amber-100 whitespace-nowrap">
              View request
            </button>
          </div>
        </div>
      )}

      <div className="max-w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Info Sections */}
          <div className="lg:col-span-2 space-y-4">

            {/* Personal Information — always show, mix app + staff data */}
            <Section title="Personal Information" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Full Name" value={app?.full_name || name} />
                <Field label="Email" value={app?.email} />
                <Field label="Phone" value={app?.contact_number} />
                <Field label="Date of Birth" value={fmtDate(app?.date_of_birth)} />
                <Field label="Address" value={app?.current_address} />
                <Field label="Place of Origin" value={app?.place_of_origin} />
                <Field label="Father's Name" value={data.father_name} />
                <Field label="Blood Type" value={data.blood_type} />
              </div>
            </Section>

            {/* Education & Experience (from application) */}
            {app && (
              <Section title="Education & Experience" icon="M12 14l9-5-9-5-9 5 9 5z">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Education Level" value={app.education_level} />
                  <Field label="Field of Study" value={app.field_of_study} />
                  <Field label="Institution" value={app.institution_name} />
                  <Field label="Experience" value={app.total_experience_years ? `${app.total_experience_years} years` : null} />
                  <Field label="Applied For" value={app.job_posting?.requisition?.position_title || app.job_posting?.title} />
                </div>
                {app.offer && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider mb-3">Accepted Offer</p>
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Salary" value={app.offer.salary_amount ? `${app.offer.salary_currency || 'AFN'} ${Number(app.offer.salary_amount).toLocaleString()}` : null} />
                      <Field label="Start Date" value={fmtDate(app.offer.start_date)} />
                      <Field label="Offer Status" value={app.offer.status} />
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Employment Details */}
            <Section title="Employment Details" icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Hire Date" value={data.created_at ? fmtDate(data.created_at) : '—'} />
                <Field label="Branch" value={branchName} />
                <Field label="Department" value={data.department || data.job_requisition?.department} />
                <Field label="Position Title" value={data.role_title_en?.replace(/_/g, ' ')} />
                <Field label="Contract Type" value={data.contract_type?.replace('_', ' ') || CONTRACT_LABELS[app?.job_posting?.requisition?.employment_type] || '—'} />
              </div>
            </Section>

            {/* Lifecycle letters — welcome on day one, experience on exit */}
            <LettersSection staffId={data.id} staffName={name} canEdit={canUpdate} />

            {/* Onboarding — welcome message sent, and quiz progress */}
            <OnboardingSection staffId={data.id} staffName={name} />

            {/* Documents */}
            <Section title="Documents" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
              {/* Application documents */}
              {app?.documents?.length > 0 ? (
                <div>
                  <p className="text-[10px] text-teal-500 font-semibold uppercase tracking-wider mb-3">Application Documents ({app.documents.length})</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {app.documents.map((doc, i) => {
                      const docType = DOCUMENT_TYPES[doc.document_type] || { label: doc.document_type, icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", color: "gray" };
                      const colors = DOC_COLORS[docType.color];
                      return (
                        <button key={i} onClick={() => setViewingDoc({ file_url: doc.file_url, label: docType.label, uploaded_at: doc.uploaded_at })}
                          className={`p-4 rounded-xl border ${colors.border} ${colors.bg} hover:shadow-md transition-all text-left`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center flex-shrink-0`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={docType.icon} />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800">{docType.label}</p>
                              <p className="text-[10px] text-gray-500 truncate mt-0.5">{doc.file_url?.split('/').pop()}</p>
                              {doc.uploaded_at && <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(doc.uploaded_at)}</p>}
                              <div className={`mt-2 w-full py-1.5 px-3 ${colors.btn} text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Document
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                  <p className="text-sm text-gray-400">No documents available</p>
                </div>
              )}
            </Section>

            {/* Attendance, Leave & Payroll — connects attendance stats, leave
                requests and the contract-driven salary deduction. */}
            <AttendancePayrollSection staffId={id} navigate={navigate} />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-teal-600 rounded-2xl p-5 text-white">
              <p className="text-[10px] font-semibold text-teal-200 uppercase tracking-wider mb-3">Summary</p>
              <div className="space-y-2.5">
                {[
                  ['Staff Code', data.employee_id],
                  ['Branch', branchName],
                  ['Department', data.department || data.job_requisition?.department || '—'],
                  ['Position', role],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between items-center">
                    <span className="text-[10px] text-teal-200">{l}</span>
                    <span className="text-[11px] font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Contact */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Contact</p>
              <div className="space-y-2.5">
                {(app?.contact_number) ? (
                  <a href={`tel:${app.contact_number}`} className="flex items-center gap-2.5 text-xs text-gray-700 hover:text-teal-600 transition-colors py-1">
                    <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    {app.contact_number}
                  </a>
                ) : (
                  <p className="text-xs text-gray-400 py-1">No phone available</p>
                )}
                {(app?.email) ? (
                  <a href={`mailto:${app.email}`} className="flex items-center gap-2.5 text-xs text-gray-700 hover:text-teal-600 transition-colors py-1">
                    <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="truncate">{app.email}</span>
                  </a>
                ) : (
                  <p className="text-xs text-gray-400 py-1">No email available</p>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Timeline</p>
              <div className="space-y-3">
                {[
                  { label: 'Hired', date: data.created_at ? fmtDate(data.created_at) : null },
                  { label: 'Record Created', date: data.created_at ? fmtDate(data.created_at) : null },
                  { label: 'Last Updated', date: data.updated_at ? fmtDate(data.updated_at) : null },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                    <div className="flex justify-between flex-1">
                      <span className="text-[10px] text-gray-500">{item.label}</span>
                      <span className="text-[10px] text-gray-700 font-medium">{item.date || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{viewingDoc.label}</h3>
                  {viewingDoc.uploaded_at && <p className="text-sm text-gray-500">Uploaded: {fmtDate(viewingDoc.uploaded_at)}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`${STORAGE_URL}/storage/${viewingDoc.file_url}`} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-all flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </a>
                <button onClick={() => setViewingDoc(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center">
              {viewingDoc.file_url?.toLowerCase().endsWith('.pdf') ? (
                <iframe src={`${STORAGE_URL}/storage/${viewingDoc.file_url}`}
                  className="w-full h-full min-h-[500px] rounded-lg bg-white" title="Document Preview" />
              ) : viewingDoc.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={`${STORAGE_URL}/storage/${viewingDoc.file_url}`}
                  alt="Document" className="max-w-full max-h-[70vh] rounded-lg shadow-lg" />
              ) : (
                <div className="text-center p-8">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">This file type cannot be previewed directly</p>
                  <a href={`${STORAGE_URL}/storage/${viewingDoc.file_url}`} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all">
                    Download / View File
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">File: {viewingDoc.file_url?.split('/').pop()}</p>
              <button onClick={() => setViewingDoc(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const money = (n, cur = "AFN") => `${Number(n || 0).toLocaleString()} ${cur}`;
const LEAVE_TONE = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

// Attendance statistics + leave requests + contract-driven salary deduction.
// Ties the attendance, leave and payroll subsystems together on the profile.
function AttendancePayrollSection({ staffId, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await get(`/hr/staff/${staffId}/attendance-summary`);
        if (alive) setData(res.data?.data || null);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [staffId]);

  return (
    <Section title="Attendance, Leave & Payroll" icon="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
      {loading ? (
        <div className="flex justify-center py-6"><div className="animate-spin h-6 w-6 border-4 border-teal-100 border-t-teal-600 rounded-full" /></div>
      ) : !data ? (
        <p className="text-sm text-gray-400 text-center py-4">No attendance/payroll data.</p>
      ) : (
        <div className="space-y-5">
          {/* Attendance stats */}
          <div>
            <p className="text-[10px] text-teal-500 font-semibold uppercase tracking-wider mb-2">Attendance (all recorded days)</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <MiniStat label="Present" value={data.attendance.present} tone="text-emerald-600" />
              <MiniStat label="Absent" value={data.attendance.absent} tone="text-red-600" />
              <MiniStat label="Late" value={data.attendance.late} tone="text-amber-600" />
              <MiniStat label="Leave" value={data.attendance.leave} tone="text-purple-600" />
              <MiniStat label="Rate" value={`${data.attendance.rate}%`} tone="text-teal-700" />
              <MiniStat label="This month" value={`${data.attendance.month_present}P / ${data.attendance.month_absent}A`} tone="text-gray-700" />
            </div>
          </div>

          {/* Salary deduction (contract-connected) */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">This month's salary deduction</span>
              {data.contract
                ? <span className="text-[11px] text-gray-500">Salary {money(data.contract.salary, data.contract.salary_currency)} · daily {money(data.payroll_deduction.daily_rate, data.contract.salary_currency)}</span>
                : <span className="text-[11px] text-amber-600">No active contract</span>}
            </div>
            <div className="p-4">
              {data.payroll_deduction.chargeable_days === 0 ? (
                <p className="text-xs text-emerald-700">
                  ✓ No deduction — {data.payroll_deduction.paid_leave_days}/{data.payroll_deduction.free_allowance} paid leaves used this month.
                </p>
              ) : (
                <>
                  <div className="space-y-1.5 mb-2">
                    {data.payroll_deduction.lines.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{l.label} <span className="text-gray-400">({l.days} day{l.days === 1 ? "" : "s"})</span></span>
                        <span className="font-semibold text-red-600">− {money(l.amount, data.contract?.salary_currency)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm">
                    <span className="font-bold text-gray-700">Total deduction</span>
                    <span className="font-bold text-red-600">− {money(data.payroll_deduction.deduction, data.contract?.salary_currency)}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">{data.payroll_deduction.reason}</p>
                </>
              )}
            </div>
          </div>

          {/* Leave requests */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-teal-500 font-semibold uppercase tracking-wider">
                Leave requests · {data.leaves.approved} approved · {data.leaves.pending} pending
              </p>
              <button onClick={() => navigate("/hr/leave-request")} className="text-[11px] text-teal-600 hover:underline">View all</button>
            </div>
            {data.leaves.recent.length === 0 ? (
              <p className="text-xs text-gray-400">No leave requests.</p>
            ) : (
              <div className="space-y-1.5">
                {data.leaves.recent.slice(0, 5).map((l) => (
                  <button key={l.id} onClick={() => navigate(`/hr/leave-request/show/${l.id}`)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 text-left">
                    <span className="text-xs text-gray-700 capitalize">{l.leave_type} · {fmtDate(l.from_date)}{l.to_date && l.to_date !== l.from_date ? ` → ${fmtDate(l.to_date)}` : ""}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-400">{l.total_days}d</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${LEAVE_TONE[l.status] || "bg-gray-100 text-gray-600"}`}>{l.status}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}

function MiniStat({ label, value, tone = "text-gray-800" }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 px-2 py-2 text-center">
      <div className={`text-base font-bold ${tone}`}>{value}</div>
      <div className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

/**
 * Onboarding on the staff record: the welcome message HR sent (name,
 * languages, when) and how far this person has got with the quiz.
 *
 * The section is what turns the quiz from "a link we emailed" into something
 * HR can actually follow up — a failed attempt shows which section was missed.
 */
function OnboardingSection({ staffId, staffName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);

  // No synchronous setState here: `loading` starts true and is only cleared
  // once the request settles, which keeps this callable straight from an
  // effect without triggering a cascading render.
  const load = useCallback(() => {
    getStaffOnboarding(staffId)
      .then((r) => setData(r.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [staffId]);

  useEffect(() => {
    load();
  }, [load]);

  const quiz = data?.quiz;
  const messages = data?.messages || [];
  const last = messages[0];

  return (
    <Section title="Onboarding" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">
      <div className="space-y-2.5">
        {/* Welcome message */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-teal-200 bg-teal-50">
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Welcome message</p>
            <p className="text-[10px] text-gray-500 truncate">
              {last
                ? `Sent ${fmtDate(last.sent_at || last.created_at)} · ${(last.languages || []).join(', ')}`
                : 'Not sent yet'}
            </p>
          </div>
          <button
            onClick={() => setCompose(true)}
            className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors flex-shrink-0"
          >
            {last ? 'Re-send' : 'Send'}
          </button>
        </div>

        {/* Quiz */}
        <div className={`p-3.5 rounded-xl border ${
          quiz?.passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              quiz?.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Onboarding quiz</p>
              <p className="text-[10px] text-gray-500">
                {loading
                  ? 'Loading…'
                  : !quiz || quiz.attempts === 0
                  ? 'Not attempted yet'
                  : `${quiz.attempts} attempt${quiz.attempts === 1 ? '' : 's'} · best ${quiz.best_percent}% · pass mark ${quiz.pass_mark}%`}
              </p>
            </div>
            {quiz && (
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0 ${
                quiz.passed
                  ? 'bg-emerald-100 text-emerald-700'
                  : quiz.attempts === 0
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {quiz.passed ? 'Passed' : quiz.attempts === 0 ? 'Pending' : 'Not passed'}
              </span>
            )}
          </div>

          {/* Where the gap is, from the most recent sitting. */}
          {quiz?.history?.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(quiz.history[quiz.history.length - 1].section_scores || []).map((sec) => (
                <span key={sec.key} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  sec.percent === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-amber-700 border border-amber-200'
                }`}>
                  {sec.title} {sec.score}/{sec.total}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {compose && (
        <OnboardingWelcomeModal
          staffId={staffId}
          initialName={staffName}
          onClose={() => setCompose(false)}
          onSent={load}
        />
      )}
    </Section>
  );
}

/**
 * Lifecycle letters on the staff record.
 *
 * The welcome letter is always present (it is rendered on demand from fixed
 * text, so there is no blank state). Experience letters only appear once the
 * person has actually left and one has been raised.
 */
function LettersSection({ staffId, staffName, canEdit }) {
  const [letters, setLetters] = useState([]);
  const [openWelcome, setOpenWelcome] = useState(false);
  const [openLetter, setOpenLetter] = useState(null);

  const load = useCallback(() => {
    get(`/hr/staff/${staffId}/letters`, { cache: false })
      .then((r) => setLetters(r.data?.data || []))
      .catch(() => setLetters([]));
  }, [staffId]);

  useEffect(() => {
    load();
  }, [load]);

  const experience = letters.filter((l) => l.type === 'experience');

  return (
    <Section title="Letters" icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
      <div className="space-y-2.5">
        <button onClick={() => setOpenWelcome(true)}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-teal-200 bg-teal-50 hover:shadow-md transition-all text-left">
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Welcome Letter</p>
            <p className="text-[10px] text-gray-500">Day one · English · دری · پښتو</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">Final</span>
        </button>

        {experience.map((l) => (
          <button key={l.id} onClick={() => setOpenLetter(l)}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-purple-200 bg-purple-50 hover:shadow-md transition-all text-left">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Experience Letter</p>
              <p className="text-[10px] text-gray-500 truncate">
                {l.start_date || '—'} → {l.end_date || '—'}
                {l.tenure_label ? ` · ${l.tenure_label}` : ''}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
              l.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>{l.status}</span>
          </button>
        ))}

        {experience.length === 0 && (
          <p className="text-[11px] text-gray-400 px-1">
            The experience letter is raised automatically when this person&apos;s contract ends or their status is set to terminated.
          </p>
        )}
      </div>

      {openWelcome && (
        <WelcomeLetterModal staffId={staffId} staffName={staffName} onClose={() => setOpenWelcome(false)} />
      )}
      {openLetter && (
        <ExperienceLetterModal
          letterId={openLetter.id}
          staffName={staffName}
          canEdit={canEdit}
          onClose={() => setOpenLetter(null)}
          onSaved={load}
        />
      )}
    </Section>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-800 capitalize">{value || '—'}</p>
    </div>
  );
}
