import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';

export const plannerFields = [
  { name: 'type', label: 'Type', type: 'select', required: true, options: [
    { value: 'task', label: 'Task' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'event', label: 'Event' },
  ]},
  { name: 'name', label: 'Your Name', type: 'text', required: true },
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'day', label: 'Day', type: 'text', required: true },
  { name: 'time', label: 'Time', type: 'time', required: true },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  { name: 'event_type', label: 'Event Type', type: 'text' },
  { name: 'target_audience', label: 'Target Audience', type: 'text' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'branch', label: 'Branch', type: 'text', required: true },
  { name: 'attendance', label: 'Attendance', type: 'select', options: [
    { value: 'optional', label: 'Optional' },
    { value: 'mandatory', label: 'Mandatory' },
  ]},
  { name: 'notify_emails', label: 'Notify Emails', type: 'textarea' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const plannerColumns = [
  { key: 'type', label: 'Type' },
  { key: 'name', label: 'Name' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'branch', label: 'Branch' },
];

const DEMO = [
  { id: 1, type: "meeting", name: "Ahmad Karimi", date: "2026-03-18", day: "Wednesday", time: "10:00", description: "Weekly staff coordination meeting", event_type: "Internal", target_audience: "All Staff", location: "Conference Room A", branch: "Wifaq School", attendance: "mandatory", notes: "Bring weekly reports" },
  { id: 2, type: "event", name: "Fatima Ahmadi", date: "2026-03-20", day: "Friday", time: "08:00", description: "Spring semester parent-teacher conference", event_type: "Academic", target_audience: "Parents & Teachers", location: "Main Hall", branch: "Wifaq School", attendance: "mandatory", notes: "Refreshments arranged" },
  { id: 3, type: "task", name: "Noor Rahman", date: "2026-03-17", day: "Tuesday", time: "14:00", description: "Complete grade 8 exam papers review", event_type: "", target_audience: "", location: "Staff Room", branch: "Wifaq Learning Studio", attendance: "optional", notes: "Deadline: March 19" },
  { id: 4, type: "meeting", name: "Maryam Sultani", date: "2026-03-19", day: "Thursday", time: "11:30", description: "Budget planning for Q2 supplies", event_type: "Finance", target_audience: "Admin Team", location: "Director Office", branch: "WISAL Academy", attendance: "mandatory", notes: "" },
  { id: 5, type: "event", name: "Khalid Noori", date: "2026-03-22", day: "Sunday", time: "09:00", description: "Science fair exhibition for grades 6-9", event_type: "Academic", target_audience: "Students & Parents", location: "School Yard", branch: "Wifaq School", attendance: "optional", notes: "Setup starts at 7:00 AM" },
];

const typeStyle = { task: "bg-teal-50 text-teal-700", meeting: "bg-teal-50 text-teal-700", event: "bg-teal-50 text-teal-700" };
const typeDot = { task: "bg-teal-500", meeting: "bg-teal-600", event: "bg-teal-400" };
const typeIcon = {
  task: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  meeting: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  event: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
};

export default function Planner() {
  const navigate = useNavigate();
  const [items, setItems] = useState(DEMO);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get('/hr/planners');
      const data = response.data?.data || response.data || [];
      if (data.length) setItems(data);
    } catch {
      // keep demo data
    } finally {
      setLoading(false);
    }
  };

  const activeFilters = [filterType].filter(Boolean).length;

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    if (q && !it.name?.toLowerCase().includes(q) && !it.description?.toLowerCase().includes(q) && !it.location?.toLowerCase().includes(q)) return false;
    if (filterType && it.type !== filterType) return false;
    return true;
  });

  const stats = [
    { label: "Total Entries", value: items.length, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { label: "Tasks", value: items.filter(r => r.type === "task").length, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
    { label: "Meetings", value: items.filter(r => r.type === "meeting").length, icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { label: "Events", value: items.filter(r => r.type === "event").length, icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  ];

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const result = await Swal.fire({ title: "Delete this entry?", text: "This action cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Delete" });
    if (result.isConfirmed) {
      try {
        await del(`/hr/planners/${id}`);
        fetchItems();
      } catch {
        setItems(prev => prev.filter(i => i.id !== id));
      }
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
    }
  };

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Planner</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage tasks, meetings, and events</p>
        </div>
        <button onClick={() => navigate("/hr/planner/create")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Entry
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${i === 0 ? "bg-teal-600 border-teal-600" : "bg-white border-teal-100"}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-white/20" : "bg-teal-50"}`}>
              <svg className={`w-4 h-4 ${i === 0 ? "text-white" : "text-teal-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
            </div>
            <div>
              <p className={`text-[10px] font-medium ${i === 0 ? "text-teal-100" : "text-gray-500"}`}>{s.label}</p>
              <p className={`text-xl font-bold leading-tight ${i === 0 ? "text-white" : "text-gray-800"}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, description, or location..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white" />
          </div>
          <button onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${filterOpen || activeFilters ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters
            {activeFilters > 0 && <span className="w-4.5 h-4.5 rounded-full bg-white text-teal-700 text-[10px] font-bold flex items-center justify-center">{activeFilters}</span>}
          </button>
          {(activeFilters > 0 || search) && (
            <button onClick={() => { setSearch(""); setFilterType(""); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              Clear
            </button>
          )}
        </div>
        {filterOpen && (
          <div className="pt-1 border-t border-gray-100">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
              <option value="">All Types</option>
              <option value="task">Task</option>
              <option value="meeting">Meeting</option>
              <option value="event">Event</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
          <p className="mt-2 text-gray-400 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Entry</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Entry */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeIcon[item.type] || typeIcon.task} />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                          <p className="text-[11px] text-gray-400">{item.branch}</p>
                        </div>
                      </div>
                    </td>
                    {/* Description */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 max-w-xs truncate">{item.description}</p>
                      {item.target_audience && <p className="text-[11px] text-gray-400">{item.target_audience}</p>}
                    </td>
                    {/* Date & Time */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{item.date}</p>
                      <p className="text-[11px] text-gray-400">{item.day} at {item.time}</p>
                    </td>
                    {/* Location */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{item.location || "—"}</p>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${typeStyle[item.type] || "bg-gray-100 text-gray-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${typeDot[item.type] || "bg-gray-400"}`} />
                        {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}
                      </span>
                    </td>
                    {/* Actions — always visible */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/hr/planner/show/${item.id}`)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => navigate(`/hr/planner/edit/${item.id}`)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={(e) => handleDelete(e, item.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-medium text-gray-600">No entries found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
              <button onClick={() => navigate("/hr/planner/create")}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create First Entry
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">Showing {filtered.length} of {items.length} entries</p>
              <div className="flex items-center gap-1">
                {[...new Set(items.map(d => d.branch))].filter(Boolean).map(b => (
                  <span key={b} className="px-2 py-0.5 bg-white border border-gray-200 text-[10px] text-gray-500 rounded-lg">{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
