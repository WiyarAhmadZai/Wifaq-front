import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../api/axios';
import Swal from 'sweetalert2';

export default function AddVendorShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendor();
  }, [id]);

  const fetchVendor = async () => {
    try {
      const response = await get(`/hr/vendors/${id}`);
      setVendor(response.data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
      Swal.fire('Error', 'Failed to load vendor', 'error');
      navigate('/hr/add-vendor');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500">Vendor not found</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getRatingDisplay = (rating) => {
    if (!rating) return <span className="text-gray-400 text-sm">N/A</span>;
    
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
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[rating] || 'bg-gray-100 text-gray-700'}`}>
        {ratingLabels[rating]}
      </span>
    );
  };

  return (
    <div className="w-full px-4 py-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Vendor Details</h2>
            <p className="text-xs text-gray-500 mt-1">ID: {vendor.id}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/hr/add-vendor/edit/${vendor.id}`)}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => navigate('/hr/add-vendor')}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs font-medium"
            >
              Back to List
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="font-medium">{vendor.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Category:</span>
                  <p className="font-medium">{vendor.category}</p>
                </div>
                <div>
                  <span className="text-gray-500">Work Type:</span>
                  <p className="font-medium">{vendor.work_type}</p>
                </div>
                <div>
                  <span className="text-gray-500">Contact:</span>
                  <p className="font-medium">{vendor.contact}</p>
                </div>
                <div>
                  <span className="text-gray-500">Recommended By:</span>
                  <p className="font-medium">{vendor.recommended_by}</p>
                </div>
                <div>
                  <span className="text-gray-500">Date Engaged:</span>
                  <p className="font-medium">{formatDate(vendor.date_engaged)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Ratings</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Quality Rating:</span>
                  <div>{getRatingDisplay(vendor.quality_rating)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Price Rating:</span>
                  <div>{getRatingDisplay(vendor.price_rating)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Deadline Rating:</span>
                  <div>{getRatingDisplay(vendor.deadline_rating)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Response Rating:</span>
                  <div>{getRatingDisplay(vendor.response_rating)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Address:</span>
                  <p className="font-medium">{vendor.address}</p>
                </div>
                <div>
                  <span className="text-gray-500">Payment Terms:</span>
                  <p className="font-medium">{vendor.payment_terms}</p>
                </div>
                <div>
                  <span className="text-gray-500">Notes:</span>
                  <p className="font-medium">{vendor.notes || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <p className="font-medium">{formatDate(vendor.created_at)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <p className="font-medium">{formatDate(vendor.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
