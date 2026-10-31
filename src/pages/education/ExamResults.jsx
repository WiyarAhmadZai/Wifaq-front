import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FiDownload, FiPrinter } from "react-icons/fi";
import {
  examResultFormData,
  examResultSheet,
  saveExamResults,
  saveExamResultSettings,
  examReportCards,
  downloadExamReportPdf,
} from "../../api/gradebook";
import { useAuth } from "../../admin/context/AuthContext";
import { Page, Header, Card, TableCard, thCls, tdCls, Btn, Banner, Loading, LoadingRow } from "./gradebookUi";

const EXAMS = {
  chaharnima: { label: "Chaharnima Marks", max: 40 },
  salana: { label: "Salana Marks", max: 60 },
};

const COMPONENT_FIELDS = [
  { key: "homework", field: "homework_score", label: "Homework" },
  { key: "performance", field: "performance_score", label: "Performance" },
  { key: "paper", field: "paper_score", label: "Paper" },
];
const RESULT_NUMBER = new Intl.NumberFormat("fa-AF", { maximumFractionDigits: 2 });
const formatResultNumber = (value) => RESULT_NUMBER.format(Number(value) || 0);

function classGroupKey(schoolClass) {
  return `${schoolClass.grade_id || ""}:${schoolClass.class_name}`;
}

function ClassAndSection({ classes, classId, onChange }) {
  const groups = useMemo(() => {
    const map = new Map();
    classes.forEach((schoolClass) => {
      const key = classGroupKey(schoolClass);
      if (!map.has(key)) map.set(key, { key, name: schoolClass.grade?.name ? `${schoolClass.grade.name} · ${schoolClass.class_name}` : schoolClass.class_name });
    });
    return [...map.values()];
  }, [classes]);
  const selected = classes.find((schoolClass) => String(schoolClass.id) === String(classId));
  const groupKey = selected ? classGroupKey(selected) : "";
  const groupClasses = classes.filter((schoolClass) => classGroupKey(schoolClass) === groupKey);

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <label className="text-xs font-semibold text-gray-600">Class
        <select value={groupKey} onChange={(event) => {
          const nextKey = event.target.value;
          const firstSection = classes.find((schoolClass) => classGroupKey(schoolClass) === nextKey);
          onChange(firstSection ? String(firstSection.id) : "");
        }} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
          <option value="">Select class</option>
          {groups.map((group) => <option key={group.key} value={group.key}>{group.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-gray-600">Section
        <select value={classId || ""} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
          <option value="">Select section</option>
          {groupClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.section || schoolClass.class_name}</option>)}
        </select>
      </label>
    </div>
  );
}

function termSelect(terms, value, onChange) {
  return (
    <label className="text-xs font-semibold text-gray-600">Academic year
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
        <option value="">Select academic year</option>
        {terms.map((term) => <option key={term.id} value={term.id}>{term.name}{term.is_current ? " · Current" : ""}</option>)}
      </select>
    </label>
  );
}

