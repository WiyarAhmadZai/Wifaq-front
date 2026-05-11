import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, del } from '../../../api/axios';
import Swal from 'sweetalert2';
import { useResourcePermissions } from '../../../admin/utils/useResourcePermissions';

const DAY_LABELS = { saturday: 'Sat', sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu' };
const CAT_COLORS = {
  'Maarif Subjects': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', dot: 'bg-teal-500' },
  'Taqwayati Mayari': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
  'Taqwayati Takhasosi': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500' },
};
const DEF_COLOR = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', dot: 'bg-gray-500' };

export default function TeachersShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { canUpdate, canDelete } = useResourcePermissions("teachers");
  const [teacher, setTeacher] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tRes, termRes] = await Promise.all([
          get(`/teacher-management/teachers/show/${id}`),
          get('/academic-terms/list'),
        ]);
        setTeacher(tRes.data?.data);
        const allTerms = termRes.data?.data || [];
        setTerms(allTerms);
        if (allTerms.length) setSelectedTerm(allTerms[allTerms.length - 1].id);
      } catch {
        Swal.fire('Error', 'Failed to load teacher', 'error');
        navigate('/teacher-management/teachers');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Fetch schedule when term changes
  useEffect(() => {
    if (!selectedTerm || !id) return;
    (async () => {
      try {
        const res = await get(`/class-management/schedule/teacher?teacher_id=${id}&academic_term_id=${selectedTerm}`);
        setSchedule(res.data);
      } catch { setSchedule(null); }
    })();
  }, [selectedTerm, id]);

  const handleDelete = async () => {
    const result = await Swal.fire({ title: 'Remove teacher?', text: 'This will remove the teacher record.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Delete' });
    if (result.isConfirmed) {
      try { await del(`/teacher-management/teachers/delete/${id}`); } catch {}
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false });
      navigate('/teacher-management/teachers');
    }
  };

  if (loading) {
    return (<div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600" /></div>);
  }
  if (!teacher) return null;

  const pct = teacher.weekly_hours > 0 ? Math.round((teacher.used_hours / teacher.weekly_hours) * 100) : 0;
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-teal-500';

  const scheduleEntries = schedule?.entries || [];
  const days = schedule?.days || [];
  const periodsCount = schedule?.periods_count || 6;

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Banner */}
      <div className="bg-teal-600 px-5 pt-5 pb-14">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate('/teacher-management/teachers')}
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            {canUpdate && (
              <button onClick={() => navigate(`/teacher-management/teachers/edit/${id}`)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-red-500/60 text-white text-xs font-semibold rounded-xl transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
            {teacher.name?.charAt(0) || 'T'}
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{teacher.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full capitalize">{teacher.role?.replace(/_/g, ' ')}</span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${teacher.status === 'active' ? 'bg-white/25 text-white' : 'bg-white/10 text-white/60'}`}>
                {teacher.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-6 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-teal-100 shadow-md p-3.5 text-center">
            <p className="text-xl font-black text-teal-700">{teacher.weekly_hours}h</p>
            <p className="text-[10px] font-semibold text-gray-600 mt-0.5">Capacity</p>
          </div>
          <div className="bg-white rounded-2xl border border-teal-100 shadow-md p-3.5 text-center">
            <p className="text-xl font-black text-teal-700">{teacher.used_hours}h</p>
            <p className="text-[10px] font-semibold text-gray-600 mt-0.5">Used</p>
          </div>
          <div className="bg-white rounded-2xl border border-teal-100 shadow-md p-3.5 text-center">
            <p className={`text-xl font-black ${teacher.is_full ? 'text-red-600' : 'text-emerald-600'}`}>{teacher.available_hours}h</p>
            <p className="text-[10px] font-semibold text-gray-600 mt-0.5">Available</p>
          </div>
        </div>
      </div>

      {/* Workload bar */}
      <div className="px-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600">Teaching Load</p>
            <p className={`text-xs font-bold ${pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-teal-600'}`}>{pct}%</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2">
          {[{ key: 'info', label: 'Information' }, { key: 'timetable', label: 'Timetable' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.key ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-8">
        {activeTab === 'info' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            {[
              { label: 'Full Name', value: teacher.name },
              { label: 'Email', value: teacher.email },
              { label: 'Phone', value: teacher.phone },
              { label: 'Role', value: teacher.role?.replace(/_/g, ' ') },
              { label: 'Weekly Capacity', value: `${teacher.weekly_hours} hours` },
              { label: 'Status', value: teacher.status },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{f.label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5 capitalize">{f.value || '—'}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'timetable' && (
          <div className="space-y-4">
            {/* Term selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Academic Term</label>
              <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white outline-none">
                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Timetable grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {scheduleEntries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase w-16">Period</th>
                        {days.map(d => (
                          <th key={d} className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">{DAY_LABELS[d]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: periodsCount }, (_, i) => i + 1).map(p => (
                        <tr key={p} className="border-b border-gray-50">
                          <td className="px-3 py-2">
                            <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold">{p}</span>
                          </td>
                          {days.map(d => {
                            const dayEntries = scheduleEntries.filter(e => e.day === d && e.period === p);
                            return (
                              <td key={d} className="px-1 py-1">
                                {dayEntries.length > 0 ? (
                                  <div className="space-y-1">
                                    {dayEntries.map(e => {
                                      const c = CAT_COLORS[e.category] || DEF_COLOR;
                                      return (
                                        <div key={e.id} className={`px-2 py-1.5 rounded-lg border ${c.bg} ${c.border}`}>
                                          <p className={`text-[10px] font-semibold ${c.text} leading-tight`}>{e.subject_name}</p>
                                          <p className="text-[8px] text-gray-400 truncate">{e.class_name} ({e.shift === 'morning' ? 'AM' : 'PM'})</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="h-10 rounded-lg border border-dashed border-gray-200 bg-gray-50/50" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400">No schedule found for this term</p>
                  <p className="text-xs text-gray-300 mt-1">Generate a schedule from the Schedule page</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
