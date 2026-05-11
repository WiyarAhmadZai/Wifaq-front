import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../../api/axios";
import { PageHeader, StatGrid, Section, Pill, Spinner } from "../../components/hr/HrUI";

const CARD_COLORS = [
  { color: "gold",      label: "Gold",      tone: "yellow",  desc: "Extraordinary all-around excellence" },
  { color: "turquoise", label: "Turquoise", tone: "teal",    desc: "Character & ethical excellence" },
  { color: "green",     label: "Green",     tone: "emerald", desc: "Sustained high performance" },
  { color: "yellow",    label: "Yellow",    tone: "amber",   desc: "First documented concern" },
  { color: "red",       label: "Red",       tone: "red",     desc: "Serious accountability" },
];

export default function VatsDashboard() {
  const navigate = useNavigate();
  const [obs, setObs] = useState([]);
  const [slips, setSlips] = useState([]);
  const [cards, setCards] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [o, s, c, i] = await Promise.all([
        get("/vats/observations?per_page=200"),
        get("/vats/slips?per_page=200"),
        get("/vats/cards"),
        get("/vats/interventions?per_page=200"),
      ]);
      setObs(o.data?.data || []);
      setSlips(s.data?.data || []);
      setCards(c.data?.data || []);
      setInterventions(i.data?.data?.data || i.data?.data || []);
    } catch (e) { /* tolerate empty */ }
    finally { setLoading(false); }
  };

  // Aggregate stats
  const positive = obs.filter(o => o.category === "positive").length;
  const concern = obs.filter(o => o.category === "concern").length;
  const urgent = obs.filter(o => o.category === "urgent").length;
  const positiveSlips = slips.filter(s => s.kind === "positive").length;
  const concernSlips = slips.filter(s => s.kind === "concern").length;
  const ratio = concern + urgent > 0 ? (positive / (concern + urgent)).toFixed(1) : positive ? "∞" : "—";
  const openInterventions = interventions.filter(i => i.status !== "resolved").length;

  // Cards by colour
  const cardsBy = (color) => cards.filter(c => c.color === color).length;

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">

        <PageHeader
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          title="VATS — Performance Overview"
          subtitle="The evidence engine: every observation, slip, card and intervention from across the year. Year-end appraisals are built from this."
          actions={
            <>
              <button onClick={() => navigate("/hr/vats/observations")}
                className="px-3 py-1.5 bg-white text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-50">
                + Observation
              </button>
              <button onClick={() => navigate("/hr/vats/slips")}
                className="px-3 py-1.5 bg-white/15 text-white text-xs font-semibold rounded-lg hover:bg-white/25">
                + Slip
              </button>
            </>
          }
        />

        <StatGrid
          stats={[
            { label: "Observations", value: obs.length, tone: "teal", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2", hint: `${positive} positive · ${concern} concern · ${urgent} urgent` },
            { label: "Pos / Neg ratio", value: ratio + ":1", tone: ratio === "—" || (typeof ratio === "string" && ratio.replace(/[^\d.]/g, "") < 3) ? "amber" : "emerald", icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", hint: "Healthy target: 3:1 or better" },
            { label: "Recognition Slips", value: slips.length, tone: "emerald", icon: "M5 13l4 4L19 7", hint: `${positiveSlips} praise · ${concernSlips} concern` },
            { label: "Open interventions", value: openInterventions, tone: openInterventions > 0 ? "red" : "teal", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", hint: "Across all 5 levels" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2 space-y-4">

            <Section
              title="Observation Mix"
              subtitle="What kind of evidence are supervisors logging?"
              icon="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
            >
              <BarRow label="Positive"  count={positive} total={obs.length} tone="emerald" />
              <BarRow label="Concern"   count={concern}  total={obs.length} tone="amber" />
              <BarRow label="Urgent"    count={urgent}   total={obs.length} tone="red" />
              {obs.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Log the first observation to see this chart fill.</p>}
            </Section>

            <Section
              title="Recent Activity"
              subtitle="Latest 10 observations"
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              action={<button onClick={() => navigate("/hr/vats/observations")} className="text-[11px] font-semibold text-teal-700 hover:underline">View all →</button>}
            >
              {obs.slice(0, 10).map(o => (
                <div key={o.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    o.category === "positive" ? "bg-emerald-500" :
                    o.category === "concern" ? "bg-amber-500" : "bg-red-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {o.staff?.application?.full_name || `Staff #${o.staff_id}`}
                      <span className="ml-2 text-[10px] text-gray-400 font-medium">{o.type?.replace(/_/g, " ")}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{o.description}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 hidden sm:block">{o.observed_on?.split?.("T")[0]}</span>
                </div>
              ))}
              {obs.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nothing yet</p>}
            </Section>
          </div>

          <div className="space-y-4">
            <Section
              title="Card Wallet"
              subtitle="Cards issued by colour"
              icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              action={<button onClick={() => navigate("/hr/vats/cards")} className="text-[11px] font-semibold text-teal-700 hover:underline">Manage →</button>}
            >
              {CARD_COLORS.map(c => (
                <div key={c.color} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CardBadge color={c.color} small />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800">{c.label}</p>
                      <p className="text-[10px] text-gray-400 truncate">{c.desc}</p>
                    </div>
                  </div>
                  <span className="text-base font-black text-gray-800">{cardsBy(c.color)}</span>
                </div>
              ))}
            </Section>

            <Section
              title="Open Interventions"
              icon="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              action={<button onClick={() => navigate("/hr/vats/interventions")} className="text-[11px] font-semibold text-teal-700 hover:underline">View →</button>}
            >
              {interventions.filter(i => i.status !== "resolved").slice(0, 5).map(i => (
                <div key={i.id} className="py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-800 truncate">{i.subject}</p>
                    <Pill tone={["teal","blue","amber","red","gray"][Math.min(i.level - 1, 4)]}>L{i.level}</Pill>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {i.staff?.application?.full_name} · opened {i.opened_on}
                  </p>
                </div>
              ))}
              {openInterventions === 0 && <p className="text-xs text-gray-400 text-center py-3">No open interventions — good.</p>}
            </Section>
          </div>
        </div>

        {/* Tip strip */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="text-xs text-teal-800">
            <strong>Tip:</strong> Aim for at least 3 positive observations for every concern. Recognition is what builds the culture; correction is just maintenance.
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, count, total, tone }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const tones = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
        <span>{label}</span>
        <span>{count} <span className="text-gray-400">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`${tones[tone]} h-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CardBadge({ color, small = false }) {
  const styles = {
    gold:      { bg: "bg-yellow-400", ring: "ring-yellow-300",   icon: "🥇" },
    turquoise: { bg: "bg-teal-500",   ring: "ring-teal-300",     icon: "💎" },
    green:     { bg: "bg-emerald-500",ring: "ring-emerald-300",  icon: "🟢" },
    yellow:    { bg: "bg-amber-400",  ring: "ring-amber-300",    icon: "🟡" },
    red:       { bg: "bg-red-500",    ring: "ring-red-300",      icon: "🔴" },
  }[color] || { bg: "bg-gray-300", ring: "ring-gray-200", icon: "?" };
  const sz = small ? "w-7 h-7 text-sm" : "w-12 h-12 text-2xl";
  return (
    <div className={`${sz} ${styles.bg} ${styles.ring} ring-2 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
      <span>{styles.icon}</span>
    </div>
  );
}
