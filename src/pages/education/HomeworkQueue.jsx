import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { homeworkQueue, homeworkAssignment, markHomework } from "../../api/gradebook";
import {
  Page, Header, Card, Avatar, Pill, Btn, InfoNote, Input, Select,
  EmptyState, Loading, LoadingRow, ICON, scoreColor, fmtScore,
} from "./gradebookUi";

const SUB_STATUS = {
  assigned:      { label: "Waiting", tone: "gray" },
  submitted:     { label: "Submitted ✓", tone: "blue" },
  reviewed:      { label: "Reviewed", tone: "teal" },
  graded:        { label: "Graded", tone: "emerald" },
  not_submitted: { label: "Not submitted", tone: "red" },
};

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-sm rounded-xl pl-9 pr-8 py-2.5 bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400" />
      {value && <button onClick={() => onChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>}
    </div>
  );
}

/** Teacher's homework review queue. */
export default function HomeworkQueue() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch] = useState("");          // homework list search
  const [studentSearch, setStudentSearch] = useState(""); // review-view student search

  const loadQueue = () => homeworkQueue().then((r) => setAssignments(r.data?.data || [])).catch(() => setAssignments([]));
  useEffect(() => { loadQueue().finally(() => setLoading(false)); }, []);
  const openAssignment = (id) => { setStudentSearch(""); setBusy(true); homeworkAssignment(id).then((r) => setOpen(r.data)).catch(() => setOpen(null)).finally(() => setBusy(false)); };
  const setStatus = async (submissionId, status) => { await markHomework(submissionId, { status }); openAssignment(open.data.id); };

  if (loading) return <Loading />;

  // ── REVIEW VIEW ──────────────────────────────────────────────────────
  if (open) {
    const subs = open.submissions || [];
    const n = (st) => subs.filter((s) => s.status === st).length;
    const submitted = n("submitted"), graded = n("graded"), waiting = n("assigned") + n("not_submitted");
    const q = studentSearch.trim().toLowerCase();
    const shown = q ? subs.filter((s) => `${s.student?.first_name || ""} ${s.student?.last_name || ""}`.toLowerCase().includes(q)) : subs;

    return (
      <Page>
        <Header icon={ICON.clipboard} title="Review homework" subtitle={`${open.data?.class_name || ""} · ${open.data?.subject_name || ""}`} onBack={() => setOpen(null)} />

        {/* task + progress card */}
        <Card className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">The task</p>
          <p className="text-sm text-gray-700 leading-relaxed">{open.data?.homework_text}</p>
          {open.data?.due_date && <p className="text-[11px] text-gray-400 mt-1">📅 Due {open.data.due_date}</p>}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>{graded} of {subs.length} graded</span>
              <span>{submitted} waiting to review</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: `${subs.length ? (graded / subs.length) * 100 : 0}%` }} />
              <div className="h-full bg-blue-400" style={{ width: `${subs.length ? (submitted / subs.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Pill tone="blue">📤 {submitted} submitted</Pill>
            <Pill tone="emerald">✓ {graded} graded</Pill>
            <Pill tone="gray">⏳ {waiting} not yet</Pill>
          </div>
        </Card>

        {/* student search */}
        <div className="mb-3">
          <SearchBox value={studentSearch} onChange={setStudentSearch} placeholder="Search a student by name…" />
        </div>

        {busy && <LoadingRow />}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {shown.map((s) => {
            const st = SUB_STATUS[s.status] || SUB_STATUS.assigned;
            const highlight = s.status === "submitted";
            return (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${highlight ? "bg-blue-50/40" : "hover:bg-gray-50"} transition-colors`}>
                <Avatar name={`${s.student?.first_name || "?"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{s.student?.first_name} {s.student?.last_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Pill tone={st.tone}>{st.label}</Pill>
                    {s.photo_url && <span title="Photo attached" className="text-xs">📷</span>}
                    {s.submitted_at && <span className="text-[11px] text-gray-400">{new Date(s.submitted_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                  </div>
                </div>
                {s.grade
                  ? <span className="text-lg font-black tabular-nums" style={{ color: scoreColor((s.grade.score / s.grade.score_max) * 10) }}>{fmtScore(s.grade.score)}</span>
                  : (
                    <div className="inline-flex gap-1.5 shrink-0">
                      {s.status !== "not_submitted" && s.status !== "submitted" && <Btn tone="ghost" onClick={() => setStatus(s.id, "submitted")}>Mark submitted</Btn>}
                      <Btn tone={highlight ? "primary" : "outline"} onClick={() => navigate(`/education/gradebook/mark?submission=${s.id}`)}>{s.photo_url ? "Review & grade →" : "Grade →"}</Btn>
                    </div>
                  )}
              </div>
            );
          })}
          {shown.length === 0 && <div className="px-4 py-10 text-center text-sm text-gray-400">{q ? `No student matching “${studentSearch}”.` : "No students on this homework."}</div>}
        </div>
        <p className="text-[11px] text-gray-400 mt-2 px-1">A <b>blue “Submitted ✓”</b> row (with 📷) means the child's work was uploaded — tap <b>Review &amp; grade</b> to see the photo and score it.</p>
      </Page>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────
  return <HomeworkList {...{ assignments, classFilter, setClassFilter, search, setSearch, openAssignment, navigate }} />;
}

function HomeworkList({ assignments, classFilter, setClassFilter, search, setSearch, openAssignment, navigate }) {
  const classes = useMemo(() => {
    const uniq = {};
    assignments.forEach((a) => { if (a.school_class_id) uniq[a.school_class_id] = { id: a.school_class_id, name: a.class_name || `Class ${a.school_class_id}` }; });
    return Object.values(uniq).sort((x, y) => x.name.localeCompare(y.name));
  }, [assignments]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments.filter((a) => {
      if (classFilter && String(a.school_class_id) !== String(classFilter)) return false;
      if (!q) return true;
      return `${a.class_name || ""} ${a.subject_name || ""} ${a.homework_text || ""}`.toLowerCase().includes(q);
    });
  }, [assignments, classFilter, search]);

  return (
    <Page>
      <Header icon={ICON.clipboard} title="Homework" subtitle="Assign & review"
        actions={<Btn tone="white" onClick={() => navigate("/education/gradebook/homework/new")}>＋ Assign homework</Btn>} />

      <InfoNote title="How homework works — 3 steps">
        <b>1. Assign</b> — write a homework in a <b>lesson plan</b> and save it (it appears here automatically), or tap <b>＋ Assign homework</b>. &nbsp;
        <b>2. Open</b> a homework to see every student. &nbsp;
        <b>3. Grade</b> each — the score goes into the gradebook and the parent is notified.
      </InfoNote>

      {assignments.length === 0 ? (
        <EmptyState icon={ICON.clipboard} title="No homework yet"
          description="Write a homework inside a lesson plan and save it, or tap ＋ Assign homework to give a class a task right now — either way it shows up here."
          action={<div className="mt-3"><Btn tone="primary" onClick={() => navigate("/education/gradebook/homework/new")}>Assign homework</Btn></div>} />
      ) : (
        <>
          {/* toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="flex-1"><SearchBox value={search} onChange={setSearch} placeholder="Search homework by class, subject or text…" /></div>
            {classes.length > 1 && (
              <div className="sm:w-52">
                <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                  <option value="">All classes ({assignments.length})</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">No homework matches your search.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {shown.map((a) => {
                const total = a.total_count || 0;
                const graded = a.graded_count || 0;
                const submitted = a.submitted_count || 0;      // anyone who submitted (incl. reviewed/graded)
                const awaiting = Math.max(0, submitted - graded);
                const pct = total ? Math.round((graded / total) * 100) : 0;
                return (
                  <button key={a.id} onClick={() => openAssignment(a.id)}
                    className="group text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-teal-200 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-lg shrink-0">📚</div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-gray-800 truncate">{a.class_name}</div>
                          <div className="text-[11px] text-gray-400 truncate">{a.subject_name}</div>
                        </div>
                      </div>
                      {a.due_date && <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 rounded-lg px-2 py-1 shrink-0">due {a.due_date}</span>}
                    </div>

                    <p className="text-xs text-gray-500 mt-2.5 line-clamp-2 leading-relaxed">{a.homework_text}</p>

                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span className="font-semibold">{graded}/{total} graded</span>
                        {awaiting > 0 && <span className="text-blue-500 font-semibold">{awaiting} to review</span>}
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 group-hover:bg-emerald-600 transition-colors" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {awaiting > 0 && <Pill tone="blue">📤 {awaiting} submitted</Pill>}
                      <Pill tone="emerald">✓ {graded} graded</Pill>
                      <Pill tone="gray">{total} students</Pill>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
