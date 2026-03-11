import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';

const DEPT = { hr: "Human Resources", finance: "Finance", academic: "Academic", admin: "Administration", it: "IT", operations: "Operations" };

const getStatusBadge = (status) => {
  const s = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', probation: 'bg-amber-50 text-amber-700 border-amber-200', inactive: 'bg-gray-100 text-gray-600 border-gray-200', suspended: 'bg-red-50 text-red-700 border-red-200', terminated: 'bg-red-50 text-red-700 border-red-200' };
  return s[status] || 'bg-gray-100 text-gray-600 border-gray-200';
};
const getOrgBadge = (org) => {
  const s = { WS: 'bg-teal-50 text-teal-700 border-teal-200', WLS: 'bg-blue-50 text-blue-700 border-blue-200', WISAL: 'bg-purple-50 text-purple-700 border-purple-200' };
  return s[org] || 'bg-gray-100 text-gray-600 border-gray-200';
};

const Field = ({ label, value, full }) => (
  <div className={full ? 'sm:col-span-2 lg:col-span-3' : ''}>
    <p className="text-[10px] text-gray-400 font-medium mb-0.5">{label}</p>
    <p className="text-xs text-gray-800">{value || '-'}</p>
  </div>
);

const DEMO_DATA = {
  1: { id: 1, staff_code: "WS-2026-001", full_name_en: "Ahmad Rahimi", full_name_dari: "احمد رحیمی", father_name: "Mohammad Rahimi", date_of_birth: "1990-05-15", national_id: "1401-0123-45678", blood_type: "A+", phone: "0770123456", whatsapp: "0770123456", email: "ahmad.rahimi@wifaqschool.com", home_address: "Kabul, District 4, Street 12, House 45", emergency_contact_name: "Ali Rahimi", emergency_contact_phone: "0790111222", hire_date: "2024-03-15", organization: "WS", department: "academic", job_title_en: "Senior Teacher", job_title_dari: "استاد ارشد", contract_type: "A", employment_status: "active", direct_supervisor: "Mohammad Karimi", rank_level: "5", base_salary: 25000, housing_allowance: 3000, transport_allowance: 2000, family_allowance: 2000, total_salary: 32000, documents: { cv: "ahmad_cv.pdf", tazkira: "ahmad_tazkira.pdf", certificates: "ahmad_certificates.pdf", contract: "ahmad_contract.pdf" }, created_at: "2024-03-15T10:30:00Z", updated_at: "2025-12-01T14:20:00Z" },
  2: { id: 2, staff_code: "WS-2026-002", full_name_en: "Mohammad Karimi", full_name_dari: "محمد کریمی", father_name: "Hassan Karimi", date_of_birth: "1988-11-20", national_id: "1401-0456-78901", blood_type: "B+", phone: "0790234567", whatsapp: "0790234567", email: "mohammad.karimi@wifaqschool.com", home_address: "Kabul, District 7, Street 3, House 12", emergency_contact_name: "Yousuf Karimi", emergency_contact_phone: "0780222333", hire_date: "2024-06-01", organization: "WLS", department: "finance", job_title_en: "Accountant", job_title_dari: "حسابدار", contract_type: "B", employment_status: "active", direct_supervisor: null, rank_level: "4", base_salary: 20000, housing_allowance: 2500, transport_allowance: 1500, family_allowance: 2000, total_salary: 26000, documents: { cv: "karimi_cv.pdf", tazkira: "karimi_tazkira.pdf", certificates: "karimi_certs.pdf", contract: null }, created_at: "2024-06-01T09:00:00Z", updated_at: "2025-11-15T16:45:00Z" },
};

