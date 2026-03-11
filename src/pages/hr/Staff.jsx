import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del, put } from '../../api/axios';
import Swal from 'sweetalert2';

const Icons = {
  Plus: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  EditStatus: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700',
    probation: 'bg-amber-100 text-amber-700',
    inactive: 'bg-gray-100 text-gray-700',
    on_leave: 'bg-amber-100 text-amber-700',
    suspended: 'bg-red-100 text-red-700',
    terminated: 'bg-red-100 text-red-700',
  };
  return styles[status] || 'bg-gray-100 text-gray-700';
};

const getOrgBadge = (org) => {
  const styles = {
    WS: 'bg-teal-100 text-teal-700',
    WLS: 'bg-blue-100 text-blue-700',
    WISAL: 'bg-purple-100 text-purple-700',
  };
  return styles[org] || 'bg-gray-100 text-gray-700';
};

// Demo data for static pages
const DEMO_ITEMS = [
  {
    id: 1,
    staff_code: "WS-2026-001",
    full_name_en: "Ahmad Rahimi",
    full_name_dari: "احمد رحیمی",
    department: "academic",
    organization: "WS",
    job_title_en: "Senior Teacher",
    contract_type: "A",
    employment_status: "active",
    phone: "0770123456",
    hire_date: "2024-03-15",
    base_salary: 25000,
    total_salary: 32000,
  },
  {
    id: 2,
    staff_code: "WS-2026-002",
    full_name_en: "Mohammad Karimi",
    full_name_dari: "محمد کریمی",
    department: "finance",
    organization: "WLS",
    job_title_en: "Accountant",
    contract_type: "B",
    employment_status: "active",
    phone: "0790234567",
    hire_date: "2024-06-01",
    base_salary: 20000,
    total_salary: 26000,
  },
  {
    id: 3,
    staff_code: "WS-2026-003",
    full_name_en: "Fatima Noori",
    full_name_dari: "فاطمه نوری",
    department: "admin",
    organization: "WISAL",
    job_title_en: "Admin Officer",
    contract_type: "A",
    employment_status: "probation",
    phone: "0780345678",
    hire_date: "2025-01-10",
    base_salary: 18000,
    total_salary: 23500,
  },
  {
    id: 4,
    staff_code: "WS-2026-004",
    full_name_en: "Ali Ahmadi",
    full_name_dari: "علی احمدی",
    department: "it",
    organization: "WS",
    job_title_en: "IT Support",
    contract_type: "C",
    employment_status: "active",
    phone: "0700456789",
    hire_date: "2023-09-20",
    base_salary: 22000,
    total_salary: 28000,
  },
  {
    id: 5,
    staff_code: "WS-2026-005",
    full_name_en: "Zahra Hashimi",
    full_name_dari: "زهرا هاشمی",
    department: "academic",
    organization: "WLS",
    job_title_en: "Teacher",
    contract_type: "A",
    employment_status: "suspended",
    phone: "0710567890",
    hire_date: "2024-08-05",
    base_salary: 15000,
    total_salary: 20000,
  },
];

const DEPARTMENT_LABELS = {
  hr: "Human Resources",
  finance: "Finance",
  academic: "Academic",
  admin: "Administration",
  it: "IT",
  operations: "Operations",
};

