import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
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

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get('/hr/contracts/list');
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

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Contracts</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage staff contracts</p>
        </div>
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 font-medium text-xs"
        >
          <Icons.Plus />
          Add Contract
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
    </div>
  );
}
