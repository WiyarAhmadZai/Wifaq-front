import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, del } from '../api/axios';
import Swal from 'sweetalert2';

export default function CrudShowPage({ title, apiEndpoint, fields, listRoute, editRoute }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await get(`${apiEndpoint}/${id}`);
      setData(response.data);
    } catch (error) {
      Swal.fire('Error', 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await del(`${apiEndpoint}/${id}`);
        Swal.fire('Deleted', 'Record deleted successfully', 'success');
        navigate(listRoute);
      } catch (error) {
        Swal.fire('Error', 'Failed to delete', 'error');
      }
    }
  };

  const getFieldValue = (field) => {
    const value = data?.[field.name];
    if (field.type === 'select') {
      const option = field.options?.find(opt => opt.value === value);
      return option?.label || value || '-';
    }
    if (field.type === 'checkbox') {
      return value ? 'Yes' : 'No';
    }
    if (field.type === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    return value || '-';
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      completed: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-purple-100 text-purple-800',
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Record not found</p>
        <button
          onClick={() => navigate(listRoute)}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{title} Details</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`${editRoute}/${id}`)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Delete
            </button>
            <button
              onClick={() => navigate(listRoute)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Back
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {data.status && (
            <div className="mb-6">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusBadge(data.status)}`}>
                {data.status}
              </span>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-4">
              Primary Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {fields.map(field => (
                <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">
                    {field.label}
                  </label>
                  <p className="text-sm sm:text-base text-gray-900">
                    {getFieldValue(field)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 sm:pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Log</h3>
            <div className="text-xs sm:text-sm text-gray-500 space-y-1">
              <p>Created: {data.created_at ? new Date(data.created_at).toLocaleString() : '-'}</p>
              <p>Updated: {data.updated_at ? new Date(data.updated_at).toLocaleString() : '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
