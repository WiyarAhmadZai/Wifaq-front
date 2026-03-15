import { useState } from 'react';
export default function GenericList({ title, subtitle, columns, data, onCreate, onView, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: '', search: '' });
  const getStatusBadge = (status) => ({ active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-gray-100 text-gray-700' }[status] || 'bg-gray-100 text-gray-700');

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div><h2 className="text-base font-bold text-gray-800">{title}</h2><p className="text-xs text-gray-500 mt-0.5">{subtitle}</p></div>
        <div className="flex gap-2">
          <button onClick={() => setFilters({status: '', search: ''})} className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium">Clear Filters</button>
          <button onClick={onCreate} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 font-medium text-xs">+ Add New</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Status</label><select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"><option value="">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Search</label><input type="text" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} placeholder={`Search by ${title.toLowerCase()}...`} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs" /></div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[800px]">
          <thead className="bg-teal-50"><tr>
            {columns.map((col, idx) => (<th key={idx} className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">{col}</th>))}
            <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item, idx) => (<tr key={idx} className="hover:bg-gray-50">
              {Object.values(item).slice(0, columns.length).map((val, i) => (<td key={i} className="px-3 py-2 text-xs text-gray-800">{val}</td>))}
              <td className="px-3 py-2 text-right"><div className="flex items-center justify-end gap-1">
                <button onClick={() => onView(item)} className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors">View</button>
                <button onClick={() => onEdit(item)} className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors">Edit</button>
                <button onClick={() => onDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">Delete</button>
              </div></td>
            </tr>))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}