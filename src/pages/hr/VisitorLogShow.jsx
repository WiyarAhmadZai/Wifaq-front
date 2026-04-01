import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, del, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function VisitorLogShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(`/hr/visitor-logs/${id}`)
      .then((res) => setData(res.data?.data || res.data))
      .catch(() => Swal.fire("Error", "Failed to load visitor log", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSignOut = async () => {
    const result = await Swal.fire({ title: "Sign Out?", html: `Sign out <b>${data.visitor_name}</b>?`, icon: "question", showCancelButton: true, confirmButtonColor: "#0d9488", confirmButtonText: "Sign Out" });
    if (result.isConfirmed) {
      try {
        const res = await put(`/hr/visitor-logs/${id}/sign-out`);
        setData(res.data?.data || res.data);
        Swal.fire({ icon: "success", title: "Signed Out!", timer: 1500, showConfirmButton: false });
      } catch { Swal.fire("Error", "Failed to sign out", "error"); }
    }
  };

  const handleDelete = async () => {
    const r = await Swal.fire({ title: "Delete?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/hr/visitor-logs/${id}`); } catch {}
      navigate("/hr/visitor-log");
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-24 text-sm text-gray-400">Entry not found</div>;

  const isInside = data.status === "in" || (!data.time_out && data.time_in);

  const formatTime = (t) => {
    if (!t) return null;
    const match = t.match(/(\d{2}):(\d{2})/);
    if (!match) return t;
    const h = parseInt(match[1]);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${match[2]} ${ampm}`;
  };

  const getDuration = () => {
    if (!data.time_in || !data.time_out) return null;
    const getMin = (t) => { const m = t.match(/(\d{2}):(\d{2})/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0; };
    const diff = getMin(data.time_out) - getMin(data.time_in);
    if (diff <= 0) return null;
    const h = Math.floor(diff / 60), m = diff % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hr/visitor-log")} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white">Visitor Details</h1>
            <p className="text-xs text-teal-100 mt-0.5">#{String(data.id).padStart(4, "0")}</p>
          </div>
          <div className="flex gap-2">
            {isInside && (
              <button onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            )}
            <button onClick={() => navigate(`/hr/visitor-log/edit/${id}`)} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl">Edit</button>
            <button onClick={handleDelete} className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold rounded-xl">Delete</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0 ${isInside ? "bg-emerald-400 text-white" : "bg-white/20 text-white"}`}>
            {data.visitor_name?.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-black text-white">{data.visitor_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{data.date ? new Date(data.date).toLocaleDateString() : "-"}</span>
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{data.purpose}</span>
              {isInside ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-400 text-white text-[11px] font-semibold rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>Inside
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-white/10 text-teal-200 text-[11px] font-semibold rounded-full">Left</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Time Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center"><svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg></div>
              <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Time In</p><p className="text-lg font-black text-gray-800">{formatTime(data.time_in) || "-"}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center"><svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></div>
              <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Time Out</p><p className="text-lg font-black text-gray-800">{formatTime(data.time_out) || "-"}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center"><svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
              <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Duration</p><p className="text-lg font-black text-gray-800">{getDuration() || "-"}</p></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Visit Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Visit Information</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Date", value: data.date ? new Date(data.date).toLocaleDateString() : "-" },
                  { label: "Visitor Name", value: data.visitor_name },
                  { label: "Phone", value: data.visitor_phone || "-" },
                  { label: "Purpose", value: data.purpose },
                  { label: "Met With", value: data.met_with },
                ].map((f) => (
                  <div key={f.label} className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{f.label}</p>
                    <p className="text-xs font-semibold text-gray-800">{f.value || "-"}</p>
                  </div>
                ))}
              </div>
            </div>

            {data.notes && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
              <h3 className="text-xs font-bold mb-3">Record Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-teal-200">ID</span><span className="font-medium">#{String(data.id).padStart(4, "0")}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Status</span><span className="font-medium capitalize">{isInside ? "Inside" : "Left"}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Created</span><span className="font-medium">{data.created_at ? new Date(data.created_at).toLocaleString() : "-"}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
