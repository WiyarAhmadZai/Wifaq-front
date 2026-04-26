import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';
import { useResourcePermissions } from '../../admin/utils/useResourcePermissions';

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
  const { canUpdate, canDelete } = useResourcePermissions("contracts");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);

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
          {(() => {
            let dl = null;
            if (data.has_probation && data.probation_end_date) {
              const end = new Date(data.probation_end_date);
              const now = new Date(); now.setHours(0,0,0,0); end.setHours(0,0,0,0);
              dl = Math.ceil((end - now) / (1000*60*60*24));
            }
            const show = (dl !== null && dl <= 3) || data.status === 'expired';
            if (!show) return null;
            if (!canUpdate) return null;
            return (
              <button onClick={() => setShowRenewModal(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-xs font-medium animate-pulse">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {data.status === 'expired' ? 'Expired — Renew' : dl <= 0 ? 'Expired — Renew' : `${dl}d left — Renew`}
              </button>
            );
          })()}
          {canUpdate && (
            <button onClick={() => navigate(`/hr/contracts/edit/${id}`)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 text-xs font-medium">
              <Icons.Edit /> Edit
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-xs font-medium">
              <Icons.Trash /> Delete
            </button>
          )}
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
                <p className="text-sm text-gray-500">{data.staff?.application?.full_name || data.staff?.full_name || 'Unknown Staff'}</p>
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
              <InfoCard icon={Icons.Calendar} label="End Date" value={data.end_date || data.probation_end_date || 'No end date'} />
              {data.has_probation && data.probation_end_date && (
                <InfoCard icon={Icons.Calendar} label="Probation End" value={data.probation_end_date} />
              )}
              <InfoCard icon={Icons.Currency} label="Salary" value={`${data.salary_currency || 'AFN'} ${parseFloat(data.salary).toLocaleString()}`} />
            </div>
          </div>

          {/* Probation Feedback */}
          {data.probation_feedback && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                Probation Feedback
              </h3>
              <p className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{data.probation_feedback}</p>
              {data.probation_feedback_at && (
                <p className="text-[10px] text-gray-400 mt-2">Submitted: {new Date(data.probation_feedback_at).toLocaleString()}</p>
              )}
            </div>
          )}

          {/* Contract History */}
          {data.staff_contracts?.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Contract History
                <span className="ml-auto text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{data.staff_contracts.length} contracts</span>
              </h3>
              <div className="space-y-2.5">
                {data.staff_contracts.map((c) => {
                  const isCurrent = c.id === data.id;
                  return (
                    <div key={c.id}
                      onClick={() => !isCurrent && navigate(`/hr/contracts/show/${c.id}`)}
                      className={`p-3 rounded-lg border transition-all ${isCurrent ? 'bg-teal-50 border-teal-300' : 'bg-gray-50 border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 cursor-pointer'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-gray-800">{c.contract_number}</p>
                          {isCurrent && <span className="text-[9px] font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded">Current</span>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize ${getStatusBadge(c.status)}`}>{c.status}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span className="capitalize">{c.contract_type?.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{c.start_date} → {c.end_date || c.probation_end_date || 'No end'}</span>
                        <span>•</span>
                        <span>{c.salary_currency || 'AFN'} {parseFloat(c.salary).toLocaleString()}</span>
                      </div>
                      {c.probation_feedback && (
                        <p className="text-[10px] text-gray-400 mt-1.5 truncate">Feedback: {c.probation_feedback}</p>
                      )}
                    </div>
                  );
                })}
              </div>
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

      {/* Renew Modal */}
      {showRenewModal && data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-orange-50 border-b border-orange-200">
              <h3 className="text-sm font-bold text-gray-800">Contract Action Required</h3>
              <p className="text-[11px] text-orange-600 mt-0.5">{data.staff?.application?.full_name || data.staff?.full_name} — {data.contract_number}</p>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500">What would you like to do?</p>
              <button onClick={() => { setShowRenewModal(false); navigate(`/hr/contracts/edit/${id}`); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all text-left group">
                <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <Icons.Edit />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Edit Current Contract</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Update dates, salary, or probation details</p>
                </div>
              </button>
              <button onClick={() => { setShowRenewModal(false); navigate(`/hr/contracts/create?staff_id=${data.staff_id}`); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Create New Contract</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Start a fresh contract for this staff member</p>
                </div>
              </button>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
              <button onClick={() => setShowRenewModal(false)} className="w-full py-2 text-xs font-medium text-gray-600 hover:text-gray-800">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
