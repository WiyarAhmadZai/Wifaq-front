import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-colors placeholder-gray-400 outline-none';

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

export default function ExamsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    examName: '',
    examType: '',
    classId: '',
    subjectId: '',
    teacherId: '',
    examDate: '',
    startTime: '',
    endTime: '',
    totalMarks: '',
    passingMarks: '',
    status: 'scheduled'
  });

  const handleInputChange = (e) => { 
    const { name, value } = e.target; 
    setFormData(prev => ({ ...prev, [name]: value })); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => { 
      Swal.fire({ 
        icon: 'success', 
        title: isEdit ? 'Exam Updated!' : 'Exam Created!', 
        text: `${formData.examName} has been saved successfully.`, 
        confirmButtonColor: '#0d9488', 
        timer: 2000, 
        showConfirmButton: false 
      }); 
      navigate('/class-management/exams'); 
      setSubmitting(false); 
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/class-management/exams')}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? 'Edit Examination' : 'New Examination'}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Fill in the exam details below</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-full mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100">
              <h2 className="text-sm font-bold text-gray-800">Basic Information</h2>
              <p className="text-xs text-teal-600 mt-0.5">Exam name, type and classification</p>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <Label required>Exam Name</Label>
                <input type="text" name="examName" value={formData.examName} onChange={handleInputChange} 
                  className={inp} placeholder="e.g., Mid Term Mathematics Exam" required />
              </div>

              <div>
                <Label required>Exam Type</Label>
                <select name="examType" value={formData.examType} onChange={handleInputChange} className={inp} required>
                  <option value="">Select Exam Type</option>
                  <option value="mid-term">Mid Term Exam</option>
                  <option value="final">Final Exam</option>
                  <option value="monthly">Monthly Test</option>
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="practical">Practical Exam</option>
                </select>
              </div>

              <div>
                <Label required>Status</Label>
                <select name="status" value={formData.status} onChange={handleInputChange} className={inp} required>
                  <option value="scheduled">Scheduled</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Class & Subject Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
              <h2 className="text-sm font-bold text-gray-800">Class & Subject Details</h2>
              <p className="text-xs text-blue-600 mt-0.5">Select class, subject and teacher</p>
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

          {/* Schedule Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-purple-50 border-b border-purple-100">
              <h2 className="text-sm font-bold text-gray-800">Schedule & Timing</h2>
              <p className="text-xs text-purple-600 mt-0.5">Exam date and time schedule</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label required>Exam Date</Label>
                <input type="date" name="examDate" value={formData.examDate} onChange={handleInputChange} 
                  className={inp} required />
              </div>

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

              <div>
                <Label>Duration (Auto-calculated)</Label>
                <input type="text" readOnly 
                  value={formData.startTime && formData.endTime ? `${((new Date(`2000-01-01 ${formData.endTime}`) - new Date(`2000-01-01 ${formData.startTime}`)) / 60000).toFixed(0)} minutes` : '—'}
                  className={`${inp} bg-gray-50 text-gray-500 cursor-not-allowed`} />
              </div>
            </div>
          </div>

          {/* Marks Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-amber-50 border-b border-amber-100">
              <h2 className="text-sm font-bold text-gray-800">Marks & Grading</h2>
              <p className="text-xs text-amber-600 mt-0.5">Total marks and passing criteria</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label required>Total Marks</Label>
                <input type="number" name="totalMarks" value={formData.totalMarks} onChange={handleInputChange} 
                  className={inp} placeholder="100" min="1" required />
              </div>

              <div>
                <Label required>Passing Marks</Label>
                <input type="number" name="passingMarks" value={formData.passingMarks} onChange={handleInputChange} 
                  className={inp} placeholder="40" min="0" required />
              </div>

              <div className="sm:col-span-2">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Passing Percentage:</span>{' '}
                    {formData.totalMarks && formData.passingMarks 
                      ? `${((formData.passingMarks / formData.totalMarks) * 100).toFixed(1)}%` 
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button type="button"
              onClick={() => navigate('/class-management/exams')}
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
              {submitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Update Exam' : 'Create Exam')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}