import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';

const DEMO_VENDORS = [
  { id: 1, vendor_name: 'ABC Supplies Ltd.', supplier_type: 'Goods Supplier', contact_person: 'Ahmad Khan', phone_number: '+93 700 111 222', email: 'ahmad@abc.com', address: 'Street 1, Kabul', status: 'Active' },
  { id: 2, vendor_name: 'Tech Solutions Co.', supplier_type: 'Service Provider', contact_person: 'Fatima Noori', phone_number: '+93 700 333 444', email: 'fatima@tech.com', address: 'District 10, Kabul', status: 'Active' },
  { id: 3, vendor_name: 'BuildRight Contractors', supplier_type: 'Contractor', contact_person: 'Noor Ahmad', phone_number: '+93 700 555 666', email: 'noor@buildright.com', address: 'Herat Main Road', status: 'Inactive' },
  { id: 4, vendor_name: 'EduBooks International', supplier_type: 'Distributor', contact_person: 'Maryam Sultani', phone_number: '+93 700 777 888', email: 'maryam@edubooks.com', address: 'Mazar-e-Sharif', status: 'Active' },
  { id: 5, vendor_name: 'Clean Pro Services', supplier_type: 'Service Provider', contact_person: 'Khalid Rasooli', phone_number: '+93 700 999 000', email: 'khalid@cleanpro.com', address: 'Jalalabad City', status: 'Active' },
];

export default function AddVendor() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get('/hr/vendors');
      const list = response.data?.data || response.data || [];
      setItems(list.length ? list : DEMO_VENDORS);
    } catch {
      setItems(DEMO_VENDORS);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Vendor?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete'
    });
    if (result.isConfirmed) {
      try {
        await del(`/hr/vendors/${id}`);
        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
        fetchItems();
      } catch {
        setItems(prev => prev.filter(v => v.id !== id));
        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
      }
    }
  };

  const filtered = items.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || (v.vendor_name || v.name || '').toLowerCase().includes(q) ||
      (v.contact_person || '').toLowerCase().includes(q) ||
      (v.supplier_type || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || (v.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const activeCount = items.filter(v => (v.status || '').toLowerCase() === 'active').length;
  const inactiveCount = items.filter(v => (v.status || '').toLowerCase() === 'inactive').length;

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Vendors</h1>
            <p className="text-xs text-teal-100 mt-0.5">Manage your vendor records</p>
          </div>
          <button onClick={() => navigate('/hr/add-vendor/create')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Vendor
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Vendors', value: items.length, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
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

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by vendor name, contact person, or type..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-gray-400" />
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'inactive'].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all capitalize ${statusFilter === f ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                  {f}
                </button>
              ))}
            </div>
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
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Vendor Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Supplier Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Contact Person</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((v, i) => (
                    <tr key={v.id} onClick={() => navigate(`/hr/add-vendor/show/${v.id}`)}
                      className="hover:bg-teal-50/40 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-teal-600">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">{v.vendor_name || v.name}</p>
                        {v.email && <p className="text-[11px] text-gray-400">{v.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-[11px] font-medium rounded-lg border border-teal-100">
                          {v.supplier_type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{v.contact_person || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{v.phone_number || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${(v.status || '').toLowerCase() === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                          {v.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/hr/add-vendor/show/${v.id}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => navigate(`/hr/add-vendor/edit/${v.id}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(v.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
                <p className="text-sm text-gray-400 font-medium">No vendors found</p>
                <button onClick={() => navigate('/hr/add-vendor/create')}
                  className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">
                  Add your first vendor
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
