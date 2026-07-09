import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../../api/axios";
import Swal from "sweetalert2";

const TEAL = "#0D5C63";

const PERIODS = [
  { key: "weekly", label: "This week" },
  { key: "monthly", label: "This month" },
  { key: "yearly", label: "This year" },
  { key: "last_week", label: "Last week" },
  { key: "last_6_months", label: "Last 6 months" },
  { key: "last_year", label: "Last year" },
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [range, setRange] = useState(null); // applied { from, to } or null
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async (p, r) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (r && (r.from || r.to)) {
        if (r.from) params.set("from", r.from);
        if (r.to) params.set("to", r.to);
      } else {
        params.set("period", p);
      }
      const res = await get(`/student-cards/rankings?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to load rankings", "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period, range); }, [period, range, load]);

  const applyRange = () => {
    if (!from && !to) return;
    if (from && to && from > to) {
      Swal.fire("Invalid range", "The 'from' date must be before the 'to' date.", "warning");
      return;
    }
    setRange({ from, to });
  };

  const clearRange = () => { setFrom(""); setTo(""); setRange(null); };

  // Selecting a preset period clears any active custom range.
  const selectPeriod = (key) => { setRange(null); setFrom(""); setTo(""); setPeriod(key); };

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
        {/* Period presets */}
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => {
            const active = !range && period === p.key;
            return (
              <button key={p.key} onClick={() => selectPeriod(p.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${active ? "text-white" : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"}`}
                style={active ? { background: TEAL } : {}}>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom date range */}
        <div className="flex flex-wrap items-end gap-2 bg-white border border-gray-100 rounded-2xl p-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">From</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">To</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </label>
          <button onClick={applyRange} disabled={!from && !to}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
            style={{ background: TEAL }}>
            Apply
          </button>
          {range && (
            <button onClick={clearRange}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
              Clear
            </button>
          )}
          {range && (
            <span className="text-[11px] text-gray-500 self-center">
              Showing {range.from || "start"} → {range.to || "today"}
            </span>
          )}
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
