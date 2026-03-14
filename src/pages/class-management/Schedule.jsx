import { useState, useCallback } from 'react';
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
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const PERIODS = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7'];

const CLASSES = [
  { id: '1', name: 'Class 1-A' },
  { id: '2', name: 'Class 1-B' },
  { id: '3', name: 'Class 2-A' },
  { id: '4', name: 'Class 2-B' },
  { id: '5', name: 'Class 3-A' },
  { id: '6', name: 'Class 3-B' },
];

const TEACHERS = [
  { id: '1', name: 'Mr. Ahmad Khan' },
  { id: '2', name: 'Ms. Fatima Ali' },
  { id: '3', name: 'Mr. Hassan Raza' },
  { id: '4', name: 'Mrs. Sarah Ahmed' },
  { id: '5', name: 'Dr. Khalid Mahmood' },
];

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-colors placeholder-gray-400 outline-none';

const initialScheduleData = {
  'Saturday-Period 1': { id: 1, class: 'Class 1-A', subject: 'Mathematics', teacher: 'Mr. Ahmad Khan', room: 'Room 101' },
  'Saturday-Period 2': { id: 2, class: 'Class 1-A', subject: 'English', teacher: 'Ms. Fatima Ali', room: 'Room 102' },
  'Saturday-Period 3': { id: 3, class: 'Class 1-B', subject: 'Science', teacher: 'Mr. Hassan Raza', room: 'Room 201' },
  'Sunday-Period 1': { id: 4, class: 'Class 2-A', subject: 'Urdu', teacher: 'Mrs. Sarah Ahmed', room: 'Room 103' },
  'Sunday-Period 2': { id: 5, class: 'Class 3-A', subject: 'Mathematics', teacher: 'Mr. Ahmad Khan', room: 'Room 101' },
  'Monday-Period 1': { id: 6, class: 'Class 1-A', subject: 'Physics', teacher: 'Dr. Khalid Mahmood', room: 'Lab 1' },
  'Monday-Period 4': { id: 7, class: 'Class 2-B', subject: 'Chemistry', teacher: 'Ms. Ayesha Siddiqui', room: 'Lab 2' },
  'Tuesday-Period 3': { id: 8, class: 'Class 3-B', subject: 'Biology', teacher: 'Mr. Usman Ghani', room: 'Lab 3' },
  'Wednesday-Period 2': { id: 9, class: 'Class 1-C', subject: 'Computer Science', teacher: 'Eng. Bilal Ahmed', room: 'Computer Lab' },
  'Thursday-Period 5': { id: 10, class: 'Class 2-A', subject: 'Islamic Studies', teacher: 'Molana Tariq Jameel', room: 'Room 104' },
};

const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-700',
  };
  return styles[status] || 'bg-gray-100 text-gray-700';
};



