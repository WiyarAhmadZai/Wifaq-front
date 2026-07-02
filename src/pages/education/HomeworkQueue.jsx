import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { homeworkQueue, homeworkAssignment, markHomework } from "../../api/gradebook";
import { Hero, Spinner } from "./lessonPlanUi";
import { PAPER, TEAL, GOLD, scoreColor, fmtScore } from "./gradebookUi";

/** Teacher's homework review queue: assignments (seeded from delivered lesson
 *  plans) with per-student rows to review / grade. */
export default function HomeworkQueue() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);      // { data, submissions }
  const [busy, setBusy] = useState(false);

  const loadQueue = () => homeworkQueue().then((r) => setAssignments(r.data?.data || [])).catch(() => setAssignments([]));

  useEffect(() => { loadQueue().finally(() => setLoading(false)); }, []);

  const openAssignment = (id) => {
    setBusy(true);
    homeworkAssignment(id).then((r) => setOpen(r.data)).catch(() => setOpen(null)).finally(() => setBusy(false));
  };

  const setStatus = async (submissionId, status) => {
    await markHomework(submissionId, { status });
    openAssignment(open.data.id);
  };

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;

  if (open) {
    return (
      <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
        <Hero title="Review homework" subtitle={`${open.data?.schoolClass?.class_name} · ${open.data?.subject?.subject_name}`}
          right={<button onClick={() => setOpen(null)} className="px-3 py-2 rounded-xl text-xs font-bold text-white/90 border border-white/30">← Queue</button>} />
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
          <p className="text-[11px] text-gray-500 bg-white rounded-lg border p-3" style={{ borderColor: "#dbe8e8" }}>{open.data?.homework_text}</p>
          {busy && <Spinner />}
          {(open.submissions || []).map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white" style={{ borderColor: "#eef3f3" }}>
              <span className="flex-1 text-xs font-semibold text-gray-700">
                {s.student?.first_name} {s.student?.last_name}
                <span className="block text-[10px] text-gray-400">{s.status}{s.submitted_at ? ` · ${new Date(s.submitted_at).toLocaleDateString()}` : ""}</span>
              </span>
              {s.grade
                ? <span className="text-sm font-black" style={{ color: scoreColor((s.grade.score / s.grade.score_max) * 10) }}>{fmtScore(s.grade.score)}</span>
                : (
                  <>
                    {s.status !== "not_submitted" && s.status !== "submitted" && (
                      <button onClick={() => setStatus(s.id, "submitted")} className="text-[10px] font-bold px-2 py-1 rounded border" style={{ borderColor: "#dbe8e8", color: TEAL }}>Mark submitted</button>
                    )}
                    <button onClick={() => navigate(`/education/gradebook/mark?submission=${s.id}`)}
                      className="text-[10px] font-bold px-2 py-1 rounded text-white" style={{ background: TEAL }}>Grade →</button>
                  </>
                )}
            </div>
          ))}
          {(open.submissions || []).length === 0 && <p className="text-[11px] text-gray-400">No students on this homework.</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Homework" subtitle="Assign & review"
        right={<button onClick={() => navigate("/education/gradebook/homework/new")}
          className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: GOLD, color: "#052528" }}>＋ Assign homework</button>} />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {assignments.length === 0 && (
          <div className="rounded-2xl border bg-white p-6 text-center text-xs text-gray-500" style={{ borderColor: "#dbe8e8" }}>
            No homework yet. Tap <b>＋ Assign homework</b> to give a class an assignment now — or deliver a lesson plan that has homework text and it shows up here automatically.
          </div>
        )}
        {assignments.map((a) => (
          <button key={a.id} onClick={() => openAssignment(a.id)}
            className="w-full text-left px-3 py-3 rounded-xl border bg-white hover:bg-teal-50/40" style={{ borderColor: "#dbe8e8" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">{a.schoolClass?.class_name} · {a.subject?.subject_name}</span>
              <span className="text-[10px] text-gray-400">due {a.due_date}</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{a.homework_text}</p>
            <div className="flex gap-3 mt-2 text-[10px] font-bold">
              <span className="text-gray-500">{a.waiting_count} waiting</span>
              <span style={{ color: "#2E7D5B" }}>{a.graded_count} graded</span>
              <span className="text-gray-400">{a.total_count} total</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
