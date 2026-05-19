import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../api/axios";

import { fmtDate } from "../utils/formErrors";

/**
 * Role-aware home dashboard. The backend returns only the sections the caller
 * is allowed to see, so this page just renders whatever it gets.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await get("/dashboard/summary");
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh every 60 seconds so numbers stay live.
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-500">
        Could not load dashboard data.
      </div>
    );
  }

  const { me, overview, hr, vats, welfare, leave, recruitment, finance, me_section, charts, recent_activity } = data;
  const roleLabel = me.is_super_admin ? "Super Admin"
    : me.is_hr ? "HR / Admin"
    : me.is_finance ? "Finance"
    : me.is_welfare ? "Welfare Officer"
    : (me.roles?.[0] || "Staff");

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">

        {/* ─── Greeting hero ─── */}
        <div className="bg-gradient-to-br from-teal-700 to-teal-600 rounded-2xl px-5 py-5 mb-5 text-white shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-black overflow-hidden flex-shrink-0">
            {me.photo ? <img src={me.photo} alt={me.name} className="w-full h-full object-cover" /> : (me.name?.charAt(0) || "U")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-teal-100">{greeting()}</p>
            <h1 className="text-lg font-black truncate">{me.name}</h1>
            <p className="text-xs text-teal-100 mt-0.5 truncate">{roleLabel}{me.staff_id ? ` · Staff #${me.staff_id}` : ""}</p>
          </div>
          {me_section?.unread_notifications > 0 && (
            <div className="bg-white/15 rounded-xl px-3 py-2 text-center flex-shrink-0">
              <p className="text-[10px] text-teal-100">Unread</p>
              <p className="text-xl font-black">{me_section.unread_notifications}</p>
            </div>
          )}
        </div>

        {/* ─── Overview strip (HR / finance) ─── */}
        {overview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard label="Total Staff"    value={overview.staff}    tone="teal"    icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857" />
            <StatCard label="Total Students" value={overview.students} tone="blue"    icon="M12 14l9-5-9-5-9 5 9 5z" />
            <StatCard label="Teachers"       value={overview.teachers} tone="purple"  icon="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4" />
            <StatCard label="Branches"       value={overview.branches} tone="emerald" icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </div>
        )}

        {/* ─── Personal slice + observation chart ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <Section
            title="My Quick View"
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            onClick={() => navigate("/profile")}
            cta="Open my profile →"
          >
            <Row label="My pending leave requests"  value={leave?.mine_pending ?? 0} highlight={(leave?.mine_pending ?? 0) > 0 ? "amber" : null} />
            <Row label="Total leave requests"       value={leave?.mine_total ?? 0} />
            <Row label="Unread notifications"       value={me_section?.unread_notifications ?? 0} highlight={(me_section?.unread_notifications ?? 0) > 0 ? "blue" : null} />
          </Section>

          {charts?.observations_last_6_months && (
            <Section title="Observations — last 6 months" icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" className="lg:col-span-2">
              <ObservationsChart data={charts.observations_last_6_months} />
            </Section>
          )}
        </div>

        {/* ─── VATS + Welfare + Leave + Recruitment + HR + Finance ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
          {vats && (
            <Section title="Performance (VATS)" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" onClick={() => navigate("/hr/vats")} cta="Open →">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <MiniStat label="Pos"     value={vats.positive} tone="emerald" />
                <MiniStat label="Concern" value={vats.concern}  tone="amber" />
                <MiniStat label="Urgent"  value={vats.urgent}   tone="red" />
              </div>
              <Row label="Observations this month" value={vats.this_month_total} />
              <Row label="Recognition slips"       value={`${vats.slips_positive} 🌟 · ${vats.slips_concern} ⚠`} />
              <Row label="Cards issued"            value={vats.cards_total} />
              <Row label="Open interventions"      value={vats.open_interventions} highlight={vats.open_interventions > 0 ? "red" : null} />
            </Section>
          )}

          {welfare && (
            <Section title="Ihsan Welfare" icon="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" onClick={() => navigate("/hr/welfare")} cta="Open →">
              <Row label="Latest average score" value={welfare.latest_avg ? `${welfare.latest_avg} / 5` : "—"} />
              <Row label="Check-ins this month" value={welfare.check_ins_this_month} />
              <Row label="Open alerts"          value={welfare.open_alerts} highlight={welfare.open_alerts > 0 ? "amber" : null} />
              <Row label="Total support given"  value={`${(welfare.benefits_total || 0).toLocaleString()} AFN`} />
            </Section>
          )}

          {leave?.pending != null && (
            <Section title="Leave Requests" icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" onClick={() => navigate("/hr/leave-request")} cta="Open list →">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <MiniStat label="Pending"  value={leave.pending}          tone="amber" />
                <MiniStat label="Approved" value={leave.approved_this_mo} tone="emerald" />
                <MiniStat label="Rejected" value={leave.rejected_this_mo} tone="red" />
              </div>
              {charts?.leave_by_status && <LeaveDonut data={charts.leave_by_status} />}
            </Section>
          )}

          {recruitment && (
            <Section title="Recruitment" icon="M17 20h5v-2a3 3 0 00-5.356-1.857" onClick={() => navigate("/recruitment/applications")} cta="Open →">
              <Row label="Active applications" value={recruitment.active_applications} highlight={recruitment.active_applications > 0 ? "teal" : null} />
              <Row label="Hired this month"    value={recruitment.hired_this_month} />
              <Row label="Total applications"  value={recruitment.total_applications} />
            </Section>
          )}

          {hr && (
            <Section title="HR — Staff" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" onClick={() => navigate("/hr/staff")} cta="Open →">
              <Row label="Active staff"            value={hr.staff_active}    highlight="emerald" />
              <Row label="Inactive / other"        value={hr.staff_inactive} />
              <Row label="New this month"          value={hr.new_this_month}  highlight={hr.new_this_month > 0 ? "blue" : null} />
              <Row label="Contracts ending in 60d" value={hr.contracts_due_60d} highlight={hr.contracts_due_60d > 0 ? "amber" : null} />
            </Section>
          )}

          {finance && (
            <Section title="Finance" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1" onClick={() => navigate("/finance/fee-payments")} cta="Open →">
              <Row label="Revenue this month"  value={`${(finance.fee_revenue_month || 0).toLocaleString()} AFN`} highlight="emerald" />
              <Row label="Revenue all time"    value={`${(finance.fee_revenue_total || 0).toLocaleString()} AFN`} />
              <Row label="Outstanding fees"    value={`${(finance.outstanding_fees  || 0).toLocaleString()} AFN`} highlight={(finance.outstanding_fees || 0) > 0 ? "red" : null} />
            </Section>
          )}
        </div>

        {/* ─── Departments + Recent activity ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {charts?.staff_by_department && charts.staff_by_department.length > 0 && (
            <Section title="Staff by Department" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5">
              <DeptBars data={charts.staff_by_department} />
            </Section>
          )}

          {recent_activity && recent_activity.length > 0 && (
            <Section title="Recent Activity" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z">
              <div className="divide-y divide-gray-50 -mx-1">
                {recent_activity.map((a, i) => (
                  <div key={i}
                    onClick={() => a.link && navigate(a.link)}
                    className="px-1 py-2.5 flex items-start gap-3 cursor-pointer hover:bg-gray-50/60 rounded-lg transition-colors">
                    <ActivityIcon item={a} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 truncate">{a.title}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(a.when)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────── building blocks ──────────────── */

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(iso);
}