export default function Schedule() {
  const navigate = useNavigate();
  const [scheduleData, setScheduleData] = useState(initialScheduleData);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [viewMode, setViewMode] = useState('timetable'); // 'timetable', 'by-class', 'by-teacher'
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [formData, setFormData] = useState({
    class: '',
    subject: '',
    teacher: '',
    room: ''
  });

  // Handle cell click
  const handleCellClick = useCallback((day, period) => {
    const key = `${day}-${period}`;
    const existing = scheduleData[key];
    setSelectedSlot({ day, period, key });
    setFormData(existing || { class: '', subject: '', teacher: '', room: '' });
    setModalOpen(true);
  }, [scheduleData]);

  // Handle form submission
  const handleSave = () => {
    if (!selectedSlot) return;
    
    if (!formData.subject || !formData.class) {
      Swal.fire('Error', 'Please fill in at least Subject and Class', 'error');
      return;
    }

    setScheduleData(prev => ({
      ...prev,
      [selectedSlot.key]: {
        ...formData,
        id: prev[selectedSlot.key]?.id || Date.now()
      }
    }));
    
    setModalOpen(false);
    Swal.fire('Success', 'Schedule updated successfully', 'success');
  };

  // Handle delete
  const handleDelete = () => {
    if (!selectedSlot) return;
    
    Swal.fire({
      title: 'Remove from Schedule?',
      text: 'This will remove the subject from this time slot',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, remove it'
    }).then((result) => {
      if (result.isConfirmed) {
        setScheduleData(prev => {
          const newData = { ...prev };
          delete newData[selectedSlot.key];
          return newData;
        });
        setModalOpen(false);
        Swal.fire('Removed!', 'Subject removed from schedule', 'success');
      }
    });
  };

  // Get schedules grouped by class
  const getSchedulesByClass = () => {
    const classSchedules = {};
    
    // Initialize all classes with empty schedules
    CLASSES.forEach(cls => {
      classSchedules[cls.name] = {};
    });
    
    // Fill in the schedules
    Object.entries(scheduleData).forEach(([key, data]) => {
      if (!classSchedules[data.className]) {
        classSchedules[data.className] = {};
      }
      classSchedules[data.className][key] = data;
    });
    
    return classSchedules;
  };

  const classSchedules = getSchedulesByClass();
  
  // Filter which classes to show based on filters
  const getClassesToShow = () => {
    if (selectedClass !== 'all') {
      return [selectedClass];
    }
    return CLASSES.map(c => c.name);
  };

  const classesToShow = getClassesToShow();

  // Drag and Drop handlers
  const handleDragStart = (e, day, period) => {
    const key = `${day}-${period}`;
    setDraggedItem({ key, data: scheduleData[key] });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetDay, targetPeriod) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const targetKey = `${targetDay}-${targetPeriod}`;
    
    // Don't allow drop on same slot
    if (targetKey === draggedItem.key) return;
    
    // Check if target is already occupied
    if (scheduleData[targetKey]) {
      Swal.fire('Conflict', 'This time slot is already occupied', 'error');
      return;
    }

    // Move the item
    setScheduleData(prev => {
      const newData = { ...prev };
      // Add to new location
      newData[targetKey] = draggedItem.data;
      // Remove from old location
      delete newData[draggedItem.key];
      return newData;
    });
    
    setDraggedItem(null);
    Swal.fire('Success', `Moved to ${targetDay} - ${targetPeriod}`, 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Interactive Class Timetable</h1>
            <p className="text-xs text-teal-100 mt-0.5">Showing all classes • Use filters to narrow down</p>
          </div>
          <button onClick={() => navigate('/class-management/schedule/create')} 
            className="px-4 py-2 bg-white text-teal-600 rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2 font-semibold text-xs shadow-sm">
            <Icons.Plus />
            Add New Schedule
          </button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="max-w-full mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">View Mode:</span>
            <button
              onClick={() => setViewMode('timetable')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'timetable'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📅 Weekly Timetable
            </button>
            <button
              onClick={() => setViewMode('by-class')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'by-class'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🎓 By Class
            </button>
            <button
              onClick={() => setViewMode('by-teacher')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'by-teacher'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👨‍🏫 By Teacher
            </button>
          </div>

          {/* Filter Dropdowns - Work together to narrow down view */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Filter by Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className={inp}
              >
                <option value="all">All Classes (Combined View)</option>
                {CLASSES.map(cls => (
                  <option key={cls.id} value={cls.name}>{cls.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-500 mt-1">Select a class to see only its schedule</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Filter by Teacher</label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className={inp}
              >
                <option value="all">All Teachers</option>
                {TEACHERS.map(teach => (
                  <option key={teach.id} value={teach.name}>{teach.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-500 mt-1">Select a teacher to see their weekly schedule</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Separate timetable for each class */}
      {classesToShow.map((className) => (
        <div key={className} className="mb-8">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-3 mb-0 rounded-t-2xl">
            <h2 className="text-base font-bold text-white">{className} - Weekly Schedule</h2>
          </div>
          <div className="bg-white rounded-b-2xl border border-t-0 border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-teal-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-teal-800 uppercase tracking-wider border-r border-teal-100 min-w-[120px]">
                      Day / Period
                    </th>
                    {PERIODS.map((period) => (
                      <th key={period} className="px-2 py-3 text-center text-xs font-semibold text-teal-800 uppercase tracking-wider border-r border-teal-100 last:border-r-0 min-w-[180px]">
                        {period}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => {
                    const key = `${day}-`;
                    const classData = classSchedules[className] || {};
                    
                    return (
                      <tr key={day} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-50 border-r border-gray-200 sticky left-0">
                          {day}
                        </td>
                        {PERIODS.map((period) => {
                          const slotKey = `${day}-${period}`;
                          const slotData = classData[slotKey];
                          
                          return (
                            <td
                              key={slotKey}
                              onClick={() => handleCellClick(day, period, className)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, day, period, className)}
                              className={`border border-gray-200 p-2 cursor-pointer transition-all hover:bg-teal-50 hover:border-teal-300 ${
                                !slotData ? 'bg-gray-50/50' : 'bg-gradient-to-br from-teal-50 to-blue-50'
                              }`}
                            >
                              {slotData ? (
                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, day, period, className)}
                                  className="bg-white rounded-lg p-2 shadow-sm border border-teal-200 cursor-move hover:shadow-md transition-shadow"
                                >
                                  <p className="text-xs font-bold text-teal-700 truncate">{slotData.subjectName}</p>
                                  <p className="text-[10px] text-gray-500 truncate">{slotData.teacherName}</p>
                                  <p className="text-[10px] text-gray-400 truncate mt-1">{slotData.room}</p>
                                </div>
                              ) : (
                                <div className="h-full min-h-[60px] flex items-center justify-center text-gray-300">
                                  <Icons.Plus />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {viewMode === 'by-class' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4">
            🎓 Class Schedule - {filterClass || 'All Classes'}
          </h3>
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No schedules found{filterClass ? ` for ${filterClass}` : ''}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSchedules.map((item) => (
                <div key={item.key} className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Class</p>
                      <p className="text-sm font-bold text-teal-700">{item.class}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Subject</p>
                      <p className="text-sm font-semibold text-gray-800">{item.subject}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Teacher</p>
                      <p className="text-sm text-gray-700">{item.teacher}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Schedule</p>
                      <p className="text-sm text-gray-700">{item.day} - {item.period}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Room</p>
                      <p className="text-sm text-gray-700">{item.room}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'by-teacher' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4">
            👨‍🏫 Teacher Schedule - {filterTeacher || 'All Teachers'}
          </h3>
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No schedules found{filterTeacher ? ` for ${filterTeacher}` : ''}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSchedules.map((item) => (
                <div key={item.key} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Teacher</p>
                      <p className="text-sm font-bold text-purple-700">{item.teacher}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Subject</p>
                      <p className="text-sm font-semibold text-gray-800">{item.subject}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Class</p>
                      <p className="text-sm text-gray-700">{item.class}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Schedule</p>
                      <p className="text-sm text-gray-700">{item.day} - {item.period}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Room</p>
                      <p className="text-sm text-gray-700">{item.room}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">
                {scheduleData[selectedSlot?.key] ? 'Edit Schedule' : 'Add New Schedule'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-teal-50 rounded-lg px-3 py-2 mb-4">
                <p className="text-xs text-teal-800">
                  <span className="font-semibold">Day:</span> {selectedSlot?.day}
                </p>
                <p className="text-xs text-teal-800">
                  <span className="font-semibold">Period:</span> {selectedSlot?.period}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Class *</label>
                <select
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Select Class</option>
                  <option value="Class 1-A">Class 1-A</option>
                  <option value="Class 1-B">Class 1-B</option>
                  <option value="Class 2-A">Class 2-A</option>
                  <option value="Class 2-B">Class 2-B</option>
                  <option value="Class 3-A">Class 3-A</option>
                  <option value="Class 3-B">Class 3-B</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject *</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Select Subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Science">Science</option>
                  <option value="Urdu">Urdu</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Islamic Studies">Islamic Studies</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Teacher</label>
                <select
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Select Teacher</option>
                  <option value="Mr. Ahmad Khan">Mr. Ahmad Khan</option>
                  <option value="Ms. Fatima Ali">Ms. Fatima Ali</option>
                  <option value="Mr. Hassan Raza">Mr. Hassan Raza</option>
                  <option value="Mrs. Sarah Ahmed">Mrs. Sarah Ahmed</option>
                  <option value="Dr. Khalid Mahmood">Dr. Khalid Mahmood</option>
                  <option value="Ms. Ayesha Siddiqui">Ms. Ayesha Siddiqui</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Room</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="e.g., Room 101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {scheduleData[selectedSlot?.key] && (
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
              >
                {scheduleData[selectedSlot?.key] ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
