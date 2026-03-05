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

export default function SubjectsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    subjectCode: '',
    subjectName: '',
    category: '',
    credits: '',
    hoursPerWeek: '',
    gradeLevel: '',
    department: '',
    teacherId: '',
    classId: '',
    description: '',
    prerequisites: '',
    learningOutcomes: '',
    assessmentMethod: '',
    textbook: '',
    status: 'active'
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
      Swal.fire('Success', `Subject ${isEdit ? 'updated' : 'created'} successfully`, 'success'); 
      navigate('/class-management/subjects'); 
      setSubmitting(false); 
    }, 500);
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/class-management/subjects')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Icons.ArrowLeft />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Subject' : 'Add New Subject'}</h2>
          <p className="text-sm text-gray-500">{isEdit ? 'Update subject details' : 'Create a new subject'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Code <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="subjectCode" 
                value={formData.subjectCode} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="e.g., MATH-101" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="subjectName" 
                value={formData.subjectName} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="e.g., Mathematics" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select 
                name="category" 
                value={formData.category} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select Category</option>
                <option value="core">Core Subject</option>
                <option value="elective">Elective</option>
                <option value="language">Language</option>
                <option value="science">Science</option>
                <option value="arts">Arts</option>
                <option value="sports">Sports</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credits</label>
              <input 
                type="number" 
                name="credits" 
                value={formData.credits} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Credit hours" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hours Per Week</label>
              <input 
                type="number" 
                name="hoursPerWeek" 
                value={formData.hoursPerWeek} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Weekly teaching hours" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
              <select 
                name="gradeLevel" 
                value={formData.gradeLevel} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select Grade Level</option>
                <option value="1">Grade 1</option>
                <option value="2">Grade 2</option>
                <option value="3">Grade 3</option>
                <option value="4">Grade 4</option>
                <option value="5">Grade 5</option>
                <option value="6">Grade 6</option>
                <option value="7">Grade 7</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input 
                type="text" 
                name="department" 
                value={formData.department} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="e.g., Science Department" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Teacher</label>
              <select 
                name="teacherId" 
                value={formData.teacherId} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select Teacher</option>
                <option value="1">Mr. Ahmad Khan</option>
                <option value="2">Ms. Fatima Ali</option>
                <option value="3">Mr. Hassan Raza</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Class</label>
              <select 
                name="classId" 
                value={formData.classId} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select Class</option>
                <option value="1">Class 1-A</option>
                <option value="2">Class 1-B</option>
                <option value="3">Class 2-A</option>
                <option value="4">Class 2-B</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Method</label>
              <select 
                name="assessmentMethod" 
                value={formData.assessmentMethod} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select Method</option>
                <option value="written">Written Exam</option>
                <option value="practical">Practical Exam</option>
                <option value="oral">Oral Exam</option>
                <option value="project">Project Based</option>
                <option value="mixed">Mixed Assessment</option>
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Subject description and objectives" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisites</label>
              <textarea 
                name="prerequisites" 
                value={formData.prerequisites} 
                onChange={handleInputChange} 
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Required prerequisites for this subject" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Learning Outcomes</label>
              <textarea 
                name="learningOutcomes" 
                value={formData.learningOutcomes} 
                onChange={handleInputChange} 
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Expected learning outcomes" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Textbook</label>
              <input 
                type="text" 
                name="textbook" 
                value={formData.textbook} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Primary textbook name" 
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button 
              type="button" 
              onClick={() => navigate('/class-management/subjects')} 
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
              {submitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Subject' : 'Create Subject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}