import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

const DEMO = {
  1: { id: 1, class_name: 'Class 6A', grade: '6', section: 'A', academic_year: '1404-1405', supervisor: 'Ahmad Karimi', assistant: 'Fatima Ahmadi', room_number: '101', room_name: 'Science Lab A', building: 'Main Building', floor: '1', capacity: 35, enrolled: 30, subjects: ['Mathematics','English','Science','Islamic Studies'], teachers: ['Ahmad Karimi','Fatima Ahmadi','Noor Rahman'], status: 'active' },
  2: { id: 2, class_name: 'Class 6B', grade: '6', section: 'B', academic_year: '1404-1405', supervisor: 'Noor Rahman',   assistant: '',              room_number: '102', room_name: 'Room 102',      building: 'Main Building', floor: '1', capacity: 35, enrolled: 28, subjects: ['Mathematics','Dari','Islamic Studies'],              teachers: ['Noor Rahman','Maryam Sultani'],  status: 'active' },
  3: { id: 3, class_name: 'Class 7A', grade: '7', section: 'A', academic_year: '1404-1405', supervisor: 'Maryam Sultani',assistant: 'Khalid Noori',  room_number: '201', room_name: 'Room 201',      building: 'Main Building', floor: '2', capacity: 30, enrolled: 30, subjects: ['Mathematics','English','Pashto','Science'],        teachers: ['Maryam Sultani','Khalid Noori'], status: 'active' },
  4: { id: 4, class_name: 'Class 8B', grade: '8', section: 'B', academic_year: '1404-1405', supervisor: 'Khalid Noori', assistant: '',              room_number: '205', room_name: 'Computer Lab', building: 'Annex Block',   floor: '2', capacity: 32, enrolled: 18, subjects: ['Science','Computer Science'],                      teachers: ['Khalid Noori','Ahmad Karimi'],   status: 'active' },
  5: { id: 5, class_name: 'Class 9A', grade: '9', section: 'A', academic_year: '1403-1404', supervisor: 'Ahmad Karimi', assistant: 'Noor Rahman',   room_number: '301', room_name: 'Room 301',      building: 'Main Building', floor: '3', capacity: 28, enrolled: 0,  subjects: ['Mathematics','Physics'],                        teachers: ['Ahmad Karimi','Noor Rahman'],    status: 'inactive' },
};

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
  const item = DEMO[id] || { ...DEMO[1], id, class_name: `Class ${id}` };
  const pct = item.capacity > 0 ? Math.round((item.enrolled / item.capacity) * 100) : 0;

  const handleDelete = async () => {
    const res = await Swal.fire({ title: 'Delete this class?', text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Delete' });
    if (res.isConfirmed) {
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false });
      navigate('/class-management/classes');
    }
  };

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
            <span className="text-2xl font-black text-white">{item.grade}{item.section}</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{item.class_name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">{item.academic_year}</span>
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">Grade {item.grade} · Section {item.section}</span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${item.status === 'active' ? 'bg-white/25 text-white' : 'bg-white/10 text-white/60'}`}>
                {item.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards overlapping banner */}
      <div className="px-4 -mt-6 mb-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Enrolled',  value: item.enrolled,  sub: `of ${item.capacity} seats` },
            { label: 'Available', value: item.capacity - item.enrolled, sub: 'seats left' },
            { label: 'Fill Rate', value: `${pct}%`,      sub: 'capacity used' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-teal-100 shadow-md p-3.5 text-center">
              <p className="text-xl font-black text-teal-700">{s.value}</p>
              <p className="text-[10px] font-semibold text-gray-600 mt-0.5">{s.label}</p>
              <p className="text-[10px] text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Enrollment progress bar */}
      <div className="px-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600">Enrollment Progress</p>
            <p className="text-xs text-gray-400">{item.enrolled} / {item.capacity} students</p>
          </div>
          <div className="h-2 bg-teal-50 rounded-full overflow-hidden border border-teal-100">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-teal-600 mt-1.5 font-medium">{pct}% filled</p>
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">

          {/* Basic Info */}
          <Card title="Basic Class Info" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4">
            <div className="grid grid-cols-2 gap-5">
              <F label="Class Name"    value={item.class_name} />
              <F label="Grade Level"   value={`Grade ${item.grade}`} />
              <F label="Section"       value={`Section ${item.section}`} />
              <F label="Academic Year" value={item.academic_year} />
            </div>
          </Card>

          {/* Location */}
          <Card title="Location" icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z">
            <div className="grid grid-cols-2 gap-5">
              <F label="Room Number" value={item.room_number} />
              <F label="Room Name"   value={item.room_name} />
              <F label="Building"    value={item.building} />
              <F label="Floor"       value={item.floor ? `Floor ${item.floor}` : '—'} />
            </div>
          </Card>

          {/* Subjects */}
          <Card title="Subjects Offered" icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253">
            {item.subjects?.length ? (
              <div className="flex flex-wrap gap-2">
                {item.subjects.map(s => (
                  <span key={s} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-xl border border-teal-200">{s}</span>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No subjects assigned</p>}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Administration */}
          <Card title="Administration" icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Class Supervisor</p>
                <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
                  <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {item.supervisor.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.supervisor}</p>
                    <p className="text-[10px] text-teal-600 font-medium">Class Supervisor</p>
                  </div>
                </div>
              </div>
              {item.assistant && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Assistant Teacher</p>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-sm font-bold flex-shrink-0">
                      {item.assistant.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.assistant}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Assistant Teacher</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Assigned Teachers */}
          <Card title="Assigned Teachers" icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z">
            {item.teachers?.length ? (
              <div className="space-y-2">
                {item.teachers.map(t => (
                  <div key={t} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {t.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-700">{t}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No teachers assigned</p>}
          </Card>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-1.5">
            <p className="text-xs font-bold text-gray-700 mb-3">Quick Actions</p>
            {[
              { label: 'Edit Class',      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', action: () => navigate(`/class-management/classes/edit/${id}`) },
              { label: 'All Classes',     icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',                                                                                          action: () => navigate('/class-management/classes') },
              { label: 'Add New Class',   icon: 'M12 4v16m8-8H4',                                                                                                             action: () => navigate('/class-management/classes/create') },
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
