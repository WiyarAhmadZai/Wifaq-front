import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../api/axios';

const DEMO = {
  1: { id: 1, staff_id: 1, staff_name: "Ahmad Rahimi", staff_code: "WS-2026-001", department: "Academic", entity: "WS", snapshot_month: "2026-03-01", rank_level: 5, base_salary: 25000, housing_allowance: 3000, transport_allowance: 2000, family_allowance: 2000, other_allowances: 0, total_package: 32000, reason: "Annual increment", created_at: "2026-03-01T10:00:00Z" },
  2: { id: 2, staff_id: 2, staff_name: "Mohammad Karimi", staff_code: "WS-2026-002", department: "Finance", entity: "WLS", snapshot_month: "2026-03-01", rank_level: 4, base_salary: 20000, housing_allowance: 2500, transport_allowance: 1500, family_allowance: 2000, other_allowances: 500, total_package: 26500, reason: "Promotion to Level 4", created_at: "2026-03-01T11:00:00Z" },
  3: { id: 3, staff_id: 3, staff_name: "Fatima Noori", staff_code: "WS-2026-003", department: "Administration", entity: "WISAL", snapshot_month: "2026-02-01", rank_level: 3, base_salary: 18000, housing_allowance: 2000, transport_allowance: 1500, family_allowance: 0, other_allowances: 0, total_package: 21500, reason: "New hire", created_at: "2026-02-01T09:00:00Z" },
  4: { id: 4, staff_id: 1, staff_name: "Ahmad Rahimi", staff_code: "WS-2026-001", department: "Academic", entity: "WS", snapshot_month: "2026-02-01", rank_level: 5, base_salary: 23000, housing_allowance: 3000, transport_allowance: 2000, family_allowance: 2000, other_allowances: 0, total_package: 30000, reason: "Previous month", created_at: "2026-02-01T10:00:00Z" },
  5: { id: 5, staff_id: 4, staff_name: "Ali Ahmadi", staff_code: "WS-2026-004", department: "IT", entity: "WS", snapshot_month: "2026-03-01", rank_level: 6, base_salary: 22000, housing_allowance: 2500, transport_allowance: 2000, family_allowance: 1500, other_allowances: 1000, total_package: 29000, reason: "Quarterly review", created_at: "2026-03-01T12:00:00Z" },
};

export default function SalarySnapshotShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const res = await get(`/hr/salary-snapshots/${id}`);
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
    <div className="flex items-center justify-center py-24">
      <p className="text-sm text-gray-400">Snapshot not found</p>
    </div>
  );

  const d = data;
  const total = d.total_package || ((d.base_salary || 0) + (d.housing_allowance || 0) + (d.transport_allowance || 0) + (d.family_allowance || 0) + (d.other_allowances || 0));

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/hr/salary-snapshot')}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="flex-1">
              <h1 className="text-sm font-bold text-white">Salary Snapshot</h1>
              <p className="text-xs text-teal-100 mt-0.5">Viewing snapshot details</p>
            </div>
            <button onClick={() => navigate(`/hr/salary-snapshot/edit/${id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0">
              {(d.staff_name || 'S').charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{d.staff_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{d.staff_code}</span>
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{d.snapshot_month}</span>
                <span className="px-2.5 py-0.5 bg-white/30 text-white text-[11px] font-semibold rounded-full">Level {d.rank_level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Rank Level', value: `Level ${d.rank_level}`, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Base Salary', value: `AFN ${(d.base_salary || 0).toLocaleString()}`, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1' },
            { label: 'Total Package', value: `AFN ${total.toLocaleString()}`, icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
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

        {/* Staff & Period Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h3 className="text-sm font-bold text-gray-800">Staff & Period</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Staff Name" value={d.staff_name} />
              <Field label="Staff Code" value={d.staff_code} />
              <Field label="Snapshot Month" value={d.snapshot_month} />
              <Field label="Rank Level" value={`Level ${d.rank_level}`} />
              {d.department && <Field label="Department" value={d.department} />}
              {d.entity && <Field label="Entity" value={d.entity} />}
            </div>
          </div>
        </div>

        {/* Salary Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-sm font-bold text-gray-800">Salary Breakdown</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <Field label="Base Salary" value={`AFN ${(d.base_salary || 0).toLocaleString()}`} />
              <Field label="Housing Allowance" value={`AFN ${(d.housing_allowance || 0).toLocaleString()}`} />
              <Field label="Transport Allowance" value={`AFN ${(d.transport_allowance || 0).toLocaleString()}`} />
              <Field label="Family Allowance" value={`AFN ${(d.family_allowance || 0).toLocaleString()}`} />
              <Field label="Other Allowances" value={`AFN ${(d.other_allowances || 0).toLocaleString()}`} />
            </div>

            <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[
                  { label: "Base", value: d.base_salary || 0 },
                  { label: "Housing", value: d.housing_allowance || 0 },
                  { label: "Transport", value: d.transport_allowance || 0 },
                  { label: "Family", value: d.family_allowance || 0 },
                  { label: "Other", value: d.other_allowances || 0 },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-lg p-2.5 text-center border border-teal-100">
                    <p className="text-[8px] font-bold text-teal-600 uppercase">{s.label}</p>
                    <p className="text-xs font-bold text-gray-800">{s.value.toLocaleString()}</p>
                  </div>
                ))}
                <div className="bg-teal-600 rounded-lg p-2.5 text-center">
                  <p className="text-[8px] font-bold text-teal-100 uppercase">Total</p>
                  <p className="text-xs font-bold text-white">{total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reason */}
        {d.reason && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-800">Reason</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 leading-relaxed">{d.reason}</p>
            </div>
          </div>
        )}
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
