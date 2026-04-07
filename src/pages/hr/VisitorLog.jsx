import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function VisitorLog() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => { fetchItems(); }, [filterDate]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const dateParam = filterDate ? `?date=${filterDate}` : "";
      const res = await get(`/hr/visitor-logs${dateParam}`);
      const data = res.data?.data || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async (item) => {
    const result = await Swal.fire({
      title: "Sign Out Visitor?",
      html: `<p class="text-sm text-gray-600">Sign out <b>${item.visitor_name}</b> at current time?</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      confirmButtonText: "Sign Out",
    });
    if (result.isConfirmed) {
      try {
        await put(`/hr/visitor-logs/${item.id}/sign-out`);
        Swal.fire({ icon: "success", title: "Signed Out!", timer: 1500, showConfirmButton: false });
        fetchItems();
      } catch {
        Swal.fire("Error", "Failed to sign out", "error");
      }
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: "Delete Entry?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (result.isConfirmed) {
      try { await del(`/hr/visitor-logs/${id}`); } catch {}
      setItems((p) => p.filter((i) => i.id !== id));
      Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
    }
  };

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return !q || (item.visitor_name || "").toLowerCase().includes(q) || (item.purpose || "").toLowerCase().includes(q) || (item.met_with || "").toLowerCase().includes(q);
  });

  const insideCount = items.filter((i) => i.status === "in" || (!i.time_out && i.time_in)).length;
  const outCount = items.filter((i) => i.status === "out" || i.time_out).length;

  const formatTime = (t) => {
    if (!t) return null;
    // Handle "HH:MM:SS" or "HH:MM" or datetime strings
    const match = t.match(/(\d{2}):(\d{2})/);
    if (!match) return t;
    const h = parseInt(match[1]);
    const m = match[2];
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const getDuration = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return null;
    const getMin = (t) => { const m = t.match(/(\d{2}):(\d{2})/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0; };
    const diff = getMin(timeOut) - getMin(timeIn);
    if (diff <= 0) return null;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Visitor Log</h1>
            <p className="text-xs text-teal-100 mt-0.5">Track visitors entering and leaving</p>
          </div>
          <button onClick={() => navigate("/hr/visitor-log/create")}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Entry
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
                <p className="text-xl font-black text-gray-800">{items.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Inside</p>
                <p className="text-xl font-black text-emerald-700">{insideCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Left</p>
                <p className="text-xl font-black text-gray-600">{outCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search visitor, purpose, or met with..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white" />
          </div>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white" />
          <button onClick={() => setFilterDate("")} className="px-3 py-2.5 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100">All Dates</button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-teal-50 border-b border-teal-100">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Visitor</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Purpose</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Met With</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Time In</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Time Out</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((item) => {
                    const isInside = item.status === "in" || (!item.time_out && item.time_in);
                    const duration = getDuration(item.time_in, item.time_out);
                    return (
                      <tr key={item.id} className="hover:bg-teal-50/30 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isInside ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                              {item.visitor_name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{item.visitor_name}</p>
                              {item.visitor_phone && <p className="text-[10px] text-gray-400">{item.visitor_phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-medium rounded-lg border border-teal-100">{item.purpose}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{item.met_with || "-"}</td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-700">{formatTime(item.time_in) || "-"}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{formatTime(item.time_out) || "-"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{duration || "-"}</td>
                        <td className="px-4 py-3">
                          {isInside ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              Inside
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-semibold rounded-full border border-gray-200">Left</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Sign Out button — only for visitors still inside */}
                            {isInside && (
                              <button onClick={() => handleSignOut(item)}
                                className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                                title="Sign Out">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Sign Out
                              </button>
                            )}
                            <button onClick={() => navigate(`/hr/visitor-log/show/${item.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="View">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            <button onClick={() => navigate(`/hr/visitor-log/edit/${item.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Edit">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <p className="text-sm text-gray-400 font-medium">No visitors logged{filterDate ? " for this date" : ""}</p>
                <button onClick={() => navigate("/hr/visitor-log/create")} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">Log a visitor</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
