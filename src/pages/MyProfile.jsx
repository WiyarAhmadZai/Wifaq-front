import { useNavigate } from "react-router-dom";

const CONTRACT_LABELS = { FT: "Full Time", PT: "Part Time", TEMP: "Temporary" };

const PROFILE = {
  staff_code: "WS-2026-001",
  full_name_en: "Ahmad Rahimi",
  full_name_dari: "احمد رحیمی",
  father_name: "Mohammad Rahimi",
  date_of_birth: "1990-05-15",
  national_id: "1401-0123-45678",
  blood_type: "A+",
  phone: "0770123456",
  whatsapp: "0770123456",
  email: "ahmad.rahimi@wifaqschool.com",
  address: "Kabul, District 4, Street 12, House 45",
  emergency_contact_name: "Ali Rahimi",
  emergency_contact_phone: "0790111222",
  entity: "WS",
  department: "Academic",
  role_title_en: "Senior Teacher",
  role_title_dari: "استاد ارشد",
  hire_date: "2024-03-15",
  contract_type: "FT",
  status: "active",
  probation_end_date: "",
  direct_supervisor: "Mohammad Karimi",
  rank_level: "Level 5",
  base_salary: 25000,
  housing_allowance: 3000,
  transport_allowance: 2000,
  family_allowance: 2000,
  documents: { cv: "ahmad_cv.pdf", tazkira: "ahmad_tazkira.pdf", certificates: "ahmad_certificates.pdf", contract: "ahmad_contract.pdf" },
  created_at: "2024-03-15T10:30:00Z",
  updated_at: "2025-12-01T14:20:00Z",
};

export default function MyProfile() {
  const navigate = useNavigate();
  const d = PROFILE;
  const total = (d.base_salary || 0) + (d.housing_allowance || 0) + (d.transport_allowance || 0) + (d.family_allowance || 0);

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => navigate(-1)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="text-sm font-bold text-white">My Profile</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
              {d.full_name_en.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">{d.full_name_en}</h2>
                <span className="text-sm text-teal-100" dir="rtl">{d.full_name_dari}</span>
              </div>
              <p className="text-xs text-teal-100 mt-0.5">{d.role_title_en} · {d.department}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{d.staff_code}</span>
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{d.entity}</span>
                <span className="px-2.5 py-0.5 bg-white/30 text-white text-[11px] font-semibold rounded-full capitalize">{d.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Info sections */}
          <div className="lg:col-span-2 space-y-4">
            {/* Personal */}
            <Section title="Personal Information" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Full Name (EN)" value={d.full_name_en} />
                <Field label="Full Name (Dari)" value={d.full_name_dari} />
                <Field label="Father's Name" value={d.father_name} />
                <Field label="Date of Birth" value={d.date_of_birth} />
                <Field label="National ID / Tazkira" value={d.national_id} />
                <Field label="Blood Type" value={d.blood_type} />
              </div>
            </Section>

            {/* Contact */}
            <Section title="Contact Information" icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Phone" value={d.phone} />
                <Field label="WhatsApp" value={d.whatsapp} />
                <Field label="Email" value={d.email} />
              </div>
              <div className="mt-4">
                <Field label="Address" value={d.address} />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-3">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Name" value={d.emergency_contact_name} />
                  <Field label="Phone" value={d.emergency_contact_phone} />
                </div>
              </div>
            </Section>

            {/* Employment */}
            <Section title="Employment Details" icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Staff Code" value={d.staff_code} />
                <Field label="Entity" value={d.entity} />
                <Field label="Department" value={d.department} />
                <Field label="Role Title (EN)" value={d.role_title_en} />
                <Field label="Role Title (Dari)" value={d.role_title_dari} />
                <Field label="Hire Date" value={d.hire_date} />
                <Field label="Contract Type" value={CONTRACT_LABELS[d.contract_type] || d.contract_type} />
                <Field label="Status" value={d.status} />
                <Field label="Supervisor" value={d.direct_supervisor} />
                {d.probation_end_date && <Field label="Probation End" value={d.probation_end_date} />}
              </div>
            </Section>

            {/* Salary */}
            <Section title="Salary Information" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Rank Level" value={d.rank_level} />
                <Field label="Base Salary" value={`AFN ${d.base_salary.toLocaleString()}`} />
              </div>
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Base", value: d.base_salary, prefix: "" },
                    { label: "Housing", value: d.housing_allowance, prefix: "+" },
                    { label: "Transport", value: d.transport_allowance, prefix: "+" },
                    { label: "Family", value: d.family_allowance, prefix: "+" },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg p-3 text-center border border-teal-100">
                      <p className="text-[8px] font-bold text-teal-600 uppercase">{s.label}</p>
                      <p className="text-xs font-bold text-gray-800">{s.prefix}{(s.value || 0).toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="bg-teal-600 rounded-lg p-3 text-center">
                    <p className="text-[8px] font-bold text-teal-100 uppercase">Total</p>
                    <p className="text-xs font-bold text-white">{total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </Section>

            {/* Documents */}
            <Section title="Documents" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "CV", file: d.documents?.cv },
                  { label: "Tazkira / National ID", file: d.documents?.tazkira },
                  { label: "Certificates", file: d.documents?.certificates },
                  { label: "Signed Contract", file: d.documents?.contract },
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
            </Section>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-teal-600 rounded-2xl p-5 text-white">
              <p className="text-[10px] font-semibold text-teal-200 uppercase tracking-wider mb-3">Summary</p>
              <div className="space-y-2.5">
                {[
                  ["Staff Code", d.staff_code],
                  ["Entity", d.entity],
                  ["Department", d.department],
                  ["Contract", CONTRACT_LABELS[d.contract_type] || d.contract_type],
                  ["Rank", d.rank_level],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between items-center">
                    <span className="text-[10px] text-teal-200">{l}</span>
                    <span className="text-[11px] font-semibold">{v}</span>
                  </div>
                ))}
                <div className="border-t border-teal-500/50 pt-2.5 mt-2.5 flex justify-between items-center">
                  <span className="text-[10px] text-teal-200">Total Salary</span>
                  <span className="text-sm font-bold">{total.toLocaleString()} AFN</span>
                </div>
              </div>
            </div>

            {/* Quick Contact */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Contact</p>
              <div className="space-y-2.5">
                {d.phone && (
                  <a href={`tel:${d.phone}`} className="flex items-center gap-2.5 text-xs text-gray-700 hover:text-teal-600 transition-colors py-1">
                    <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    {d.phone}
                  </a>
                )}
                {d.whatsapp && (
                  <div className="flex items-center gap-2.5 text-xs text-gray-700 py-1">
                    <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    {d.whatsapp}
                  </div>
                )}
                {d.email && (
                  <a href={`mailto:${d.email}`} className="flex items-center gap-2.5 text-xs text-gray-700 hover:text-teal-600 transition-colors py-1">
                    <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="truncate">{d.email}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Timeline</p>
              <div className="space-y-3">
                {[
                  { label: "Hired", date: d.hire_date },
                  { label: "Record Created", date: d.created_at ? new Date(d.created_at).toLocaleDateString() : null },
                  { label: "Last Updated", date: d.updated_at ? new Date(d.updated_at).toLocaleDateString() : null },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                    <div className="flex justify-between flex-1">
                      <span className="text-[10px] text-gray-500">{item.label}</span>
                      <span className="text-[10px] text-gray-700 font-medium">{item.date || "—"}</span>
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
      <p className="text-sm font-semibold text-gray-800 capitalize">{value || "—"}</p>
    </div>
  );
}
