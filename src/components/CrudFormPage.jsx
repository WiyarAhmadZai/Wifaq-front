import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post, put } from '../api/axios';
import Swal from 'sweetalert2';

export default function CrudFormPage({ title, apiEndpoint, fields, listRoute }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchItem();
    } else {
      const defaults = {};
      fields.forEach(field => {
        if (field.type === 'checkbox') defaults[field.name] = false;
        else if (field.type === 'number') defaults[field.name] = '';
        else defaults[field.name] = '';
      });
      setFormData(defaults);
    }
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await get(`${apiEndpoint}/${id}`);
      setFormData(response.data);
    } catch (error) {
      Swal.fire('Error', 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await put(`${apiEndpoint}/${id}`, formData);
        Swal.fire('Success', 'Updated successfully', 'success');
      } else {
        await post(apiEndpoint, formData);
        Swal.fire('Success', 'Created successfully', 'success');
      }
      navigate(listRoute);
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.name] ?? '';

    if (field.type === 'select') {
      return (
        <select
          name={field.name}
          value={value}
          onChange={handleChange}
          required={field.required}
          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base"
        >
          <option value="">Select {field.label}</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          name={field.name}
          value={value}
          onChange={handleChange}
          required={field.required}
          rows={4}
          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base"
        />
      );
    }

    if (field.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          name={field.name}
          checked={Boolean(value)}
          onChange={handleChange}
          className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
        />
      );
    }

    if (field.type === 'date') {
      return (
        <input
          type="date"
          name={field.name}
          value={value}
          onChange={handleChange}
          required={field.required}
          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base"
        />
      );
    }

    return (
      <input
        type={field.type || 'text'}
        name={field.name}
        value={value}
        onChange={handleChange}
        required={field.required}
        className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base"
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            {isEdit ? `Edit ${title}` : `Create ${title}`}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-4">
              Primary Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {fields.map(field => (
                <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2 sm:py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium text-sm sm:text-base"
            >
              {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
            </button>
            <button
              type="button"
              onClick={() => navigate(listRoute)}
              className="w-full sm:w-auto px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm sm:text-base"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
