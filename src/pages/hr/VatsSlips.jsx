import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { get, post, del } from "../../api/axios";
import Swal from "sweetalert2";
import {
  FiStar, FiAlertTriangle, FiPlus, FiTrash2,
  FiTrendingUp, FiTrendingDown, FiCheckCircle, FiZap, FiBarChart2, FiAward,
} from "react-icons/fi";
import { PageHeader, EmptyState, Spinner, InfoNote } from "../../components/hr/HrUI";
import { broadcastVatsChange } from "../../components/hr/useVats";
import Select2 from "../../components/hr/Select2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

const inp = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-shadow";


export default function VatsSlips() {
  const { canCreate, canDelete } = useResourcePermissions("vats-slips");
  const location = useLocation();
  const navigate = useNavigate();
  const [slips, setSlips] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ kind: "" });
  const [form, setForm] = useState({ staff_id: "", kind: "positive", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const [pulseActive, setPulseActive] = useState(false);
  const rowRefs = useRef({});

  const searchParams = new URLSearchParams(location.search);
  const highlightId = searchParams.get("highlight");
  const fromNotif = searchParams.get("from") === "notif";

  useEffect(() => { fetchAll(); fetchStaff(); fetchLeaderboard(); }, [filter, location.key]);

  useEffect(() => {
    if (!fromNotif || !highlightId || slips.length === 0) return;
    const target = rowRefs.current[String(highlightId)];
    if (!target) return;
    requestAnimationFrame(() => {
      try { target.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
      setPulseActive(true);
    });
    const tmr = setTimeout(() => setPulseActive(false), 2500);
    return () => clearTimeout(tmr);
  }, [fromNotif, highlightId, slips]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
      const r = await get(`/vats/slips?${params}`);
      setSlips(r.data?.data || []);
    } catch { setSlips([]); }
    finally { setLoading(false); }
  };

  const fetchStaff = async () => {
    try { const r = await get("/hr/staff/list?per_page=200"); setStaff(r.data?.data || []); } catch {}
  };

  const fetchLeaderboard = async () => {
    try {
      const r = await get("/vats/slips/leaderboard");
      setLeaderboard(r.data || null);
    } catch {
      setLeaderboard(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.staff_id || !form.reason || submitting) return;
    setSubmitting(true);
    try {
      await post("/vats/slips", form);
      setForm({ staff_id: "", kind: form.kind, reason: "" });
      Swal.fire({ icon: "success", title: "Slip recorded", timer: 800, showConfirmButton: false });
      fetchAll(); fetchLeaderboard();
      // A slip is a recognition/concern event — let dashboard + cards re-sync.
      broadcastVatsChange();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    } finally { setSubmitting(false); }
  };

  const remove = async (id) => {
    const r = await Swal.fire({ icon: "warning", title: "Delete this slip?", showCancelButton: true, confirmButtonColor: "#b91c1c" });
    if (!r.isConfirmed) return;
    await del(`/vats/slips/${id}`);
    fetchAll(); fetchLeaderboard();
    broadcastVatsChange();
  };

  /* ────────────── derived totals & balance ────────────── */
  const positive = slips.filter(s => s.kind === "positive").length;
  const concern  = slips.filter(s => s.kind === "concern").length;
  const total    = positive + concern;
  const ratioStr = concern > 0 ? (positive / concern).toFixed(1) + ":1" : (positive > 0 ? "∞" : "—");
  const positivePct = total ? Math.round((positive / total) * 100) : 0;
  const concernPct  = total ? 100 - positivePct : 0;
  const balanceMood = positive === 0 && concern === 0 ? "neutral"
    : positive > concern * 2 ? "great"
    : positive > concern ? "good"
    : positive === concern ? "balanced"
    : "watch";
  const balanceConf = {
    great:    { label: "Excellent",  Icon: FiTrendingUp,   text: "text-teal-700",  bg: "bg-teal-50",   ring: "ring-teal-200" },
    good:     { label: "Healthy",    Icon: FiTrendingUp,   text: "text-teal-700",  bg: "bg-teal-50",   ring: "ring-teal-200" },
    balanced: { label: "Balanced",   Icon: FiCheckCircle,  text: "text-teal-700",  bg: "bg-teal-50",   ring: "ring-teal-200" },
    watch:    { label: "Watch list", Icon: FiTrendingDown, text: "text-amber-700", bg: "bg-amber-50",  ring: "ring-amber-200" },
    neutral:  { label: "No data",    Icon: FiZap,          text: "text-gray-600",  bg: "bg-gray-50",   ring: "ring-gray-200" },
  }[balanceMood];

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">

        <PageHeader
          icon="M5 13l4 4L19 7"
          title="Recognition Slips"
          subtitle="10-second praise or concern slips. They accumulate towards formal cards."
        />

        <InfoNote title="The concept — counting rules">
          A slip and a positive observation are both a <b>recognition event</b>; a concern slip and a concern/urgent
          observation are both a <b>concern event</b> — they feed two separate counters that <b>never offset</b>.
          Thresholds run on a <b>rolling 12-month window</b> and the counter <b>never resets</b> when a card is issued
          (so "20" means 20 total, not 10 more after a card). <b>10 / 20 / 50+</b> recognition events flag positive-card
          / award review; <b>3 / 5</b> concern events flag coaching / written-warning review. These are
          <b> alerts for HR judgement, not automatic verdicts</b>.
        </InfoNote>

        {/* ───── Balance panel — single hero card ───── */}
        <div className={`relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 ring-1 ${balanceConf.ring} overflow-hidden`}>
          <div className="absolute right-5 top-5 flex items-center gap-2">
            <div className={`${balanceConf.bg} ${balanceConf.text} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5`}>
              <balanceConf.Icon className="w-3.5 h-3.5" />
              {balanceConf.label}
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Slip Balance</p>
          <div className="flex items-baseline gap-3 mt-1">
            <p className="text-4xl font-black text-gray-800">{ratioStr}</p>
            <p className="text-xs text-gray-500">positive : concern slips · target 3:1</p>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 leading-snug">
            Slips count as <b>recognition / concern events</b> alongside observations.
            Every {/* targets handled on cards page */}10 recognition events earns the next positive card; cards are sent from the{" "}
            <button onClick={() => navigate("/hr/vats/cards")} className="text-teal-700 font-semibold hover:underline">Cards page</button>.
          </p>

          {/* Stacked bar */}
          <div className="mt-5">
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
              <div className="bg-teal-600 transition-all duration-500" style={{ width: `${positivePct}%` }} />
              <div className="bg-amber-500 transition-all duration-500" style={{ width: `${concernPct}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-teal-700 font-semibold">
                <FiStar className="w-3.5 h-3.5" />
                {positive} positive
                <span className="text-gray-400 font-normal">({positivePct}%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <FiAlertTriangle className="w-3.5 h-3.5" />
                {concern} concern
                <span className="text-gray-400 font-normal">({concernPct}%)</span>
              </div>
            </div>
          </div>

          {/* Inline message */}
          {balanceMood !== "neutral" && (
            <p className="mt-4 text-xs text-gray-600 leading-relaxed">
              {balanceMood === "great" && <>You're recognising the team far more than you're correcting. Keep it up — that's how culture builds.</>}
              {balanceMood === "good"  && <>You're recognising more than you're correcting — healthy. Aim for at least 3 praise slips per concern.</>}
              {balanceMood === "balanced" && <>Praise and concern are equal. Try logging a few more positive slips when you see good work.</>}
              {balanceMood === "watch" && <>Concerns are outpacing praise. Look for what's going right, too — every staff has wins worth noting.</>}
            </p>
          )}
        </div>

        {/* ───── Quick record form — modern, branded only ───── */}
        {canCreate && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
                <FiZap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Quick Record</p>
                <p className="text-[11px] text-gray-500">A 10-second slip — what did you see today?</p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <KindToggle
                  active={form.kind === "positive"}
                  onClick={() => setForm({ ...form, kind: "positive" })}
                  Icon={FiStar}
                  label="Positive"
                  hint="Great work, kindness, initiative"
                  tone="teal"
                />
                <KindToggle
                  active={form.kind === "concern"}
                  onClick={() => setForm({ ...form, kind: "concern" })}
                  Icon={FiAlertTriangle}
                  label="Concern"
                  hint="Small slip — needs a quick chat"
                  tone="amber"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Staff member</label>
                <Select2
                  value={form.staff_id}
                  onChange={(v) => setForm({ ...form, staff_id: v })}
                  options={staff.map(s => ({ value: s.id, label: s.application?.full_name || s.employee_id }))}
                  placeholder="Search staff…"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">What happened? <span className="text-gray-400 font-normal">(one line)</span></label>
                <input
                  type="text"
                  maxLength={200}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder={form.kind === "positive"
                    ? "e.g. Helped a colleague set up a science demo"
                    : "e.g. Arrived 20 min late after the morning bell"}
                  className={inp}
                  required
                />
              </div>

              <button type="submit"
                disabled={submitting || !form.staff_id || !form.reason}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                <FiPlus className="w-4 h-4" />
                {submitting ? "Recording…" : "Record slip"}
              </button>
            </form>
          </div>
        )}


        {/* ───── Standings (top by positives / cards / concerns) ───── */}
        {leaderboard && (leaderboard.top_positives?.length > 0 || leaderboard.top_concerns?.length > 0 || leaderboard.top_cards?.length > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiBarChart2 className="w-4 h-4 text-teal-700" />
                <div>
                  <p className="text-sm font-bold text-teal-800">Standings</p>
                  <p className="text-[11px] text-teal-700/70">Who leads in praise, cards, and concerns</p>
                </div>
              </div>
              <div className="text-[10px] text-teal-700/70 hidden sm:block">
                {leaderboard.totals?.staff || 0} staff · {leaderboard.totals?.positive || 0} positive · {leaderboard.totals?.concern || 0} concern · {leaderboard.totals?.cards || 0} cards
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-50">
              <LeaderColumn
                title="Top recognised"
                Icon={FiStar}
                tone="teal"
                rows={leaderboard.top_positives || []}
                metricKey="positive"
                metricLabel="positive"
              />
              <LeaderColumn
                title="Most cards"
                Icon={FiAward}
                tone="teal"
                rows={leaderboard.top_cards || []}
                metricKey="cards"
                metricLabel="cards"
              />
              <LeaderColumn
                title="Most concerns"
                Icon={FiAlertTriangle}
                tone="amber"
                rows={leaderboard.top_concerns || []}
                metricKey="concern"
                metricLabel="concern"
              />
            </div>
          </div>
        )}

        {/* ───── Filters ───── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-3 flex gap-2">
          <FilterChip active={filter.kind === ""}        onClick={() => setFilter({ kind: "" })}        label="All" />
          <FilterChip active={filter.kind === "positive"} onClick={() => setFilter({ kind: "positive" })} label="Positive" Icon={FiStar}          tone="teal" />
          <FilterChip active={filter.kind === "concern"}  onClick={() => setFilter({ kind: "concern" })}  label="Concern"  Icon={FiAlertTriangle} tone="amber" />
        </div>

        {/* ───── Slip list ───── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="text-center py-10"><Spinner size={6} /></div>
          ) : slips.length === 0 ? (
            <EmptyState
              icon="M5 13l4 4L19 7"
              title="No slips yet"
              description="A 10-second 'well done' makes a real difference. Use the form above to record your first one."
            />
          ) : (
            <ul className="divide-y divide-gray-50">
              {slips.map((s) => {
                const isPositive = s.kind === "positive";
                const isHighlight = String(s.id) === String(highlightId);
                return (
                  <li key={s.id}
                    ref={(el) => { if (el) rowRefs.current[String(s.id)] = el; }}
                    className={`px-4 py-3 flex items-center gap-3 transition-shadow duration-500 ${
                      isHighlight && pulseActive ? "ring-2 ring-teal-400 bg-teal-50/60 animate-pulse" : "hover:bg-gray-50/50"
                    }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isPositive ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {isPositive ? <FiStar className="w-4 h-4" /> : <FiAlertTriangle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {s.staff?.application?.full_name || `Staff #${s.staff_id}`}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{s.reason}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 hidden sm:block">{s.issued_on?.split?.("T")[0]}</span>
                    {canDelete && (
                      <button onClick={() => remove(s.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete">
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── small UI primitives ─────────── */

function KindToggle({ active, onClick, Icon, label, hint, tone }) {
  const tones = {
    teal:  { active: "border-teal-600 bg-teal-50 text-teal-800",   iconBg: "bg-teal-600 text-white" },
    amber: { active: "border-amber-500 bg-amber-50 text-amber-800", iconBg: "bg-amber-500 text-white" },
  }[tone] || { active: "border-teal-600 bg-teal-50 text-teal-800", iconBg: "bg-teal-600 text-white" };

  return (
    <button type="button" onClick={onClick}
      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 text-left ${
        active ? tones.active : "border-gray-100 hover:border-gray-200 bg-white text-gray-700"
      }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? tones.iconBg : "bg-gray-100 text-gray-400"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">{label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{hint}</p>
      </div>
    </button>
  );
}

function FilterChip({ active, onClick, label, Icon, tone }) {
  const tones = {
    teal:  { active: "bg-teal-600 text-white",  hover: "" },
    amber: { active: "bg-amber-500 text-white", hover: "" },
    none:  { active: "bg-teal-600 text-white",  hover: "" },
  }[tone] || { active: "bg-teal-600 text-white", hover: "" };
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors ${
        active ? tones.active : "bg-gray-50 text-gray-600 hover:bg-gray-100"
      }`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function LeaderColumn({ title, Icon, tone, rows, metricKey, metricLabel }) {
  // Branded teal palette only; amber reserved for the concerns column.
  const headerText  = tone === "amber" ? "text-amber-700" : "text-teal-700";
  const iconBg      = tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700";
  const valueText   = tone === "amber" ? "text-amber-700" : "text-teal-700";
  const rankBg      = tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700";
  const max = Math.max(1, ...rows.map(r => r[metricKey] || 0));

  return (
    <div className="p-4">
      <div className={`flex items-center gap-2 mb-3 ${headerText}`}>
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${iconBg}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider">{title}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-gray-400 text-center py-3">No data yet</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => {
            const v = r[metricKey] || 0;
            const pct = Math.round((v / max) * 100);
            const isTop = i === 0;
            return (
              <li key={r.staff_id} className="flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                  isTop ? "bg-teal-600 text-white" : rankBg
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-xs font-semibold text-gray-800 truncate">{r.name}</span>
                    <span className={`text-xs font-black ${valueText}`}>{v}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-0.5">
                    <div className={`h-full transition-all duration-500 ${tone === "amber" ? "bg-amber-500" : "bg-teal-600"}`}
                         style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > 0 && (
        <p className="text-[9px] text-gray-400 mt-3 text-center uppercase tracking-wider">{metricLabel}</p>
      )}
    </div>
  );
}