function StatCard({ label, value, icon, tone = "teal" }) {
  const tones = {
    teal:    { bg: "bg-teal-50",    text: "text-teal-700",    accent: "bg-teal-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", accent: "bg-emerald-600" },
    blue:    { bg: "bg-blue-50",    text: "text-blue-700",    accent: "bg-blue-600" },
    purple:  { bg: "bg-purple-50",  text: "text-purple-700",  accent: "bg-purple-600" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700",   accent: "bg-amber-500" },
    red:     { bg: "bg-red-50",     text: "text-red-700",     accent: "bg-red-600" },
  }[tone] || { bg: "bg-gray-50", text: "text-gray-700", accent: "bg-gray-600" };
  return (
    <div className={`${tones.bg} rounded-2xl p-4 border border-white/40`}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${tones.text}`}>{label}</p>
        {icon && (
          <div className={`w-7 h-7 ${tones.accent} text-white rounded-lg flex items-center justify-center`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-800 mt-1.5">{value ?? 0}</p>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    teal: "bg-teal-50 text-teal-700",
  }[tone] || "bg-gray-50 text-gray-700";
  return (
    <div className={`rounded-lg p-2 text-center ${tones}`}>
      <p className="text-[9px] font-bold uppercase">{label}</p>
      <p className="text-base font-black text-gray-800">{value ?? 0}</p>
    </div>
  );
}

function Row({ label, value, highlight }) {
  const tones = {
    emerald: "text-emerald-600",
    amber:   "text-amber-600",
    red:     "text-red-600",
    blue:    "text-blue-600",
    teal:    "text-teal-600",
  };
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-bold ${highlight ? tones[highlight] : "text-gray-800"}`}>{value ?? "—"}</span>
    </div>
  );
}

