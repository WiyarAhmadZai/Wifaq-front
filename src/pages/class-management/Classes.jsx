import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const DEMO = [
  { id: 1, class_name: 'Class 6A', grade: '6', section: 'A', academic_year: '1404-1405', supervisor: 'Ahmad Karimi', assistant: 'Fatima Ahmadi', room: '101', building: 'Main Building', floor: '1', capacity: 35, enrolled: 30, subjects: ['Mathematics','English','Science'], status: 'active' },
  { id: 2, class_name: 'Class 6B', grade: '6', section: 'B', academic_year: '1404-1405', supervisor: 'Noor Rahman',  assistant: '',             room: '102', building: 'Main Building', floor: '1', capacity: 35, enrolled: 28, subjects: ['Mathematics','Dari','Islamic Studies'], status: 'active' },
  { id: 3, class_name: 'Class 7A', grade: '7', section: 'A', academic_year: '1404-1405', supervisor: 'Maryam Sultani',assistant: 'Khalid Noori',  room: '201', building: 'Main Building', floor: '2', capacity: 30, enrolled: 30, subjects: ['Mathematics','English','Pashto'], status: 'active' },
  { id: 4, class_name: 'Class 8B', grade: '8', section: 'B', academic_year: '1404-1405', supervisor: 'Khalid Noori', assistant: '',             room: '205', building: 'Annex Block',  floor: '2', capacity: 32, enrolled: 18, subjects: ['Science','Computer Science'], status: 'active' },
  { id: 5, class_name: 'Class 9A', grade: '9', section: 'A', academic_year: '1403-1404', supervisor: 'Ahmad Karimi', assistant: 'Noor Rahman',  room: '301', building: 'Main Building', floor: '3', capacity: 28, enrolled: 0,  subjects: ['Mathematics','Physics'],    status: 'inactive' },
];

const statusStyle = { active: 'bg-teal-50 text-teal-700', inactive: 'bg-gray-100 text-gray-500' };

export default function Classes() {
  const navigate = useNavigate();
  const [items, setItems] = useState(DEMO);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilters = [filterGrade, filterStatus].filter(Boolean).length;

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    if (q && !it.class_name.toLowerCase().includes(q) && !it.supervisor.toLowerCase().includes(q)) return false;
    if (filterGrade && it.grade !== filterGrade) return false;
    if (filterStatus && it.status !== filterStatus) return false;
    return true;
  });

  const stats = [
    { label: 'Total Classes',  value: items.length,                                       icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { label: 'Active Classes', value: items.filter(i => i.status === 'active').length,    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Total Enrolled', value: items.reduce((s, i) => s + i.enrolled, 0),          icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0' },
    { label: 'Total Capacity', value: items.reduce((s, i) => s + i.capacity, 0),          icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  ];

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const res = await Swal.fire({ title: 'Delete this class?', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Delete' });
    if (res.isConfirmed) {
      setItems(prev => prev.filter(i => i.id !== id));
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false });
    }
  };

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Classes</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage all school classes and sections</p>
        </div>
        <button onClick={() => navigate('/class-management/classes/create')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add New Class
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${i === 0 ? 'bg-teal-600 border-teal-600' : 'bg-white border-teal-100'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-white/20' : 'bg-teal-50'}`}>
              <svg className={`w-4 h-4 ${i === 0 ? 'text-white' : 'text-teal-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
            </div>
            <div>
              <p className={`text-[10px] font-medium ${i === 0 ? 'text-teal-100' : 'text-gray-500'}`}>{s.label}</p>
              <p className={`text-xl font-bold leading-tight ${i === 0 ? 'text-white' : 'text-gray-800'}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by class name or supervisor..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white" />
          </div>
          <button onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${filterOpen || activeFilters ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters
            {activeFilters > 0 && <span className="w-4.5 h-4.5 rounded-full bg-white text-teal-700 text-[10px] font-bold flex items-center justify-center">{activeFilters}</span>}
          </button>
          {(activeFilters > 0 || search) && (
            <button onClick={() => { setSearch(''); setFilterGrade(''); setFilterStatus(''); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              Clear
            </button>
          )}
        </div>

        {filterOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Grade</label>
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All Grades</option>
                {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={`${i+1}`}>Grade {i+1}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Supervisor</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Enrolled</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => {
                const pct = Math.round((item.enrolled / item.capacity) * 100);
                return (
                  <tr key={item.id}
                    className="hover:bg-gray-50/80 transition-colors">
                    {/* Class */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-white">{item.grade}{item.section}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 group-hover:text-teal-700 transition-colors">{item.class_name}</p>
                          <p className="text-[11px] text-gray-400">{item.academic_year}</p>
                        </div>
                      </div>
                    </td>
                    {/* Supervisor */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {item.supervisor.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">{item.supervisor}</span>
                      </div>
                    </td>
                    {/* Location */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{item.building}</p>
                      <p className="text-[11px] text-gray-400">Room {item.room} · Floor {item.floor}</p>
                    </td>
                    {/* Enrolled */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-semibold text-gray-800">{item.enrolled}<span className="text-gray-400 font-normal">/{item.capacity}</span></span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyle[item.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-teal-500' : 'bg-gray-400'}`} />
                        {item.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/class-management/classes/show/${item.id}`)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => navigate(`/class-management/classes/edit/${item.id}`)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={(e) => handleDelete(e, item.id)}
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

        {filtered.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No classes found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
            <button onClick={() => navigate('/class-management/classes/create')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add First Class
            </button>
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {items.length} classes</p>
            <div className="flex items-center gap-1">
              {[...new Set(DEMO.map(d => d.academic_year))].map(y => (
                <span key={y} className="px-2 py-0.5 bg-white border border-gray-200 text-[10px] text-gray-500 rounded-lg">{y}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
