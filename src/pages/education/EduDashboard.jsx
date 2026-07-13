import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, peekCache } from "../../api/axios";

const TEAL = "#0D5C63";
const GOLD = "#C9A227";

const CAT = {
  positive: { bg: "#e6f3ec", fg: "#2E7D5B", label: "Positive" },
  routine: { bg: "#eef3f3", fg: "#5d7273", label: "Routine" },
  concern: { bg: "#fbf0db", fg: "#9a6a12", label: "Concern" },
  urgent: { bg: "#f7e3e1", fg: "#C0473F", label: "Urgent" },
};
const DIM = { intellectual: "#14919B", character: "#C9A227", social: "#C2607A", practical: "#2E7D5B" };

function Kpi({ label, value, sub, accent, icon, onClick }) {
  return (
    <div onClick={onClick}
      className={`relative bg-white rounded-2xl border border-gray-100 p-4 overflow-hidden shadow-sm ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all" : ""}`}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium text-gray-500">{label}</p>
        <span className="text-base opacity-70">{icon}</span>
      </div>
      <p className="text-2xl font-black text-gray-800 mt-1.5" style={{ letterSpacing: "-.5px" }}>{value}</p>
      {sub && <p className="text-[11px] font-semibold mt-0.5" style={{ color: accent }}>{sub}</p>}
    </div>
  );
}

function Card({ title, accent = TEAL, children, action }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-[13px] font-bold" style={{ color: accent }}>{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function EduDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const __cached = peekCache("/student-observations/dashboard");
    if (__cached) { setData(__cached); setLoading(false); }
    try { const r = await get("/student-observations/dashboard"); setData(r.data); }
    catch { setData(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-9 h-9 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;

  const s = data?.stats || {};
  const recent = data?.recent || [];

  return (
    <div className="min-h-screen" style={{ background: "#F4F8F8" }}>
      {/* Hero */}
      <div className="px-5 py-6" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
        <p className="text-[11px] uppercase tracking-widest" style={{ color: GOLD }}>Education & Formation</p>
        <h1 className="text-lg font-black text-white mt-1">Student Observation</h1>
        <p className="text-xs text-teal-100/80 mt-1">See every day · follow up every month · narrate the growth. {data?.name ? `Welcome, ${data.name}.` : ""}</p>
      </div>

      <div className="px-4 py-5 max-w-6xl mx-auto space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Observations this week" value={s.observations_week ?? 0} sub="keep it up" accent="#2E7D5B" icon="📈" onClick={() => navigate("/education/observations")} />
          <Kpi label="Students unseen 2+ weeks" value={s.unseen_2w ?? 0} sub={s.unseen_2w ? "need attention" : "all seen"} accent={GOLD} icon="👁" onClick={() => navigate("/education/observations")} />
          <Kpi label="Recognition : concern" value={s.ratio_label ?? "—"} sub="target 5:1" accent={TEAL} icon="⚖" />
          <Kpi label="Under monitoring" value={s.monitoring_count ?? 0} sub={`of ${s.total_students ?? 0} students`} accent="#C0473F" icon="🔎" onClick={() => navigate("/education/monitoring")} />
        </div>

        {/* Coverage bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-bold text-gray-800">Today's coverage</p>
            <p className="text-xs text-gray-500">{s.seen_today ?? 0} / {s.total_students ?? 0} students observed</p>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.total_students ? Math.round((s.seen_today / s.total_students) * 100) : 0}%`, background: `linear-gradient(90deg, ${TEAL}, #14919B)` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today's tasks */}
          <div className="lg:col-span-2">
            <Card title="Today's tasks">
              <div className="space-y-3">
                {s.no_today_count > 0 ? (
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#fbf0db", color: "#9a6a12" }}>✎</div>
                    <div className="text-xs text-gray-700">
                      <b>{s.no_today_count} student{s.no_today_count === 1 ? "" : "s"}</b> have no observation today
                      <div className="text-[11px] text-gray-400 mt-0.5">{(s.no_today_names || []).join(" · ")}{s.no_today_count > (s.no_today_names || []).length ? " …" : ""}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">🎉 Every student has been observed today.</p>
                )}
                {s.unseen_2w > 0 && (
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#f7e3e1", color: "#C0473F" }}>!</div>
                    <div className="text-xs text-gray-700"><b>{s.unseen_2w}</b> student{s.unseen_2w === 1 ? "" : "s"} unseen for 2+ weeks — the quiet ones need a look</div>
                  </div>
                )}
                {s.monitoring_count > 0 && (
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#e8f6f6", color: TEAL }}>🔎</div>
                    <div className="text-xs text-gray-700"><b>{s.monitoring_count}</b> under monitoring — check the board for follow-ups</div>
                  </div>
                )}
              </div>
            </Card>

            <div className="h-4" />

            <Card title="Recent observations" accent={GOLD} action={<button onClick={() => navigate("/education/observations")} className="text-[11px] font-semibold" style={{ color: TEAL }}>View all →</button>}>
              {recent.length === 0 ? (
                <p className="text-xs text-gray-400">No observations yet.</p>
              ) : (
                <div className="divide-y divide-gray-50 -my-1">
                  {recent.map((o) => (
                    <div key={o.id} className="py-2.5 flex items-start gap-3">
                      <span className="mt-0.5 w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: DIM[o.dimension] || "#ccc" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-gray-800 truncate">{o.student}</p>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: CAT[o.category]?.bg, color: CAT[o.category]?.fg }}>{CAT[o.category]?.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-600 truncate">{o.description}</p>
                        <p className="text-[10px] text-gray-400">{o.observed_on}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Quick access */}
          <div className="space-y-4">
            <Card title="Quick access">
              <div className="space-y-2">
                <button onClick={() => navigate("/education/observations")} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold text-white" style={{ background: `linear-gradient(120deg, #14919B, ${TEAL})` }}>＋ Record a daily observation</button>
                <button onClick={() => navigate("/education/observations")} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:border-gray-300">⏰ My recent observations</button>
                <button onClick={() => navigate("/education/monitoring")} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:border-gray-300">🔎 Under-monitoring board</button>
                <button onClick={() => navigate("/education/synthesis")} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:border-gray-300">🗎 Mentor synthesis</button>
              </div>
            </Card>

            <div className="rounded-2xl border p-4" style={{ background: "#E8F6F6", borderColor: "#c3e0e0" }}>
              <p className="text-[12px] font-bold" style={{ color: TEAL }}>A kind reminder</p>
              <p className="text-[11px] mt-1" style={{ color: "#3a6b6d" }}>Only 2–3 short observations a day is enough. One precise sentence beats ten general ones — quality, not quantity.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