function Section({ title, icon, children, onClick, cta, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          )}
          <h3 className="text-sm font-bold text-teal-800">{title}</h3>
        </div>
        {onClick && cta && (
          <button onClick={onClick} className="text-[11px] font-semibold text-teal-700 hover:underline">{cta}</button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ──────────────── charts ──────────────── */

function ObservationsChart({ data }) {
  const max = Math.max(1, ...data.map(d => (d.positive + d.concern + d.urgent)));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => {
        const total = d.positive + d.concern + d.urgent;
        const h = (total / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col-reverse rounded-sm overflow-hidden" style={{ height: `${h}%`, minHeight: "4px" }}>
              {d.positive > 0 && <div className="bg-emerald-500" style={{ height: `${(d.positive / total) * 100}%` }} />}
              {d.concern > 0 && <div className="bg-amber-500"   style={{ height: `${(d.concern  / total) * 100}%` }} />}
              {d.urgent > 0  && <div className="bg-red-500"     style={{ height: `${(d.urgent   / total) * 100}%` }} />}
            </div>
            <span className="text-[9px] text-gray-500">{d.label}</span>
            <span className="text-[10px] font-bold text-gray-700">{total}</span>
          </div>
        );
      })}
      <div className="ml-2 flex flex-col gap-1 text-[9px] text-gray-500 self-end">
        <span><span className="inline-block w-2 h-2 bg-emerald-500 rounded-sm mr-1" />positive</span>
        <span><span className="inline-block w-2 h-2 bg-amber-500   rounded-sm mr-1" />concern</span>
        <span><span className="inline-block w-2 h-2 bg-red-500     rounded-sm mr-1" />urgent</span>
      </div>
    </div>
  );
}

function LeaveDonut({ data }) {
  const tones = { pending: "#f59e0b", approved: "#10b981", rejected: "#ef4444" };
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return <p className="text-xs text-gray-400 text-center py-4">No leave requests yet</p>;

  const r = 30, c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center justify-center gap-4">
      <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
        {entries.map(([k, v]) => {
          const dash = (v / total) * c;
          const seg = (
            <circle key={k} cx="40" cy="40" r={r} fill="none" stroke={tones[k] || "#9ca3af"}
              strokeWidth="12" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <div className="space-y-1 text-xs">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: tones[k] || "#9ca3af" }} />
            <span className="capitalize text-gray-600">{k}</span>
            <span className="font-bold text-gray-800 ml-auto">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeptBars({ data }) {
  const max = Math.max(1, ...data.map(d => d.count));
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700 truncate">{d.department}</span>
            <span className="font-bold text-gray-800">{d.count}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-teal-500 h-full transition-all duration-500"
                 style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityIcon({ item }) {
  const conf = {
    leave_request:    { bg: "bg-blue-100",    text: "text-blue-600",    path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    staff_registered: { bg: "bg-teal-100",    text: "text-teal-600",    path: "M17 20h5v-2a3 3 0 00-5.356-1.857" },
    vats_observation: { bg: "bg-purple-100",  text: "text-purple-600",  path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" },
    vats_card:        { bg: "bg-amber-100",   text: "text-amber-700",   path: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
  }[item.kind] || { bg: "bg-gray-100", text: "text-gray-600", path: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" };
  return (
    <div className={`w-7 h-7 rounded-lg ${conf.bg} flex items-center justify-center flex-shrink-0`}>
      <svg className={`w-3.5 h-3.5 ${conf.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={conf.path} />
      </svg>
    </div>
  );
}
