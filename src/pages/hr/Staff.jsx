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
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  EditStatus: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
};

const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    probation: 'bg-amber-50 text-amber-700 border-amber-200',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200',
    on_leave: 'bg-amber-50 text-amber-700 border-amber-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
    terminated: 'bg-red-50 text-red-700 border-red-200',
  };
  return styles[status] || 'bg-gray-100 text-gray-600 border-gray-200';
};

const getOrgBadge = (org) => {
  const styles = {
    WS: 'bg-teal-50 text-teal-700',
    WLS: 'bg-blue-50 text-blue-700',
    WISAL: 'bg-purple-50 text-purple-700',
  };
  return styles[org] || 'bg-gray-100 text-gray-600';
};

// Demo data
const DEMO_ITEMS = [
  { id: 1, staff_code: "WS-2026-001", full_name_en: "Ahmad Rahimi", full_name_dari: "احمد رحیمی", department: "academic", organization: "WS", job_title_en: "Senior Teacher", contract_type: "A", employment_status: "active", phone: "0770123456", hire_date: "2024-03-15", base_salary: 25000, total_salary: 32000 },
  { id: 2, staff_code: "WS-2026-002", full_name_en: "Mohammad Karimi", full_name_dari: "محمد کریمی", department: "finance", organization: "WLS", job_title_en: "Accountant", contract_type: "B", employment_status: "active", phone: "0790234567", hire_date: "2024-06-01", base_salary: 20000, total_salary: 26000 },
  { id: 3, staff_code: "WS-2026-003", full_name_en: "Fatima Noori", full_name_dari: "فاطمه نوری", department: "admin", organization: "WISAL", job_title_en: "Admin Officer", contract_type: "A", employment_status: "probation", phone: "0780345678", hire_date: "2025-01-10", base_salary: 18000, total_salary: 23500 },
  { id: 4, staff_code: "WS-2026-004", full_name_en: "Ali Ahmadi", full_name_dari: "علی احمدی", department: "it", organization: "WS", job_title_en: "IT Support", contract_type: "C", employment_status: "active", phone: "0700456789", hire_date: "2023-09-20", base_salary: 22000, total_salary: 28000 },
  { id: 5, staff_code: "WS-2026-005", full_name_en: "Zahra Hashimi", full_name_dari: "زهرا هاشمی", department: "academic", organization: "WLS", job_title_en: "Teacher", contract_type: "A", employment_status: "suspended", phone: "0710567890", hire_date: "2024-08-05", base_salary: 15000, total_salary: 20000 },
];

const DEPT = { hr: "HR", finance: "Finance", academic: "Academic", admin: "Admin", it: "IT", operations: "Ops" };

