import { useEffect, useState } from "react";
import { crossClassSummary, homeworkCompliance, coaching } from "../../api/gradebook";
import {
  Page, Header, Card, TableCard, thCls, tdCls, StatGrid, Section, InfoNote,
  BalanceBar, EmptyState, Spinner, ICON, scoreColor, fmtScore,
} from "./gradebookUi";

/** Leadership panel: cross-class averages + 4D balance, homework compliance,
 *  and 4D-balance coaching signals. Reads served entirely from rollups. */
export default function GradebookDashboard() {
  const [cross, setCross] = useState(null);
  const [hw, setHw] = useState(null);
  const [coach, setCoach] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    Promise.all([
      crossClassSummary().then((r) => setCross(r.data)).catch((e) => { if (e.response?.status === 403) setForbidden(true); }),
      homeworkCompliance().then((r) => setHw(r.data)).catch(() => {}),
      coaching().then((r) => setCoach(r.data?.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Page><Spinner /></Page>;
  if (forbidden) return <Page><Header icon={ICON.chart} title="Gradebook analytics" /><EmptyState icon={ICON.chart} title="Leadership only" description="This panel is available to deputies and administrators." /></Page>;

  const o = cross?.overall || {};
  const s = hw?.stats || {};
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

  return (
    <Page>
      <Header icon={ICON.chart} title="Gradebook analytics" subtitle={`Monthly panel${cross?.month ? ` · ${cross.month}` : ""}`} />

      <StatGrid stats={[
        { label: "Overall average", value: `${fmtScore(o.avg)} / 10`, tone: "teal", hint: `${o.classes || 0} class·subjects` },
        { label: "Assessments", value: o.assessments || 0, tone: "blue" },
        { label: "HW submission", value: `${pct(s.submitted, s.assigned)}%`, tone: "emerald", hint: `${s.assigned || 0} assigned` },
        { label: "HW reviewed", value: `${pct(s.reviewed, s.assigned)}%`, tone: "amber" },
      ]} />

      <Section title="Averages by class" subtitle="Class · subject monthly average and 4D balance">
        {(cross?.classes || []).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No graded classes this month.</p>}
        <div className="space-y-3">
          {(cross?.classes || []).map((c, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-800 truncate">{c.class_name} · {c.subject_name}</span>
                <span className="text-lg font-black tabular-nums" style={{ color: scoreColor(c.avg) }}>{fmtScore(c.avg)}</span>
              </div>
              <BalanceBar balance={c.balance} />
            </div>
          ))}
        </div>
      </Section>

      {coach.length > 0 && (
        <Section title="Coaching suggestions" subtitle="4D-balance signals — for leadership only, never shown to peers">
          <div className="space-y-2">
            {coach.map((c) => (
              <InfoNote key={c.id} tone="amber" title={`Teacher #${c.teacher_id} · ${c.year_month}`}>
                Grading is concentrated in one dimension ({String(c.reason).replace("dominant:", "")}). Suggest a coaching session on 4D balance.
              </InfoNote>
            ))}
          </div>
        </Section>
      )}

      {(hw?.waiting || []).length > 0 && (
        <Section title="Homework waiting longest for review">
          <TableCard>
            <thead><tr><th className={thCls}>Teacher</th><th className={thCls}>Waiting</th><th className={`${thCls} text-right`}>Oldest</th></tr></thead>
            <tbody>
              {(hw.waiting || []).map((w, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className={tdCls}>Teacher #{w.teacher_id}</td>
                  <td className={tdCls}>{w.waiting_count}</td>
                  <td className={`${tdCls} text-right`}>{w.oldest ? new Date(w.oldest).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </Section>
      )}
    </Page>
  );
}
