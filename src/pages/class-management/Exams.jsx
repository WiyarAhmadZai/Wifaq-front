import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const Icons = { Plus: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>, Eye: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>, Edit: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>, Trash: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> };

const dummyData = [
  { id: 1, examName: 'Mid Term Mathematics Exam', examType: 'Mid Term Exam', className: 'Class 1-A', subject: 'Mathematics', teacher: 'Mr. Ahmad Khan', examDate: '2025-03-15', startTime: '09:00 AM', endTime: '11:00 AM', totalMarks: '100', passingMarks: '40', status: 'scheduled' },
  { id: 2, examName: 'Final English Exam', examType: 'Final Exam', className: 'Class 1-B', subject: 'English', teacher: 'Ms. Fatima Ali', examDate: '2025-04-20', startTime: '10:00 AM', endTime: '01:00 PM', totalMarks: '100', passingMarks: '40', status: 'upcoming' },
  { id: 3, examName: 'Science Quiz 1', examType: 'Quiz', className: 'Class 2-A', subject: 'Science', teacher: 'Mr. Hassan Raza', examDate: '2025-02-10', startTime: '11:00 AM', endTime: '11:30 AM', totalMarks: '20', passingMarks: '10', status: 'completed' },
];

const getStatusBadge = (status) => ({ scheduled: 'bg-blue-100 text-blue-700', upcoming: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700' }[status] || 'bg-gray-100 text-gray-700');

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-colors placeholder-gray-400 outline-none';

export default function Exams() {
  const navigate = useNavigate();
  const [items] = useState(dummyData);
  const [filters, setFilters] = useState({ status: '', search: '' });

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
      Swal.fire('Deleted!', 'Record has been deleted.', 'success');
      setFilters(prev => ({ ...prev, search: '' }));
    }
  };

  const filteredItems = items.filter(item => {
    const matchesStatus = filters.status ? item.status === filters.status : true;
    const matchesSearch = filters.search ? 
      item.examName.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.subject.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.teacher.toLowerCase().includes(filters.search.toLowerCase()) : true;
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Examinations Management</h1>
            <p className="text-xs text-teal-100 mt-0.5">Manage school exams and assessments</p>
          </div>
          <button onClick={() => navigate('/class-management/exams/create')} 
            className="px-4 py-2 bg-white text-teal-600 rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2 font-semibold text-xs shadow-sm">
            <Icons.Plus />
            Add New Exam
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className={inp}>
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Search</label>
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} 
                  placeholder="Search by exam name, subject, or teacher..." className={`${inp} pl-10`} />
              </div>
            </div>
          </div>
          {(filters.status || filters.search) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setFilters({status: '', search: ''})} 
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Exams', value: items.length, color: 'bg-blue-50 text-blue-700' },
            { label: 'Scheduled', value: items.filter(i => i.status === 'scheduled').length, color: 'bg-amber-50 text-amber-700' },
            { label: 'Upcoming', value: items.filter(i => i.status === 'upcoming').length, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Completed', value: items.filter(i => i.status === 'completed').length, color: 'bg-purple-50 text-purple-700' },
          ].map((stat, idx) => (
            <div key={idx} className={`${stat.color} rounded-xl p-4 border border-current/10`}>
              <p className="text-xs font-medium opacity-70">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-teal-50 border-b border-teal-100">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Exam Name</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Class</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Teacher</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-gray-500">No exams found matching your criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-teal-600">{item.examName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700">{item.examType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700">{item.className}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700">{item.subject}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{item.teacher}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{item.examDate}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => navigate(`/class-management/exams/show/${item.id}`)} 
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                            <Icons.Eye />
                          </button>
                          <button onClick={() => navigate(`/class-management/exams/edit/${item.id}`)} 
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                            <Icons.Edit />
                          </button>
                          <button onClick={() => handleDelete(item.id)} 
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Icons.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}