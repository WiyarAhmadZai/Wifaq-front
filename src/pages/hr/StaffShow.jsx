import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, del, API_BASE_URL as _API } from '../../api/axios';
const STORAGE_URL = _API.replace(/\/api\/?$/, '');
import Swal from 'sweetalert2';

const DOCUMENT_TYPES = { cv_resume: "CV/Resume", identity_document: "Identity Document", educational_document: "Educational Document", work_samples: "Work Samples" };

const CONTRACT_LABELS = { FT: "Full Time", PT: "Part Time", TEMP: "Temporary", CONTRACT: "Contract", INTERNSHIP: "Internship", full_time: "Full Time", part_time: "Part Time", contract: "Contract", temporary: "Temporary", internship: "Internship" };

export default function StaffShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchItem(); }, [id]);

  const fetchItem = async () => {
    setLoading(true);
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
              <button onClick={() => navigate(`/hr/staff/edit/${id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </button>
              <button onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-white text-xs font-semibold rounded-xl transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
            </div>
          </div>

          {/* Profile banner */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0 overflow-hidden">
              {data.profile_photo ? (
                <img src={`${API_BASE_URL}/storage/${data.profile_photo}`} alt={name} className="w-full h-full object-cover" />
              ) : name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-white">{name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{data.employee_id}</span>
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{branchName}</span>
                <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full capitalize ${status === 'active' ? 'bg-white/30 text-white' : status === 'probation' ? 'bg-amber-300/30 text-white' : 'bg-red-400/30 text-white'}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                <Field label="Date of Birth" value={app?.date_of_birth?.split('T')[0]} />
                <Field label="Address" value={app?.current_address} />
                <Field label="Place of Origin" value={app?.place_of_origin} />
                <Field label="Father's Name" value={data.father_name} />
                <Field label="Blood Type" value={data.blood_type} />
              </div>
              {(data.emergency_contact_name || data.emergency_contact_phone) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Name" value={data.emergency_contact_name} />
                    <Field label="Phone" value={data.emergency_contact_phone} />
                  </div>
                </div>
              )}
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
                      <Field label="Start Date" value={app.offer.start_date?.split('T')[0]} />
                      <Field label="Offer Status" value={app.offer.status} />
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Employment Details */}
            <Section title="Employment Details" icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Hire Date" value={data.created_at ? new Date(data.created_at).toLocaleDateString() : '—'} />
                <Field label="Branch" value={branchName} />
                <Field label="Department" value={data.department} />
                <Field label="Position Title" value={role} />
                <Field label="Contract Type" value={CONTRACT_LABELS[app?.job_posting?.requisition?.employment_type] || app?.job_posting?.requisition?.employment_type || '—'} />
                {data.has_probation && <Field label="Probation End" value={data.probation_end_date?.split('T')[0]} />}
              </div>
            </Section>

            {/* Documents */}
            <Section title="Documents" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
              {/* Staff documents */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Tazkira / National ID", file: data.tazkira_scan },
                  { label: "Signed Contract", file: data.signed_contract },
                ].map((doc, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${doc.file ? 'bg-teal-50/50 border-teal-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.file ? 'bg-teal-100 text-teal-600' : 'bg-gray-200 text-gray-400'}`}>
                      {doc.file ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{doc.label}</p>
                      {doc.file && <p className="text-[10px] text-teal-600 truncate">{doc.file}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Application documents */}
              {app?.documents?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[10px] text-teal-500 font-semibold uppercase tracking-wider mb-3">Application Documents</p>
                  <div className="grid grid-cols-2 gap-3">
                    {app.documents.map((doc, i) => (
                      <a key={i} href={`${API_BASE_URL}/storage/${doc.file_url}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-teal-50/50 border-teal-200 hover:bg-teal-100/50 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700">{DOCUMENT_TYPES[doc.document_type] || doc.document_type}</p>
                          <p className="text-[10px] text-teal-600 truncate">{doc.file_url?.split('/').pop()}</p>
                        </div>
                        <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-teal-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Section>
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
                  ['Department', data.department || '—'],
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
                  { label: 'Hired', date: data.created_at ? new Date(data.created_at).toLocaleDateString() : null },
                  { label: 'Record Created', date: data.created_at ? new Date(data.created_at).toLocaleDateString() : null },
                  { label: 'Last Updated', date: data.updated_at ? new Date(data.updated_at).toLocaleDateString() : null },
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
    </div>
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
