import { useState } from "react";

/**
 * Student Development history — renders every development record we hold for a
 * student (observations, under-monitoring, monthly follow-ups, elicitation
 * sessions, mentor syntheses, annual-review decisions), newest first.
 *
 * Data comes straight from the students/show endpoint, which eager-loads each
 * pipeline layer. Sections with no records are hidden; if the student has no
 * development records at all, a friendly empty state is shown.
 */

const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CATEGORY_STYLES = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-gray-50 text-gray-600 border-gray-200",
  concern: "bg-amber-50 text-amber-700 border-amber-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_STYLES = {
  active: "bg-amber-50 text-amber-700",
  monitoring: "bg-amber-50 text-amber-700",
  cleared: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  submitted: "bg-blue-50 text-blue-700",
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-50 text-blue-700",
};

const Chip = ({ children, className = "" }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${className}`}>{children}</span>
);

const Field = ({ label, value }) =>
  value ? (
    <div>
      <span className="text-[10px] font-semibold text-gray-400 uppercase">{label}: </span>
      <span className="text-[11px] text-gray-700">{value}</span>
    </div>
  ) : null;

const Section = ({ title, count, color, children }) => {
  const [open, setOpen] = useState(true);
  if (!count) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
          <h4 className="text-sm font-bold text-gray-800">{title}</h4>
          <Chip className="bg-gray-100 text-gray-600">{count}</Chip>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5 space-y-2.5">{children}</div>}
    </div>
  );
};

const Card = ({ children }) => (
  <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1.5">{children}</div>
);

export default function StudentDevelopmentPanel({ student }) {
  const observations = student?.observations || [];
  const monitorings = student?.monitorings || [];
  const followups = student?.monitoring_followups || [];
  const elicitations = student?.elicitation_sessions || [];
  const syntheses = student?.syntheses || [];
  const decisions = student?.annual_review_decisions || [];

  const total =
    observations.length + monitorings.length + followups.length +
    elicitations.length + syntheses.length + decisions.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">Student Development</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">{total} record{total !== 1 ? "s" : ""} across all layers</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {total === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">No development records yet for this student.</p>
          </div>
        )}

        {/* Layer 1 — Observations */}
        <Section title="Observations" count={observations.length} color="bg-teal-500">
          {observations.map((o) => (
            <Card key={`obs-${o.id}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Chip className={CATEGORY_STYLES[o.category] || CATEGORY_STYLES.neutral}>{o.category || "observation"}</Chip>
                  {o.dimension && <Chip className="bg-indigo-50 text-indigo-600">{o.dimension}</Chip>}
                  {o.monitoring_flag ? <Chip className="bg-red-50 text-red-700">⚑ flagged</Chip> : null}
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{fmtDate(o.observed_on)}</span>
              </div>
              {o.description && <p className="text-[12px] text-gray-700 leading-relaxed">{o.description}</p>}
              <Field label="Recommendation" value={o.recommendation} />
              <div className="flex items-center gap-3 flex-wrap pt-0.5">
                {o.subject && <Field label="Subject" value={o.subject} />}
                {o.school_class?.class_name && <Field label="Class" value={o.school_class.class_name} />}
                <Field label="By" value={o.observer?.name || o.teacher?.staff?.application?.full_name} />
              </div>
            </Card>
          ))}
        </Section>

        {/* Layer 2 — Under-Monitoring */}
        <Section title="Under-Monitoring" count={monitorings.length} color="bg-amber-500">
          {monitorings.map((m) => (
            <Card key={`mon-${m.id}`}>
              <div className="flex items-center justify-between gap-2">
                <Chip className={STATUS_STYLES[m.status] || STATUS_STYLES.pending}>{m.status || "—"}</Chip>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">flagged {fmtDate(m.first_flagged_on)}</span>
              </div>
              {m.reason && <p className="text-[12px] text-gray-700 leading-relaxed">{m.reason}</p>}
              <Field label="Flagged by" value={m.flagged_by?.name} />
            </Card>
          ))}
        </Section>

        {/* Layer 2 — Monthly Follow-ups */}
        <Section title="Monthly Follow-ups" count={followups.length} color="bg-orange-500">
          {followups.map((f) => (
            <Card key={`fu-${f.id}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Chip className="bg-gray-100 text-gray-600">{MONTHS[f.period_month] || f.period_month} {f.period_year}</Chip>
                  <Chip className={STATUS_STYLES[f.status] || STATUS_STYLES.pending}>{f.status || "—"}</Chip>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{f.mentor?.name || ""}</span>
              </div>
              <Field label="Pattern" value={f.pattern} />
              <Field label="Change vs last month" value={f.change_vs_last_month} />
              <Field label="Next month plan" value={f.next_month_plan} />
            </Card>
          ))}
        </Section>

        {/* Layer 3 — Elicitation Sessions */}
        <Section title="Elicitation Sessions" count={elicitations.length} color="bg-violet-500">
          {elicitations.map((e) => (
            <Card key={`eli-${e.id}`}>
              <div className="flex items-center justify-between gap-2">
                <Chip className={STATUS_STYLES[e.status] || STATUS_STYLES.pending}>{e.status || "—"}</Chip>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {fmtDate(e.conducted_on || e.scheduled_on)}
                </span>
              </div>
              <Field label="Goal" value={e.goal} />
              <Field label="Recommendation" value={e.recommendation} />
              <Field label="Action" value={e.recommendation_action} />
              <Field label="Mentor" value={e.mentor?.name} />
            </Card>
          ))}
        </Section>

        {/* Layer 3.5 — Mentor Syntheses */}
        <Section title="Mentor Syntheses" count={syntheses.length} color="bg-blue-500">
          {syntheses.map((s) => (
            <Card key={`syn-${s.id}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {s.period && <Chip className="bg-gray-100 text-gray-600">{s.period}</Chip>}
                  <Chip className={STATUS_STYLES[s.status] || STATUS_STYLES.draft}>{s.status || "—"}</Chip>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{s.mentor?.name || ""}</span>
              </div>
              <Field label="Overall trend" value={s.overall_trend} />
              {(s.overall_progress || s.overall_progress === 0) && (
                <Field label="Overall progress" value={`${s.overall_progress}`} />
              )}
              <Field label="Most important statement" value={s.most_important_statement} />
            </Card>
          ))}
        </Section>

        {/* Layer 4 — Annual Review Decisions */}
        <Section title="Annual Review Decisions" count={decisions.length} color="bg-rose-500">
          {decisions.map((d) => (
            <Card key={`arv-${d.id}`}>
              <div className="flex items-center justify-between gap-2">
                <Chip className="bg-rose-50 text-rose-700">{d.decision || "decision"}</Chip>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {fmtDate(d.reviewed_on)}{d.panel?.year ? ` · ${d.panel.year}` : ""}
                </span>
              </div>
              <Field label="Reasoning" value={d.reasoning} />
              <Field label="Effective from" value={d.effective_from ? fmtDate(d.effective_from) : null} />
              <Field label="Recorded by" value={d.recorder?.name} />
            </Card>
          ))}
        </Section>
      </div>
    </div>
  );
}
