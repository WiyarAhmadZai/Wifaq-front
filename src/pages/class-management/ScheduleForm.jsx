import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

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

const SUBJECTS = [
  { id: '1', name: 'Mathematics' },
  { id: '2', name: 'English' },
  { id: '3', name: 'Science' },
  { id: '4', name: 'Urdu' },
  { id: '5', name: 'Physics' },
  { id: '6', name: 'Chemistry' },
  { id: '7', name: 'Biology' },
  { id: '8', name: 'Computer Science' },
  { id: '9', name: 'Islamic Studies' },
];

const TEACHERS = [
  { id: '1', name: 'Mr. Ahmad Khan' },
  { id: '2', name: 'Ms. Fatima Ali' },
  { id: '3', name: 'Mr. Hassan Raza' },
  { id: '4', name: 'Mrs. Sarah Ahmed' },
  { id: '5', name: 'Dr. Khalid Mahmood' },
];

const Icons = {
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function ScheduleForm() {
  const navigate = useNavigate();
  const [scheduleData, setScheduleData] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [formData, setFormData] = useState({
    classId: '',
    className: '',
    subjectId: '',
    subjectName: '',
    teacherId: '',
    teacherName: '',
    room: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle cell click
  const handleCellClick = useCallback((day, period) => {
    const key = `${day}-${period}`;
    const existing = scheduleData[key];
    setSelectedSlot({ day, period, key });
    if (existing) {
      setFormData({
        classId: existing.classId,
        className: existing.className,
        subjectId: existing.subjectId,
        subjectName: existing.subjectName,
        teacherId: existing.teacherId,
        teacherName: existing.teacherName,
        room: existing.room || ''
      });
    } else {
      setFormData({
        classId: '',
        className: '',
        subjectId: '',
        subjectName: '',
        teacherId: '',
        teacherName: '',
        room: ''
      });
    }
    setModalOpen(true);
  }, [scheduleData]);

  // Handle form submission
  const handleSave = () => {
    if (!selectedSlot) return;
    
    if (!formData.subjectId || !formData.classId) {
      Swal.fire('Error', 'Please fill in at least Subject and Class', 'error');
      return;
    }

    const classData = CLASSES.find(c => c.id === formData.classId);
    const subjData = SUBJECTS.find(s => s.id === formData.subjectId);
    const teachData = TEACHERS.find(t => t.id === formData.teacherId);

    setScheduleData(prev => ({
      ...prev,
      [selectedSlot.key]: {
        ...formData,
        className: classData?.name || formData.className,
        subjectName: subjData?.name || formData.subjectName,
        teacherName: teachData?.name || formData.teacherName
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
            <h1 className="text-sm font-bold text-white">Create Class Schedule</h1>
            <p className="text-xs text-teal-100 mt-0.5">Click on any cell to add subject • Drag & drop to reschedule</p>
          </div>
          <button onClick={() => navigate('/class-management/schedule')} 
            className="px-4 py-2 bg-white text-teal-600 rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2 font-semibold text-xs shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </button>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="max-w-full mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-teal-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-teal-800 uppercase tracking-wider border-r border-teal-100 min-w-[120px]">
                    Day / Period
                  </th>
                  {PERIODS.map((period) => (
                    <th key={period} className="px-2 py-3 text-center text-xs font-semibold text-teal-800 uppercase tracking-wider border-r border-teal-100 last:border-r-0 min-w-[200px]">
                      {period}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-50 border-r border-gray-200 sticky left-0">
                      {day}
                    </td>
                    {PERIODS.map((period) => {
                      const key = `${day}-${period}`;
                      const slotData = scheduleData[key];
                      
                      return (
                        <td
                          key={key}
                          onClick={() => handleCellClick(day, period)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day, period)}
                          className={`border border-gray-200 p-2 cursor-pointer transition-all hover:bg-teal-50 hover:border-teal-300 ${
                            !slotData ? 'bg-gray-50/50' : 'bg-gradient-to-br from-teal-50 to-blue-50'
                          }`}
                        >
                          {slotData ? (
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, day, period)}
                              className="bg-white rounded-lg p-2 shadow-sm border border-teal-200 cursor-move hover:shadow-md transition-shadow"
                            >
                              <p className="text-xs font-bold text-teal-700 truncate">{slotData.subjectName}</p>
                              <p className="text-[10px] text-gray-600 truncate">{slotData.className}</p>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-teal-50 to-blue-50 rounded border border-teal-200"></div>
            <span className="text-gray-600">Scheduled Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50/50 rounded border border-gray-200"></div>
            <span className="text-gray-600">Empty Slot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">💡 Tip:</span>
            <span className="text-gray-600">Click empty cell to add subject • Drag scheduled class to move it</span>
          </div>
        </div>
      </div>

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
                  value={formData.classId}
                  onChange={(e) => {
                    const cls = CLASSES.find(c => c.id === e.target.value);
                    setFormData({ ...formData, classId: e.target.value, className: cls?.name || '' });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Select Class</option>
                  {CLASSES.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject *</label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => {
                    const subj = SUBJECTS.find(s => s.id === e.target.value);
                    setFormData({ ...formData, subjectId: e.target.value, subjectName: subj?.name || '' });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Select Subject</option>
                  {SUBJECTS.map(subj => (
                    <option key={subj.id} value={subj.id}>{subj.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Teacher</label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => {
                    const teach = TEACHERS.find(t => t.id === e.target.value);
                    setFormData({ ...formData, teacherId: e.target.value, teacherName: teach?.name || '' });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Select Teacher</option>
                  {TEACHERS.map(teach => (
                    <option key={teach.id} value={teach.id}>{teach.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Room</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="e.g., Room 101, Lab 2"
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
