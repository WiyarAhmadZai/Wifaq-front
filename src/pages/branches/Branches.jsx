import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
};

const dummyData = [
  { id: 1, name: 'Main Branch', code: 'BR-001', city: 'Kabul', phone: '+93 700 000 001', manager: 'Mr. Ahmad', students: 450, status: 'active' },
  { id: 2, name: 'North Branch', code: 'BR-002', city: 'Mazar-i-Sharif', phone: '+93 700 000 002', manager: 'Ms. Fatima', students: 320, status: 'active' },
  { id: 3, name: 'East Branch', code: 'BR-003', city: 'Jalalabad', phone: '+93 700 000 003', manager: 'Mr. Hassan', students: 280, status: 'active' },
  { id: 4, name: 'West Branch', code: 'BR-004', city: 'Herat', phone: '+93 700 000 004', manager: 'Mrs. Aisha', students: 210, status: 'inactive' },
];

const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-700',
  };
  return styles[status] || 'bg-gray-100 text-gray-700';
};

export default function Branches() {
  const navigate = useNavigate();
  const [items, setItems] = useState(dummyData);
  const [filters, setFilters] = useState({ status: '', search: '' });

  const filtered = items.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !item.name.toLowerCase().includes(q) &&
        !item.city.toLowerCase().includes(q) &&
        !item.manager.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!',
    });
    if (result.isConfirmed) {
      setItems(items.filter((item) => item.id !== id));
      Swal.fire('Deleted!', 'Record has been deleted.', 'success');
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Branches</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage school branches and locations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilters({ status: '', search: '' })}
            className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium"
          >
            Clear Filters
          </button>
          <button
            onClick={() => navigate('/branches/create')}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 font-medium text-xs"
          >
            <Icons.Plus />
            Add New
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search by name, city or manager..."
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-teal-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Branch Name</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Code</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">City</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Phone</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Manager</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Students</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs font-medium text-teal-600">{item.name}</td>
                  <td className="px-3 py-2 text-xs text-gray-800">{item.code}</td>
                  <td className="px-3 py-2 text-xs text-gray-800">{item.city}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{item.phone}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{item.manager}</td>
                  <td className="px-3 py-2 text-center text-xs text-gray-800">{item.students}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/branches/show/${item.id}`)} className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors" title="View">
                        <Icons.Eye />
                      </button>
                      <button onClick={() => navigate(`/branches/edit/${item.id}`)} className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit">
                        <Icons.Edit />
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
        {filtered.length === 0 && (
          <div className="text-center py-8 px-4">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-500 text-xs">No records found</p>
            <button onClick={() => navigate('/branches/create')} className="mt-3 text-teal-600 hover:text-teal-700 font-medium text-xs">
              Add your first branch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
