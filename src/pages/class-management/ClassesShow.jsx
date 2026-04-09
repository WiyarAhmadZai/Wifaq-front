import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';

const F = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
    <p className="text-sm font-medium text-gray-800 mt-0.5">{value || '—'}</p>
  </div>
);

const Card = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-3.5 bg-teal-50 border-b border-teal-100">
      <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

export default function ClassesShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await get(`/class-management/classes/show/${id}`);
        setItem(res.data?.data);
      } catch {
        Swal.fire('Error', 'Failed to load class', 'error');
        navigate('/class-management/classes');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    const res = await Swal.fire({ title: 'Delete this class?', text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Delete' });
    if (res.isConfirmed) {
      try { await del(`/class-management/classes/delete/${id}`); } catch {}
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false });
      navigate('/class-management/classes');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
      </div>
    );
  }

  if (!item) return null;

  const gradeName = item.grade?.name || '';
  const gradeShort = gradeName.replace('Grade ', '').substring(0, 3);

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Banner */}
      <div className="bg-teal-600 px-5 pt-5 pb-14">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate('/class-management/classes')}
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Classes
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/class-management/classes/edit/${id}`)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-red-500/60 text-white text-xs font-semibold rounded-xl transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-black text-white">{gradeShort}{item.section}</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{item.class_name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">{item.academic_term?.name}</span>
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">{gradeName} · Section {item.section}</span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${item.shift === 'morning' ? 'bg-amber-400/30 text-white' : 'bg-indigo-400/30 text-white'}`}>
                {item.shift === 'morning' ? '☀️ Morning' : '🌙 Afternoon'}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${item.status === 'active' ? 'bg-white/25 text-white' : 'bg-white/10 text-white/60'}`}>
                {item.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="px-4 -mt-6 mb-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Capacity', value: item.capacity, sub: 'max students' },
            { label: 'Subjects', value: item.subjects?.length || 0, sub: 'assigned' },
            { label: 'Branch', value: item.branch?.name || '—', sub: 'location' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-teal-100 shadow-md p-3.5 text-center">
              <p className="text-xl font-black text-teal-700">{s.value}</p>
              <p className="text-[10px] font-semibold text-gray-600 mt-0.5">{s.label}</p>
              <p className="text-[10px] text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info */}
          <Card title="Basic Class Info" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4">
            <div className="grid grid-cols-2 gap-5">
              <F label="Class Name" value={item.class_name} />
              <F label="Grade Level" value={gradeName} />
              <F label="Section" value={`Section ${item.section}`} />
              <F label="Shift" value={item.shift === 'morning' ? 'Morning (صبح)' : 'Afternoon (بعد از ظهر)'} />
              <F label="Academic Term" value={item.academic_term?.name} />
            </div>
          </Card>

          {/* Location */}
          <Card title="Location" icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z">
            <div className="grid grid-cols-2 gap-5">
              <F label="Room Number" value={item.room_number} />
              <F label="Room Name" value={item.room_name} />
              <F label="Building" value={item.building} />
              <F label="Floor" value={item.floor ? `Floor ${item.floor}` : null} />
            </div>
          </Card>

          {/* Subjects & Teachers */}
          <Card title="Subjects & Teachers" icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13">
            {item.subjects?.length > 0 ? (
              <div className="space-y-3">
                {item.subjects.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {s.subject_code?.substring(0, 3)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{s.subject_name}</p>
                        <p className="text-[10px] text-gray-400">{s.category}{s.weekly_hours ? ` · ${s.weekly_hours}h/week` : ''}</p>
                      </div>
                    </div>
                    {s.teacher_name && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold">
                          {s.teacher_name.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-600">{s.teacher_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No subjects assigned</p>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Administration */}
          <Card title="Administration" icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Class Supervisor</p>
                {item.supervisor ? (
                  <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
                    <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {item.supervisor.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.supervisor.name}</p>
                      <p className="text-[10px] text-teal-600 font-medium">Class Supervisor</p>
                    </div>
                  </div>
                ) : <p className="text-sm text-gray-400">Not assigned</p>}
              </div>
              {item.assistant && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Assistant Teacher</p>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-sm font-bold flex-shrink-0">
                      {item.assistant.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.assistant.name}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Assistant Teacher</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-1.5">
            <p className="text-xs font-bold text-gray-700 mb-3">Quick Actions</p>
            {[
              { label: 'Edit Class', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', action: () => navigate(`/class-management/classes/edit/${id}`) },
              { label: 'All Classes', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', action: () => navigate('/class-management/classes') },
              { label: 'Add New Class', icon: 'M12 4v16m8-8H4', action: () => navigate('/class-management/classes/create') },
            ].map(a => (
              <button key={a.label} onClick={a.action}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors text-left">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} /></svg>
                {a.label}
              </button>
            ))}
            <button onClick={handleDelete}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors text-left">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete Class
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
