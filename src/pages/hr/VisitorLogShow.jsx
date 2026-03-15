import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../api/axios';

const DEMO = {
  1: { id: 1, date: "2026-03-15", visitor_name: "Mohammad Ali", purpose: "Meeting with Principal", time_in: "09:00", time_out: "10:30", met_with: "Ahmad Rahimi", notes: "Discussed student enrollment for next year." },
  2: { id: 2, date: "2026-03-15", visitor_name: "Zahra Sultani", purpose: "Document Delivery", time_in: "11:00", time_out: "11:15", met_with: "Fatima Noori", notes: "" },
  3: { id: 3, date: "2026-03-14", visitor_name: "Khalid Noori", purpose: "Interview", time_in: "14:00", time_out: "15:00", met_with: "Mohammad Karimi", notes: "Teacher candidate for Math position." },
  4: { id: 4, date: "2026-03-14", visitor_name: "Mariam Ahmadi", purpose: "Parent Meeting", time_in: "10:00", time_out: "10:45", met_with: "Ahmad Rahimi", notes: "Report card discussion." },
  5: { id: 5, date: "2026-03-13", visitor_name: "Abdul Rahman", purpose: "Maintenance Check", time_in: "08:30", time_out: "12:00", met_with: "Ali Ahmadi", notes: "Electrical inspection completed." },
};

export default function VisitorLogShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const res = await get(`/hr/visitor-logs/${id}`);
      setData(res.data?.data || res.data);
    } catch { setData(DEMO[id] || DEMO[1]); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="flex items-center justify-center py-24"><p className="text-sm text-gray-400">Entry not found</p></div>;

  const d = data;
  const duration = d.time_in && d.time_out ? (() => {
    const [h1, m1] = d.time_in.split(':').map(Number);
    const [h2, m2] = d.time_out.split(':').map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    return mins > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : '—';
  })() : '—';

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/hr/visitor-log')} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="flex-1">
              <h1 className="text-sm font-bold text-white">Visitor Log Details</h1>
              <p className="text-xs text-teal-100 mt-0.5">Viewing visitor entry</p>
            </div>
            <button onClick={() => navigate(`/hr/visitor-log/edit/${id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0">{d.visitor_name.charAt(0)}</div>
            <div>
              <h2 className="text-lg font-black text-white">{d.visitor_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{d.date}</span>
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{d.purpose}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Time In', value: d.time_in || '—', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Time Out', value: d.time_out || '—', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Duration', value: duration, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-lg font-black text-gray-800">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h3 className="text-sm font-bold text-gray-800">Visit Information</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Date" value={d.date} />
              <Field label="Visitor Name" value={d.visitor_name} />
              <Field label="Purpose" value={d.purpose} />
              <Field label="Time In" value={d.time_in} />
              <Field label="Time Out" value={d.time_out} />
              <Field label="Met With" value={d.met_with} />
            </div>
          </div>
        </div>

        {d.notes && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-800">Notes</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 leading-relaxed">{d.notes}</p>
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
