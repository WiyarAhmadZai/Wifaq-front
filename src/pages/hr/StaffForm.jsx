import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post, put } from '../../api/axios';
import Swal from 'sweetalert2';

export default function StaffForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    phone: '',
    password: '',
    gender: '',
    date_of_birth: '',
    national_id: '',
    nationality: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    role: '',
    department: '',
    designation: '',
    hire_date: '',
    employment_type: '',
    base_salary: '',
    bank_account: '',
    bank_name: '',
    qualifications: '',
    skills: '',
    supervisor_id: '',
    status: 'active',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchStaff();
    }
  }, [id]);

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/staff/show/${id}`);
      const data = response.data;
      setFormData({
        employee_id: data.employee_id || '',
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        password: '',
        gender: data.gender || '',
        date_of_birth: formatDateForInput(data.date_of_birth),
        national_id: data.national_id || '',
        nationality: data.nationality || '',
        address: data.address || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        role: data.role || '',
        department: data.department || '',
        designation: data.designation || '',
        hire_date: formatDateForInput(data.hire_date),
        employment_type: data.employment_type || '',
        base_salary: data.base_salary || '',
        bank_account: data.bank_account || '',
        bank_name: data.bank_name || '',
        qualifications: data.qualifications || '',
        skills: data.skills || '',
        supervisor_id: data.supervisor_id || '',
    status: data.status || 'active',
      });
    } catch (error) {
      Swal.fire('Error', 'Failed to load staff data', 'error');
      navigate('/hr/staff');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const scrollToFirstError = (validationErrors) => {
    const firstErrorField = Object.keys(validationErrors)[0];
    if (firstErrorField && formRef.current) {
      const errorElement = formRef.current.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const dataToSend = { ...formData };
      console.log('Data being sent:', dataToSend); // Debug logging
      
      if (!dataToSend.password && isEdit) {
        delete dataToSend.password;
      }

      if (isEdit) {
        await put(`/hr/staff/update/${id}`, dataToSend);
        Swal.fire('Success', 'Staff updated successfully', 'success');
        navigate('/hr/staff');
      } else {
        const response = await post('/hr/staff/store', dataToSend);
        console.log('Response:', response); // Debug logging
        Swal.fire('Success', 'Staff created successfully', 'success');
        navigate('/hr/staff');
      }
    } catch (error) {
      console.error('Error response:', error.response); // Debug logging
      if (error.response?.status === 422 && error.response?.data?.errors) {
        // Validation errors
        const validationErrors = error.response.data.errors;
        console.log('Validation errors:', validationErrors); // Debug logging
        setErrors(validationErrors);
        scrollToFirstError(validationErrors);
      } else {
        // Other errors
        const message = error.response?.data?.message || 'Failed to save staff';
        console.error('Other error:', message); // Debug logging
        Swal.fire('Error', message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (fieldName) => errors[fieldName]?.[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/hr/staff')}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Edit Staff' : 'Add Staff'}</h2>
          <p className="text-xs text-gray-500">{isEdit ? 'Update staff information' : 'Create new staff record'}</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5" autoComplete="off">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Employee ID *</label>
            <input type="text" name="employee_id" value={formData.employee_id} onChange={handleChange} required autoComplete="off" data-lpignore="true" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('employee_id') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('employee_id') && <p className="text-red-500 text-xs mt-1">{getFieldError('employee_id')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required autoComplete="off" data-lpignore="true" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('full_name') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('full_name') && <p className="text-red-500 text-xs mt-1">{getFieldError('full_name')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="off" data-lpignore="true" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('email') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('email') && <p className="text-red-500 text-xs mt-1">{getFieldError('email')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} autoComplete="off" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('phone') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('phone') && <p className="text-red-500 text-xs mt-1">{getFieldError('phone')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password {isEdit ? '(leave blank to keep current)' : '*'}</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required={!isEdit} autoComplete="new-password" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('password') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('password') && <p className="text-red-500 text-xs mt-1">{getFieldError('password')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gender <span className="text-gray-400 font-normal">(optional)</span></label>
            <select name="gender" value={formData.gender} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('gender') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`}>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {getFieldError('gender') && <p className="text-red-500 text-xs mt-1">{getFieldError('gender')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('date_of_birth') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('date_of_birth') && <p className="text-red-500 text-xs mt-1">{getFieldError('date_of_birth')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">National ID <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" name="national_id" value={formData.national_id} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('national_id') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('national_id') && <p className="text-red-500 text-xs mt-1">{getFieldError('national_id')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
            <select name="role" value={formData.role} onChange={handleChange} required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('role') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`}>
              <option value="">Select Role</option>
              <option value="staff">Staff</option>
              <option value="observer">Observer</option>
              <option value="supervisor">Supervisor</option>
              <option value="hr_manager">HR Manager</option>
              <option value="super_admin">Super Admin</option>
            </select>
            {getFieldError('role') && <p className="text-red-500 text-xs mt-1">{getFieldError('role')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department <span className="text-gray-400 font-normal">(optional)</span></label>
            <select name="department" value={formData.department} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('department') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`}>
              <option value="">Select Department</option>
              <option value="hr">Human Resources</option>
              <option value="finance">Finance</option>
              <option value="academic">Academic</option>
              <option value="admin">Administration</option>
              <option value="it">IT</option>
              <option value="operations">Operations</option>
            </select>
            {getFieldError('department') && <p className="text-red-500 text-xs mt-1">{getFieldError('department')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Designation <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" name="designation" value={formData.designation} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('designation') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('designation') && <p className="text-red-500 text-xs mt-1">{getFieldError('designation')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hire Date *</label>
            <input type="date" name="hire_date" value={formData.hire_date} onChange={handleChange} required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('hire_date') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('hire_date') && <p className="text-red-500 text-xs mt-1">{getFieldError('hire_date')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Employment Type *</label>
            <select name="employment_type" value={formData.employment_type} onChange={handleChange} required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('employment_type') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`}>
              <option value="">Select Type</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="probation">Probation</option>
            </select>
            {getFieldError('employment_type') && <p className="text-red-500 text-xs mt-1">{getFieldError('employment_type')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
            <select name="status" value={formData.status} onChange={handleChange} required className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('status') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
            {getFieldError('status') && <p className="text-red-500 text-xs mt-1">{getFieldError('status')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Base Salary <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="number" name="base_salary" value={formData.base_salary} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('base_salary') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('base_salary') && <p className="text-red-500 text-xs mt-1">{getFieldError('base_salary')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bank Account <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" name="bank_account" value={formData.bank_account} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('bank_account') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('bank_account') && <p className="text-red-500 text-xs mt-1">{getFieldError('bank_account')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('bank_name') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`} />
            {getFieldError('bank_name') && <p className="text-red-500 text-xs mt-1">{getFieldError('bank_name')}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Address <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('address') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`}></textarea>
          {getFieldError('address') && <p className="text-red-500 text-xs mt-1">{getFieldError('address')}</p>}
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Qualifications <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea name="qualifications" value={formData.qualifications} onChange={handleChange} rows={2} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('qualifications') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`}></textarea>
          {getFieldError('qualifications') && <p className="text-red-500 text-xs mt-1">{getFieldError('qualifications')}</p>}
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Skills <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea name="skills" value={formData.skills} onChange={handleChange} rows={2} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs ${getFieldError('skills') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'}`}></textarea>
          {getFieldError('skills') && <p className="text-red-500 text-xs mt-1">{getFieldError('skills')}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/hr/staff')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
          </button>
        </div>
      </form>
    </div>
  );
}
