import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { get, del, post, put, peekCache } from '../../api/axios';
import Swal from 'sweetalert2';
import { useResourcePermissions } from '../../admin/utils/useResourcePermissions';
import { useAuth } from '../../admin/context/AuthContext';

export default function JobApplicationList() {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = useResourcePermissions('applications');
  const { hasPermission } = useAuth();
  // Same grant the backend route checks, so the button never leads to a 403.
  const canBulkEmail = hasPermission('job-applications.manage');
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedApplicantIds, setSelectedApplicantIds] = useState([]);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [bulkEmail, setBulkEmail] = useState({ subject: '', message: '' });
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    message: ''
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState({
    status: searchParams.get('f_status') || '',
    position: searchParams.get('f_position') || '',
    reviewed: searchParams.get('f_reviewed') || '',
  });

  const setParams = (patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        const isDefault = v == null || v === '';
        if (isDefault) next.delete(k);
        else next.set(k, String(v));
      });
      return next;
    });
  };

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (filterValues.status) params.append('status', filterValues.status);
    if (filterValues.position) params.append('position', filterValues.position);
    if (filterValues.reviewed) params.append('reviewed', filterValues.reviewed);
    const url = `/hr/job-applications?${params.toString()}`;
    setLoading(true);
    try {
      const __cached = peekCache(url);
      if (__cached) {
        setItems(__cached);
        setLoading(false);
      }
      const response = await get(url);
      setItems(response.data);
    } catch (error) {
      console.error('Fetch error:', error);
      
      let errorMessage = 'An unexpected error occurred';
      let errorTitle = 'Error';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 500) {
          errorTitle = 'Server Error (500)';
          errorMessage = data?.message || 'Internal server error. Check Laravel logs.';
        } else if (status === 401) {
          errorTitle = 'Unauthorized (401)';
          errorMessage = 'Please login to access this resource.';
        } else if (status === 403) {
          errorTitle = 'Forbidden (403)';
          errorMessage = 'You do not have permission to access this resource.';
        } else if (status === 404) {
          errorTitle = 'Not Found (404)';
          errorMessage = 'The requested resource was not found.';
        } else if (status === 422) {
          errorTitle = 'Validation Error (422)';
          errorMessage = data?.message || 'Validation failed. Please check your input.';
        } else {
          errorTitle = `Error (${status})`;
          errorMessage = data?.message || `HTTP ${status} error`;
        }
      } else if (error.request) {
        errorTitle = 'Network Error';
        errorMessage = 'Cannot connect to server. Please check if Laravel is running on localhost:8000';
      }
      
      Swal.fire({
        title: errorTitle,
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#0d9488'
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterValues]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // A new search or filter shows a different list: drop the old selection so
  // nobody hidden from view is emailed.
  useEffect(() => {
    setSelectedApplicantIds([]);
  }, [searchQuery, filterValues]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== (searchParams.get('q') || '')) {
        setParams({ q: searchQuery, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e) => setSearchQuery(e.target.value);

  const setFilter = (key, value) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    setParams({ [`f_${key}`]: value, page: 1 });
  };

  const clearFilters = () => {
    setFilterValues({ status: '', position: '', reviewed: '' });
    setParams({ q: '', f_status: '', f_position: '', f_reviewed: '', page: 1 });
  };

  const activeFilterCount = Object.values(filterValues).filter(v => v).length;
  const selectedApplicantSet = useMemo(() => new Set(selectedApplicantIds), [selectedApplicantIds]);
  const allApplicantsSelected = items.length > 0 && items.every(item => selectedApplicantSet.has(item.id));

  const handleCreate = () => {
    navigate('/hr/job-application/create');
  };

  const handleEdit = (item) => {
    navigate(`/hr/job-application/edit/${item.id}`);
  };

  const handleView = (item) => {
    navigate(`/hr/job-application/show/${item.id}`);
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
        await del(`/hr/job-applications/${id}`);
        setSelectedApplicantIds(current => current.filter(selectedId => selectedId !== id));
        Swal.fire('Deleted!', 'Record has been deleted.', 'success');
        fetchItems();
      } catch (error) {
        Swal.fire('Error!', 'Failed to delete record.', 'error');
      }
    }
  };

  const openStatusModal = (application) => {
    setSelectedApplication(application);
    setStatusUpdate({
      status: application.status,
      message: ''
    });
    setShowModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdate.message.trim()) {
      Swal.fire('Error', 'Please enter a message for the status update.', 'error');
      return;
    }

    try {
      await put(`/hr/job-applications/${selectedApplication.id}`, {
        status: statusUpdate.status,
        status_message: statusUpdate.message
      });

      Swal.fire('Success', 'Status updated successfully and notification sent!', 'success');
      setShowModal(false);
      fetchItems(); // Refresh the list
    } catch (error) {
      console.error('Update error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const toggleApplicant = (id, checked) => {
    setSelectedApplicantIds(current => (
      checked ? [...new Set([...current, id])] : current.filter(selectedId => selectedId !== id)
    ));
  };

  const toggleAllApplicants = (checked) => {
    setSelectedApplicantIds(checked ? items.map(item => item.id) : []);
  };

  const sendBulkEmail = async (event) => {
    event.preventDefault();
    setSendingBulkEmail(true);

    try {
      // Always send the exact ids. `all_applicants: true` makes the backend
      // email EVERY applicant in the database, ignoring the search and
      // filters — so "select all" on a filtered list would reach people HR
      // never saw.
      const response = await post('/hr/job-applications/bulk-email', {
        all_applicants: false,
        application_ids: selectedApplicantIds,
        subject: bulkEmail.subject.trim(),
        message: bulkEmail.message.trim(),
      });
      const result = response.data.data || {};
      const summary = `Queued: ${result.queued || 0}; skipped (invalid email): ${result.skipped || 0}; failed: ${result.failed || 0}.`;

      setShowBulkEmailModal(false);
      setBulkEmail({ subject: '', message: '' });
      setSelectedApplicantIds([]);
      await Swal.fire({
        title: result.failed ? 'Email partially queued' : 'Bulk email queued',
        text: summary,
        icon: result.failed ? 'warning' : 'success',
        confirmButtonColor: '#0d9488',
      });
    } catch (error) {
      const result = error.response?.data?.data;
      const summary = result
        ? `Queued: ${result.queued || 0}; skipped (invalid email): ${result.skipped || 0}; failed: ${result.failed || 0}.`
        : error.response?.data?.message || 'Unable to queue the bulk email.';
      Swal.fire('Bulk email failed', summary, 'error');
    } finally {
      setSendingBulkEmail(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-blue-100 text-blue-700',
      reviewing: 'bg-yellow-100 text-yellow-700',
      interview: 'bg-purple-100 text-purple-700',
      hired: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Job Application</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage job application records</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {canBulkEmail && (
            <button
              type="button"
              onClick={() => setShowBulkEmailModal(true)}
              disabled={selectedApplicantIds.length === 0}
              className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs"
            >
              Email selected ({selectedApplicantIds.length})
            </button>
          )}
          {canCreate && (
            <button
              onClick={handleCreate}
              className="w-full sm:w-auto px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 font-medium text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Entry
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-500 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="bg-teal-50">
                <tr>
                  {canBulkEmail && (
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={allApplicantsSelected}
                        onChange={(event) => toggleAllApplicants(event.target.checked)}
                        aria-label="Select all applicants"
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                  )}
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {canBulkEmail && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedApplicantSet.has(item.id)}
                          onChange={(event) => toggleApplicant(item.id, event.target.checked)}
                          aria-label={`Select ${item.full_name}`}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 text-xs font-medium text-teal-600">
                      #{String(index + 1).padStart(4, '0')}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-800">
                      {item.full_name}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-800">
                      {item.position_applied}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-800">
                      {item.email}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-800">
                      {item.phone}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && (
                          <button
                            onClick={() => openStatusModal(item)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Update Status"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
                        {canUpdate && (
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
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
              {canCreate && (
                <button
                  onClick={handleCreate}
                  className="mt-3 text-teal-600 hover:text-teal-700 font-medium text-xs"
                >
                  Create your first entry
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Update Application Status</h3>
              <p className="text-sm text-gray-600 mt-1">
                For: <span className="font-medium">{selectedApplication.full_name}</span>
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedApplication.status)}`}>
                  {selectedApplication.status}
                </span>
              </div>
              
              <div>
                <label htmlFor="new-status" className="block text-sm font-medium text-gray-700 mb-1">
                  New Status
                </label>
                <select
                  id="new-status"
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="new">New</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="interview">Interview</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="status-message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message to Applicant
                </label>
                <textarea
                  id="status-message"
                  value={statusUpdate.message}
                  onChange={(e) => setStatusUpdate({...statusUpdate, message: e.target.value})}
                  rows={4}
                  placeholder="Enter a message to be sent to the applicant regarding the status change..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message will be sent to {selectedApplication.email}
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusUpdate}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Update & Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={sendBulkEmail} className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Email applicants</h3>
              <p className="text-sm text-gray-600 mt-1">
                This message will be sent privately to the {selectedApplicantIds.length} selected applicant{selectedApplicantIds.length === 1 ? '' : 's'}.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="bulk-email-subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  id="bulk-email-subject"
                  type="text"
                  maxLength={200}
                  required
                  value={bulkEmail.subject}
                  onChange={(event) => setBulkEmail(current => ({ ...current, subject: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label htmlFor="bulk-email-message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="bulk-email-message"
                  required
                  rows={7}
                  maxLength={10000}
                  value={bulkEmail.message}
                  onChange={(event) => setBulkEmail(current => ({ ...current, message: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <p className="text-xs text-gray-500">
                Each valid address receives a separate email. Delivery status is recorded per applicant.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkEmailModal(false)}
                disabled={sendingBulkEmail}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingBulkEmail || !bulkEmail.subject.trim() || !bulkEmail.message.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
              >
                {sendingBulkEmail ? 'Queuing...' : 'Send email'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}