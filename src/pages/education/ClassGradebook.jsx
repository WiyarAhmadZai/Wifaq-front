import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assessmentFormData, classGradebook, listAssessments } from "../../api/gradebook";
import { peekCache } from "../../api/axios";
import {
  Page, Header, Card, TableCard, thCls, tdCls, Avatar, Pill, Select, Btn,
  StatGrid, Section, BalanceBar, EmptyState, Spinner, Loading, LoadingRow, ICON, scoreColor, fmtScore,
} from "./gradebookUi";

/** Class gradebook: pick a class+subject, see the monthly average, 4D balance,
 *  student list sorted by average, and the assessment list. */
export default function ClassGradebook() {
  const navigate = useNavigate();
  const [pairs, setPairs] = useState([]);
  const [sel, setSel] = useState(null);
  const [data, setData] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const __cached = peekCache("/gradebook/assessments/form-data");
    if (__cached) { const p = __cached?.pairs || []; setPairs(p); if (p.length) setSel(p[0]); setLoading(false); }
    assessmentFormData().then((r) => { const p = r.data?.pairs || []; setPairs(p); if (p.length) setSel(p[0]); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sel) return;
    setBusy(true);
    const __data = peekCache(`/gradebook/class/${sel.school_class_id}/subject/${sel.subject_id}`, {});
    const __assess = peekCache("/gradebook/assessments", { school_class_id: sel.school_class_id });
    if (__data) { setData(__data); setAssessments(__assess?.data || []); setBusy(false); }
    Promise.all([
      classGradebook(sel.school_class_id, sel.subject_id).then((r) => setData(r.data)).catch(() => setData(null)),
      listAssessments({ school_class_id: sel.school_class_id }).then((r) => setAssessments(r.data?.data || [])).catch(() => setAssessments([])),
    ]).finally(() => setBusy(false));
  }, [sel]);

  if (loading) return <Loading />;
  const pairKey = (p) => `${p.school_class_id}:${p.subject_id}`;
  const newAssessment = () => navigate(`/education/gradebook/assessments/new?class=${sel.school_class_id}&subject=${sel.subject_id}`);

  return (
    <Page>
      <Header icon={ICON.book} title="Gradebook" subtitle={data ? `${data.class?.name} · ${data.subject?.name}` : "Class grades"}
        actions={sel && <Btn tone="white" onClick={newAssessment}>＋ New assessment</Btn>} />

      {pairs.length === 0 ? (
        <EmptyState icon={ICON.book} title="No class assigned to you"
          description="Ask an administrator to link you to a class & subject in Class Management → Grade Subjects." />
      ) : (
        <>
          <Card className="mb-4">
            <Select value={sel ? pairKey(sel) : ""} onChange={(e) => setSel(pairs.find((p) => pairKey(p) === e.target.value))}>
              {pairs.map((p) => <option key={pairKey(p)} value={pairKey(p)}>{p.class_name} · {p.subject_name}</option>)}
            </Select>
          </Card>

          {busy && <LoadingRow />}

          {!busy && data && (
            <>
              <StatGrid stats={[
                { label: "Monthly average", value: `${fmtScore(data.summary?.avg)} / 10`, tone: "teal", hint: `${data.summary?.count || 0} grades · trend ${data.summary?.trend || "—"}` },
                { label: "Students", value: data.students?.length || 0, tone: "emerald" },
                { label: "Assessments", value: assessments.length, tone: "blue" },
                { label: "Top score", value: fmtScore(data.students?.[0]?.avg), tone: "purple" },
              ]} />

              <Section title="4D balance" subtitle="How grades spread across the four dimensions">
                <BalanceBar balance={data.balance} />
              </Section>

              <div className="grid lg:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">Students · by average</p>
                  <TableCard>
                    <thead><tr><th className={thCls}>Student</th><th className={`${thCls} text-right`}>Average</th></tr></thead>
                    <tbody>
                      {(data.students || []).map((st) => (
                        <tr key={st.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/education/gradebook/student/${st.id}/subject/${sel.subject_id}`)}>
                          <td className={tdCls}><div className="flex items-center gap-3"><Avatar name={st.name} /><div><div className="font-semibold text-gray-800">{st.name}</div><div className="text-[11px] text-gray-400">{st.count || 0} grades</div></div></div></td>
                          <td className={`${tdCls} text-right`}><span className="text-base font-black tabular-nums" style={{ color: scoreColor(st.avg) }}>{fmtScore(st.avg)}</span></td>
                        </tr>
                      ))}
                      {(data.students || []).length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-sm text-gray-400">No active students.</td></tr>}
                    </tbody>
                  </TableCard>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">Assessments</p>
                  <TableCard>
                    <thead><tr><th className={thCls}>Assessment</th><th className={`${thCls} text-right`}>Graded</th></tr></thead>
                    <tbody>
                      {assessments.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/education/gradebook/assessments/${a.id}`)}>
                          <td className={tdCls}><div className="font-semibold text-gray-800">{a.title}</div><div className="text-[11px] text-gray-400 capitalize">{a.assessment_type?.replace("_", " ")} · {a.assessment_date}</div></td>
                          <td className={`${tdCls} text-right`}><Pill tone="teal">{a.grades_count} graded</Pill></td>
                        </tr>
                      ))}
                      {assessments.length === 0 && (
                        <tr><td colSpan={2} className="px-4 py-6 text-center"><p className="text-sm text-gray-400 mb-2">No assessments yet.</p><Btn tone="primary" onClick={newAssessment}>Create the first one</Btn></td></tr>
                      )}
                    </tbody>
                  </TableCard>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Page>
  );
}
