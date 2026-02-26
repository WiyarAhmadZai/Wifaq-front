import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post, put } from '../../api/axios';
import Swal from 'sweetalert2';

export default function ContractsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    staff_id: '',
    contract_number: '',
    contract_type: 'fixed_term',
    start_date: '',
    end_date: '',
    probation_period_days: 90,
    salary: '',
    allowances: {},
    benefits: {},
    job_description: '',
    terms_conditions: '',
  });

  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaffList();
    if (isEdit) {
      fetchContract();
    }
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = staffList.filter(staff =>
        staff.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStaff(filtered);
    } else {
      setFilteredStaff(staffList);
    }
  }, [searchTerm, staffList]);

  const fetchStaffList = async () => {
    try {
      const response = await get('/hr/staff/list?per_page=1000');
      const staffData = response.data?.data || response.data || [];
      setStaffList(Array.isArray(staffData) ? staffData : []);
      setFilteredStaff(Array.isArray(staffData) ? staffData : []);
    } catch (error) {
      console.error('Failed to load staff list', error);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const fetchContract = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/contracts/show/${id}`);
      const data = response.data;
      setFormData({
        staff_id: data.staff_id || '',
        contract_number: data.contract_number || '',
        contract_type: data.contract_type || '',
        start_date: formatDateForInput(data.start_date),
        end_date: formatDateForInput(data.end_date),
        probation_period_days: data.probation_period_days || '',
        salary: data.salary || '',
        allowances: data.allowances || {},
        benefits: data.benefits || {},
        job_description: data.job_description || '',
        terms_conditions: data.terms_conditions || '',
      });
      if (data.staff) {
        setSelectedStaffName(`${data.staff.full_name} (${data.staff.employee_id})`);
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to load contract data', 'error');
      navigate('/hr/contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = (staff) => {
    setFormData(prev => ({ ...prev, staff_id: staff.id }));
    setSelectedStaffName(`${staff.full_name} (${staff.employee_id})`);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEdit) {
        await put(`/hr/contracts/update/${id}`, formData);
        Swal.fire('Success', 'Contract updated successfully', 'success');
      } else {
        await post('/hr/contracts/store', formData);
        Swal.fire('Success', 'Contract created successfully', 'success');
      }
      navigate('/hr/contracts');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save contract';
      Swal.fire('Error', message, 'error');
    } finally {
      setSaving(false);
    }
  };

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
          onClick={() => navigate('/hr/contracts')}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Edit Contract' : 'Add Contract'}</h2>
          <p className="text-xs text-gray-500">{isEdit ? 'Update contract information' : 'Create new contract'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5" autoComplete="off">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Staff *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search staff by name, ID or email..."
                value={searchTerm || selectedStaffName}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredStaff.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">No staff found</div>
                ) : (
                  filteredStaff.map(staff => (
                    <div
                      key={staff.id}
                      onClick={() => handleStaffSelect(staff)}
                      className={`px-3 py-2 cursor-pointer hover:bg-teal-50 border-b border-gray-100 last:border-0 ${formData.staff_id === staff.id ? 'bg-teal-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold">
                          {staff.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{staff.full_name}</p>
                          <p className="text-[10px] text-gray-500">{staff.employee_id} • {staff.department || 'No Dept'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            <input type="hidden" name="staff_id" value={formData.staff_id} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contract Number *</label>
            <input type="text" name="contract_number" value={formData.contract_number} onChange={handleChange} required autoComplete="off" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contract Type *</label>
            <select name="contract_type" value={formData.contract_type} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs">
              <option value="">Select Type</option>
              <option value="permanent">Permanent</option>
              <option value="fixed_term">Fixed Term</option>
              <option value="probation">Probation</option>
              <option value="consultancy">Consultancy</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
            <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs" />
          </div>
          {formData.contract_type === 'probation' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Probation Period (Days) <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="number" name="probation_period_days" value={formData.probation_period_days} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Salary (AFN) *</label>
            <input type="number" name="salary" value={formData.salary} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Job Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea name="job_description" value={formData.job_description} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"></textarea>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Terms & Conditions <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea name="terms_conditions" value={formData.terms_conditions} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"></textarea>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/hr/contracts')}
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
