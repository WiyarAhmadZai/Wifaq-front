import { useState, useEffect } from "react";
import { get } from "../../api/axios";
import { PageHeader, StatGrid, Section, Spinner, EmptyState, InfoNote } from "../../components/hr/HrUI";

import { fmtDate, fmtDateTime, fmtMonth } from "../../utils/formErrors";

/**
 * Aggregate-only welfare dashboard for leadership.
 * Never shows individual rows — privacy is enforced server-side too.
 */
export default function WelfareDashboard() {
  const [agg, setAgg] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [a, al, b] = await Promise.all([
        get("/welfare/checkins/aggregate"),
        get("/welfare/alerts"),
        get("/welfare/benefits"),
      ]);
      setAgg(a.data?.data || []);
      setAlerts(al.data?.data?.data || al.data?.data || []);
      setBenefits(b.data?.data?.data || b.data?.data || []);
    } catch { /* tolerate */ }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner /></div>;

  const latest = agg[0]; // first is most recent due to ORDER BY year/month DESC
  const openAlerts = alerts.filter(a => a.status === "open").length;
  const totalBenefits = benefits.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const supportedStaff = new Set(benefits.map(b => b.staff_id)).size;

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">

        <PageHeader
          icon="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
          title="Ihsan Welfare — Institutional View"
          subtitle="How are we caring for our staff? This page shows organisation-wide patterns only — never individual answers."
        >
          <div className="bg-white/15 rounded-xl px-4 py-2.5 text-[11px] text-teal-50 leading-relaxed">
            <strong>Privacy guarantee.</strong> Individual check-in data is invisible here, even to leadership. We see <em>aggregate trends</em> so we can act institutionally, never single people out.
          </div>
        </PageHeader>

        <InfoNote title="The concept — Ihsan welfare is walled off from performance">
          A staff member telling us they are struggling is an <b>act of trust</b>. Welfare data <b>never enters a
          performance context</b> — enforced at the query level, not just by policy. A low welfare score triggers
          <b> care, not scrutiny</b>, and routes to the <b>Welfare Officer — never the direct supervisor</b>. The 4D
          wellbeing (spiritual · emotional · physical · professional) plus material &amp; psychological signals exist
          to measure whether <b>WEN is fulfilling its obligation to staff</b>, never to assess the staff member.
        </InfoNote>

        <StatGrid stats={[
          {
            label: "Latest avg score",
            value: latest ? `${avgOf(latest)} / 5` : "—",
            tone: latest && avgOf(latest) >= 3.5 ? "emerald" : "amber",
            icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z",
            hint: latest ? `${monthLabel(latest)}` : "No check-ins yet",
          },
          {
            label: "Asking for support",
            value: latest?.needs_support_count ?? 0,
            tone: (latest?.needs_support_count ?? 0) > 0 ? "red" : "teal",
            icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11",
            hint: "This month",
          },
          {
            label: "Open alerts",
            value: openAlerts,
            tone: openAlerts > 0 ? "amber" : "emerald",
            icon: "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            hint: "Need follow-up",
          },
          {
            label: "Care delivered",
            value: totalBenefits.toLocaleString() + " AFN",
            tone: "purple",
            icon: "M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318",
            hint: `${supportedStaff} staff helped`,
          },
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 4D trend */}
          <Section
            title="The 4 Dimensions Over Time"
            subtitle="Average scores from staff self-reports"
            icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          >
            {agg.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Not enough data yet</p>
            ) : (
              <div className="space-y-3">
                {[
                  { key: "avg_spiritual", label: "Spiritual",    tone: "purple" },
                  { key: "avg_emotional", label: "Emotional",    tone: "blue" },
                  { key: "avg_physical",  label: "Physical",     tone: "emerald" },
                  { key: "avg_professional", label: "Professional", tone: "teal" },
                  { key: "avg_motivation", label: "Motivation",  tone: "amber" },
                ].map(d => {
                  const score = parseFloat(latest?.[d.key] || 0);
                  return <ScoreBar key={d.key} label={d.label} score={score} tone={d.tone} />;
                })}
              </div>
            )}
          </Section>

          {/* Recent months */}
          <Section
            title="Past Months"
            subtitle="Aggregate by month"
            icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          >
            {agg.length === 0 ? (
              <EmptyState
                title="No history yet"
                description="Once staff submit monthly check-ins, you'll see trends here."
              />
            ) : (
              <div className="space-y-2">
                {agg.map((m, i) => {
                  const score = avgOf(m);
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                      <div className="text-center flex-shrink-0">
                        <p className="text-[10px] uppercase font-semibold text-gray-500">{fmtMonth(m.year, m.month - 1, { yearless: true })}</p>
                        <p className="text-[10px] text-gray-400">{m.year}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">Avg {score} / 5</p>
                        <p className="text-[11px] text-gray-500">{m.total_checkins} check-ins · {m.needs_support_count} asked for support</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        score >= 4 ? "bg-emerald-100 text-emerald-700" :
                        score >= 3 ? "bg-blue-100 text-blue-700" :
                        score >= 2 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                      }`}>
                        {score >= 4 ? "Healthy" : score >= 3 ? "OK" : score >= 2 ? "Watch" : "Concern"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* Bottom guidance */}
        <div className="mt-5 bg-teal-600 text-white rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="text-xs leading-relaxed">
            <strong>Reminder.</strong> Welfare data is not performance data. A low aggregate this month means we should ask "what does our team need?" — not "who is underperforming?" The supervisor cannot see a report's individual answers, even from this dashboard.
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, tone }) {
  const pct = Math.min(100, (score / 5) * 100);
  const tones = {
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    teal: "bg-teal-500",
    amber: "bg-amber-500",
  };
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className="text-xs font-bold text-gray-800">{score.toFixed(1)} <span className="text-gray-400">/5</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`${tones[tone]} h-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function avgOf(m) {
  const v = [m.avg_spiritual, m.avg_emotional, m.avg_physical, m.avg_professional]
    .map(Number).filter(n => !isNaN(n));
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "—";
}

function monthLabel(m) {
  return fmtMonth(m.year, m.month - 1);
}