export default function Staff() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', department: '', organization: '', search: '' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '' });
  const [saving, setSaving] = useState(false);
  const [useDemo, setUseDemo] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchItems(); }, [filters.status, filters.department, filters.organization, debouncedSearch]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 500);
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
    } catch {
      let filtered = [...DEMO_ITEMS];
      if (filters.status) filtered = filtered.filter(i => i.employment_status === filters.status);
      if (filters.department) filtered = filtered.filter(i => i.department === filters.department);
      if (filters.organization) filtered = filtered.filter(i => i.organization === filters.organization);
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        filtered = filtered.filter(i => i.full_name_en.toLowerCase().includes(s) || i.staff_code.toLowerCase().includes(s) || i.job_title_en.toLowerCase().includes(s));
      }
      setItems(filtered);
      setUseDemo(true);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: 'Are you sure?', text: 'You will not be able to recover this record!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0d9488', cancelButtonColor: '#ef4444', confirmButtonText: 'Yes, delete it!' });
    if (result.isConfirmed) {
      if (useDemo) { setItems(prev => prev.filter(i => i.id !== id)); Swal.fire('Deleted!', 'Staff has been deleted.', 'success'); return; }
      try { await del(`/hr/staff/delete/${id}`); Swal.fire('Deleted!', 'Staff has been deleted.', 'success'); fetchItems(); } catch { Swal.fire('Error!', 'Failed to delete staff.', 'error'); }
    }
  };

  const handleOpenStatusModal = (staff) => { setSelectedStaff(staff); setStatusUpdate({ status: staff.employment_status || staff.status }); setShowStatusModal(true); };
  const handleCloseStatusModal = () => { setShowStatusModal(false); setSelectedStaff(null); };

  const handleStatusUpdate = async () => {
    if (!statusUpdate.status) { Swal.fire('Error', 'Please select a status', 'error'); return; }
    setSaving(true);
    if (useDemo) { setItems(prev => prev.map(i => i.id === selectedStaff.id ? { ...i, employment_status: statusUpdate.status } : i)); Swal.fire('Success', 'Status updated', 'success'); handleCloseStatusModal(); setSaving(false); return; }
    try { await put(`/hr/staff/update-status/${selectedStaff.id}`, { status: statusUpdate.status }); Swal.fire('Success', 'Status updated', 'success'); handleCloseStatusModal(); fetchItems(); } catch { Swal.fire('Error', 'Failed to update', 'error'); } finally { setSaving(false); }
  };

  const activeFilters = [filters.status, filters.department, filters.organization].filter(Boolean).length;

  return (
    <div className="px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">Staff Management</h2>
          <p className="text-xs text-gray-400 mt-0.5">{items.length} staff members</p>
        </div>
        <button onClick={() => navigate('/hr/staff/create')} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 font-medium text-xs shadow-sm">
          <Icons.Plus /> Register Staff
        </button>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search /></div>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search staff by name, code, or title..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:outline-none text-xs bg-white"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${showFilters || activeFilters > 0 ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
        >
          <Icons.Filter />
          Filters
          {activeFilters > 0 && <span className="w-4 h-4 bg-teal-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">{activeFilters}</span>}
        </button>
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-400 text-xs bg-white">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} className="px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-400 text-xs bg-white">
            <option value="">All Departments</option>
            <option value="hr">Human Resources</option>
            <option value="finance">Finance</option>
            <option value="academic">Academic</option>
            <option value="admin">Administration</option>
            <option value="it">IT</option>
            <option value="operations">Operations</option>
          </select>
          <select value={filters.organization} onChange={(e) => setFilters({ ...filters, organization: e.target.value })} className="px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-400 text-xs bg-white">
            <option value="">All Orgs</option>
            <option value="WS">WS</option>
            <option value="WLS">WLS</option>
            <option value="WISAL">WISAL</option>
          </select>
          {activeFilters > 0 && (
            <button onClick={() => setFilters({ status: '', department: '', organization: '', search: filters.search })} className="col-span-3 text-[10px] text-teal-600 hover:text-teal-700 font-medium text-center py-1">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-teal-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-400 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Org</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Dept</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-teal-50/30 transition-colors cursor-pointer group" onClick={() => navigate(`/hr/staff/show/${item.id}`)}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 text-[10px] font-bold flex-shrink-0">
                          {(item.full_name_en || item.full_name || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{item.full_name_en || item.full_name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{item.staff_code || item.employee_id} · {item.job_title_en || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${getOrgBadge(item.organization || item.employment_type)}`}>
                        {item.organization || item.employment_type || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 hidden md:table-cell">{DEPT[item.department] || item.department || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 hidden lg:table-cell">{item.phone || '-'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize border ${getStatusBadge(item.employment_status || item.status)}`}>
                        {(item.employment_status || item.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/hr/staff/show/${item.id}`)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors" title="View">
                          <Icons.Eye />
                        </button>
                        <button onClick={() => navigate(`/hr/staff/edit/${item.id}`)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit">
                          <Icons.Edit />
                        </button>
                        <button onClick={() => handleOpenStatusModal(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Status">
                          <Icons.EditStatus />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
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
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-xs font-medium">No staff found</p>
              <p className="text-gray-400 text-[10px] mt-1">Try adjusting your filters or search</p>
              <button onClick={() => navigate('/hr/staff/create')} className="mt-3 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors">
                Register Staff
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={handleCloseStatusModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Update Status</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">{selectedStaff?.full_name_en || selectedStaff?.full_name} ({selectedStaff?.staff_code || selectedStaff?.employee_id})</p>
            </div>
            <div className="p-4">
              <label className="block text-[11px] font-semibold text-gray-600 mb-2">New Status</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'active', label: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { value: 'probation', label: 'Probation', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { value: 'suspended', label: 'Suspended', color: 'bg-red-50 text-red-700 border-red-200' },
                  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-600 border-gray-200' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatusUpdate({ status: opt.value })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      statusUpdate.status === opt.value ? `${opt.color} ring-2 ring-offset-1 ring-teal-400` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2 rounded-b-xl">
              <button onClick={handleCloseStatusModal} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium">Cancel</button>
              <button onClick={handleStatusUpdate} disabled={saving} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
