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
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-xs">Record not found</p>
        <button
          onClick={() => navigate(listRoute)}
          className="mt-3 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs"
        >
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">{title} Details</h2>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => navigate(`${editRoute}/${id}`)}
              className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium"
            >
              Delete
            </button>
            <button
              onClick={() => navigate(listRoute)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs font-medium"
            >
              Back
            </button>
          </div>
        </div>

        <div className="p-4">
          {data.status && (
            <div className="mb-4">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(data.status)}`}>
                {data.status}
              </span>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">
              Primary Details
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {fields.map(field => (
                <div key={field.name} className={field.type === 'textarea' ? 'lg:col-span-2' : ''}>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    {field.label}
                  </label>
                  <p className="text-xs text-gray-900 bg-white px-2.5 py-1.5 rounded border border-gray-200">
                    {getFieldValue(field)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Activity Log</h3>
            <div className="text-[10px] text-gray-500 space-y-0.5">
              <p>Created: {data.created_at ? new Date(data.created_at).toLocaleString() : '-'}</p>
              <p>Updated: {data.updated_at ? new Date(data.updated_at).toLocaleString() : '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
