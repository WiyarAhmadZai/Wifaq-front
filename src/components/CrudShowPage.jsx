import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, del } from '../api/axios';
import Swal from 'sweetalert2';

const Icons = {
  ArrowLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Document: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const getStatusBadge = (status) => {
  const styles = {
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    new: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    absent: 'bg-red-100 text-red-800 border-red-200',
    late: 'bg-amber-100 text-amber-800 border-amber-200',
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const InfoCard = ({ icon: Icon, label, value, highlight = false }) => (
  <div className={`p-4 rounded-xl ${highlight ? 'bg-teal-50 border border-teal-100' : 'bg-gray-50'}`}>
    <div className="flex items-center gap-2 text-teal-600 mb-2">
      <Icon />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-sm font-medium ${highlight ? 'text-teal-800' : 'text-gray-800'}`}>{value}</p>
  </div>
);

const DetailRow = ({ label, value, isStatus = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-0">
    <span className="text-xs text-gray-500 sm:w-1/3 mb-1 sm:mb-0">{label}</span>
    <div className="sm:w-2/3">
      {isStatus ? (
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(value)}`}>
          {value}
        </span>
      ) : (
        <span className="text-sm text-gray-800">{value || '-'}</span>
      )}
    </div>
  </div>
);

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
    if (field.name === 'created_at' && value) {
      return new Date(value).toLocaleString();
    }
    if (field.name === 'updated_at' && value) {
      return new Date(value).toLocaleString();
    }
    return value || '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
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

  const regularFields = fields.filter(f => f.name !== 'status');
  const statusField = fields.find(f => f.name === 'status');

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(listRoute)}
            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <Icons.ArrowLeft />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{title} Details</h2>
            <p className="text-xs text-gray-500">View complete information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`${editRoute}/${id}`)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 text-xs font-medium"
          >
            <Icons.Edit />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-xs font-medium"
          >
            <Icons.Trash />
            Delete
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Primary Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status Card */}
          {data.status && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                  <Icons.Document />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current Status</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(data.status)}`}>
                    {data.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Document />
              Primary Details
            </h3>
            <div className="space-y-1">
              {regularFields.map(field => (
                <DetailRow
                  key={field.name}
                  label={field.label}
                  value={getFieldValue(field)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Timeline & Meta */}
        <div className="space-y-5">
          {/* Timeline Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Clock />
              Activity Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
                  <Icons.Calendar />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Created On</p>
                  <p className="text-xs font-medium text-gray-800">
                    {data.created_at ? new Date(data.created_at).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
              <div className="w-px h-4 bg-gray-200 ml-4"></div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                  <Icons.Clock />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last Updated</p>
                  <p className="text-xs font-medium text-gray-800">
                    {data.updated_at ? new Date(data.updated_at).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Record Info Card */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-sm p-5 text-white">
            <h3 className="text-sm font-semibold mb-3">Record Information</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Record ID</span>
                <span className="text-xs font-medium">#{String(data.id).padStart(4, '0')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Type</span>
                <span className="text-xs font-medium">{title}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
