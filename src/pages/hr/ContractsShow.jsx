import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
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
  Document: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Currency: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    expired: 'bg-red-100 text-red-800 border-red-200',
    terminated: 'bg-red-100 text-red-800 border-red-200',
    renewed: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const InfoCard = ({ icon: Icon, label, value }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="flex items-center gap-2 text-teal-600 mb-1">
      <Icon />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-xs font-medium text-gray-800">{value || '-'}</p>
  </div>
);

export default function ContractsShow() {
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
      const response = await get(`/hr/contracts/show/${id}`);
      setData(response.data);
    } catch (error) {
      Swal.fire('Error', 'Failed to load contract', 'error');
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
        await del(`/hr/contracts/delete/${id}`);
        Swal.fire('Deleted', 'Contract deleted successfully', 'success');
        navigate('/hr/contracts');
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
        <p className="text-gray-500">Contract not found</p>
        <button onClick={() => navigate('/hr/contracts')} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/hr/contracts')} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
            <Icons.ArrowLeft />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Contract Details</h2>
            <p className="text-xs text-gray-500">View complete contract information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/hr/contracts/edit/${id}`)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 text-xs font-medium">
            <Icons.Edit /> Edit
          </button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-xs font-medium">
            <Icons.Trash /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                <Icons.Document />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{data.contract_number}</h3>
                <p className="text-sm text-gray-500">{data.staff?.full_name || 'Unknown Staff'}</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border mt-1 ${getStatusBadge(data.status)}`}>
                  {data.status}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Document /> Contract Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard icon={Icons.Document} label="Contract Type" value={data.contract_type?.replace('_', ' ')} />
              <InfoCard icon={Icons.Calendar} label="Start Date" value={data.start_date} />
              <InfoCard icon={Icons.Calendar} label="End Date" value={data.end_date || 'No end date'} />
              <InfoCard icon={Icons.Currency} label="Salary" value={`AFN ${parseFloat(data.salary).toLocaleString()}`} />
            </div>
          </div>

          {data.job_description && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Job Description</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{data.job_description}</p>
            </div>
          )}

          {data.terms_conditions && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Terms & Conditions</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{data.terms_conditions}</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Activity</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Created</p>
                <p className="text-xs text-gray-800">{data.created_at ? new Date(data.created_at).toLocaleString() : '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last Updated</p>
                <p className="text-xs text-gray-800">{data.updated_at ? new Date(data.updated_at).toLocaleString() : '-'}</p>
              </div>
              {data.approved_at && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Approved</p>
                  <p className="text-xs text-gray-800">{new Date(data.approved_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-sm p-5 text-white">
            <h3 className="text-sm font-semibold mb-3">Contract Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Contract ID</span>
                <span className="text-xs font-medium">#{data.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Status</span>
                <span className="text-xs font-medium capitalize">{data.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
