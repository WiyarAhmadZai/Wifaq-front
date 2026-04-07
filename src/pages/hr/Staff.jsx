import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del, put, API_BASE_URL } from '../../api/axios';
import Swal from 'sweetalert2';
const STORAGE = API_BASE_URL.replace(/\/api\/?$/, '');

const CONTRACT_LABELS = { FT: "Full Time", PT: "Part Time", TEMP: "Temporary", CONTRACT: "Contract", INTERNSHIP: "Internship" };
const DEPARTMENTS = ["Human Resources", "Finance", "Academic", "Administration", "IT", "Operations", "Science", "Languages"];

export default function Staff() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [positionTitles, setPositionTitles] = useState({});
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [transferData, setTransferData] = useState({ branch_id: '', department: '', role_title_en: '', contract_type: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  useEffect(() => { fetchBranches(); fetchPositionTitles(); }, []);
  useEffect(() => { fetchItems(); }, [search, statusFilter, deptFilter, branchFilter, contractFilter]);

  const fetchBranches = async () => {
    try {
      const res = await get('/branches/list');
      setBranches(res.data?.data || res.data || []);
    } catch { setBranches([]); }
  };

  const fetchPositionTitles = async () => {
    try {
      const res = await get('/hr/staff/position-titles/list');
      setPositionTitles(res.data || {});
    } catch { setPositionTitles({}); }
  };

  const fetchItems = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (deptFilter) params.append('department', deptFilter);
      if (branchFilter) params.append('branch_id', branchFilter);
      if (contractFilter) params.append('contract_type', contractFilter);

      const res = await get(`/hr/staff/list?${params.toString()}`);
      const data = res.data;
      setItems(data?.data || []);
      setPagination({ current_page: data?.current_page || 1, last_page: data?.last_page || 1, total: data?.total || 0 });
    } catch {
      setItems([]);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: 'Delete Staff?', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0d9488', cancelButtonColor: '#ef4444', confirmButtonText: 'Yes, delete' });
    if (result.isConfirmed) {
      try { await del(`/hr/staff/delete/${id}`); } catch {}
      fetchItems();
      Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
    }
  };

  const openStatusModal = (staff) => {
    setSelectedStaff(staff);
    setStatusUpdate(staff.status || '');
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdate) return;
    setSaving(true);
    try {
      await put(`/hr/staff/update-status/${selectedStaff.id}`, { status: statusUpdate });
      fetchItems();
    } catch {
      setItems(prev => prev.map(i => i.id === selectedStaff.id ? { ...i, status: statusUpdate } : i));
    }
    Swal.fire({ icon: 'success', title: 'Status Updated!', timer: 1500, showConfirmButton: false });
    setShowStatusModal(false);
    setSaving(false);
  };

  const openTransferModal = (staff) => {
    const name = staff.application?.full_name || `Staff #${staff.employee_id}`;
    setSelectedStaff({ ...staff, display_name: name });
    setTransferData({
      branch_id: staff.branch_id || '',
      department: staff.department || '',
      role_title_en: staff.role_title_en || '',
      contract_type: staff.contract_type || '',
      notes: '',
    });
    setShowTransferModal(true);
  };

  const handleTransfer = async () => {
    setSaving(true);
    try {
      await put(`/hr/staff/transfer/${selectedStaff.id}`, transferData);
      fetchItems();
      Swal.fire({ icon: 'success', title: 'Transfer Saved!', text: 'Staff record updated and logged.', timer: 2000, showConfirmButton: false });
      setShowTransferModal(false);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to save transfer', 'error');
    } finally { setSaving(false); }
  };

  const activeCount = items.filter(i => i.status === 'active').length;
  const inactiveCount = items.filter(i => i.status === 'inactive').length;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDeptFilter('');
    setBranchFilter('');
    setContractFilter('');
  };

  const hasFilters = search || statusFilter !== 'all' || deptFilter || branchFilter || contractFilter;

  // Helper to get name from application relationship
  const getName = (item) => item.application?.full_name || `Staff #${item.employee_id}`;

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Staff Management</h1>
            <p className="text-xs text-teal-100 mt-0.5">{pagination.total} staff members</p>
          </div>
          <button onClick={() => navigate('/hr/staff/create')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Register Staff
          </button>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: pagination.total, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
            { label: 'Active', value: activeCount, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Inactive', value: inactiveCount, icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-xl font-black text-gray-800">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, staff code, email, phone, or role..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-gray-400" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'active', 'inactive'].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all capitalize ${statusFilter === f ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white">
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={contractFilter} onChange={e => setContractFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white">
              <option value="">All Contracts</option>
              {[{ v: "FT", l: "Full Time" }, { v: "PT", l: "Part Time" }, { v: "TEMP", l: "Temporary" }, { v: "CONTRACT", l: "Contract" }, { v: "INTERNSHIP", l: "Internship" }].map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearFilters}
                className="px-3 py-2 text-xs text-teal-600 font-semibold hover:bg-teal-50 rounded-xl transition-colors">
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-teal-50 border-b border-teal-100">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Staff</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Branch</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden md:table-cell">Department</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden lg:table-cell">Contract</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => {
                    const name = getName(item);
                    const code = item.employee_id || '';
                    const role = positionTitles[item.role_title_en] || item.role_title_en || '';
                    const branchName = item.branch?.name || '—';
                    const dept = item.department || '';
                    const contract = item.contract_type || '';
                    const status = item.status || '';
                    const phone = item.application?.contact_number || '';

                    return (
                      <tr key={item.id} onClick={() => navigate(`/hr/staff/show/${item.id}`)}
                        className="hover:bg-teal-50/40 cursor-pointer transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {item.profile_photo ? (
                              <img src={`${STORAGE}/storage/${item.profile_photo}`} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0">
                                {name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                              <p className="text-[11px] text-gray-400 truncate">{code} {role && `· ${role}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[11px] font-semibold rounded-lg">{branchName}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{dept || '—'}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-[11px] text-gray-600 font-medium">{CONTRACT_LABELS[contract] || contract || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{phone || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full capitalize ${
                            status === 'active' ? 'bg-teal-100 text-teal-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => navigate(`/hr/staff/show/${item.id}`)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            <button onClick={() => navigate(`/hr/staff/edit/${item.id}`)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => openTransferModal(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Transfer / Update">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            </button>
                            <button onClick={() => openStatusModal(item)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Update Status">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {items.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <p className="text-sm text-gray-400 font-medium">No staff found</p>
                <button onClick={() => navigate('/hr/staff/create')}
                  className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">
                  Register your first staff member
                </button>
              </div>
            )}

            {pagination.last_page > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">Page {pagination.current_page} of {pagination.last_page} ({pagination.total} total)</p>
                <div className="flex gap-1">
                  <button onClick={() => fetchItems(pagination.current_page - 1)} disabled={pagination.current_page <= 1}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
                  <button onClick={() => fetchItems(pagination.current_page + 1)} disabled={pagination.current_page >= pagination.last_page}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowStatusModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Update Status</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{getName(selectedStaff)} ({selectedStaff.employee_id})</p>
            </div>
            <div className="p-5">
              <p className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">New Status</p>
              <div className="flex gap-3">
                {['active', 'inactive'].map(s => (
                  <button key={s} type="button" onClick={() => setStatusUpdate(s)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize ${statusUpdate === s ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
              <button onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-xs font-medium">Cancel</button>
              <button onClick={handleStatusUpdate} disabled={saving}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-xs font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Transfer / Update Staff</h3>
                  <p className="text-[11px] text-blue-600 mt-0.5">{selectedStaff.display_name} — {selectedStaff.employee_id}</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
                <select value={transferData.branch_id} onChange={e => setTransferData(p => ({ ...p, branch_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                <select value={transferData.department} onChange={e => setTransferData(p => ({ ...p, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Position Title</label>
                <select value={transferData.role_title_en} onChange={e => setTransferData(p => ({ ...p, role_title_en: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                  <option value="">Select Position</option>
                  {Object.entries(positionTitles).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contract Type</label>
                <select value={transferData.contract_type} onChange={e => setTransferData(p => ({ ...p, contract_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                  <option value="">Select Type</option>
                  <option value="permanent">Permanent</option>
                  <option value="fixed_term">Fixed Term</option>
                  <option value="probation">Probation</option>
                  <option value="consultancy">Consultancy</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={transferData.notes} onChange={e => setTransferData(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500" placeholder="Reason for transfer or update..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs font-medium">Cancel</button>
                <button onClick={handleTransfer} disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save & Log Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
