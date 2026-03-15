import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../api/axios';

const DEMO = {
  1: { id: 1, project_name: "School Renovation Phase 1", start_date: "2026-01-15", end_date: "2026-06-30", budget: 1500000, manager_id: 1, manager_name: "Ahmad Rahimi", manager_code: "WS-2026-001", created_at: "2026-01-10T10:00:00Z" },
  2: { id: 2, project_name: "IT Infrastructure Upgrade", start_date: "2026-02-01", end_date: "2026-04-30", budget: 350000, manager_id: 4, manager_name: "Ali Ahmadi", manager_code: "WS-2026-004", created_at: "2026-01-25T09:00:00Z" },
  3: { id: 3, project_name: "Curriculum Development 1405", start_date: "2025-09-01", end_date: "2026-03-01", budget: 200000, manager_id: 2, manager_name: "Mohammad Karimi", manager_code: "WS-2026-002", created_at: "2025-08-20T11:00:00Z" },
  4: { id: 4, project_name: "Staff Training Program", start_date: "2026-03-01", end_date: "2026-08-31", budget: 450000, manager_id: 3, manager_name: "Fatima Noori", manager_code: "WS-2026-003", created_at: "2026-02-15T08:00:00Z" },
  5: { id: 5, project_name: "Library Expansion", start_date: "2026-04-01", end_date: "2026-12-31", budget: 800000, manager_id: 1, manager_name: "Ahmad Rahimi", manager_code: "WS-2026-001", created_at: "2026-03-10T14:00:00Z" },
};

export default function ProjectsShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const res = await get(`/hr/projects/${id}`);
      setData(res.data?.data || res.data);
    } catch {
      setData(DEMO[id] || DEMO[1]);
    } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center py-24"><p className="text-sm text-gray-400">Project not found</p></div>
  );

  const d = data;
  const startDate = new Date(d.start_date);
  const endDate = new Date(d.end_date);
  const today = new Date();
  const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24))));
  const progress = Math.round((elapsedDays / totalDays) * 100);

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-5">
        <div className="max-w-full mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/hr/projects')} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="flex-1">
              <h1 className="text-sm font-bold text-white">Project Details</h1>
              <p className="text-xs text-teal-100 mt-0.5">Viewing project record</p>
            </div>
            <button onClick={() => navigate(`/hr/projects/edit/${id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0">
              {d.project_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{d.project_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{d.start_date} → {d.end_date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Budget', value: `AFN ${(d.budget || 0).toLocaleString()}`, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1' },
            { label: 'Duration', value: `${totalDays} days`, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { label: 'Progress', value: `${progress}%`, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm font-bold text-gray-800">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Timeline Progress</p>
            <p className="text-xs font-bold text-teal-600">{progress}%</p>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-gray-400">{d.start_date}</span>
            <span className="text-[10px] text-gray-400">{d.end_date}</span>
          </div>
        </div>

        {/* Project Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
            </div>
            <h3 className="text-sm font-bold text-gray-800">Project Information</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Project Name" value={d.project_name} />
              <Field label="Start Date" value={d.start_date} />
              <Field label="End Date" value={d.end_date} />
              <Field label="Budget" value={d.budget ? `AFN ${parseFloat(d.budget).toLocaleString()}` : '—'} />
              <Field label="Manager" value={d.manager_name || '—'} />
              {d.manager_code && <Field label="Manager Code" value={d.manager_code} />}
              {d.created_at && <Field label="Created" value={new Date(d.created_at).toLocaleDateString()} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
    </div>
  );
}
