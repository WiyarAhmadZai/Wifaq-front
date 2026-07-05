import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { homeworkQueue, homeworkAssignment, markHomework } from "../../api/gradebook";
import {
  Page, Header, Card, TableCard, thCls, tdCls, Avatar, Pill, Btn, InfoNote,
  EmptyState, Spinner, Loading, LoadingRow, ICON, scoreColor, fmtScore,
} from "./gradebookUi";

/** Teacher's homework review queue. */
export default function HomeworkQueue() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadQueue = () => homeworkQueue().then((r) => setAssignments(r.data?.data || [])).catch(() => setAssignments([]));
  useEffect(() => { loadQueue().finally(() => setLoading(false)); }, []);
  const openAssignment = (id) => { setBusy(true); homeworkAssignment(id).then((r) => setOpen(r.data)).catch(() => setOpen(null)).finally(() => setBusy(false)); };
  const setStatus = async (submissionId, status) => { await markHomework(submissionId, { status }); openAssignment(open.data.id); };

  if (loading) return <Loading />;

  if (open) {
    return (
      <Page>
        <Header icon={ICON.clipboard} title="Review homework" subtitle={`${open.data?.schoolClass?.class_name} · ${open.data?.subject?.subject_name}`} onBack={() => setOpen(null)} />
        <InfoNote title="Homework">{open.data?.homework_text}</InfoNote>
        {busy && <LoadingRow />}
        <TableCard>
          <thead><tr><th className={thCls}>Student</th><th className={thCls}>Status</th><th className={`${thCls} text-right`}>Action</th></tr></thead>
          <tbody>
            {(open.submissions || []).map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className={tdCls}><div className="flex items-center gap-3"><Avatar name={`${s.student?.first_name || "?"}`} /><span className="font-semibold text-gray-800">{s.student?.first_name} {s.student?.last_name}</span></div></td>
                <td className={tdCls}><span className="capitalize text-gray-500 text-xs">{s.status}{s.submitted_at ? ` · ${new Date(s.submitted_at).toLocaleDateString()}` : ""}</span></td>
                <td className={`${tdCls} text-right`}>
                  {s.grade
                    ? <span className="text-base font-black tabular-nums" style={{ color: scoreColor((s.grade.score / s.grade.score_max) * 10) }}>{fmtScore(s.grade.score)}</span>
                    : (
                      <div className="inline-flex gap-1.5">
                        {s.status !== "not_submitted" && s.status !== "submitted" && <Btn tone="ghost" onClick={() => setStatus(s.id, "submitted")}>Mark submitted</Btn>}
                        <Btn tone="primary" onClick={() => navigate(`/education/gradebook/mark?submission=${s.id}`)}>Grade →</Btn>
                      </div>
                    )}
                </td>
              </tr>
            ))}
            {(open.submissions || []).length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">No students on this homework.</td></tr>}
          </tbody>
        </TableCard>
      </Page>
    );
  }

  return (
    <Page>
      <Header icon={ICON.clipboard} title="Homework" subtitle="Assign & review"
        actions={<Btn tone="white" onClick={() => navigate("/education/gradebook/homework/new")}>＋ Assign homework</Btn>} />

      {assignments.length === 0 ? (
        <EmptyState icon={ICON.clipboard} title="No homework yet"
          description="Tap ＋ Assign to give a class an assignment now — or deliver a lesson plan that has homework text and it appears here automatically."
          action={<div className="mt-3"><Btn tone="primary" onClick={() => navigate("/education/gradebook/homework/new")}>Assign homework</Btn></div>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {assignments.map((a) => (
            <button key={a.id} onClick={() => openAssignment(a.id)} className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-gray-800 truncate">{a.schoolClass?.class_name} · {a.subject?.subject_name}</span>
                <span className="text-[11px] text-gray-400 shrink-0">due {a.due_date}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.homework_text}</p>
              <div className="flex gap-1.5 mt-3">
                <Pill tone="gray">{a.waiting_count} waiting</Pill>
                <Pill tone="emerald">{a.graded_count} graded</Pill>
                <Pill tone="teal">{a.total_count} total</Pill>
              </div>
            </button>
          ))}
        </div>
      )}
    </Page>
  );
}
