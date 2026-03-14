import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-colors placeholder-gray-400 outline-none';

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const periods = [
  'Period 1',
  'Period 2',
  'Period 3',
  'Period 4',
  'Period 5',
  'Period 6',
  'Period 7',
  'Period 8'
];

export default function ScheduleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    room: '',
    day: '',
    period: '',
    startTime: '',
    endTime: '',
    status: 'active'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const duration = useMemo(() => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01 ${formData.startTime}`);
      const end = new Date(`2000-01-01 ${formData.endTime}`);
      const diff = (end - start) / 60000; // minutes
      return `${diff} minutes`;
    }
    return '—';
  }, [formData.startTime, formData.endTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      Swal.fire({
        icon: 'success',
        title: isEdit ? 'Schedule Updated!' : 'Schedule Created!',
        text: `Class schedule has been saved successfully.`,
        confirmButtonColor: '#0d9488',
        timer: 2000,
        showConfirmButton: false
      });
      navigate('/class-management/schedule');
      setSubmitting(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/class-management/schedule')}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? 'Edit Class Schedule' : 'New Class Schedule'}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Schedule class sessions</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Class & Subject Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100">
              <h2 className="text-sm font-bold text-gray-800">Class Information</h2>
              <p className="text-xs text-teal-600 mt-0.5">Select class, subject and teacher</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label required>Class</Label>
                <select name="classId" value={formData.classId} onChange={handleInputChange} className={inp} required>
                  <option value="">Select Class</option>
                  <option value="1">Class 1-A</option>
                  <option value="2">Class 1-B</option>
                  <option value="3">Class 2-A</option>
                  <option value="4">Class 2-B</option>
                  <option value="5">Class 3-A</option>
                  <option value="6">Class 3-B</option>
                </select>
              </div>

              <div>
                <Label required>Subject</Label>
                <select name="subjectId" value={formData.subjectId} onChange={handleInputChange} className={inp} required>
                  <option value="">Select Subject</option>
                  <option value="1">Mathematics</option>
                  <option value="2">English</option>
                  <option value="3">Urdu</option>
                  <option value="4">Science</option>
                  <option value="5">Islamiat</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <Label required>Teacher</Label>
                <select name="teacherId" value={formData.teacherId} onChange={handleInputChange} className={inp} required>
                  <option value="">Select Teacher</option>
                  <option value="1">Mr. Ahmad Khan</option>
                  <option value="2">Ms. Fatima Ali</option>
                  <option value="3">Mr. Hassan Raza</option>
                  <option value="4">Mrs. Sarah Ahmed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schedule Details Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
              <h2 className="text-sm font-bold text-gray-800">Schedule Details</h2>
              <p className="text-xs text-blue-600 mt-0.5">Day, period and room assignment</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label required>Day</Label>
                <select name="day" value={formData.day} onChange={handleInputChange} className={inp} required>
                  <option value="">Select Day</option>
                  {days.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <Label required>Period</Label>
                <select name="period" value={formData.period} onChange={handleInputChange} className={inp} required>
                  <option value="">Select Period</option>
                  {periods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <Label required>Room</Label>
                <input type="text" name="room" value={formData.room} onChange={handleInputChange} 
                  className={inp} placeholder="e.g., Room 101" required />
              </div>

              <div>
                <Label>Status</Label>
                <select name="status" value={formData.status} onChange={handleInputChange} className={inp}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Time Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-purple-50 border-b border-purple-100">
              <h2 className="text-sm font-bold text-gray-800">Time Schedule</h2>
              <p className="text-xs text-purple-600 mt-0.5">Start and end time for the session</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label required>Start Time</Label>
                <input type="time" name="startTime" value={formData.startTime} onChange={handleInputChange} 
                  className={inp} required />
              </div>

              <div>
                <Label required>End Time</Label>
                <input type="time" name="endTime" value={formData.endTime} onChange={handleInputChange} 
                  className={inp} required />
              </div>

              <div className="sm:col-span-2">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Duration:</span>{' '}
                    <span className="font-bold text-teal-600">{duration}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button type="button"
              onClick={() => navigate('/class-management/schedule')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Cancel
            </button>

            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {submitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Update Schedule' : 'Create Schedule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