export default function SubjectMarksPage({ examType = "chaharnima" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const exam = EXAMS[examType] || EXAMS.chaharnima;
  const [meta, setMeta] = useState(null);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [rows, setRows] = useState([]);
  const [components, setComponents] = useState({});
  const [passingMark, setPassingMark] = useState(40);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    examResultFormData().then((response) => {
      const data = response.data || {};
      setMeta(data);
      setComponents(data.components || {});
      setPassingMark(data.passing_mark ?? 40);
      const firstClass = data.classes?.[0];
      if (firstClass) setClassId(String(firstClass.id));
      const currentTerm = data.terms?.find((term) => term.is_current) || data.terms?.[0];
      if (currentTerm) setTermId(String(currentTerm.id));
    }).catch((requestError) => setError(requestError.response?.data?.message || "Could not load exam setup."))
      .finally(() => setLoading(false));
  }, []);

  const pairs = (meta?.pairs || []).filter((pair) => String(pair.school_class_id) === String(classId));
  const currentComponents = COMPONENT_FIELDS.map((field) => ({
    ...field,
    config: components.find((item) => item.exam_type === examType && item.component_key === field.key),
  }));
  const componentTotal = Math.round(currentComponents.reduce((total, field) => total + Number(field.config?.max_marks || 0), 0) * 100) / 100;

  useEffect(() => {
    if (pairs.length && !pairs.some((pair) => String(pair.subject_id) === String(subjectId))) setSubjectId(String(pairs[0].subject_id));
    if (!pairs.length) setSubjectId("");
  }, [classId, meta]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!classId || !subjectId || !termId) {
      setRows([]);
      return;
    }
    setBusy(true);
    setError("");
    examResultSheet({ class_id: classId, subject_id: subjectId, academic_term_id: termId, exam_type: examType })
      .then((response) => setRows((response.data?.data || []).map((row) => ({ ...row }))))
      .catch((requestError) => {
        setRows([]);
        setError(requestError.response?.data?.message || "Could not load marks.");
      }).finally(() => setBusy(false));
  }, [classId, subjectId, termId, examType]);

  function updateScore(studentId, field, value) {
    setRows((currentRows) => currentRows.map((row) => row.student_id === studentId ? { ...row, [field]: value } : row));
  }

  function focusNext(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const inputs = [...document.querySelectorAll("[data-mark-entry] input")];
    const index = inputs.indexOf(event.currentTarget);
    inputs[index + 1]?.focus();
  }

  async function saveMarks() {
    setError("");
    setFeedback("");
    if (componentTotal !== exam.max) {
      setError(`${exam.label} component maximums must add up to ${exam.max}.`);
      return;
    }
    for (const row of rows) {
      for (const field of currentComponents) {
        const value = row[field.field];
        const maximum = Number(field.config?.max_marks || 0);
        if (value !== null && value !== "" && value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > maximum)) {
          setError(`${row.name}: ${field.label} must be between 0 and ${maximum}.`);
          return;
        }
      }
    }
    setBusy(true);
    try {
      const response = await saveExamResults({
        class_id: Number(classId),
        subject_id: Number(subjectId),
        academic_term_id: Number(termId),
        exam_type: examType,
        rows: rows.map((row) => ({
          student_id: row.student_id,
          homework_score: row.homework_score === "" ? null : row.homework_score,
          performance_score: row.performance_score === "" ? null : row.performance_score,
          paper_score: row.paper_score === "" ? null : row.paper_score,
        })),
      });
      setFeedback(response.data?.message || "Marks saved.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Marks could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function updateComponent(componentKey, value) {
    setComponents((current) => current.map((item) => item.exam_type === examType && item.component_key === componentKey
      ? { ...item, max_marks: value }
      : item));
  }

  async function saveSettings() {
    const allComponents = {};
    for (const type of Object.keys(EXAMS)) {
      allComponents[type] = Object.fromEntries(COMPONENT_FIELDS.map((field) => {
        const setting = components.find((item) => item.exam_type === type && item.component_key === field.key);
        return [field.key, Number(setting?.max_marks || 0)];
      }));
      const total = Math.round(Object.values(allComponents[type]).reduce((sum, value) => sum + value, 0) * 100) / 100;
      if (total !== EXAMS[type].max) {
        setError(`${EXAMS[type].label} components must add up to ${EXAMS[type].max}.`);
        return;
      }
    }
    setError("");
    try {
      await saveExamResultSettings({ passing_mark: Number(passingMark), components: allComponents });
      setFeedback("Exam settings saved.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Settings could not be saved.");
    }
  }

  if (loading) return <Loading />;
  const selectedPair = pairs.find((pair) => String(pair.subject_id) === String(subjectId));
  const canSave = hasPermission("subject-marks.create") || hasPermission("subject-marks.update") || hasPermission("subject-marks.manage") || isSuperAdmin;
  const canConfigure = meta?.can_configure && hasPermission("subject-marks.manage");

  return (
    <Page>
      <Header title={exam.label} subtitle={`${exam.max} marks per subject · Homework, class performance, paper`} />
      {error && <Banner kind="error" onClose={() => setError("")}>{error}</Banner>}
      {feedback && <Banner onClose={() => setFeedback("")}>{feedback}</Banner>}
      <Card className="mb-4 space-y-4">
        <ClassAndSection classes={meta?.classes || []} classId={classId} onChange={setClassId} />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-600">Subject
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              <option value="">Select subject</option>
              {pairs.map((pair) => <option key={pair.subject_id} value={pair.subject_id}>{pair.subject_name}</option>)}
            </select>
          </label>
          {termSelect(meta?.terms || [], termId, setTermId)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
          <span>{selectedPair?.class_name}{selectedPair?.section ? ` · ${selectedPair.section}` : ""}{selectedPair?.subject_name ? ` · ${selectedPair.subject_name}` : ""}</span>
          <span>Components total: <strong className={componentTotal === exam.max ? "text-emerald-700" : "text-red-700"}>{componentTotal} / {exam.max}</strong></span>
        </div>
      </Card>

      {canConfigure && <Card className="mb-4">
        <button type="button" onClick={() => setSettingsOpen((open) => !open)} className="flex w-full items-center justify-between text-left text-sm font-bold text-gray-800">
          Mark settings <span aria-hidden>{settingsOpen ? "−" : "+"}</span>
        </button>
        {settingsOpen && <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {currentComponents.map((field) => <label key={field.key} className="text-xs font-semibold text-gray-600">{field.label} maximum
              <input type="number" min="0" max={exam.max} step="0.5" value={field.config?.max_marks ?? ""} onChange={(event) => updateComponent(field.key, event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </label>)}
            <label className="text-xs font-semibold text-gray-600">Passing percentage
              <input type="number" min="0" max="100" step="0.5" value={passingMark} onChange={(event) => setPassingMark(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </label>
          </div>
          <p className="text-xs text-gray-500">Chaharnima must total 40 and Salana must total 60. Current {exam.label} total: {componentTotal}.</p>
          <Btn onClick={saveSettings}>Save settings</Btn>
        </div>}
      </Card>}

      {busy && <LoadingRow />}
      {!busy && rows.length > 0 && <>
        <TableCard>
          <thead><tr>
            <th className={thCls}>Student</th>
            <th className={`${thCls} text-right`}>Homework /{currentComponents[0]?.config?.max_marks}</th>
            <th className={`${thCls} text-right`}>Performance /{currentComponents[1]?.config?.max_marks}</th>
            <th className={`${thCls} text-right`}>Paper /{currentComponents[2]?.config?.max_marks}</th>
            <th className={`${thCls} text-right`}>Total /{exam.max}</th>
          </tr></thead>
          <tbody data-mark-entry>
            {rows.map((row) => {
              const total = COMPONENT_FIELDS.reduce((sum, field) => sum + (Number(row[field.field]) || 0), 0);
              return <tr key={row.student_id} className="hover:bg-gray-50">
                <td className={tdCls}><span className="font-semibold text-gray-800">{row.name}</span><span className="block text-[11px] text-gray-400">{row.admission_no || ""}</span></td>
                {currentComponents.map((field) => <td key={field.key} className={`${tdCls} text-right`}>
                  <input data-mark-entry type="number" inputMode="decimal" min="0" max={field.config?.max_marks} step="0.5" value={row[field.field] ?? ""} onChange={(event) => updateScore(row.student_id, field.field, event.target.value)} onKeyDown={focusNext} className="w-24 rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm tabular-nums" aria-label={`${field.label} marks for ${row.name}`} />
                </td>)}
                <td className={`${tdCls} text-right font-bold tabular-nums`}>{total.toFixed(2)}</td>
              </tr>;
            })}
          </tbody>
        </TableCard>
        <div className="sticky bottom-3 mt-4 flex justify-end"><Btn onClick={saveMarks} disabled={!canSave || busy || componentTotal !== exam.max} size="lg">Save class marks</Btn></div>
      </>}
      {!busy && rows.length === 0 && <Card><p className="py-8 text-center text-sm text-gray-500">Choose a class, section, subject, and academic year to enter marks.</p></Card>}
    </Page>
  );
}

// ── Report documents ────────────────────────────────────────────────────
// Three printable documents share one data set. Each mirrors the backend PDF
// view of the same name (resources/views/reports/*) so Print and Download
// produce the same page.
const DOCUMENTS = [
  { key: "result-sheet", label: "Result sheet", orientation: "portrait" },
  { key: "certificate", label: "Certificate", orientation: "landscape" },
  { key: "shahadatnama", label: "Shahadatnama", orientation: "portrait" },
];
const GRADE_COLORS = { "A+": "#0b3d3a", A: "#0f6b64", B: "#3aa59a", C: "#d4a62d", D: "#e2b866", F: "#c9685e" };
const num = (value) => (value === null || value === undefined ? "—" : formatResultNumber(Math.round(Number(value) * 10) / 10));
const passLabel = (passed) => (passed === null ? "نا مکمل" : passed ? "کامیاب" : "ناکام");

function arcPath(cx, cy, r, from, to) {
  const end = Math.min(to, from + 359.99);
  const point = (angle) => [cx + r * Math.sin((angle * Math.PI) / 180), cy - r * Math.cos((angle * Math.PI) / 180)];
  const [x1, y1] = point(from);
  const [x2, y2] = point(end);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${end - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

function Ring({ value, color }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return <svg viewBox="0 0 80 80" className="rs-ring" aria-hidden>
    <circle cx="40" cy="40" r="31" fill="none" stroke="#e7e1d2" strokeWidth="9" />
    {percent > 0 && <path d={arcPath(40, 40, 31, 0, percent * 3.6)} fill="none" stroke={color} strokeWidth="9" />}
    <text x="40" y="46" fontSize="17" fontWeight="700" textAnchor="middle" fill="#0b3d3a">{formatResultNumber(Math.round(percent))}٪</text>
  </svg>;
}

function Stars({ score }) {
  const filled = score === null || score === undefined ? 0 : Math.round(score / 2);
  return <span className="rs-stars" aria-label={`${filled}/5`}>{[0, 1, 2, 3, 4].map((index) => <span key={index} className={index < filled ? "on" : ""}>★</span>)}</span>;
}

function averageOf(values) {
  const present = values.filter((value) => value !== null && value !== undefined);
  return present.length ? present.reduce((sum, value) => sum + Number(value), 0) / present.length : null;
}

function ResultSheetDoc({ student, report, activeClass, examType }) {
  const isSalana = examType === "salana";
  const subjects = student.subjects;
  const components = Object.fromEntries((report.components || []).map((item) => [item.component_key, Number(item.max_marks)]));
  const subjectMax = subjects[0]?.max_score ?? 0;
  const gradeCounts = subjects.reduce((counts, subject) => (subject.grade ? { ...counts, [subject.grade]: (counts[subject.grade] || 0) + 1 } : counts), {});
  const graded = Object.values(gradeCounts).reduce((sum, count) => sum + count, 0);
  const points = isSalana
    ? [["چهارنیمه", averageOf(subjects.map((s) => s.chaharnima_percentage))], ["سالانه", averageOf(subjects.map((s) => s.salana_percentage))], ["نتیجه نهایی", student.has_marks ? student.percentage : null]]
    : [["homework", "کارخانگی"], ["performance", "فعالیت صنفی"], ["paper", "امتحان تحریری"]].map(([key, label]) => {
      const average = averageOf(subjects.map((s) => s[`${key}_score`]));
      return [label, components[key] && average !== null ? (average / components[key]) * 100 : null];
    });
  const lineW = 264, lineH = 100, step = lineW / points.length;
  const coords = points.map(([, value], index) => (value === null ? null : [lineW - (index + 0.5) * step, lineH - 6 - ((lineH - 16) * Math.max(0, Math.min(100, value))) / 100])).filter(Boolean);
  let angle = 0;
  const attendance = student.attendance;

  return <div className="rs-page">
    <header className="rs-band">
      <div className="rs-brand"><span className="rs-mark"><img src="/wifaq-logo.png" alt="" /></span><div><b>شبکه تعلیمی وفاق</b><small>پیوند · علم · روح · زندگی</small></div></div>
      <div className="rs-title"><h1>اطلاعنامهٔ پیشرفت تحصیلی</h1><small>سال تعلیمی {report.academic_term?.name} · {isSalana ? "سالانه" : "نیمسال اول"}</small></div>
      <span className="rs-badge"><small>{isSalana ? "امتحان" : "نیمسال"}</small>{isSalana ? "سالانه" : "اول"}</span>
    </header>

    <section className="rs-kpis">
      <div className="rs-card rs-student">
        {student.photo_url ? <img src={student.photo_url} alt="" /> : <span className="rs-photo">عکس<br />متعلم</span>}
        <div><b>{student.name}</b>{student.father_name && <span>فرزند {student.father_name}</span>}<span>صنف: {activeClass?.class_name} {activeClass?.section || ""}</span><small>{student.admission_no || "—"}</small></div>
      </div>
      <div className="rs-card rs-kpi"><small>معدل کل</small><b>{num(student.average_score)}</b><span>از {formatResultNumber(subjectMax)}</span></div>
      <div className="rs-card rs-kpi"><small>رتبه در صنف</small><b>{student.rank ? formatResultNumber(student.rank) : "—"}</b><span>از {formatResultNumber(student.class_size)} متعلم</span></div>
      <div className="rs-card rs-kpi"><small>فیصدی کل</small><Ring value={student.percentage} color="#3aa59a" /></div>
      <div className="rs-card rs-kpi"><small>حضور</small>{attendance.rate === null ? <><b>—</b><span>حاضری ثبت نشده</span></> : <Ring value={attendance.rate} color="#2e8b57" />}</div>
    </section>

    <section className="rs-row rs-charts">
      <div className="rs-card"><h2 className="teal">{isSalana ? "مقایسه چهارنیمه و سالانه" : "نمرات مضامین (فیصدی)"}</h2>
        <div className="rs-bars">{subjects.map((subject) => <div key={subject.subject_id} className="rs-bar-group">
          <div className="rs-bar-pair">
            {isSalana && <i style={{ height: `${subject.chaharnima_percentage ?? 0}%`, background: "#d9cfb8" }} />}
            <i style={{ height: `${(isSalana ? subject.salana_percentage : subject.percentage) ?? 0}%`, background: "#0f5f5b" }} />
          </div>
          <span>{subject.subject_name}</span>
        </div>)}</div>
        {isSalana && <div className="rs-legend"><span><i style={{ background: "#0f5f5b" }} /> سالانه</span><span><i style={{ background: "#d9cfb8" }} /> چهارنیمه</span></div>}
      </div>
      <div className="rs-card"><h2 className="teal">{isSalana ? "نمودار پیشرفت کل" : "عملکرد در اجزای نمره"}</h2>
        <svg viewBox={`0 0 ${lineW} ${lineH}`} className="rs-line" aria-hidden>
          {[25, 50, 75].map((grid) => { const y = lineH - 6 - ((lineH - 16) * grid) / 100; return <line key={grid} x1="0" x2={lineW} y1={y} y2={y} stroke="#efe9da" />; })}
          {coords.length > 1 && <polyline points={coords.map((c) => c.join(",")).join(" ")} fill="none" stroke="#d4a62d" strokeWidth="2.5" />}
          {coords.map(([x, y]) => <circle key={x} cx={x} cy={y} r="4" fill="#fff" stroke="#d4a62d" strokeWidth="2" />)}
        </svg>
        <div className="rs-line-labels">{points.map(([label, value]) => <span key={label}>{label}<b>{value === null ? "—" : `${num(value)}٪`}</b></span>)}</div>
      </div>
      <div className="rs-card"><h2 className="gold">توزیع نمرات</h2>
        <div className="rs-donut">
          <svg viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="34" fill="none" stroke="#efe9da" strokeWidth="18" />
            {Object.entries(GRADE_COLORS).map(([grade, color]) => {
              if (!gradeCounts[grade]) return null;
              const sweep = (360 * gradeCounts[grade]) / graded;
              const path = <path key={grade} d={arcPath(50, 50, 34, angle, angle + sweep)} fill="none" stroke={color} strokeWidth="18" />;
              angle += sweep;
              return path;
            })}
          </svg>
          <ul>{Object.entries(GRADE_COLORS).filter(([grade]) => gradeCounts[grade]).map(([grade, color]) => <li key={grade}><i style={{ background: color }} />{grade}<span>{formatResultNumber(gradeCounts[grade])} مضمون</span></li>)}
            {!graded && <li>نمره ثبت نشده</li>}</ul>
        </div>
      </div>
    </section>

    <section className="rs-row rs-marks-row">
      <div className="rs-card"><h2 className="dark">نمرات مضامین</h2>
        <table className="rs-marks">
          <thead><tr><th>مضمون</th><th>کارخانگی ({formatResultNumber(components.homework || 0)})</th><th>فعالیت صنفی ({formatResultNumber(components.performance || 0)})</th><th>تحریری ({formatResultNumber(components.paper || 0)})</th>
            {isSalana && <><th>سالانه (۶۰)</th><th>چهارنیمه (۴۰)</th></>}<th>مجموع ({formatResultNumber(subjectMax)})</th><th>درجه</th></tr></thead>
          <tbody>{subjects.map((subject) => <tr key={subject.subject_id}><td>{subject.subject_name}</td><td>{num(subject.homework_score)}</td><td>{num(subject.performance_score)}</td><td>{num(subject.paper_score)}</td>
            {isSalana && <><td>{num(subject.salana_score)}</td><td>{num(subject.chaharnima_score)}</td></>}<td><b>{num(subject.total_score)}</b></td><td className={subject.grade === "F" ? "fail" : "grade"}>{subject.grade || "—"}</td></tr>)}</tbody>
          <tfoot><tr><td>معدل</td><td colSpan={isSalana ? 5 : 3}>{num(student.total_score)} از {formatResultNumber(student.maximum_score)} · {num(student.percentage)}٪</td><td>{num(student.average_score)}</td><td className="grade">{student.grade || "—"}</td></tr></tfoot>
        </table>
      </div>
      <div className="rs-card"><h2 className="dark">حضور و غیاب</h2>
        <dl className="rs-list">
          <div><dt>روزهای ثبت‌شده</dt><dd>{formatResultNumber(attendance.recorded_days)}</dd></div>
          <div><dt>روزهای حاضر</dt><dd className="ok">{formatResultNumber(attendance.present_days)}</dd></div>
          <div><dt>روزهای غایب</dt><dd className="bad">{formatResultNumber(attendance.absent_days)}</dd></div>
          <div><dt>نیم‌روز</dt><dd>{formatResultNumber(attendance.half_days)}</dd></div>
          <div><dt><b>فیصدی حضور</b></dt><dd className="ok">{attendance.rate === null ? "—" : `${num(attendance.rate)}٪`}</dd></div>
          <div><dt><b>نتیجه</b></dt><dd className={student.passed ? "ok" : "bad"}>{student.complete ? passLabel(student.passed) : "نا مکمل"}</dd></div>
        </dl>
      </div>
    </section>

    <section className="rs-row rs-thirds">
      <div className="rs-card"><h2 className="green">ارزیابی چهارگانه</h2><dl className="rs-list">
        {[["intellectual", "ذهنی"], ["character", "اخلاقی‌معنوی"], ["practical", "عملی"], ["social", "اجتماعی"]].map(([key, label]) => <div key={key}><dt className="green-text">{label}</dt><dd><Stars score={student.four_d?.[key]} /></dd></div>)}
      </dl></div>
      <div className="rs-card"><h2 className="teal">مهارت‌های قرن ۲۱</h2><dl className="rs-list">
        {["حل مسئله", "تفکر انتقادی", "خلاقیت", "کار گروهی"].map((skill) => <div key={skill}><dt>{skill}</dt><dd className="rs-circles">○○○○○</dd></div>)}
      </dl></div>
      <div className="rs-card"><h2 className="gold">فعالیت‌های فوق برنامه</h2><div className="rs-blanks">{[0, 1, 2, 3].map((line) => <span key={line} />)}</div></div>
    </section>

    <section className="rs-row rs-thirds">
      <div className="rs-card"><h2 className="gold">افتخارات</h2>{student.awards?.length ? <ul className="rs-awards">{student.awards.map((award) => <li key={award}>{award}</li>)}</ul> : <div className="rs-blanks">{[0, 1, 2].map((line) => <span key={line} />)}</div>}</div>
      <div className="rs-card"><h2 className="teal">اهداف {isSalana ? "سال آینده" : "نیمسال بعد"}</h2><div className="rs-blanks">{[0, 1, 2].map((line) => <span key={line}>•</span>)}</div></div>
      <div className="rs-card"><h2 className="green">قوت و نیاز</h2><div className="rs-blanks"><span><b className="green-text">قوت:</b></span><span /><span><b className="bad">نیاز:</b></span></div></div>
    </section>

    <section className="rs-row rs-thirds">
      {["نظر استاد راهنما", "نظر مدیر ترتیبی", "نظر والدین"].map((title) => <div key={title} className="rs-card rs-comment"><b>{title}</b><small>امضا</small></div>)}
    </section>
    <footer className="rs-foot"><span>WEN · {report.academic_term?.name} · اطلاعنامهٔ پیشرفت تحصیلی</span><span dir="ltr">Wifaq Education Network</span></footer>
  </div>;
}

function CertificateDoc({ student, report, activeClass, examType }) {
  const isSalana = examType === "salana";
  const period = isSalana ? `سال تعلیمی ${report.academic_term?.name || ""}` : `نیم سال اول تعلیمی ${report.academic_term?.name || ""}`;
  return <div className="cert-page">
    <div className="cert-medal">{isSalana ? "پایان" : "نیمه اول"}<br />سال تعلیمی</div>
    <div className="cert-text">
      <b>{student.name}</b> فرزند <b>{student.father_name || "...................."}</b>، متعلم صنف <b>{activeClass?.class_name} {activeClass?.section || ""}</b><br />
      با کمال مسرت و افتخار، این تقدیرنامه را به مناسبت رشد و پیشرفت چشمگیر شما در ابعاد چهارگانه‌ی آموزشی، اخلاقی، اجتماعی و عملی در {period} به شما تقدیم می‌نماییم. تلاش، پشتکار، مسؤولیت‌پذیری و عملکرد شایسته‌ی شما، مایه‌ی خرسندی خانواده و افتخار مکتب وفاق است. امیدواریم با حفظ این روحیه، همواره در مسیر دانش، اخلاق و خدمت به جامعه گام‌های استوار بردارید. از خداوند متعال برای شما سلامتی، توفیق، سربلندی و موفقیت‌های روزافزون را می‌خواهیم.
    </div>
  </div>;
}

function ShahadatnamaDoc({ student, report, activeClass, examType }) {
  const isSalana = examType === "salana";
  const components = Object.fromEntries((report.components || []).map((item) => [item.component_key, Number(item.max_marks)]));
  const verdict = !student.complete ? "نا مکمل" : student.passed ? (isSalana ? "کامیاب — ارتقا به صنف بالاتر" : "کامیاب") : "ناکام";
  return <div className="sh-page"><div className="sh-inner">
    <img className="sh-watermark" src="/wifaq-logo.png" alt="" />
    <header className="sh-top">
      <img src="/wifaq-logo.png" alt="Wifaq School" />
      <div><b>شبکه تعلیمی وفاق · مکتب وفاق</b><small>پیوند · علم · روح · زندگی</small><h1>شهادتنامه</h1><p>نتایج امتحان {isSalana ? "سالانه" : "چهارنیمه"} · سال تعلیمی {report.academic_term?.name}</p></div>
      {student.photo_url ? <img className="sh-photo" src={student.photo_url} alt="" /> : <span className="sh-photo">عکس<br />متعلم</span>}
    </header>
    <table className="sh-identity"><tbody>
      <tr><th>نام:</th><td>{student.name}</td><th>نام پدر:</th><td>{student.father_name || "—"}</td></tr>
      <tr><th>صنف:</th><td>{activeClass?.class_name} {activeClass?.section || ""}</td><th>شماره اساس:</th><td>{student.admission_no || "—"}</td></tr>
    </tbody></table>
    <table className="sh-marks">
      <thead><tr><th style={{ width: "8%" }}>شماره</th><th style={{ width: "26%" }}>مضامین</th>
        {isSalana ? <><th>چهارنیمه (۴۰)</th><th>سالانه (۶۰)</th></> : <><th>کارخانگی ({formatResultNumber(components.homework || 0)})</th><th>فعالیت صنفی ({formatResultNumber(components.performance || 0)})</th><th>تحریری ({formatResultNumber(components.paper || 0)})</th></>}
        <th>مجموعه ({formatResultNumber(student.subjects[0]?.max_score ?? 0)})</th><th>درجه</th><th>نتیجه</th></tr></thead>
      <tbody>{student.subjects.map((subject, index) => <tr key={subject.subject_id}><td>{formatResultNumber(index + 1)}</td><td>{subject.subject_name}</td>
        {isSalana ? <><td>{num(subject.chaharnima_score)}</td><td>{num(subject.salana_score)}</td></> : <><td>{num(subject.homework_score)}</td><td>{num(subject.performance_score)}</td><td>{num(subject.paper_score)}</td></>}
        <td><b>{num(subject.total_score)}</b></td><td>{subject.grade || "—"}</td><td>{passLabel(subject.passed)}</td></tr>)}</tbody>
    </table>
    <div className="sh-summary">
      <div><small>مجموعه نمرات</small><b>{num(student.total_score)} / {formatResultNumber(student.maximum_score)}</b></div>
      <div><small>فیصدی</small><b>{num(student.percentage)}٪</b></div>
      <div><small>درجه</small><b>{student.grade || "—"}</b></div>
      <div><small>رتبه در صنف</small><b>{student.rank ? formatResultNumber(student.rank) : "—"}</b></div>
      <div><small>حاضری</small><b>{formatResultNumber(student.attendance.present_days)}</b></div>
      <div><small>غیرحاضری</small><b>{formatResultNumber(student.attendance.absent_days)}</b></div>
    </div>
    <div className="sh-verdict">نتیجه نهایی: {verdict}</div>
    <footer className="sh-signs"><span>امضای نگران صنف</span><span>امضای مدیر تدریسی</span><span>امضای مدیر مکتب</span><span className="sh-seal">مهر مکتب</span></footer>
  </div></div>;
}

const DOCUMENT_VIEWS = { "result-sheet": ResultSheetDoc, certificate: CertificateDoc, shahadatnama: ShahadatnamaDoc };

export function ReportCardsPage({ examType = "chaharnima" }) {
  const exam = EXAMS[examType] || EXAMS.chaharnima;
  const [meta, setMeta] = useState(null);
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [documentType, setDocumentType] = useState("result-sheet");
  const [printStudentId, setPrintStudentId] = useState(null);
  const [viewStudentId, setViewStudentId] = useState(null);

  useEffect(() => {
    examResultFormData().then((response) => {
      const data = response.data || {};
      setMeta(data);
      if (data.classes?.[0]) setClassId(String(data.classes[0].id));
      const currentTerm = data.terms?.find((term) => term.is_current) || data.terms?.[0];
      if (currentTerm) setTermId(String(currentTerm.id));
    }).catch((requestError) => setError(requestError.response?.data?.message || "Could not load report-card setup."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!classId || !termId) return;
    const requestKey = `${classId}:${termId}:${examType}`;
    examReportCards({ class_id: classId, academic_term_id: termId, exam_type: examType })
      .then((response) => setReport({ ...response.data, request_key: requestKey }))
      .catch((requestError) => {
        setReport(null);
        setError(requestError.response?.data?.message || "Could not load report cards.");
      }).finally(() => setLoading(false));
  }, [classId, termId, examType]);

  if (!meta && loading) return <Loading />;
  const students = report?.students || [];
  const activeClass = (meta?.classes || []).find((schoolClass) => String(schoolClass.id) === String(classId));
  const reportReady = report?.request_key === `${classId}:${termId}:${examType}`;
  const activeDocument = DOCUMENTS.find((item) => item.key === documentType) || DOCUMENTS[0];
  const DocumentView = DOCUMENT_VIEWS[activeDocument.key];
  const shownStudentId = printStudentId || viewStudentId;

  function printDocument(studentId = null) {
    setViewStudentId(null);
    setPrintStudentId(studentId);
    window.addEventListener("afterprint", () => setPrintStudentId(null), { once: true });
    window.setTimeout(() => window.print(), 300);
  }

  async function downloadPdf(studentId = null) {
    setDownloading(true);
    setError("");
    try {
      await downloadExamReportPdf({ class_id: classId, academic_term_id: termId, exam_type: examType, ...(studentId ? { student_id: studentId } : {}) }, documentType);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "PDF could not be downloaded.");
    } finally {
      setDownloading(false);
    }
  }

  return <Page>
    <Header title={exam.label.replace("Marks", "Report Card")} subtitle="Result sheets, certificates and shahadatnama · print or download as PDF" actions={<div className="no-print flex flex-wrap gap-2">
      <Btn tone="outline" onClick={() => printDocument()} disabled={!students.length}><FiPrinter aria-hidden /> Print all</Btn>
      <Btn onClick={() => downloadPdf()} disabled={!students.length || downloading}><FiDownload aria-hidden /> {downloading ? "Downloading…" : "Download PDF"}</Btn>
    </div>} />
    {error && <Banner kind="error" onClose={() => setError("")}>{error}</Banner>}
    <Card className="no-print mb-4 grid gap-3 sm:grid-cols-2">
      <ClassAndSection classes={meta?.classes || []} classId={classId} onChange={setClassId} />
      {termSelect(meta?.terms || [], termId, setTermId)}
      <div className="sm:col-span-2">
        <span className="text-xs font-semibold text-gray-600">Document</span>
        <div className="mt-1 flex flex-wrap gap-2" role="radiogroup">
          {DOCUMENTS.map((item) => <button key={item.key} type="button" role="radio" aria-checked={documentType === item.key} onClick={() => setDocumentType(item.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${documentType === item.key ? "border-teal-700 bg-teal-700 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-teal-50"}`}>{item.label}</button>)}
        </div>
      </div>
    </Card>
    {(loading || (classId && termId && !reportReady && !error)) && <LoadingRow />}
    {!loading && reportReady && students.length > 0 && <>
      <Card className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-gray-800">{activeClass?.grade?.name} · {activeClass?.class_name} {activeClass?.section || ""}</div>
        <div className="text-xs text-gray-500">{students.length} students · {report?.academic_term?.name}</div>
      </Card>
      <div className="no-print overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[720px]">
          <thead><tr><th className={thCls}>Student</th><th className={`${thCls} text-right`}>Total</th><th className={`${thCls} text-right`}>Percent</th><th className={`${thCls} text-right`}>Rank</th><th className={`${thCls} text-right`}>Present</th><th className={`${thCls} text-right`}>Absent</th><th className={thCls}>Result</th><th className={thCls}>Actions</th></tr></thead>
          <tbody>{students.map((student) => <tr key={student.student_id} className="border-b border-gray-100">
            <td className={tdCls}>{student.name}</td>
            <td className={`${tdCls} text-right tabular-nums`}>{formatResultNumber(student.total_score)} / {formatResultNumber(student.maximum_score)}</td>
            <td className={`${tdCls} text-right tabular-nums`}>{formatResultNumber(student.percentage)}٪</td>
            <td className={`${tdCls} text-right`}>{student.rank ? formatResultNumber(student.rank) : "—"}</td>
            <td className={`${tdCls} text-right`}>{formatResultNumber(student.attendance.present_days)}</td>
            <td className={`${tdCls} text-right`}>{formatResultNumber(student.attendance.absent_days)}</td>
            <td className={tdCls}>{student.complete ? student.passed ? "Pass" : "Fail" : "Incomplete"}</td>
            <td className={`${tdCls} whitespace-nowrap`}>
              <button type="button" className="font-semibold text-teal-700 hover:underline" onClick={() => setViewStudentId(student.student_id)}>View</button>
              <button type="button" className="ml-3 text-gray-500 hover:text-teal-700" title="Print" aria-label="Print" onClick={() => printDocument(student.student_id)}><FiPrinter aria-hidden /></button>
              <button type="button" className="ml-2 text-gray-500 hover:text-teal-700" title="Download PDF" aria-label="Download PDF" disabled={downloading} onClick={() => downloadPdf(student.student_id)}><FiDownload aria-hidden /></button>
            </td>
          </tr>)}</tbody>
        </table>
      </div>
      {createPortal(<section className={`report-print-area doc-${activeDocument.key} ${viewStudentId ? "screen-preview" : ""}`}>
        {viewStudentId && <div className="screen-preview-toolbar no-print">
          <strong>{students.find((student) => student.student_id === viewStudentId)?.name}</strong>
          <span className="doc-switch">{DOCUMENTS.map((item) => <button key={item.key} type="button" className={documentType === item.key ? "active" : ""} onClick={() => setDocumentType(item.key)}>{item.label}</button>)}</span>
          <button type="button" onClick={() => printDocument(viewStudentId)}><FiPrinter aria-hidden /> Print</button>
          <button type="button" disabled={downloading} onClick={() => downloadPdf(viewStudentId)}><FiDownload aria-hidden /> Download PDF</button>
          <button type="button" onClick={() => setViewStudentId(null)}>Close</button>
        </div>}
        {(shownStudentId ? students.filter((student) => student.student_id === shownStudentId) : students).map((student) => <article className="report-card" key={student.student_id} dir="rtl" lang="fa-AF">
          <DocumentView student={student} report={report} activeClass={activeClass} examType={examType} />
        </article>)}
      </section>, document.body)}
    </>}
    {!loading && reportReady && !students.length && <Card><p className="py-8 text-center text-sm text-gray-500">No students or report data are available for this class and year.</p></Card>}
    <style>{`@media print { @page { size: A4 ${activeDocument.orientation}; margin: ${activeDocument.key === "certificate" ? "0" : "7mm"}; } }`}</style>
    <style>{REPORT_STYLES}</style>
  </Page>;
}

const REPORT_STYLES = `
  .report-card { color:#17302e; font-family:Vazirmatn,"Noto Naskh Arabic",Tahoma,serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .report-card * { box-sizing:border-box; }
  .report-print-area { display:none; }
  .report-print-area.screen-preview { display:block; position:fixed; z-index:70; inset:0; overflow:auto; padding:24px; background:rgba(19,47,45,.82); }
  .screen-preview-toolbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:8px; max-width:297mm; margin:0 auto 12px; padding:10px 14px; background:#fff; border-radius:6px; }
  .screen-preview-toolbar strong { margin-right:auto; }
  .screen-preview-toolbar button { display:inline-flex; align-items:center; gap:5px; padding:6px 11px; border:1px solid #d1d5db; border-radius:5px; color:#075d5a; font-size:12px; background:#fff; }
  .screen-preview-toolbar .doc-switch { display:inline-flex; gap:4px; margin-left:8px; }
  .screen-preview-toolbar .doc-switch button.active { background:#0f5f5b; color:#fff; border-color:#0f5f5b; }
  .screen-preview .report-card { width:fit-content; margin:0 auto 18px; box-shadow:0 10px 30px rgba(0,0,0,.25); }

  /* اطلاعنامه — A4 portrait dashboard */
  .rs-page { width:196mm; min-height:283mm; padding:3mm; background:#f7f3ea; font-size:7.6pt; }
  .rs-band { display:grid; grid-template-columns:62mm 1fr 22mm; align-items:center; gap:3mm; padding:3mm 4mm; background:#0b4f4c; color:#fff; }
  .rs-brand { display:flex; align-items:center; gap:3mm; }
  .rs-brand b { display:block; font-size:13pt; } .rs-brand small { color:#e5c76b; font-size:7pt; }
  .rs-mark { display:grid; place-items:center; width:13mm; height:13mm; background:#d4a62d; } .rs-mark img { width:12mm; }
  .rs-title { text-align:center; } .rs-title h1 { margin:0; color:#e5c76b; font-size:16pt; } .rs-title small { color:#d6e6e3; font-size:7.5pt; }
  .rs-badge { padding:2mm 1mm; background:#d4a62d; color:#0b3d3a; text-align:center; font-weight:700; font-size:10pt; line-height:1.2; } .rs-badge small { display:block; font-size:6.5pt; }
  .rs-card { background:#fff; border:.25mm solid #e3dccb; overflow:hidden; }
  .rs-card h2 { margin:0; padding:1.4mm 2mm; color:#fff; font-size:8pt; }
  .rs-card h2.teal { background:#0f5f5b; } .rs-card h2.dark { background:#10302e; } .rs-card h2.gold { background:#c9a227; } .rs-card h2.green { background:#2e8b57; }
  .rs-kpis { display:grid; grid-template-columns:34fr 17fr 17fr 16fr 16fr; gap:2mm; margin-top:2mm; }
  .rs-student { display:flex; align-items:center; gap:2.5mm; padding:2mm; }
  .rs-student img, .rs-photo { flex:none; width:17mm; height:21mm; object-fit:cover; border:.3mm solid #d9cfb8; }
  .rs-photo { display:grid; place-items:center; background:#efe9da; color:#9b927d; font-size:6pt; text-align:center; }
  .rs-student b { display:block; font-size:10pt; } .rs-student span { display:block; color:#6b7a77; } .rs-student small { color:#9b927d; font-size:6.5pt; }
  .rs-kpi { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:25mm; text-align:center; }
  .rs-kpi small { color:#7a8a87; font-size:6.5pt; } .rs-kpi b { font-size:17pt; color:#0b3d3a; line-height:1.2; } .rs-kpi span { color:#8a958f; font-size:6.5pt; }
  .rs-ring { width:17mm; height:17mm; }
  .rs-row { display:grid; gap:2mm; margin-top:2mm; }
  .rs-charts { grid-template-columns:36fr 36fr 28fr; } .rs-charts .rs-card { min-height:46mm; }
  .rs-bars { display:flex; gap:1mm; height:34mm; padding:2mm 2mm 0; }
  .rs-bar-group { flex:1; display:flex; flex-direction:column; min-width:0; }
  .rs-bar-pair { flex:1; display:flex; align-items:flex-end; justify-content:center; gap:.4mm; border-bottom:.3mm solid #d9cfb8; }
  .rs-bar-pair i { display:block; width:35%; max-width:3.2mm; }
  .rs-bar-group span { overflow:hidden; padding-top:.6mm; color:#4f5f5c; font-size:5.6pt; text-align:center; white-space:nowrap; text-overflow:ellipsis; }
  .rs-legend { display:flex; gap:3mm; padding:1mm 2mm; font-size:6.5pt; } .rs-legend i { display:inline-block; width:2.4mm; height:2.4mm; }
  .rs-line { display:block; width:100%; height:26mm; padding:2mm 2mm 0; }
  .rs-line-labels { display:flex; padding:0 2mm 2mm; } .rs-line-labels span { flex:1; text-align:center; color:#4f5f5c; font-size:6pt; } .rs-line-labels b { display:block; color:#0f5f5b; }
  .rs-donut { display:flex; align-items:center; gap:2mm; padding:3mm 2mm; } .rs-donut svg { width:22mm; height:22mm; flex:none; }
  .rs-donut ul { margin:0; padding:0; list-style:none; font-size:6.5pt; } .rs-donut li { display:flex; align-items:center; gap:1mm; padding:.4mm 0; }
  .rs-donut li i { width:2.2mm; height:2.2mm; border-radius:50%; } .rs-donut li span { margin-right:1.5mm; color:#6b7a77; }
  .rs-marks-row { grid-template-columns:70fr 30fr; }
  .rs-marks { width:100%; border-collapse:collapse; }
  .rs-marks th { background:#10302e; color:#fff; font-size:6.6pt; padding:1.3mm .8mm; font-weight:600; }
  .rs-marks td { border-bottom:.2mm solid #ece6d8; padding:1.2mm .8mm; text-align:center; }
  .rs-marks th:first-child, .rs-marks td:first-child { text-align:right; font-weight:700; }
  .rs-marks tbody tr:nth-child(even) td { background:#faf7f0; }
  .rs-marks tfoot td { background:#f4e9bf; font-weight:700; border-top:.4mm solid #d4a62d; }
  .rs-marks .grade { color:#0f6b64; font-weight:700; } .rs-marks .fail { color:#c9685e; font-weight:700; }
  .rs-list { margin:0; padding:1.5mm 2mm; }
  .rs-list div { display:flex; justify-content:space-between; align-items:center; padding:1.2mm 0; border-bottom:.2mm solid #ece6d8; }
  .rs-list dd { margin:0; font-weight:700; color:#0f5f5b; }
  .rs-list .ok, .green-text { color:#2e8b57; font-weight:700; } .rs-list .bad, .rs-card .bad { color:#c9685e; }
  .rs-stars { color:#e2dccb; font-size:9pt; letter-spacing:.3mm; } .rs-stars .on { color:#d4a62d; }
  .rs-circles { color:#c9c0aa!important; font-weight:400!important; letter-spacing:.8mm; }
  .rs-thirds { grid-template-columns:repeat(3,1fr); }
  .rs-blanks { padding:1mm 2mm 2mm; } .rs-blanks span { display:block; height:5.4mm; padding-top:1mm; border-bottom:.25mm dotted #b9b09b; }
  .rs-awards { margin:0; padding:2mm 6mm 2mm 2mm; }
  .rs-comment { display:flex; flex-direction:column; justify-content:space-between; min-height:22mm; padding:2mm; }
  .rs-comment b { color:#0f5f5b; } .rs-comment small { color:#8a958f; border-top:.2mm solid #e3dccb; padding-top:1mm; }
  .rs-foot { display:flex; justify-content:space-between; margin-top:1.5mm; color:#9b927d; font-size:6pt; }

  /* تقدیرنامه — the approved artwork, A4 landscape, edge to edge */
  .cert-page { position:relative; width:297mm; height:210mm; background:#fff url("/certificate-bg.jpg") center/100% 100% no-repeat; color:#111; }
  .cert-medal { position:absolute; left:212.5mm; top:32.5mm; width:30mm; text-align:center; font-size:10.5pt; font-weight:800; color:#3d2c06; line-height:1.35; }
  .cert-text { position:absolute; left:37mm; top:88.5mm; width:219mm; text-align:justify; font-size:14.5pt; line-height:10.1mm; }
  .cert-text b { color:#0b4f4c; }

  /* شهادتنامه — framed A4 portrait */
  .sh-page { width:196mm; height:283mm; padding:1.2mm; background:#fff; border:2.2mm solid #d4a62d; font-size:9pt; }
  .sh-inner { position:relative; height:100%; padding:6mm 7mm; border:.6mm solid #0f5f5b; overflow:hidden; }
  .sh-watermark { position:absolute; top:50%; left:50%; width:110mm; transform:translate(-50%,-50%); opacity:.06; pointer-events:none; }
  .sh-top { position:relative; display:grid; grid-template-columns:30mm 1fr 30mm; align-items:center; padding-bottom:3mm; border-bottom:.5mm solid #d4a62d; text-align:center; }
  .sh-top > img { width:26mm; }
  .sh-top b { display:block; color:#0f5f5b; font-size:12pt; } .sh-top small { color:#9b7416; font-size:8pt; }
  .sh-top h1 { margin:1mm 0; color:#0b4f4c; font-size:30pt; } .sh-top p { margin:0; color:#9b7416; font-size:10pt; }
  .sh-photo { display:grid; place-items:center; width:26mm; height:32mm; object-fit:cover; border:.4mm solid #d4a62d; color:#9b927d; font-size:7.5pt; justify-self:end; }
  .sh-identity { position:relative; width:100%; margin-top:4mm; border-collapse:collapse; }
  .sh-identity th, .sh-identity td { padding:2.2mm 2mm; border-bottom:.2mm dotted #b9b09b; text-align:right; font-size:9.5pt; }
  .sh-identity th { width:17%; color:#6b7a77; font-weight:400; } .sh-identity td { width:33%; font-weight:700; }
  .sh-marks { position:relative; width:100%; margin-top:5mm; border-collapse:collapse; table-layout:fixed; }
  .sh-marks th { padding:2mm 1mm; background:#0f5f5b; color:#fff; font-size:8.5pt; border:.2mm solid #0f5f5b; }
  .sh-marks td { padding:1.8mm 1mm; border:.2mm solid #b6c9c4; text-align:center; }
  .sh-marks td:nth-child(2) { text-align:right; font-weight:700; } .sh-marks tbody tr:nth-child(even) td { background:rgba(15,95,91,.05); }
  .sh-summary { position:relative; display:grid; grid-template-columns:repeat(6,1fr); margin-top:4mm; border:.3mm solid #d4a62d; }
  .sh-summary div { padding:2mm 1mm; background:#fbf6e6; text-align:center; border-left:.3mm solid #d4a62d; } .sh-summary div:last-child { border-left:0; }
  .sh-summary small { display:block; color:#7a6a3a; font-size:7.5pt; } .sh-summary b { color:#0b4f4c; font-size:11pt; }
  .sh-verdict { position:relative; margin-top:4mm; padding:2.5mm; border:.5mm solid #0f5f5b; background:#eef6f4; color:#0b4f4c; font-size:12pt; font-weight:700; text-align:center; }
  .sh-signs { position:relative; display:grid; grid-template-columns:repeat(4,1fr); align-items:end; gap:6mm; margin-top:16mm; color:#4f5f5c; font-size:8.5pt; text-align:center; }
  .sh-signs span { padding-top:1.5mm; border-top:.3mm solid #4f5f5c; }
  .sh-signs .sh-seal { display:grid; place-items:center; justify-self:center; width:22mm; height:22mm; border:.4mm dashed #d4a62d; color:#c9b27a; }

  @media print {
    /* The documents sit directly under <body> (portal); everything else is removed
       from layout, not just hidden, so it cannot push out an extra blank page. */
    html, body { height:auto!important; min-height:0!important; margin:0!important; padding:0!important; overflow:visible!important; background:white!important; }
    body > *:not(.report-print-area) { display:none!important; }
    .report-print-area { display:block!important; position:static!important; inset:auto!important; width:auto!important; margin:0!important; padding:0!important; overflow:visible!important; background:white!important; }
    .screen-preview-toolbar, .no-print { display:none!important; }
    .report-card { display:block!important; width:auto!important; margin:0!important; box-shadow:none!important; break-after:page; page-break-after:always; break-inside:avoid; }
    .report-card:last-child { break-after:auto; page-break-after:auto; }
    /* A hair under the printable area so browser rounding never spills onto a second sheet. */
    .rs-page { height:281mm; min-height:0; overflow:hidden; }
    .sh-page { height:281mm; overflow:hidden; }
    .cert-page { height:209mm; overflow:hidden; }
  }
`;
