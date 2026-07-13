import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, peekCache } from "../../api/axios";
import Swal from "sweetalert2";

const TEAL = "#0D5C63";

const PERIODS = [
  { key: "weekly", label: "This week" },
  { key: "monthly", label: "This month" },
  { key: "yearly", label: "This year" },
];

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} />
  </div>
);

const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`);

function Board({ title, subtitle, rows, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3" style={{ background: accent.bg }}>
        <p className="text-sm font-bold" style={{ color: accent.fg }}>{title}</p>
        <p className="text-[10px]" style={{ color: accent.fg }}>{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-50">
        {rows.length === 0 && <p className="text-center py-10 text-xs text-gray-400">No cards in this period.</p>}
        {rows.map((r, i) => (
          <div key={r.student_id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-7 text-center text-sm font-bold text-gray-500">{medal(i)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{r.name}</p>
              <p className="text-[10px] text-gray-400">{r.class || "—"} · {r.code || ""}</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: accent.bg, color: accent.fg }}>
              {r.count} card{r.count === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CardRankings() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async (p) => {
    setLoading(true);
    const __cached = peekCache(`/student-cards/rankings?period=${p}`);
    if (__cached) { setData(__cached); setLoading(false); }
    try {
      const res = await get(`/student-cards/rankings?period=${p}`);
      setData(res.data);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to load rankings", "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/education/cards")}
              className="p-2 bg-white/15 hover:bg-white/25 rounded-xl text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">Card Rankings</h1>
              <p className="text-xs text-teal-100 mt-0.5">Top students by best and concern cards.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-4xl mx-auto">
        {/* Period filter */}
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${period === p.key ? "text-white" : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"}`}
              style={period === p.key ? { background: TEAL } : {}}>
              {p.label}
            </button>
          ))}
        </div>

        {loading ? <Spinner /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Board
              title="🏅 Top Best Cards"
              subtitle="Most positive (green / golden / diamond) cards"
              rows={data?.top_best || []}
              accent={{ bg: "#e6f3ec", fg: "#2E7D5B" }}
            />
            <Board
              title="⚠️ Top Concern Cards"
              subtitle="Most concern (yellow / red / black) cards"
              rows={data?.top_bad || []}
              accent={{ bg: "#fbe4e4", fg: "#b23b3b" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
