import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post, put } from '../../api/axios';
import Swal from 'sweetalert2';

export default function JobApplicationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    position_applied: '',
    qualification: '',
    experience: '',
    expected_salary: '',
    cv: null,
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cvFileName, setCvFileName] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchItem();
    }
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/job-applications/${id}`);
      const data = response.data;
      setFormData({
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        position_applied: data.position_applied || '',
        qualification: data.qualification || '',
        experience: data.experience || '',
        expected_salary: data.expected_salary || '',
        cv: null, // Don't set the file object, just track the filename
        notes: data.notes || '',
      });
      if (data.cv_path) {
        setCvFileName(data.cv_path.split('/').pop());
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to load data', 'error');
      navigate('/hr/job-application');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0],
      }));
      if (files[0]) {
        setCvFileName(files[0].name);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    try {
      const dataToSend = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          // Only append file if it's a File object
          if (key === 'cv' && formData[key] instanceof File) {
            dataToSend.append(key, formData[key]);
          } else if (key !== 'cv') {
            dataToSend.append(key, formData[key]);
          }
        }
      });

      // Set status to 'new' by default for new applications
      if (!isEdit) {
        dataToSend.append('status', 'new');
      }

      if (isEdit) {
        await put(`/hr/job-applications/${id}`, dataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        Swal.fire('Success', 'Job application updated successfully', 'success');
      } else {
        await post('/hr/job-applications', dataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        Swal.fire('Success', 'Job application created successfully', 'success');
      }
      navigate('/hr/job-application');
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        const firstError = Object.values(error.response.data.errors)[0][0];
        Swal.fire('Validation Error', firstError, 'warning');
      } else {
        Swal.fire('Error', error.response?.data?.message || 'Failed to save', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldClass = (fieldName) => {
    const baseClass = "w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs transition-colors";
    const errorClass = errors[fieldName] ? "border-red-500 bg-red-50" : "border-gray-300";
    return `${baseClass} ${errorClass}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            {isEdit ? 'Edit Job Application' : 'Create Job Application'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">
              Primary Details
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className={getFieldClass('full_name')}
                />
                {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={getFieldClass('email')}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className={getFieldClass('phone')}
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Position Applied <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="position_applied"
                  value={formData.position_applied}
                  onChange={handleChange}
                  required
                  className={getFieldClass('position_applied')}
                />
                {errors.position_applied && <p className="mt-1 text-sm text-red-600">{errors.position_applied[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Expected Salary
                </label>
                <input
                  type="number"
                  name="expected_salary"
                  value={formData.expected_salary}
                  onChange={handleChange}
                  className={getFieldClass('expected_salary')}
                />
                {errors.expected_salary && <p className="mt-1 text-sm text-red-600">{errors.expected_salary[0]}</p>}
              </div>



              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Qualification <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  required
                  rows={3}
                  className={getFieldClass('qualification')}
                />
                {errors.qualification && <p className="mt-1 text-sm text-red-600">{errors.qualification[0]}</p>}
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Experience <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  required
                  rows={3}
                  className={getFieldClass('experience')}
                />
                {errors.experience && <p className="mt-1 text-sm text-red-600">{errors.experience[0]}</p>}
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  CV
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    name="cv"
                    onChange={handleChange}
                    accept=".pdf,.doc,.docx"
                    className="w-full text-xs"
                  />
                </div>
                {cvFileName && (
                  <p className="text-xs text-gray-600 mt-1">Selected: {cvFileName}</p>
                )}
                {errors.cv && <p className="mt-1 text-sm text-red-600">{errors.cv[0]}</p>}
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  className={getFieldClass('notes')}
                />
                {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes[0]}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium text-xs"
            >
              {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/hr/job-application')}
              className="w-full sm:w-auto px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}