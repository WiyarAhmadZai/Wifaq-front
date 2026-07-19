import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, peekCache } from "../../api/axios";
import { fmtDate, fmtDateTime } from "../../utils/formErrors";
import { TEAL, GOLD, PAPER, DAY_LABEL, Hero, Spinner, StatusPill } from "./lessonPlanUi";

/**
 * Plan → Class Register Bridge — the keystone automation (guidelines, Principle 4).
 * On DH approval, a plan's title + homework flow into the next day's Class
 * Register entry for (class, date, period). The Class Register module (m17)
 * isn't built yet, so approved plans are shown here as a "ready to land" queue.
 */
export default function LessonPlanBridge() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const __cached = peekCache("/lesson-plans/bridge");
    if (__cached) { setData(__cached); setLoading(false); }
    get("/lesson-plans/bridge")
      .then((r) => setData(r.data))
      .catch((e) => { if (e.response?.status === 403) setForbidden(true); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;
  if (forbidden) return (
    <div style={{ background: PAPER, minHeight: "100vh" }}>
      <Hero title="Plan → Class Register Bridge" />
      <p className="max-w-3xl mx-auto px-4 py-10 text-center text-sm text-gray-500">Leadership access only.</p>
    </div>
  );

  const rows = data?.data || [];
  const s = data?.stats || {};

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Plan → Class Register Bridge" subtitle="The keystone — approved plans flow into the daily register" />

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* Status banner */}
        <div className="rounded-xl px-4 py-3 text-[12px] flex gap-2 items-start"
          style={{ background: data?.register_module_ready ? "#e6f3ec" : "#fbf0db", color: data?.register_module_ready ? "#2E7D5B" : "#9a6a12" }}>
          <span>◈</span>
          <div>
            {data?.register_module_ready
              ? "Class Register is live — approved plans auto-populate the next day's register entry."
              : "The Class Register module (m17) isn't live yet, so these approved plans are queued and ready to land. Each plan is already keyed to its (class · date · period), so the bridge will back-fill with zero rework once the register exists."}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Queued for register" value={s.queued ?? 0} accent={GOLD} />
          <Kpi label="Delivered" value={s.delivered ?? 0} accent="#2E7D5B" />
          <Kpi label="Homework drafts" value={s.homework_drafts ?? 0} accent={TEAL} />
        </div>

        {/* How it works + what transfers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="How it works">
            <Step n="1" color={GOLD} title="Teacher writes a plan" body="Title, 4 dimensions, homework — for a class · date · period." />
            <Step n="2" color={GOLD} title="Department Head approves" body="The plan is locked (title & homework frozen) and enters this bridge." />
            <Step n="3" color="#2E7D5B" title="Register pre-fills" body="The next day, the class register shows the lesson title ready — no retyping." />
            <Step n="4" color={TEAL} title="Taught → reflection" body="The teacher confirms delivery; the plan becomes 'delivered' and the reflection opens." />
          </Card>
          <Card title="What each approved plan transfers">
            <Transfer label="Lesson title" to="the period entry in the register" />
            <Transfer label="Homework" to="the homework module (auto-draft)" />
            <Transfer label="Materials" to="the pre-period note for the teacher" />
            <Transfer label="Success indicators" to="the reflection form" />
            <Transfer label="Plan ID" to="a permanent link (class · date · period)" />
          </Card>
        </div>

        {/* The queue */}
        <div className="rounded-2xl border bg-white" style={{ borderColor: "#dbe8e8" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#eef4f4" }}>
            <h3 className="text-sm font-black text-gray-800">Approved plans → register targets</h3>
          </div>
          {rows.length === 0 ? (
            <p className="p-8 text-center text-xs text-gray-400">No approved plans yet — approve plans in the Review Queue to populate the bridge.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "#eef4f4" }}>
              {rows.map((p) => (
                <button key={p.id} onClick={() => navigate(`/education/lesson-plans/show/${p.id}`)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-gray-800 truncate">{p.title}</p>
                      <StatusPill status={p.status} />
                      {p.has_homework && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>+ homework</span>}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {p.teacher} · {p.subject}
                    </p>
                  </div>
                  {/* Register target */}
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-gray-700">{p.class} · {DAY_LABEL[p.day_of_week] || ""} P{p.period_number}</p>
                    <p className="text-[10px] text-gray-400">
                      {p.status === "approved" ? `→ register ${fmtDate(p.lesson_date)}` : `delivered ${p.delivered_at ? fmtDateTime(p.delivered_at) : ""}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Kpi = ({ label, value, accent }) => (
  <div className="rounded-2xl border bg-white p-4 relative overflow-hidden" style={{ borderColor: "#dbe8e8" }}>
    <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-2xl font-black text-gray-800 mt-1 leading-none">{value}</p>
  </div>
);
const Card = ({ title, children }) => (
  <div className="rounded-2xl border bg-white" style={{ borderColor: "#dbe8e8" }}>
    <div className="px-4 py-3 border-b" style={{ borderColor: "#eef4f4" }}><h3 className="text-sm font-black text-gray-800">{title}</h3></div>
    <div className="p-4 space-y-2.5">{children}</div>
  </div>
);
const Step = ({ n, color, title, body }) => (
  <div className="flex gap-3">
    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0" style={{ background: color }}>{n}</span>
    <div><p className="text-[12px] font-bold text-gray-800">{title}</p><p className="text-[11px] text-gray-500">{body}</p></div>
  </div>
);
const Transfer = ({ label, to }) => (
  <div className="flex items-center gap-2 text-[12px]">
    <span className="font-bold text-gray-700">{label}</span>
    <span className="text-gray-300">→</span>
    <span className="text-gray-500">{to}</span>
  </div>
);
