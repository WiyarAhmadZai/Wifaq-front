import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del, put } from '../../api/axios';
import Swal from 'sweetalert2';

export const staffTaskFields = [
  { name: 'staff_name', label: 'Staff Name', type: 'text', required: true },
  { name: 'task', label: 'Task', type: 'textarea', required: true },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const staffTaskColumns = [
  { key: 'created_at', label: 'Assigned Date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
  { key: 'staff_name', label: 'Staff Name' },
  { key: 'task', label: 'Task', render: (val) => val?.length > 30 ? val.substring(0, 30) + '...' : val },
  { key: 'assigner', label: 'Assigned By', render: (val) => val?.name || '-' },
];

const getStatusBadge = (status) => {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };
  return styles[status] || 'bg-gray-100 text-gray-700';
};

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return labels[status] || status;
};

export default function StaffTask() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get('/hr/staff-tasks');
      setItems(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Swal.fire('Error', 'Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate('/hr/staff-task/create');
  };

  const handleEdit = (item) => {
    navigate(`/hr/staff-task/edit/${item.id}`);
  };

  const handleView = (item) => {
    navigate(`/hr/staff-task/show/${item.id}`);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await del(`/hr/staff-tasks/${id}`);
        Swal.fire('Deleted!', 'Record has been deleted.', 'success');
        fetchItems();
      } catch (error) {
        Swal.fire('Error!', 'Failed to delete record.', 'error');
      }
    }
  };

  const handleStatusUpdate = async (item) => {
    const { value: newStatus } = await Swal.fire({
      title: 'Update Status',
      input: 'select',
      inputOptions: {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed',
      },
      inputValue: item.status,
      inputPlaceholder: 'Select status',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Update',
    });

    if (newStatus && newStatus !== item.status) {
      try {
        await put(`/hr/staff-tasks/${item.id}`, {
          staff_name: item.staff_name,
          task: item.task,
          status: newStatus,
          notes: item.notes,
        });
        Swal.fire('Updated!', `Status changed to ${getStatusLabel(newStatus)}.`, 'success');
        fetchItems();
      } catch (error) {
        Swal.fire('Error!', 'Failed to update status.', 'error');
      }
    }
  };

  const handleQualityUpdate = async (item) => {
    if (item.status !== 'completed') {
      Swal.fire('Info', 'Quality can only be set for completed tasks.', 'info');
      return;
    }

    const { value: quality } = await Swal.fire({
      title: 'Rate Task Quality',
      input: 'select',
      inputOptions: {
        excellent: 'Excellent',
        good: 'Good',
        average: 'Average',
        poor: 'Poor',
      },
      inputPlaceholder: 'Select quality rating',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#6b7280',
    });

    if (quality) {
      try {
        await put(`/hr/staff-tasks/${item.id}`, {
          staff_name: item.staff_name,
          task: item.task,
          status: item.status,
          quality: quality,
          notes: item.notes,
        });
        Swal.fire('Updated!', `Quality rated as ${quality}.`, 'success');
        fetchItems();
      } catch (error) {
        Swal.fire('Error!', 'Failed to update quality.', 'error');
      }
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Staff Task</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage staff task records</p>
        </div>
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 font-medium text-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Entry
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-500 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-teal-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    ID
                  </th>
                  {staffTaskColumns.map(col => (
                    <th key={col.key} className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-medium text-teal-600">
                      #{String(index + 1).padStart(4, '0')}
                    </td>
                    {staffTaskColumns.map(col => (
                      <td key={col.key} className="px-3 py-2 text-xs text-gray-800">
                        {col.render ? col.render(item[col.key], item) : item[col.key]}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(item.status)}`}>
                        {getStatusLabel(item.status) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.quality ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          item.quality === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                          item.quality === 'good' ? 'bg-blue-100 text-blue-700' :
                          item.quality === 'average' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {item.quality.charAt(0).toUpperCase() + item.quality.slice(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStatusUpdate(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Update Status"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        {item.status === 'completed' && (
                          <button
                            onClick={() => handleQualityUpdate(item)}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Rate Quality"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleView(item)}
                          className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                          title="View"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <div className="text-center py-8 px-4">
              <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-xs">No records found</p>
              <button
                onClick={handleCreate}
                className="mt-3 text-teal-600 hover:text-teal-700 font-medium text-xs"
              >
                Create your first entry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