export default function Staff() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    organization: '',
    search: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [useDemo, setUseDemo] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [filters.status, filters.department, filters.organization, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.department) queryParams.append('department', filters.department);
      if (filters.organization) queryParams.append('organization', filters.organization);
      if (debouncedSearch) queryParams.append('search', debouncedSearch);

      const queryString = queryParams.toString();
      const apiUrl = queryString ? `/hr/staff/list?${queryString}` : '/hr/staff/list';

      const response = await get(apiUrl);
      const staffData = response.data?.data || [];
      setItems(Array.isArray(staffData) ? staffData : []);
      setUseDemo(false);
    } catch (error) {
      console.error('Fetch error:', error);
      // Fallback to demo data
      let filtered = [...DEMO_ITEMS];
      if (filters.status) filtered = filtered.filter(i => i.employment_status === filters.status);
      if (filters.department) filtered = filtered.filter(i => i.department === filters.department);
      if (filters.organization) filtered = filtered.filter(i => i.organization === filters.organization);
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        filtered = filtered.filter(i =>
          i.full_name_en.toLowerCase().includes(s) ||
          i.staff_code.toLowerCase().includes(s) ||
          i.job_title_en.toLowerCase().includes(s)
        );
      }
      setItems(filtered);
      setUseDemo(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => navigate('/hr/staff/create');
  const handleEdit = (item) => navigate(`/hr/staff/edit/${item.id}`);
  const handleView = (item) => navigate(`/hr/staff/show/${item.id}`);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      if (useDemo) {
        setItems(prev => prev.filter(i => i.id !== id));
        Swal.fire('Deleted!', 'Staff has been deleted.', 'success');
        return;
      }
      try {
        await del(`/hr/staff/delete/${id}`);
        Swal.fire('Deleted!', 'Staff has been deleted.', 'success');
        fetchItems();
      } catch (error) {
        Swal.fire('Error!', 'Failed to delete staff.', 'error');
      }
    }
  };

  const handleOpenStatusModal = (staff) => {
    setSelectedStaff(staff);
    setStatusUpdate({ status: staff.employment_status || staff.status, notes: '' });
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setSelectedStaff(null);
    setStatusUpdate({ status: '', notes: '' });
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdate.status) {
      Swal.fire('Error', 'Please select a status', 'error');
      return;
    }
    setSaving(true);
    if (useDemo) {
      setItems(prev => prev.map(i => i.id === selectedStaff.id ? { ...i, employment_status: statusUpdate.status } : i));
      Swal.fire('Success', 'Staff status updated successfully', 'success');
      handleCloseStatusModal();
      setSaving(false);
      return;
    }
    try {
      await put(`/hr/staff/update-status/${selectedStaff.id}`, { status: statusUpdate.status });
      Swal.fire('Success', 'Staff status updated successfully', 'success');
      handleCloseStatusModal();
      fetchItems();
    } catch (error) {
      Swal.fire('Error', 'Failed to update staff status', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Staff Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage all staff records and employment details</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilters({status: '', department: '', organization: '', search: ''})}
            className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium"
          >
            Clear Filters
          </button>
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 font-medium text-xs"
          >
            <Icons.Plus />
            Register Staff
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
          <select
            value={filters.department}
            onChange={(e) => setFilters({...filters, department: e.target.value})}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
          >
            <option value="">All Departments</option>
            <option value="hr">Human Resources</option>
            <option value="finance">Finance</option>
            <option value="academic">Academic</option>
            <option value="admin">Administration</option>
            <option value="it">IT</option>
            <option value="operations">Operations</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Organization</label>
          <select
            value={filters.organization}
            onChange={(e) => setFilters({...filters, organization: e.target.value})}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
          >
            <option value="">All Organizations</option>
            <option value="WS">WS</option>
            <option value="WLS">WLS</option>
            <option value="WISAL">WISAL</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            placeholder="Search by name, staff code, or job title..."
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-500 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-teal-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Staff Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Organization</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Department</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Job Title</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Contract</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Phone</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-medium text-teal-600">{item.staff_code || item.employee_id || '-'}</td>
                    <td className="px-3 py-2">
                      <div>
                        <p className="text-xs text-gray-800 font-medium">{item.full_name_en || item.full_name}</p>
                        {item.full_name_dari && <p className="text-[10px] text-gray-400" dir="rtl">{item.full_name_dari}</p>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getOrgBadge(item.organization || item.employment_type)}`}>
                        {item.organization || item.employment_type || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-800 capitalize">{DEPARTMENT_LABELS[item.department] || item.department || '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.job_title_en || '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 font-medium">{item.contract_type ? `Type ${item.contract_type}` : '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.phone || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${getStatusBadge(item.employment_status || item.status)}`}>
                        {(item.employment_status || item.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleView(item)} className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors" title="View">
                          <Icons.Eye />
                        </button>
                        <button onClick={() => handleEdit(item)} className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit">
                          <Icons.Edit />
                        </button>
                        <button onClick={() => handleOpenStatusModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Update Status">
                          <Icons.EditStatus />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                          <Icons.Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <div className="text-center py-8 px-4">
              <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 text-xs">No staff found</p>
              <button onClick={handleCreate} className="mt-3 text-teal-600 hover:text-teal-700 font-medium text-xs">
                Register your first staff member
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Update Staff Status</h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <div className={`px-3 py-2 rounded-lg capitalize ${getStatusBadge(selectedStaff?.employment_status || selectedStaff?.status)} text-sm`}>
                  {(selectedStaff?.employment_status || selectedStaff?.status || '').replace('_', ' ')}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Select Status</option>
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm">
                  {selectedStaff?.full_name_en || selectedStaff?.full_name} ({selectedStaff?.staff_code || selectedStaff?.employee_id})
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2 rounded-b-lg">
              <button type="button" onClick={handleCloseStatusModal} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                Cancel
              </button>
              <button type="button" onClick={handleStatusUpdate} disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50">
                {saving ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
