import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del, put } from '../../api/axios';
import Swal from 'sweetalert2';

export default function AddVendor() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ratingUpdates, setRatingUpdates] = useState({
    quality_rating: '',
    price_rating: '',
    deadline_rating: '',
    response_rating: ''
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get('/hr/vendors');
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
  };

  const handleCreate = () => {
    navigate('/hr/add-vendor/create');
  };

  const handleEdit = (item) => {
    navigate(`/hr/add-vendor/edit/${item.id}`);
  };

  const handleView = (item) => {
    navigate(`/hr/add-vendor/show/${item.id}`);
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
        await del(`/hr/vendors/${id}`);
        Swal.fire('Deleted!', 'Record has been deleted.', 'success');
        fetchItems();
      } catch (error) {
        Swal.fire('Error!', 'Failed to delete record.', 'error');
      }
    }
  };

  const openRatingModal = (vendor) => {
    setSelectedVendor(vendor);
    setRatingUpdates({
      quality_rating: vendor.quality_rating || '',
      price_rating: vendor.price_rating || '',
      deadline_rating: vendor.deadline_rating || '',
      response_rating: vendor.response_rating || ''
    });
    setShowRatingModal(true);
  };

  const handleRatingUpdate = async () => {
    setSaving(true);
    try {
      // Only send fields that have values (non-empty)
      const updatesToSend = {};
      Object.keys(ratingUpdates).forEach(key => {
        if (ratingUpdates[key] !== '') {
          updatesToSend[key] = ratingUpdates[key];
        }
      });

      await put(`/hr/vendors/${selectedVendor.id}`, updatesToSend);
      Swal.fire('Success', 'Ratings updated successfully!', 'success');
      setShowRatingModal(false);
      fetchItems(); // Refresh the list
    } catch (error) {
      console.error('Update error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to update ratings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRatingChange = (field, value) => {
    setRatingUpdates(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getRatingBadge = (rating) => {
    if (!rating) return <span className="text-gray-400 text-xs">N/A</span>;
    
    const ratingLabels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    
    const colorClasses = {
      1: 'bg-red-100 text-red-700',
      2: 'bg-orange-100 text-orange-700', 
      3: 'bg-yellow-100 text-yellow-700',
      4: 'bg-blue-100 text-blue-700',
      5: 'bg-green-100 text-green-700'
    };
    
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${colorClasses[rating] || 'bg-gray-100 text-gray-700'}`}>
        {ratingLabels[rating]}
      </span>
    );
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Vendor</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage vendor records</p>
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
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Date Engaged
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Deadline
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Response
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
                    <td className="px-3 py-2 text-xs text-gray-800">
                      {item.name}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-800">
                      {item.category}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-800">
                      {item.contact}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-800">
                      {new Date(item.date_engaged).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      {getRatingBadge(item.quality_rating)}
                    </td>
                    <td className="px-3 py-2">
                      {getRatingBadge(item.price_rating)}
                    </td>
                    <td className="px-3 py-2">
                      {getRatingBadge(item.deadline_rating)}
                    </td>
                    <td className="px-3 py-2">
                      {getRatingBadge(item.response_rating)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openRatingModal(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Update Ratings"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
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

      {/* Rating Update Modal */}
      {showRatingModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Update Vendor Ratings</h3>
              <p className="text-sm text-gray-600 mt-1">
                For: <span className="font-medium">{selectedVendor.name}</span>
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quality (1-5)</label>
                <select
                  value={ratingUpdates.quality_rating}
                  onChange={(e) => handleRatingChange('quality_rating', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="">-- Select --</option>
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Fair (1-5)</label>
                <select
                  value={ratingUpdates.price_rating}
                  onChange={(e) => handleRatingChange('price_rating', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="">-- Select --</option>
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (1-5)</label>
                <select
                  value={ratingUpdates.deadline_rating}
                  onChange={(e) => handleRatingChange('deadline_rating', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="">-- Select --</option>
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Response (1-5)</label>
                <select
                  value={ratingUpdates.response_rating}
                  onChange={(e) => handleRatingChange('response_rating', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="">-- Select --</option>
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRatingUpdate}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                disabled={saving}
              >
                {saving ? 'Updating...' : 'Update Ratings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
