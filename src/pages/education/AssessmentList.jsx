import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAssessments } from "../../api/gradebook";
import { peekCache } from "../../api/axios";
import {
  Page, Header, Pill, Btn, Select, SearchBox, EmptyState, Loading, ICON,
} from "./gradebookUi";

const TYPE = {
  short_quiz:     { label: "Short quiz", tone: "blue", icon: "✏️" },
  monthly_exam:   { label: "Monthly exam", tone: "purple", icon: "📝" },
  term_exam:      { label: "Term exam", tone: "red", icon: "🎓" },
  project:        { label: "Project", tone: "amber", icon: "🛠️" },
  class_activity: { label: "Class activity", tone: "teal", icon: "🎯" },
  homework:       { label: "Homework", tone: "gray", icon: "📚" },
};

/** All of a teacher's assessments — open one to grade its students. */
export default function AssessmentList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");

  useEffect(() => {
    const cached = peekCache("/gradebook/assessments", {});
    if (cached) { setItems(cached?.data || []); setLoading(false); }
    listAssessments().then((r) => setItems(r.data?.data || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  const classes = useMemo(() => {
    const uniq = {};
    items.forEach((a) => { if (a.school_class_id) uniq[a.school_class_id] = { id: a.school_class_id, name: a.class_name || `Class ${a.school_class_id}` }; });
    return Object.values(uniq).sort((x, y) => x.name.localeCompare(y.name));
  }, [items]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (classFilter && String(a.school_class_id) !== String(classFilter)) return false;
      if (!q) return true;
      return `${a.title || ""} ${a.class_name || ""} ${a.subject_name || ""}`.toLowerCase().includes(q);
    });
  }, [items, search, classFilter]);

  if (loading) return <Loading />;

  return (
    <Page>
      <Header icon={ICON.check} title="Assessments" subtitle="Quizzes, exams, projects & activities"
        actions={<Btn tone="white" onClick={() => navigate("/education/gradebook/assessments/new")}>＋ New assessment</Btn>} />

      {items.length === 0 ? (
        <EmptyState icon={ICON.check} title="No assessments yet"
          description="Create a quiz, exam, project or activity — then open it to grade your students."
          action={<div className="mt-3"><Btn tone="primary" onClick={() => navigate("/education/gradebook/assessments/new")}>Create an assessment</Btn></div>} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="flex-1"><SearchBox value={search} onChange={setSearch} placeholder="Search by title, class or subject…" /></div>
            {classes.length > 1 && (
              <div className="sm:w-52">
                <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                  <option value="">All classes ({items.length})</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">No assessment matches your search.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {shown.map((a) => {
                const t = TYPE[a.assessment_type] || TYPE.short_quiz;
                return (
                  <button key={a.id} onClick={() => navigate(`/education/gradebook/assessments/${a.id}`)}
                    className="group text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-teal-200 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-lg shrink-0">{t.icon}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-gray-800 truncate">{a.title}</div>
                          <div className="text-[11px] text-gray-400 truncate">{a.class_name} · {a.subject_name}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 rounded-lg px-2 py-1 shrink-0">{a.assessment_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3">
                      <Pill tone={t.tone}>{t.label}</Pill>
                      <Pill tone="emerald">✓ {a.graded_count} graded</Pill>
                      <span className="ml-auto text-teal-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
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
