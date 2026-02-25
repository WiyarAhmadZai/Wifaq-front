import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';

const Icons = {
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Task: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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
  Star: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  Notes: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
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
};

const getStatusBadge = (status) => {
  const styles = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return labels[status] || status;
};

const getStatusIcon = (status) => {
  const icons = {
    pending: '⏳',
    in_progress: '🔄',
    completed: '✅',
  };
  return icons[status] || '⏳';
};

const getQualityBadge = (quality) => {
  const styles = {
    excellent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    good: 'bg-blue-100 text-blue-800 border-blue-200',
    average: 'bg-amber-100 text-amber-800 border-amber-200',
    poor: 'bg-red-100 text-red-800 border-red-200',
  };
  return styles[quality] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getQualityStars = (quality) => {
  const stars = {
    excellent: '★★★★★',
    good: '★★★★☆',
    average: '★★★☆☆',
    poor: '★★☆☆☆',
  };
  return stars[quality] || '☆☆☆☆☆';
};

const InfoCard = ({ icon: Icon, label, value, highlight = false }) => (
  <div className={`p-3 rounded-lg ${highlight ? 'bg-teal-50 border border-teal-100' : 'bg-gray-50'}`}>
    <div className="flex items-center gap-2 text-teal-600 mb-1">
      <Icon />
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-xs font-medium ${highlight ? 'text-teal-800' : 'text-gray-800'}`}>{value}</p>
  </div>
);

const TimelineItem = ({ icon: Icon, label, value, color = 'teal' }) => (
  <div className="flex items-start gap-3">
    <div className={`w-8 h-8 rounded-full bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
      <Icon />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-gray-800">{value}</p>
    </div>
  </div>
);

export default function StaffTaskShow() {
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
      const response = await get(`/hr/staff-tasks/${id}`);
      setData(response.data);
    } catch (error) {
      Swal.fire('Error', 'Failed to load task', 'error');
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
        await del(`/hr/staff-tasks/${id}`);
        Swal.fire('Deleted', 'Task deleted successfully', 'success');
        navigate('/hr/staff-task');
      } catch (error) {
        Swal.fire('Error', 'Failed to delete', 'error');
      }
    }
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
        <p className="text-gray-500">Task not found</p>
        <button
          onClick={() => navigate('/hr/staff-task')}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hr/staff-task')}
            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <Icons.ArrowLeft />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Task Details</h2>
            <p className="text-xs text-gray-500">View complete task information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/hr/staff-task/edit/${id}`)}
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Task Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getStatusIcon(data.status)}</span>
                <div>
                  <p className="text-xs text-gray-500">Current Status</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(data.status)}`}>
                    {getStatusLabel(data.status)}
                  </span>
                </div>
              </div>
              {data.quality && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Quality Rating</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getQualityBadge(data.quality)}`}>
                    {getQualityStars(data.quality)} {data.quality.charAt(0).toUpperCase() + data.quality.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Task Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Task />
              Task Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <InfoCard icon={Icons.User} label="Staff Name" value={data.staff_name} highlight />
              <InfoCard icon={Icons.User} label="Assigned By" value={data.assigner?.name || '-'} />
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-teal-600 mb-2">
                <Icons.Task />
                <span className="text-[10px] font-medium uppercase tracking-wider">Task Description</span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{data.task}</p>
            </div>
            {data.notes && (
              <div className="mt-4 bg-amber-50 rounded-lg p-4 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Icons.Notes />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Additional Notes</span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{data.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Timeline */}
        <div className="space-y-5">
          {/* Timeline Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Clock />
              Timeline
            </h3>
            <div className="space-y-4">
              <TimelineItem
                icon={Icons.Calendar}
                label="Assigned On"
                value={data.created_at ? new Date(data.created_at).toLocaleString() : '-'}
                color="teal"
              />
              <div className="w-px h-4 bg-gray-200 ml-4"></div>
              <TimelineItem
                icon={Icons.Clock}
                label="Started On"
                value={data.started_at ? new Date(data.started_at).toLocaleString() : (data.created_at ? new Date(data.created_at).toLocaleString() : 'Not started yet')}
                color={data.started_at || data.created_at ? 'blue' : 'gray'}
              />
              <div className="w-px h-4 bg-gray-200 ml-4"></div>
              <TimelineItem
                icon={Icons.Clock}
                label="Completed On"
                value={data.completed_at ? new Date(data.completed_at).toLocaleString() : 'Not completed yet'}
                color={data.completed_at ? 'emerald' : 'gray'}
              />
              <div className="w-px h-4 bg-gray-200 ml-4"></div>
              <TimelineItem
                icon={Icons.Calendar}
                label="Last Updated"
                value={data.updated_at ? new Date(data.updated_at).toLocaleString() : '-'}
                color="gray"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-sm p-5 text-white">
            <h3 className="text-sm font-semibold mb-3">Task Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Task ID</span>
                <span className="text-xs font-medium">#{String(data.id).padStart(4, '0')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Duration</span>
                <span className="text-xs font-medium">
                  {data.started_at && data.completed_at
                    ? `${Math.ceil((new Date(data.completed_at) - new Date(data.started_at)) / (1000 * 60 * 60))} hours`
                    : 'In progress'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Quality</span>
                <span className="text-xs font-medium">
                  {data.quality ? data.quality.charAt(0).toUpperCase() + data.quality.slice(1) : 'Not rated'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
