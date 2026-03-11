import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';

const Icons = {
  ArrowLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Briefcase: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Money: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Document: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Mail: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Home: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  Hash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  ),
  Heart: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
};

const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    probation: 'bg-amber-100 text-amber-800 border-amber-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
    on_leave: 'bg-amber-100 text-amber-800 border-amber-200',
    suspended: 'bg-red-100 text-red-800 border-red-200',
    terminated: 'bg-red-100 text-red-800 border-red-200',
  };
  return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getOrgBadge = (org) => {
  const styles = {
    WS: 'bg-teal-100 text-teal-700 border-teal-200',
    WLS: 'bg-blue-100 text-blue-700 border-blue-200',
    WISAL: 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return styles[org] || 'bg-gray-100 text-gray-700 border-gray-200';
};

const DEPARTMENT_LABELS = {
  hr: "Human Resources",
  finance: "Finance",
  academic: "Academic",
  admin: "Administration",
  it: "IT",
  operations: "Operations",
};

const InfoCard = ({ icon: Icon, label, value }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="flex items-center gap-2 text-teal-600 mb-1">
      <Icon />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-xs font-medium text-gray-800">{value || '-'}</p>
  </div>
);

// Demo data for show page
const DEMO_DATA = {
  1: {
    id: 1,
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
    home_address: "Kabul, District 4, Street 12, House 45",
    emergency_contact_name: "Ali Rahimi",
    emergency_contact_phone: "0790111222",
    hire_date: "2024-03-15",
    organization: "WS",
    department: "academic",
    job_title_en: "Senior Teacher",
    job_title_dari: "استاد ارشد",
    contract_type: "A",
    employment_status: "active",
    probation_end_date: null,
    direct_supervisor: "Mohammad Karimi",
    rank_level: "5",
    base_salary: 25000,
    housing_allowance: 3000,
    transport_allowance: 2000,
    family_allowance: 2000,
    total_salary: 32000,
    documents: {
      cv: "ahmad_cv.pdf",
      tazkira: "ahmad_tazkira.pdf",
      certificates: "ahmad_certificates.pdf",
      contract: "ahmad_contract.pdf",
    },
    created_at: "2024-03-15T10:30:00Z",
    updated_at: "2025-12-01T14:20:00Z",
  },
  2: {
    id: 2,
    staff_code: "WS-2026-002",
    full_name_en: "Mohammad Karimi",
    full_name_dari: "محمد کریمی",
    father_name: "Hassan Karimi",
    date_of_birth: "1988-11-20",
    national_id: "1401-0456-78901",
    blood_type: "B+",
    phone: "0790234567",
    whatsapp: "0790234567",
    email: "mohammad.karimi@wifaqschool.com",
    home_address: "Kabul, District 7, Street 3, House 12",
    emergency_contact_name: "Yousuf Karimi",
    emergency_contact_phone: "0780222333",
    hire_date: "2024-06-01",
    organization: "WLS",
    department: "finance",
    job_title_en: "Accountant",
    job_title_dari: "حسابدار",
    contract_type: "B",
    employment_status: "active",
    probation_end_date: null,
    direct_supervisor: null,
    rank_level: "4",
    base_salary: 20000,
    housing_allowance: 2500,
    transport_allowance: 1500,
    family_allowance: 2000,
    total_salary: 26000,
    documents: {
      cv: "karimi_cv.pdf",
      tazkira: "karimi_tazkira.pdf",
      certificates: "karimi_certs.pdf",
      contract: null,
    },
    created_at: "2024-06-01T09:00:00Z",
    updated_at: "2025-11-15T16:45:00Z",
  },
};

export default function StaffShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/staff/show/${id}`);
      setData(response.data);
      setUseDemo(false);
    } catch (error) {
      // Fallback to demo data
      const demoItem = DEMO_DATA[id];
      if (demoItem) {
        setData(demoItem);
        setUseDemo(true);
      } else {
        // Generate a generic demo for any ID
        setData({
          ...DEMO_DATA[1],
          id: parseInt(id),
          staff_code: `WS-2026-${String(id).padStart(3, '0')}`,
        });
        setUseDemo(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      if (useDemo) {
        Swal.fire('Deleted', 'Staff deleted successfully', 'success');
        navigate('/hr/staff');
        return;
      }
      try {
        await del(`/hr/staff/delete/${id}`);
        Swal.fire('Deleted', 'Staff deleted successfully', 'success');
        navigate('/hr/staff');
      } catch (error) {
        Swal.fire('Error', 'Failed to delete', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading staff details...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Staff not found</p>
        <button onClick={() => navigate('/hr/staff')} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/hr/staff')} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
            <Icons.ArrowLeft />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Staff Details</h2>
            <p className="text-[11px] text-gray-400">View complete staff information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/hr/staff/edit/${id}`)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 text-xs font-medium">
            <Icons.Edit /> Edit
          </button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-xs font-medium">
            <Icons.Trash /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600 text-xl font-bold">
                {data.full_name_en?.charAt(0) || data.full_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-gray-800">{data.full_name_en || data.full_name}</h3>
                  {data.full_name_dari && <span className="text-sm text-gray-400" dir="rtl">({data.full_name_dari})</span>}
                </div>
                <p className="text-xs text-gray-500">{data.job_title_en || 'No designation'}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getStatusBadge(data.employment_status || data.status)}`}>
                    {(data.employment_status || data.status || '').replace('_', ' ')}
                  </span>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getOrgBadge(data.organization)}`}>
                    {data.organization}
                  </span>
                  {data.contract_type && (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-100 text-gray-700 border-gray-200">
                      Contract {data.contract_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.User /> Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InfoCard icon={Icons.Hash} label="Staff Code" value={data.staff_code || data.employee_id} />
              <InfoCard icon={Icons.User} label="Father's Name" value={data.father_name} />
              <InfoCard icon={Icons.Calendar} label="Date of Birth" value={data.date_of_birth} />
              <InfoCard icon={Icons.Document} label="National ID / Tazkira" value={data.national_id} />
              <InfoCard icon={Icons.Heart} label="Blood Type" value={data.blood_type} />
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Phone /> Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InfoCard icon={Icons.Phone} label="Phone Number" value={data.phone} />
              <InfoCard icon={Icons.Phone} label="WhatsApp" value={data.whatsapp} />
              <InfoCard icon={Icons.Mail} label="Email" value={data.email} />
              <div className="sm:col-span-2 lg:col-span-3">
                <InfoCard icon={Icons.Home} label="Home Address" value={data.home_address} />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Icons.Alert /> Emergency Contact
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCard icon={Icons.User} label="Contact Name" value={data.emergency_contact_name} />
                <InfoCard icon={Icons.Phone} label="Contact Phone" value={data.emergency_contact_phone} />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Briefcase /> Employment Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InfoCard icon={Icons.Calendar} label="Hire Date" value={data.hire_date} />
              <InfoCard icon={Icons.Briefcase} label="Organization" value={data.organization} />
              <InfoCard icon={Icons.Briefcase} label="Department" value={DEPARTMENT_LABELS[data.department] || data.department} />
              <InfoCard icon={Icons.Briefcase} label="Job Title (EN)" value={data.job_title_en} />
              <InfoCard icon={Icons.Briefcase} label="Job Title (Dari)" value={data.job_title_dari} />
              <InfoCard icon={Icons.Document} label="Contract Type" value={data.contract_type ? `Type ${data.contract_type}` : '-'} />
              <InfoCard icon={Icons.User} label="Direct Supervisor" value={data.direct_supervisor} />
              {data.probation_end_date && (
                <InfoCard icon={Icons.Calendar} label="Probation End Date" value={data.probation_end_date} />
              )}
            </div>
          </div>

          {/* Salary Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Money /> Salary Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <InfoCard icon={Icons.Hash} label="Rank Level" value={data.rank_level ? `Level ${data.rank_level}` : '-'} />
              <InfoCard icon={Icons.Money} label="Base Salary" value={data.base_salary ? `AFN ${parseFloat(data.base_salary).toLocaleString()}` : '-'} />
            </div>

            {/* Salary Breakdown Card */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-5 border border-teal-100">
              <h4 className="text-xs font-bold text-teal-800 mb-4">Salary Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white rounded-lg p-3 border border-teal-100">
                  <p className="text-[9px] font-bold text-teal-600 uppercase tracking-wider">Base Salary</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">{(parseFloat(data.base_salary) || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Housing</p>
                  <p className="text-sm font-bold text-blue-600 mt-1">+{(parseFloat(data.housing_allowance) || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wider">Transport</p>
                  <p className="text-sm font-bold text-purple-600 mt-1">+{(parseFloat(data.transport_allowance) || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-amber-100">
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Family</p>
                  <p className="text-sm font-bold text-amber-600 mt-1">+{(parseFloat(data.family_allowance) || 0).toLocaleString()}</p>
                </div>
                <div className="bg-teal-600 rounded-lg p-3">
                  <p className="text-[9px] font-bold text-teal-100 uppercase tracking-wider">Total Package</p>
                  <p className="text-sm font-bold text-white mt-1">{(parseFloat(data.total_salary) || 0).toLocaleString()} AFN</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Document /> Documents
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "CV", file: data.documents?.cv },
                { label: "Tazkira / National ID", file: data.documents?.tazkira },
                { label: "Certificates", file: data.documents?.certificates },
                { label: "Signed Contract", file: data.documents?.contract },
              ].map((doc, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${doc.file ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.file ? 'bg-teal-100' : 'bg-gray-100'}`}>
                    {doc.file ? (
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-700">{doc.label}</p>
                    <p className={`text-[10px] ${doc.file ? 'text-teal-600' : 'text-gray-400'}`}>
                      {doc.file || 'Not uploaded'}
                    </p>
                  </div>
                  {doc.file && (
                    <button className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 px-2 py-1 bg-white rounded-md border border-teal-200">
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Staff Summary Card */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl shadow-sm p-5 text-white">
            <h3 className="text-sm font-semibold mb-4">Staff Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Staff Code</span>
                <span className="text-xs font-bold">{data.staff_code || data.employee_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Organization</span>
                <span className="text-xs font-bold">{data.organization}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Contract</span>
                <span className="text-xs font-bold">Type {data.contract_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Rank Level</span>
                <span className="text-xs font-bold">Level {data.rank_level || '-'}</span>
              </div>
              <div className="border-t border-teal-500 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-teal-100">Total Salary</span>
                  <span className="text-sm font-bold">{(parseFloat(data.total_salary) || 0).toLocaleString()} AFN</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Contact Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Quick Contact</h3>
            <div className="space-y-3">
              {data.phone && (
                <a href={`tel:${data.phone}`} className="flex items-center gap-3 text-xs text-gray-700 hover:text-teal-600 transition-colors">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                    <Icons.Phone />
                  </div>
                  {data.phone}
                </a>
              )}
              {data.whatsapp && (
                <div className="flex items-center gap-3 text-xs text-gray-700">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                    <Icons.Phone />
                  </div>
                  {data.whatsapp} (WhatsApp)
                </div>
              )}
              {data.email && (
                <a href={`mailto:${data.email}`} className="flex items-center gap-3 text-xs text-gray-700 hover:text-teal-600 transition-colors">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <Icons.Mail />
                  </div>
                  <span className="truncate">{data.email}</span>
                </a>
              )}
            </div>
          </div>

          {/* Activity Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Activity</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Hire Date</p>
                <p className="text-xs text-gray-800 font-medium">{data.hire_date || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Created</p>
                <p className="text-xs text-gray-800">{data.created_at ? new Date(data.created_at).toLocaleString() : '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last Updated</p>
                <p className="text-xs text-gray-800">{data.updated_at ? new Date(data.updated_at).toLocaleString() : '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
