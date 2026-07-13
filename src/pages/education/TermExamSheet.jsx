import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { termExamFormData, termExamSheet, saveTermExam, TERM_EXAMS } from "../../api/gradebook";
import { peekCache } from "../../api/axios";
import {
  Page, Header, Card, TableCard, thCls, tdCls, Avatar, Pill, Select, Input, Segmented,
  Btn, Banner, EmptyState, Spinner, Loading, LoadingRow, ICON, fmtScore,
} from "./gradebookUi";

/** Enter the two year-defining term exams (midterm /40, final /60) + re-exam
 *  (/100) for a class+subject. One number per student; live total + Pass/Fail. */
export default function TermExamSheet() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [pair, setPair] = useState(null);
  const [termId, setTermId] = useState(null);
  const [exam, setExam] = useState("midterm");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const __cached = peekCache("/gradebook/term-exams/form-data");
    if (__cached) {
      setMeta(__cached);
      const p = __cached?.pairs || [];
      if (p.length) setPair(p[0]);
      const cur = (__cached?.terms || []).find((t) => t.is_current) || __cached?.terms?.[0];
      if (cur) setTermId(cur.id);
      setLoading(false);
    }
    termExamFormData().then((r) => {
      setMeta(r.data);
      const p = r.data?.pairs || [];
      if (p.length) setPair(p[0]);
      const cur = (r.data?.terms || []).find((t) => t.is_current) || r.data?.terms?.[0];
      if (cur) setTermId(cur.id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (pair && termId) loadSheet(); }, [pair, termId]); // eslint-disable-line
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(""), 4000); return () => clearTimeout(t); }, [flash]);

  function loadSheet() {
    setBusy(true); setErr("");
    const __cached = peekCache("/gradebook/term-exams/sheet", { class_id: pair.school_class_id, subject_id: pair.subject_id, term_id: termId });
    if (__cached) { setRows((__cached?.data || []).map((x) => ({ ...x }))); setBusy(false); }
    termExamSheet({ class_id: pair.school_class_id, subject_id: pair.subject_id, term_id: termId })
      .then((r) => setRows((r.data?.data || []).map((x) => ({ ...x }))))
      .catch(() => setRows([])).finally(() => setBusy(false));
  }

  const max = TERM_EXAMS.find((t) => t.key === exam)?.max || 100;
  const pairKey = (p) => `${p.school_class_id}:${p.subject_id}`;
  const visible = exam === "reexam" ? rows.filter((r) => r.passed === false) : rows;
  const filled = visible.filter((r) => r[exam] !== null && r[exam] !== "" && r[exam] !== undefined).length;
  const setScore = (id, v) => setRows((rs) => rs.map((r) => (r.student_id === id ? { ...r, [exam]: v } : r)));

  async function save() {
    setErr(""); setFlash("");
    for (const r of visible) {
      const v = r[exam];
      if (v !== null && v !== "" && v !== undefined && (Number(v) < 0 || Number(v) > max)) return setErr(`Scores must be between 0 and ${max}.`);
    }
    setBusy(true);
    try {
      const scores = visible.map((r) => ({ student_id: r.student_id, score: r[exam] === "" ? null : r[exam] }));
      const res = await saveTermExam({ class_id: pair.school_class_id, subject_id: pair.subject_id, term_id: termId, exam, scores });
      loadSheet(); setFlash(res.data?.message || "Saved.");
    } catch (e) { setErr(e.response?.data?.message || "Save failed."); setBusy(false); }
  }

  if (loading) return <Loading />;
  const pairs = meta?.pairs || [];

  return (
    <Page>
      <Header icon={ICON.check} title="Term Exams" subtitle="Midterm /40 · Final /60 · Re-exam /100" onBack={() => navigate(-1)} />
      {flash && <Banner onClose={() => setFlash("")}>{flash}</Banner>}
      {err && <Banner kind="error" onClose={() => setErr("")}>{err}</Banner>}

      {pairs.length === 0 ? (
        <EmptyState icon={ICON.check} title="No class assigned to you"
          description="An administrator links teachers to classes in Class Management → Grade Subjects. Once you teach a class, it appears here." />
      ) : (
        <>
          <Card className="mb-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
              <Select value={pair ? pairKey(pair) : ""} onChange={(e) => setPair(pairs.find((p) => pairKey(p) === e.target.value))}>
                {pairs.map((p) => <option key={pairKey(p)} value={pairKey(p)}>{p.class_name} · {p.subject_name}</option>)}
              </Select>
              <Select value={termId || ""} onChange={(e) => setTermId(Number(e.target.value))}>
                {(meta?.terms || []).map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</option>)}
              </Select>
            </div>
            <div className="max-w-md">
              <Segmented value={exam} onChange={setExam} options={TERM_EXAMS.map((t) => ({ value: t.key, label: `${t.label} /${t.max}` }))} />
            </div>
          </Card>

          {busy && <LoadingRow />}
          {!busy && exam === "reexam" && visible.length === 0 && (
            <EmptyState icon={ICON.check} title="No re-exams needed" description="No student failed the two term exams in this subject." />
          )}

          {!busy && visible.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{exam === "reexam" ? "Failed students" : "Students"} · {visible.length}</p>
                <p className="text-[11px] font-semibold text-gray-400">{filled} entered</p>
              </div>
              <TableCard>
                <thead>
                  <tr>
                    <th className={thCls}>Student</th>
                    <th className={thCls}>Term result</th>
                    <th className={`${thCls} text-right w-40`}>{TERM_EXAMS.find((t) => t.key === exam)?.label} /{max}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.student_id} className="hover:bg-gray-50">
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <Avatar name={r.name} />
                          <span className="font-semibold text-gray-800">{r.name}</span>
                        </div>
                      </td>
                      <td className={tdCls}>
                        {r.total != null ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-gray-500 text-xs">total {fmtScore(r.total)}</span>
                            {r.passed === false ? <Pill tone="red">Fail</Pill> : r.passed ? <Pill tone="emerald">Pass</Pill> : null}
                            {r.flag && <span title="midterm below 16" className="text-amber-500">⚠</span>}
                          </span>
                        ) : <span className="text-gray-300 text-xs">not entered</span>}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <div className="inline-block w-28">
                          <Input type="number" min="0" max={max} step="0.5" value={r[exam] ?? ""} onChange={(e) => setScore(r.student_id, e.target.value)} placeholder={`/${max}`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableCard>

              <div className="sticky bottom-4 mt-4">
                <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-100 shadow-sm p-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-gray-400">Empty box = skip. Midterm below 16 shows ⚠ (warning only — doesn't fail the subject).</p>
                  <Btn tone="primary" size="lg" onClick={save} disabled={busy}>Save {TERM_EXAMS.find((t) => t.key === exam)?.label} scores</Btn>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Page>
  );
}
