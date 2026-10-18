import { useEffect, useMemo, useState } from "react";
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

export function ReportCardsPage({ examType = "chaharnima" }) {
  const exam = EXAMS[examType] || EXAMS.chaharnima;
  const [meta, setMeta] = useState(null);
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

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

  function printStudent(studentId) {
    const hiddenCards = [...document.querySelectorAll(".report-card")]
      .filter((card) => card.dataset.student !== String(studentId));
    hiddenCards.forEach((card) => card.classList.add("print-hidden"));
    const clearFilter = () => hiddenCards.forEach((card) => card.classList.remove("print-hidden"));
    window.addEventListener("afterprint", clearFilter, { once: true });
    window.print();
    window.setTimeout(clearFilter, 1500);
  }

  async function downloadPdf(studentId = null) {
    setDownloading(true);
    setError("");
    try {
      await downloadExamReportPdf({ class_id: classId, academic_term_id: termId, exam_type: examType, ...(studentId ? { student_id: studentId } : {}) });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "PDF could not be downloaded.");
    } finally {
      setDownloading(false);
    }
  }

  return <Page>
    <Header title={`${exam.label.replace("Marks", "Report Card")}`} subtitle="Class results · Individual cards · A4 print" actions={<div className="flex gap-2"><Btn tone="outline" onClick={() => window.print()} disabled={!students.length}><FiPrinter aria-hidden /> Print class</Btn><Btn onClick={() => downloadPdf()} disabled={!students.length || downloading}><FiDownload aria-hidden /> {downloading ? "Preparing PDF…" : "Download PDF"}</Btn></div>} />
    {error && <Banner kind="error" onClose={() => setError("")}>{error}</Banner>}
    <Card className="no-print mb-4 grid gap-3 sm:grid-cols-2">
      <ClassAndSection classes={meta?.classes || []} classId={classId} onChange={setClassId} />
      {termSelect(meta?.terms || [], termId, setTermId)}
    </Card>
    {(loading || (classId && termId && !reportReady && !error)) && <LoadingRow />}
    {!loading && reportReady && students.length > 0 && <>
      <Card className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-gray-800">{activeClass?.grade?.name} · {activeClass?.class_name} {activeClass?.section || ""}</div>
        <div className="text-xs text-gray-500">{students.length} students · {report?.academic_term?.name}</div>
      </Card>
      <div className="no-print overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[680px]">
          <thead><tr><th className={thCls}>Student</th><th className={`${thCls} text-right`}>Total</th><th className={`${thCls} text-right`}>Percent</th><th className={`${thCls} text-right`}>Present</th><th className={`${thCls} text-right`}>Absent</th><th className={thCls}>Result</th><th className={thCls}>View</th></tr></thead>
          <tbody>{students.map((student) => <tr key={student.student_id} className="border-b border-gray-100">
            <td className={tdCls}>{student.name}</td><td className={`${tdCls} text-right tabular-nums`}>{formatResultNumber(student.total_score)} / {formatResultNumber(student.maximum_score)}</td><td className={`${tdCls} text-right tabular-nums`}>{formatResultNumber(student.percentage)}٪</td><td className={`${tdCls} text-right`}>{formatResultNumber(student.attendance.present_days)}</td><td className={`${tdCls} text-right`}>{formatResultNumber(student.attendance.absent_days)}</td><td className={tdCls}>{student.complete ? student.passed ? "Pass" : "Fail" : "Incomplete"}</td><td className={`${tdCls} whitespace-nowrap`}><a className="font-semibold text-teal-700 hover:underline" href={`#report-${student.student_id}`}>Open</a><button type="button" className="ml-3 text-gray-500 hover:text-teal-700" title={`Print ${student.name}'s report card`} aria-label={`Print ${student.name}'s report card`} onClick={() => printStudent(student.student_id)}><FiPrinter aria-hidden /></button><button type="button" className="ml-2 text-gray-500 hover:text-teal-700" title={`Download ${student.name}'s PDF`} aria-label={`Download ${student.name}'s PDF`} onClick={() => downloadPdf(student.student_id)}><FiDownload aria-hidden /></button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <section className="report-print-area mt-5 space-y-5">
        {students.map((student) => <article className="report-card" data-student={student.student_id} id={`report-${student.student_id}`} key={student.student_id} dir="rtl" lang="fa-AF">
          <div className="certificate-frame">
            <header className="certificate-header">
              <img src="/wifaq-logo.png" alt="Wifaq School" />
              <div><h1>اطلاعنامه نتایج</h1><p>شبکه تعلیمی وفاق</p></div>
              <span className="exam-seal">{examType === "chaharnima" ? "چهارنیمه" : "سالانه"}</span>
            </header>
            <div className="student-details">
              <span>نام شاگرد: <b>{student.name}</b></span>
              <span>شماره اساس: <b>{student.admission_no || "—"}</b></span>
              <span>صنف: <b>{activeClass?.class_name} {activeClass?.section || ""}</b></span>
              <span>سال تعلیمی: <b>{report?.academic_term?.name}</b></span>
            </div>
            <table className="report-subjects">
              <thead><tr><th>مضمون</th><th>کارخانگی</th><th>ارزیابی و فعالیت</th><th>امتحان تحریری</th>{examType === "salana" && <th>چهارنیمه /40</th>}<th>مجموعه</th><th>نتیجه</th></tr></thead>
              <tbody>{student.subjects.map((subject) => <tr key={subject.subject_id}>
                <td>{subject.subject_name}</td><td>{subject.homework_score === null ? "—" : formatResultNumber(subject.homework_score)}</td><td>{subject.performance_score === null ? "—" : formatResultNumber(subject.performance_score)}</td><td>{subject.paper_score === null ? "—" : formatResultNumber(subject.paper_score)}</td>{examType === "salana" && <td>{subject.chaharnima_score === null ? "—" : formatResultNumber(subject.chaharnima_score)}</td>}<td>{subject.total_score === null ? "—" : formatResultNumber(subject.total_score)} / {formatResultNumber(subject.max_score)}</td><td>{subject.passed === null ? "نا مکمل" : subject.passed ? "کامیاب" : "ناکام"}</td>
              </tr>)}</tbody>
              <tfoot><tr><th>مجموعه عمومی</th><th colSpan="3">{formatResultNumber(student.total_score)} از {formatResultNumber(student.maximum_score)}</th>{examType === "salana" && <th></th>}<th>{formatResultNumber(student.percentage)}٪</th><th>{student.complete ? student.passed ? "کامیاب" : "ناکام" : "نا مکمل"}</th></tr></tfoot>
            </table>
            <div className="attendance-strip"><span>حاضری: <b>{formatResultNumber(student.attendance.present_days)}</b> روز</span><span>غیرحاضری: <b>{formatResultNumber(student.attendance.absent_days)}</b> روز</span></div>
            <footer className="signature-row"><span>امضای معلم مضمون: __________________</span><span>امضای مدیر: __________________</span><span>مهر مکتب</span></footer>
          </div>
        </article>)}
      </section>
    </>}
    {!loading && reportReady && !students.length && <Card><p className="py-8 text-center text-sm text-gray-500">No students or report data are available for this class and year.</p></Card>}
    <style>{`
      .report-card { color:#132f2d; font-family:Vazirmatn,"Noto Naskh Arabic",serif; }
      .certificate-frame { box-sizing:border-box; position:relative; min-height:190mm; padding:26px; background:#fff; border:8px double #d8a92b; box-shadow:inset 0 0 0 5px #fff,inset 0 0 0 7px #e4ba48; }
      .certificate-header { display:grid; grid-template-columns:100px 1fr 76px; align-items:center; gap:14px; border-bottom:2px solid #d8a92b; padding-bottom:14px; }
      .certificate-header img { width:88px; height:68px; object-fit:contain; }
      .certificate-header h1 { margin:0; text-align:center; color:#075d5a; font-size:24px; }
      .certificate-header p { margin:4px 0 0; text-align:center; color:#9b7416; font-size:13px; }
      .exam-seal { border:2px solid #c7a13b; border-radius:50%; display:grid; place-items:center; width:70px; aspect-ratio:1; color:#785812; font-weight:700; text-align:center; font-size:13px; }
      .student-details { display:grid; grid-template-columns:1fr 1fr; gap:9px 22px; padding:16px 0; font-size:13px; }
      .report-subjects { width:100%; border-collapse:collapse; font-size:11px; }
      .report-subjects th,.report-subjects td { border:1px solid #b7cbc7; padding:7px 5px; text-align:center; }
      .report-subjects thead { background:#075d5a; color:#fff; }
      .report-subjects tbody tr:nth-child(even) { background:#f2f8f6; }
      .report-subjects tfoot { background:#f7edcf; }
      .attendance-strip { display:flex; justify-content:space-around; border:1px solid #d8a92b; padding:9px; margin-top:12px; font-size:12px; }
      .signature-row { display:flex; justify-content:space-between; gap:12px; margin-top:34px; font-size:11px; }
      .report-card.print-hidden { display:none!important; }
      @media print { @page { size:A4 landscape; margin:10mm; } body { background:white!important; } .no-print,button,nav,aside,header:not(.certificate-header) { display:none!important; } .report-print-area { margin:0!important; } .report-card { page-break-after:always; break-after:page; } .report-card:last-child { page-break-after:auto; break-after:auto; } .report-card.print-hidden { display:none!important; } .certificate-frame { min-height:190mm; box-shadow:none; print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
      @media (max-width:640px) { .certificate-frame { padding:14px; border-width:5px; } .certificate-header { grid-template-columns:60px 1fr 54px; gap:7px; } .certificate-header img { width:58px; height:52px; } .certificate-header h1 { font-size:18px; } .exam-seal { width:50px; font-size:10px; } .report-subjects { font-size:9px; } .report-subjects th,.report-subjects td { padding:5px 2px; } .signature-row { flex-wrap:wrap; } }
    `}</style>
  </Page>;
}