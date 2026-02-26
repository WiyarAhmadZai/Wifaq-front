import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del, put } from '../../api/axios';
import Swal from 'sweetalert2';

const Icons = {
  Plus: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  EditStatus: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-gray-100 text-gray-700',
    expired: 'bg-red-100 text-red-700',
    terminated: 'bg-red-100 text-red-700',
    renewed: 'bg-blue-100 text-blue-700',
  };
  return styles[status] || 'bg-gray-100 text-gray-700';
};

const getContractTypeBadge = (type) => {
  const styles = {
    permanent: 'bg-emerald-100 text-emerald-700',
    fixed_term: 'bg-blue-100 text-blue-700',
    probation: 'bg-amber-100 text-amber-700',
    consultancy: 'bg-purple-100 text-purple-700',
    internship: 'bg-pink-100 text-pink-700',
  };
  return styles[type] || 'bg-gray-100 text-gray-700';
};

export default function Contracts() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    contract_type: '',
    search: ''
  });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [filters]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      // Build query parameters from filters
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.contract_type) queryParams.append('contract_type', filters.contract_type);
      if (filters.search) queryParams.append('search', filters.search);

      const queryString = queryParams.toString();
      const apiUrl = queryString ? `/hr/contracts/list?${queryString}` : '/hr/contracts/list';
      
      const response = await get(apiUrl);
      setItems(response.data?.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Swal.fire('Error', 'Failed to load contracts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate('/hr/contracts/create');
  };

  const handleEdit = (item) => {
    navigate(`/hr/contracts/edit/${item.id}`);
  };

  const handleView = (item) => {
    navigate(`/hr/contracts/show/${item.id}`);
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
        await del(`/hr/contracts/delete/${id}`);
        Swal.fire('Deleted!', 'Contract has been deleted.', 'success');
        fetchItems();
      } catch (error) {
        Swal.fire('Error!', 'Failed to delete contract.', 'error');
      }
    }
  };

  const handleOpenStatusModal = (contract) => {
    setSelectedContract(contract);
    setStatusUpdate({
      status: contract.status
    });
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setSelectedContract(null);
    setStatusUpdate({
      status: ''
    });
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdate.status) {
      Swal.fire('Error', 'Please select a status', 'error');
      return;
    }

    setSaving(true);
    try {
      await put(`/hr/contracts/update-status/${selectedContract.id}`, {
        status: statusUpdate.status
      });
      
      Swal.fire('Success', 'Contract status updated successfully', 'success');
      handleCloseStatusModal();
      fetchItems(); // Refresh the list
    } catch (error) {
      console.error('Update error:', error);
      Swal.fire('Error', 'Failed to update contract status', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Contracts</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage staff contracts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFilters({status: '', contract_type: '', search: ''});
            }}
            className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium"
          >
            Clear Filters
          </button>
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 font-medium text-xs"
          >
            <Icons.Plus />
            Add Contract
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
            <option value="renewed">Renewed</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Contract Type</label>
          <select
            value={filters.contract_type}
            onChange={(e) => setFilters({...filters, contract_type: e.target.value})}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
          >
            <option value="">All Types</option>
            <option value="permanent">Permanent</option>
            <option value="fixed_term">Fixed Term</option>
            <option value="probation">Probation</option>
            <option value="consultancy">Consultancy</option>
            <option value="internship">Internship</option>
          </select>
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            placeholder="Search by contract number, staff name..."
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
          />
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
            <table className="w-full min-w-[900px]">
              <thead className="bg-teal-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Contract #</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Staff</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Start Date</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">End Date</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Salary</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-medium text-teal-600">{item.contract_number}</td>
                    <td className="px-3 py-2 text-xs text-gray-800">{item.staff?.full_name || '-'}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getContractTypeBadge(item.contract_type)}`}>
                        {item.contract_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.start_date}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.end_date || 'No end date'}</td>
                    <td className="px-3 py-2 text-xs text-gray-800">AFN {parseFloat(item.salary).toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleView(item)} className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors" title="View">
                          <Icons.Eye />
                        </button>
                        <button onClick={() => handleEdit(item)} className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit">
                          <Icons.Edit />
                        </button>
                        <button onClick={() => handleOpenStatusModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Update Status">
                          <Icons.EditStatus />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                          <Icons.Trash />
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
              <p className="text-gray-500 text-xs">No contracts found</p>
              <button onClick={handleCreate} className="mt-3 text-teal-600 hover:text-teal-700 font-medium text-xs">
                Create your first contract
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Update Contract Status</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <div className={`px-3 py-2 rounded-lg ${getStatusBadge(selectedContract?.status)} text-sm`}>
                  {selectedContract?.status}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status *</label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select Status</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="terminated">Terminated</option>
                  <option value="renewed">Renewed</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleCloseStatusModal}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {saving ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
