import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

const Icons = {
  ArrowLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Save: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

export default function ExamsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    examTitle: '',
    examType: '',
    examCategory: '',
    classId: '',
    subjectId: '',
    examDate: '',
    startTime: '',
    endTime: '',
    duration: '',
    totalMarks: '',
    passingMarks: '',
    examVenue: '',
    supervisorId: '',
    instructions: '',
    syllabus: '',
    gradingScheme: '',
    specialInstructions: '',
    status: 'scheduled'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => { 
    const { name, value } = e.target; 
    setFormData(prev => ({ ...prev, [name]: value })); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => { 
      Swal.fire('Success', `Exam ${isEdit ? 'updated' : 'created'} successfully`, 'success'); 
      navigate('/class-management/exams'); 
      setSubmitting(false); 
    }, 500);
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/class-management/exams')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Icons.ArrowLeft />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Exam' : 'Add New Exam'}</h2>
          <p className="text-sm text-gray-500">{isEdit ? 'Update exam details' : 'Create a new exam'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Title <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="examTitle" 
                value={formData.examTitle} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="e.g., Mid Term Mathematics Exam" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type <span className="text-red-500">*</span></label>
              <select 
                name="examType" 
                value={formData.examType} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              >
                <option value="">Select Type</option>
                <option value="mid-term">Mid Term Exam</option>
                <option value="final">Final Exam</option>
                <option value="monthly">Monthly Test</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
                <option value="practical">Practical Exam</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Category</label>
              <select 
                name="examCategory" 
                value={formData.examCategory} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select Category</option>
                <option value="formative">Formative Assessment</option>
                <option value="summative">Summative Assessment</option>
                <option value="diagnostic">Diagnostic Test</option>
                <option value="placement">Placement Test</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class <span className="text-red-500">*</span></label>
              <select 
                name="classId" 
                value={formData.classId} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              >
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject <span className="text-red-500">*</span></label>
              <select 
                name="subjectId" 
                value={formData.subjectId} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              >
                <option value="">Select Subject</option>
                <option value="1">Mathematics</option>
                <option value="2">English</option>
                <option value="3">Urdu</option>
                <option value="4">Science</option>
                <option value="5">Islamiat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Date <span className="text-red-500">*</span></label>
              <input 
                type="date" 
                name="examDate" 
                value={formData.examDate} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input 
                type="time" 
                name="startTime" 
                value={formData.startTime} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <input 
                type="time" 
                name="endTime" 
                value={formData.endTime} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
              <input 
                type="number" 
                name="duration" 
                value={formData.duration} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="120" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                name="totalMarks" 
                value={formData.totalMarks} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="100" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Passing Marks <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                name="passingMarks" 
                value={formData.passingMarks} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="40" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Venue</label>
              <input 
                type="text" 
                name="examVenue" 
                value={formData.examVenue} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="e.g., Main Hall, Room 101" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supervisor</label>
              <select 
                name="supervisorId" 
                value={formData.supervisorId} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select Supervisor</option>
                <option value="1">Mr. Ahmad Khan</option>
                <option value="2">Ms. Fatima Ali</option>
                <option value="3">Mr. Hassan Raza</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grading Scheme</label>
              <select 
                name="gradingScheme" 
                value={formData.gradingScheme} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select Scheme</option>
                <option value="percentage">Percentage Based</option>
                <option value="gpa">GPA Based</option>
                <option value="grades">Grade Based</option>
                <option value="pass-fail">Pass/Fail</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="upcoming">Upcoming</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
              <textarea 
                name="instructions" 
                value={formData.instructions} 
                onChange={handleInputChange} 
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="General instructions for students" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Syllabus Coverage</label>
              <textarea 
                name="syllabus" 
                value={formData.syllabus} 
                onChange={handleInputChange} 
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Topics and chapters covered in this exam" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
              <textarea 
                name="specialInstructions" 
                value={formData.specialInstructions} 
                onChange={handleInputChange} 
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Any special requirements or arrangements" 
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button 
              type="button" 
              onClick={() => navigate('/class-management/exams')} 
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Icons.Save />
              {submitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Exam' : 'Create Exam')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}