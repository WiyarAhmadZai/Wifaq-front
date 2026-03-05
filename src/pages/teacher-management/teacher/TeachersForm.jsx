import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

const Icons = {
  ArrowLeft: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
  Save: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
};

export default function TeachersForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cnic: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    qualification: '',
    specialization: '',
    experience: '',
    joiningDate: '',
    salary: '',
    employmentType: 'full-time',
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
      Swal.fire('Success', `Record ${isEdit ? 'updated' : 'created'} successfully`, 'success'); 
      navigate('/teacher-management/teachers'); 
      setSubmitting(false); 
    }, 500);
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/teacher-management/teachers')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><Icons.ArrowLeft /></button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Teacher' : 'Add New Teacher'}</h2>
          <p className="text-sm text-gray-500">{isEdit ? 'Update teacher details' : 'Create a new teacher'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="firstName" 
                value={formData.firstName} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Enter first name" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="lastName" 
                value={formData.lastName} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Enter last name" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Enter email address" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone <span className="text-red-500">*</span></label>
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Enter phone number" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CNIC</label>
              <input 
                type="text" 
                name="cnic" 
                value={formData.cnic} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="XXXXX-XXXXXXX-X" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input 
                type="date" 
                name="dateOfBirth" 
                value={formData.dateOfBirth} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select 
                name="gender" 
                value={formData.gender} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
              <select 
                name="employmentType" 
                value={formData.employmentType} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="visiting">Visiting Faculty</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
              <input 
                type="text" 
                name="qualification" 
                value={formData.qualification} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="e.g., M.A, M.Sc, B.Ed" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
              <input 
                type="text" 
                name="specialization" 
                value={formData.specialization} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="e.g., Mathematics, Physics" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience (Years)</label>
              <input 
                type="number" 
                name="experience" 
                value={formData.experience} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Years of experience" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
              <input 
                type="date" 
                name="joiningDate" 
                value={formData.joiningDate} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
              <input 
                type="number" 
                name="salary" 
                value={formData.salary} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Monthly salary" 
              />
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
                <option value="on-leave">On Leave</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea 
                name="address" 
                value={formData.address} 
                onChange={handleInputChange} 
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                placeholder="Enter complete address" 
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button 
              type="button" 
              onClick={() => navigate('/teacher-management/teachers')} 
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
              {submitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Teacher' : 'Create Teacher')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}