export default function StaffShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  useEffect(() => { fetchItem(); }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/staff/show/${id}`);
      setData(response.data);
      setUseDemo(false);
    } catch {
      const d = DEMO_DATA[id] || { ...DEMO_DATA[1], id: parseInt(id), staff_code: `WS-2026-${String(id).padStart(3, '0')}` };
      setData(d);
      setUseDemo(true);
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({ title: 'Are you sure?', text: 'This action cannot be undone', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, delete' });
    if (result.isConfirmed) {
      if (useDemo) { Swal.fire('Deleted', 'Staff deleted', 'success'); navigate('/hr/staff'); return; }
      try { await del(`/hr/staff/delete/${id}`); Swal.fire('Deleted', 'Staff deleted', 'success'); navigate('/hr/staff'); } catch { Swal.fire('Error', 'Failed to delete', 'error'); }
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-100 border-t-teal-600"></div>
    </div>
  );

  if (!data) return (
    <div className="text-center py-12">
      <p className="text-gray-500 text-sm">Staff not found</p>
      <button onClick={() => navigate('/hr/staff')} className="mt-3 px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs hover:bg-teal-700">Back</button>
    </div>
  );

  const totalSalary = (parseFloat(data.base_salary) || 0) + (parseFloat(data.housing_allowance) || 0) + (parseFloat(data.transport_allowance) || 0) + (parseFloat(data.family_allowance) || 0);

  return (
    <div className="px-4 py-3 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate('/hr/staff')} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h2 className="text-sm font-bold text-gray-800">Staff Details</h2>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => navigate(`/hr/staff/edit/${id}`)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </button>
          <button onClick={handleDelete} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete
          </button>
        </div>
      </div>

      {/* Profile Banner */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 text-base font-bold flex-shrink-0">
            {(data.full_name_en || data.full_name || '?').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-800">{data.full_name_en || data.full_name}</h3>
              {data.full_name_dari && <span className="text-xs text-gray-400" dir="rtl">{data.full_name_dari}</span>}
            </div>
            <p className="text-[11px] text-gray-500">{data.job_title_en || 'No designation'} · {data.staff_code || data.employee_id}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getStatusBadge(data.employment_status || data.status)}`}>
              {(data.employment_status || data.status || '').replace('_', ' ')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getOrgBadge(data.organization)}`}>
              {data.organization}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: All Info Sections */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal */}
          <Section title="Personal Information" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
              <Field label="Father's Name" value={data.father_name} />
              <Field label="Date of Birth" value={data.date_of_birth} />
              <Field label="National ID / Tazkira" value={data.national_id} />
              <Field label="Blood Type" value={data.blood_type} />
            </div>
          </Section>

          {/* Contact */}
          <Section title="Contact Information" icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
              <Field label="Phone" value={data.phone} />
              <Field label="WhatsApp" value={data.whatsapp} />
              <Field label="Email" value={data.email} />
              <Field label="Address" value={data.home_address} full />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-2">Emergency Contact</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Name" value={data.emergency_contact_name} />
                <Field label="Phone" value={data.emergency_contact_phone} />
              </div>
            </div>
          </Section>

          {/* Employment */}
          <Section title="Employment Details" icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
              <Field label="Hire Date" value={data.hire_date} />
              <Field label="Organization" value={data.organization} />
              <Field label="Department" value={DEPT[data.department] || data.department} />
              <Field label="Job Title (EN)" value={data.job_title_en} />
              <Field label="Job Title (Dari)" value={data.job_title_dari} />
              <Field label="Contract Type" value={data.contract_type ? `Type ${data.contract_type}` : null} />
              <Field label="Supervisor" value={data.direct_supervisor} />
              {data.probation_end_date && <Field label="Probation End" value={data.probation_end_date} />}
            </div>
          </Section>

          {/* Salary */}
          <Section title="Salary Information" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
              <Field label="Rank Level" value={data.rank_level ? `Level ${data.rank_level}` : null} />
              <Field label="Base Salary" value={data.base_salary ? `AFN ${parseFloat(data.base_salary).toLocaleString()}` : null} />
            </div>
            {/* Breakdown */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="grid grid-cols-5 gap-2">
                <SalaryItem label="Base" value={parseFloat(data.base_salary) || 0} color="text-gray-800" />
                <SalaryItem label="Housing" value={parseFloat(data.housing_allowance) || 0} prefix="+" color="text-blue-600" />
                <SalaryItem label="Transport" value={parseFloat(data.transport_allowance) || 0} prefix="+" color="text-purple-600" />
                <SalaryItem label="Family" value={parseFloat(data.family_allowance) || 0} prefix="+" color="text-amber-600" />
                <div className="bg-teal-600 rounded-md p-2 text-center">
                  <p className="text-[8px] font-bold text-teal-100 uppercase">Total</p>
                  <p className="text-xs font-bold text-white">{totalSalary.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Documents */}
          <Section title="Documents" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "CV", file: data.documents?.cv },
                { label: "Tazkira / National ID", file: data.documents?.tazkira },
                { label: "Certificates", file: data.documents?.certificates },
                { label: "Signed Contract", file: data.documents?.contract },
              ].map((doc, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${doc.file ? 'bg-teal-50/50 border-teal-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${doc.file ? 'bg-teal-100 text-teal-600' : 'bg-gray-200 text-gray-400'}`}>
                    {doc.file ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">{doc.label}</p>
                    {doc.file && <p className="text-[10px] text-teal-600 truncate">{doc.file}</p>}
                  </div>
                  {doc.file && (
                    <button className="text-[10px] font-medium text-teal-600 hover:text-teal-700 flex-shrink-0">View</button>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 text-white">
            <p className="text-[10px] font-semibold text-teal-200 uppercase tracking-wider mb-3">Summary</p>
            <div className="space-y-2">
              {[
                ['Staff Code', data.staff_code || data.employee_id],
                ['Organization', data.organization],
                ['Contract', `Type ${data.contract_type || '-'}`],
                ['Rank', `Level ${data.rank_level || '-'}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between items-center">
                  <span className="text-[10px] text-teal-200">{l}</span>
                  <span className="text-[11px] font-semibold">{v}</span>
                </div>
              ))}
              <div className="border-t border-teal-500/50 pt-2 mt-2 flex justify-between items-center">
                <span className="text-[10px] text-teal-200">Total Salary</span>
                <span className="text-sm font-bold">{totalSalary.toLocaleString()} AFN</span>
              </div>
            </div>
          </div>

          {/* Quick Contact */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Contact</p>
            <div className="space-y-2">
              {data.phone && (
                <a href={`tel:${data.phone}`} className="flex items-center gap-2 text-xs text-gray-700 hover:text-teal-600 transition-colors py-1">
                  <div className="w-6 h-6 bg-teal-50 rounded-md flex items-center justify-center text-teal-600 flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  {data.phone}
                </a>
              )}
              {data.whatsapp && (
                <div className="flex items-center gap-2 text-xs text-gray-700 py-1">
                  <div className="w-6 h-6 bg-green-50 rounded-md flex items-center justify-center text-green-600 flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  {data.whatsapp}
                </div>
              )}
              {data.email && (
                <a href={`mailto:${data.email}`} className="flex items-center gap-2 text-xs text-gray-700 hover:text-teal-600 transition-colors py-1">
                  <div className="w-6 h-6 bg-blue-50 rounded-md flex items-center justify-center text-blue-600 flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <span className="truncate">{data.email}</span>
                </a>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Timeline</p>
            <div className="space-y-3">
              {[
                { label: 'Hired', date: data.hire_date, color: 'bg-teal-500' },
                { label: 'Record Created', date: data.created_at ? new Date(data.created_at).toLocaleDateString() : null, color: 'bg-blue-400' },
                { label: 'Last Updated', date: data.updated_at ? new Date(data.updated_at).toLocaleDateString() : null, color: 'bg-gray-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.color}`}></div>
                  <div className="flex justify-between flex-1">
                    <span className="text-[10px] text-gray-500">{item.label}</span>
                    <span className="text-[10px] text-gray-700 font-medium">{item.date || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
        <h3 className="text-xs font-bold text-gray-800">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function SalaryItem({ label, value, prefix = '', color }) {
  return (
    <div className="bg-white rounded-md p-2 text-center border border-gray-100">
      <p className="text-[8px] font-bold text-gray-400 uppercase">{label}</p>
      <p className={`text-xs font-bold ${color}`}>{prefix}{value.toLocaleString()}</p>
    </div>
  );
}
