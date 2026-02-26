import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post, put } from '../../api/axios';
import Swal from 'sweetalert2';

export default function AddVendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    work_type: '',
    contact: '',
    address: '',
    payment_terms: '',
    recommended_by: '',
    date_engaged: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchItem();
    }
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/vendors/${id}`);
      const data = response.data;
      setFormData({
        name: data.name || '',
        category: data.category || '',
        work_type: data.work_type || '',
        contact: data.contact || '',
        address: data.address || '',
        payment_terms: data.payment_terms || '',
        recommended_by: data.recommended_by || '',
        date_engaged: data.date_engaged || '',
        notes: data.notes || '',
      });
    } catch (error) {
      Swal.fire('Error', 'Failed to load data', 'error');
      navigate('/hr/add-vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    try {
      if (isEdit) {
        await put(`/hr/vendors/${id}`, formData);
        Swal.fire('Success', 'Vendor updated successfully', 'success');
      } else {
        await post('/hr/vendors', formData);
        Swal.fire('Success', 'Vendor created successfully', 'success');
      }
      navigate('/hr/add-vendor');
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
            {isEdit ? 'Edit Vendor' : 'Create Vendor'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">
              Vendor Details
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={getFieldClass('name')}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className={getFieldClass('category')}
                >
                  <option value="">Select Category</option>
                  <option value="supplier">Supplier</option>
                  <option value="contractor">Contractor</option>
                  <option value="consultant">Consultant</option>
                  <option value="other">Other</option>
                </select>
                {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Work Type <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="work_type"
                  value={formData.work_type}
                  onChange={handleChange}
                  required
                  className={getFieldClass('work_type')}
                />
                {errors.work_type && <p className="mt-1 text-sm text-red-600">{errors.work_type[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contact <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                  className={getFieldClass('contact')}
                />
                {errors.contact && <p className="mt-1 text-sm text-red-600">{errors.contact[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Recommended By <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="recommended_by"
                  value={formData.recommended_by}
                  onChange={handleChange}
                  required
                  className={getFieldClass('recommended_by')}
                />
                {errors.recommended_by && <p className="mt-1 text-sm text-red-600">{errors.recommended_by[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date Engaged <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="date"
                  name="date_engaged"
                  value={formData.date_engaged}
                  onChange={handleChange}
                  required
                  className={getFieldClass('date_engaged')}
                />
                {errors.date_engaged && <p className="mt-1 text-sm text-red-600">{errors.date_engaged[0]}</p>}
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className={getFieldClass('address')}
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address[0]}</p>}
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Terms <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleChange}
                  required
                  rows={2}
                  className={getFieldClass('payment_terms')}
                />
                {errors.payment_terms && <p className="mt-1 text-sm text-red-600">{errors.payment_terms[0]}</p>}
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
              onClick={() => navigate('/hr/add-vendor')}
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
