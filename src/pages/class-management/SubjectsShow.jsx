import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';
import { useResourcePermissions } from '../../admin/utils/useResourcePermissions';

const getStatusBadge = (status) => ({
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-700'
}[status] || 'bg-gray-100 text-gray-700');

export default function SubjectsShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { canUpdate, canDelete } = useResourcePermissions("subjects");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchItem(); }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await get(`/class-management/subjects/show/${id}`);
      setData(res.data?.data || res.data);
    } catch {
      Swal.fire('Error', 'Failed to load subject', 'error');
      navigate('/class-management/subjects');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({ title: 'Delete Subject?', text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0d9488', cancelButtonColor: '#ef4444', confirmButtonText: 'Yes, delete' });
    if (result.isConfirmed) {
      try { await del(`/class-management/subjects/delete/${id}`); } catch {}
      Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
      navigate('/class-management/subjects');
    }
  };

  if (loading) return (<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>);
  if (!data) return (<div className="flex items-center justify-center py-24"><p className="text-sm text-gray-400">Subject not found</p></div>);

  const InfoRow = ({ label, value, highlight = false }) => (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm ${highlight ? 'font-bold text-teal-600' : 'font-medium text-gray-800'}`}>{value || '—'}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/class-management/subjects')} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">Subject Details</h1>
              <p className="text-xs text-teal-100 mt-0.5">View subject information</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canUpdate && (
              <button onClick={() => navigate(`/class-management/subjects/edit/${id}`)}
                className="px-4 py-2 bg-white text-teal-600 rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2 font-semibold text-xs shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete}
                className="px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-white rounded-xl transition-colors flex items-center gap-2 font-semibold text-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6 space-y-4">
        {/* Quick Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800 mb-1">{data.subject_name}</h2>
              <p className="text-xs text-gray-500">Code: {data.subject_code}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-semibold capitalize ${getStatusBadge(data.status)}`}>{data.status}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Category</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{data.category}</p>
            </div>
            {data.field && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Field</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{data.field}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Weekly Hours</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{data.weekly_hours ? `${data.weekly_hours}h` : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Status</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5 capitalize">{data.status}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Book Information */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-800">Book Information</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <InfoRow label="Book Name" value={data.book_name} highlight />
              <InfoRow label="Author" value={data.author} />
              <InfoRow label="Edition" value={data.edition} />
              <InfoRow label="Total Pages" value={data.total_pages} />
              <div className="col-span-2">
                <InfoRow label="Chapters" value={data.chapters} />
              </div>
            </div>
          </div>

          {/* Teaching Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-800">Teaching Timeline</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <InfoRow label="Start Date" value={data.start_date?.split('T')[0]} />
              <InfoRow label="Expected Completion" value={data.expected_completion_date?.split('T')[0]} />
              <InfoRow label="Weekly Hours" value={data.weekly_hours ? `${data.weekly_hours} hours` : null} highlight />
              <InfoRow label="Created" value={data.created_at ? new Date(data.created_at).toLocaleDateString() : null} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
