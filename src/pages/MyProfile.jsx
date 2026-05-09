import { useState, useEffect } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { get, put } from '../api/axios';
import Swal from 'sweetalert2';

const CONTRACT_LABELS = { FT: "Full Time", PT: "Part Time", TEMP: "Temporary" };

export default function MyProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState(false);
  
  // Modal states for each section
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const endpoint = userId ? `/profile/${userId}` : '/profile';
      const response = await get(endpoint);
      setProfileData(response.data.data);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Profile fetch error:', error);
      Swal.fire('Error', 'Failed to load profile data', 'error');
      if (!userId) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleFileUpload = async (section, file) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => {
          const updatedData = { ...prev };
          
          // Upload to the correct section based on user type
          if (prev.type === 'staff') {
            updatedData.staff = {
              ...prev.staff,
              profile_photo: file,
              profile_photo_preview: reader.result
            };
          } else if (prev.type === 'teacher') {
            updatedData.teacher = {
              ...prev.teacher,
              profile_photo: file,
              profile_photo_preview: reader.result
            };
          } else if (prev.type === 'student') {
            updatedData.student = {
              ...prev.student,
              profile_photo: file,
              profile_photo_preview: reader.result
            };
          } else {
            // Default to user section
            updatedData.user = {
              ...prev.user,
              profile_photo: file,
              profile_photo_preview: reader.result
            };
          }
          
          return updatedData;
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      Swal.fire('Error', 'Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSectionUpdate = async (section, data) => {
    setUploading(true);
    try {
      const submitData = new FormData();
      submitData.append('type', formData.type || 'user');
      
      if (userId) {
        submitData.append('user_id', userId);
      }

      if (section === 'personal') {
        submitData.append('name', data.name || formData.user?.name || '');
        if (formData.type === 'staff') {
          submitData.append('staff_data.father_name', data.father_name || '');
          submitData.append('staff_data.blood_type', data.blood_type || '');
        } else if (formData.type === 'student') {
          submitData.append('student_data.father_name', data.father_name || '');
          submitData.append('student_data.date_of_birth', data.date_of_birth || '');
          submitData.append('student_data.blood_type', data.blood_type || '');
        }
      } else if (section === 'contact') {
        // Don't include name in contact updates - name should be updated in personal section
        submitData.append('email', data.email || formData.user?.email || '');
        if (formData.type === 'student') {
          submitData.append('student_data.current_address', data.address || '');
          submitData.append('student_data.emergency_contact_name', data.emergency_contact_name || '');
          submitData.append('student_data.emergency_contact_phone', data.emergency_contact_phone || '');
        } else if (formData.type === 'staff') {
          submitData.append('staff_data.emergency_contact_name', data.emergency_contact_name || '');
          submitData.append('staff_data.emergency_contact_phone', data.emergency_contact_phone || '');
        } else {
          // For regular users, add phone and whatsapp to user table
          submitData.append('phone', data.phone || '');
          submitData.append('whatsapp', data.whatsapp || '');
        }
      } else if (section === 'salary') {
        if (formData.type === 'staff') {
          submitData.append('staff_data.rank_level', data.rank_level || '');
          submitData.append('staff_data.base_salary', data.base_salary || 0);
          submitData.append('staff_data.housing_allowance', data.housing_allowance || 0);
          submitData.append('staff_data.transport_allowance', data.transport_allowance || 0);
          submitData.append('staff_data.family_allowance', data.family_allowance || 0);
        }
      }

      const response = await put('/profile', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Swal.fire('Success', `${section.charAt(0).toUpperCase() + section.slice(1)} information updated successfully`, 'success');
      setProfileData(response.data.data);
      setFormData(response.data.data);
      
      // Close modal
      if (section === 'personal') setShowPersonalModal(false);
      else if (section === 'contact') setShowContactModal(false);
      else if (section === 'employment') setShowEmploymentModal(false);
      else if (section === 'salary') setShowSalaryModal(false);
      
    } catch (error) {
      console.error('Section update error:', error);
      Swal.fire('Error', error.response?.data?.message || `Failed to update ${section} information`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const submitData = new FormData();
      
      // Add user data
      submitData.append('name', formData.user?.name || '');
      submitData.append('email', formData.user?.email || '');
      submitData.append('username', formData.user?.username || '');
      submitData.append('type', formData.type || 'user');
      
      if (userId) {
        submitData.append('user_id', userId);
      }

      // Add profile photo if changed
      if (formData.user?.profile_photo instanceof File) {
        submitData.append('profile_photo', formData.user.profile_photo);
      }

      // Add type-specific data
      if (formData.type === 'staff' && formData.staff) {
        Object.keys(formData.staff).forEach(key => {
          if (key === 'profile_photo' && formData.staff[key] instanceof File) {
            submitData.append(`staff_data.${key}`, formData.staff[key]);
          } else if (key !== 'profile_photo_preview') {
            submitData.append(`staff_data.${key}`, formData.staff[key] || '');
          }
        });
      }

      if (formData.type === 'teacher' && formData.teacher) {
        Object.keys(formData.teacher).forEach(key => {
          if (key === 'profile_photo' && formData.teacher[key] instanceof File) {
            submitData.append(`teacher_data.${key}`, formData.teacher[key]);
          } else if (key !== 'profile_photo_preview') {
            submitData.append(`teacher_data.${key}`, formData.teacher[key] || '');
          }
        });
      }

      if (formData.type === 'student' && formData.student) {
        Object.keys(formData.student).forEach(key => {
          if (key === 'profile_photo' && formData.student[key] instanceof File) {
            submitData.append(`student_data.${key}`, formData.student[key]);
          } else if (key !== 'profile_photo_preview') {
            submitData.append(`student_data.${key}`, formData.student[key] || '');
          }
        });
      }

      const response = await put('/profile', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Swal.fire('Success', 'Profile updated successfully', 'success');
      
      // Update form data with response - the backend returns the correct URLs
      setProfileData(response.data.data);
      setFormData(response.data.data);
      setEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/60 flex items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-50/60 flex items-center justify-center">
        <div className="text-lg">Profile not found</div>
      </div>
    );
  }

  const d = {
    full_name_en: formData.user?.name || 'N/A',
    full_name_dari: formData.user?.name || 'N/A',
    role_title_en: formData.staff?.role_title_en || 'User',
    department: formData.staff?.department || 'General',
    staff_code: formData.staff?.employee_id || 'ID: ' + formData.user?.id,
    entity: formData.user?.email || 'N/A',
    status: 'active',
    father_name: formData.staff?.father_name || formData.student?.father_name || 'N/A',
    date_of_birth: formData.student?.date_of_birth || 'N/A',
    national_id: formData.user?.username || 'N/A',
    blood_type: formData.staff?.blood_type || formData.student?.blood_type || 'N/A',
    phone: formData.user?.phone || 'N/A',
    whatsapp: formData.user?.whatsapp || 'N/A',
    email: formData.user?.email || 'N/A',
    address: formData.student?.current_address || 'N/A',
    emergency_contact_name: formData.staff?.emergency_contact_name || formData.teacher?.emergency_contact_name || formData.student?.emergency_contact_name || 'N/A',
    emergency_contact_phone: formData.staff?.emergency_contact_phone || formData.teacher?.emergency_contact_phone || formData.student?.emergency_contact_phone || 'N/A',
    base_salary: formData.staff?.base_salary || 0,
    housing_allowance: formData.staff?.housing_allowance || 0,
    transport_allowance: formData.staff?.transport_allowance || 0,
    family_allowance: formData.staff?.family_allowance || 0,
    rank_level: formData.staff?.rank_level || 'N/A',
    contract_type: formData.staff?.contract_type || 'N/A',
    hire_date: formData.staff?.hire_date || 'N/A',
    direct_supervisor: formData.staff?.direct_supervisor || 'N/A',
    probation_end_date: formData.staff?.probation_end_date || null,
  };

  const total = (d.base_salary || 0) + (d.housing_allowance || 0) + (d.transport_allowance || 0) + (d.family_allowance || 0);

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-6">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <h1 className="text-sm font-bold text-white">My Profile</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="px-3 py-1.5 bg-white text-teal-600 text-xs font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0 overflow-hidden bg-white/20">
                {formData.user?.profile_photo_preview || (typeof formData.user?.profile_photo === 'string' && formData.user?.profile_photo) || formData.staff?.profile_photo || formData.teacher?.profile_photo || formData.student?.profile_photo ? (
                  <img 
                    src={formData.user?.profile_photo_preview || formData.user?.profile_photo || formData.staff?.profile_photo || formData.teacher?.profile_photo || formData.student?.profile_photo} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  formData.user?.name?.charAt(0) || 'U'
                )}
              </div>
              {/* Edit icon overlay */}
              <button
                onClick={() => document.getElementById('profile-photo-upload').click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white hover:bg-teal-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Update profile photo"
              >
                {uploading ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input
                id="profile-photo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload('user', e.target.files[0])}
                className="hidden"
              />
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

      <div className="max-w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Info sections */}
          <div className="lg:col-span-2 space-y-4">

          {/* Contact */}
          <Section title="Contact Information" icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-gray-500">Update your contact details</span>
              <button
                onClick={() => setShowContactModal(true)}
                className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Phone" value={d.phone} />
              <Field label="WhatsApp" value={d.whatsapp} />
              <Field label="Email" value={d.email} type="email" />
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
            <div className="mb-4">
              <span className="text-xs text-gray-500">Employment information managed by admin</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Staff Code" value={d.staff_code} />
                <Field label="Entity" value={d.entity} />
                <Field label="Department" value={d.department} />
                <Field label="Role Title (EN)" value={d.role_title_en} />
                <Field label="Hire Date" value={d.hire_date} />
                <Field label="Contract Type" value={CONTRACT_LABELS[d.contract_type] || d.contract_type} />
                <Field label="Status" value={d.status} />
                <Field label="Supervisor" value={d.direct_supervisor} />
                {d.probation_end_date && <Field label="Probation End" value={d.probation_end_date} />}
              </div>
            </Section>

            {/* Salary */}
            {(formData.type === 'staff' || formData.type === 'teacher') && (
              <Section title="Salary Information" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-gray-500">Update your salary information</span>
                  <button
                    onClick={() => setShowSalaryModal(true)}
                    className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="Rank Level" value={d.rank_level} />
                  <Field label="Base Salary" value={d.base_salary} type="number" />
                </div>
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Base", value: d.base_salary, prefix: "", field: "base_salary" },
                    { label: "Housing", value: d.housing_allowance, prefix: "", field: "housing_allowance" },
                    { label: "Transport", value: d.transport_allowance, prefix: "", field: "transport_allowance" },
                    { label: "Family", value: d.family_allowance, prefix: "", field: "family_allowance" },
                    { label: "Total", value: total, prefix: "", field: "total" }
                  ].map((item, idx) => (
                    <div key={idx} className={`${item.field === "total" ? "bg-teal-600 text-white" : "bg-white"} rounded-lg p-3 text-center`}>
                      <div className="text-xs font-medium">{item.label}</div>
                      <div className="text-sm font-bold">{item.prefix}{item.value?.toLocaleString() || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
            )}

          </div>

          {/* Right: Sidebar */}
          <div className="space-y-4">
            <Section title="Personal Information" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-gray-500">Update your personal details</span>
                <button
                  onClick={() => setShowPersonalModal(true)}
                  className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Full Name (EN)" value={d.full_name_en} />
                <Field label="Full Name (Dari)" value={d.full_name_dari} />
                <Field label="Father's Name" value={d.father_name} />
                <Field label="Date of Birth" value={d.date_of_birth} type="date" />
                <Field label="National ID / Tazkira" value={d.national_id} />
                <Field label="Blood Type" value={d.blood_type} />
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* Personal Information Modal */}
      {showPersonalModal && (
        <PersonalInfoModal
          data={formData}
          onClose={() => setShowPersonalModal(false)}
          onSave={(data) => handleSectionUpdate('personal', data)}
          uploading={uploading}
        />
      )}

      {/* Contact Information Modal */}
      {showContactModal && (
        <ContactInfoModal
          data={formData}
          onClose={() => setShowContactModal(false)}
          onSave={(data) => handleSectionUpdate('contact', data)}
          uploading={uploading}
        />
      )}

      {/* Salary Information Modal */}
      {showSalaryModal && (
        <SalaryModal
          data={formData}
          onClose={() => setShowSalaryModal(false)}
          onSave={(data) => handleSectionUpdate('salary', data)}
          uploading={uploading}
        />
      )}
    </div>
  );
}

// Helper components
function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
          <h3 className="text-sm font-bold text-teal-800">{title}</h3>
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, type = "text" }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-800 capitalize">{value || "—"}</p>
    </div>
  );
}

// Modal Components
function PersonalInfoModal({ data, onClose, onSave, uploading }) {
  const [formData, setFormData] = useState({
    name: data.user?.name || '',
    father_name: data.staff?.father_name || data.student?.father_name || '',
    date_of_birth: data.student?.date_of_birth || '',
    blood_type: data.staff?.blood_type || data.student?.blood_type || '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
            <input
              type="text"
              value={formData.father_name}
              onChange={(e) => handleChange('father_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {data.type === 'student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
            <select
              value={formData.blood_type}
              onChange={(e) => handleChange('blood_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Select...</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {uploading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContactInfoModal({ data, onClose, onSave, uploading }) {
  const [formData, setFormData] = useState({
    email: data.user?.email || '',
    phone: data.user?.phone || '',
    whatsapp: data.user?.whatsapp || '',
    address: data.student?.current_address || '',
    emergency_contact_name: data.staff?.emergency_contact_name || data.teacher?.emergency_contact_name || data.student?.emergency_contact_name || '',
    emergency_contact_phone: data.staff?.emergency_contact_phone || data.teacher?.emergency_contact_phone || data.student?.emergency_contact_phone || '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {data.type === 'student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Emergency Contact</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {uploading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SalaryModal({ data, onClose, onSave, uploading }) {
  const [formData, setFormData] = useState({
    rank_level: data.staff?.rank_level || '',
    base_salary: data.staff?.base_salary || 0,
    housing_allowance: data.staff?.housing_allowance || 0,
    transport_allowance: data.staff?.transport_allowance || 0,
    family_allowance: data.staff?.family_allowance || 0,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const total = (formData.base_salary || 0) + (formData.housing_allowance || 0) + (formData.transport_allowance || 0) + (formData.family_allowance || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Salary Information</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rank Level</label>
            <input
              type="text"
              value={formData.rank_level}
              onChange={(e) => handleChange('rank_level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
              <input
                type="number"
                value={formData.base_salary}
                onChange={(e) => handleChange('base_salary', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Housing</label>
              <input
                type="number"
                value={formData.housing_allowance}
                onChange={(e) => handleChange('housing_allowance', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transport</label>
              <input
                type="number"
                value={formData.transport_allowance}
                onChange={(e) => handleChange('transport_allowance', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Family</label>
              <input
                type="number"
                value={formData.family_allowance}
                onChange={(e) => handleChange('family_allowance', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-teal-800">Total Salary</span>
              <span className="text-lg font-bold text-teal-800">{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {uploading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
