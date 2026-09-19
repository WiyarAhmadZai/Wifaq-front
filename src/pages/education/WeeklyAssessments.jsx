import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { weeklyFormData, weeklySheet, saveWeekly } from "../../api/gradebook";
import { useI18n } from "../../i18n/I18nContext";
import {
  Page, Header, Card, TableCard, thCls, tdCls, Select, Input, Segmented,
  Btn, Banner, EmptyState, Loading, ICON,
} from "./gradebookUi";

/**
 * The fortnightly class test.
 *
 * ENTRY  — pick class, term and week; type questions asked and answers correct
 *          per student, the percentage updates as you type. An Excel file in
 *          the template layout can fill the grid instead of typing.
 * RESULTS — the term at a glance: every week's score coloured by band, the
 *          average, the class rank and a small trend line per student. Sorted
 *          best-first, so the top of the list is the promotion shortlist.
 *
 * All arithmetic (percent, average, rank, band) is done by the server so this
 * screen, the printouts and the promotion board always agree.
 */
export default function WeeklyAssessments() {
  // Only for text that leaves the DOM (Excel headers) or is built at runtime;
  // everything rendered is translated by the DOM translator on its own.
  const { t } = useI18n();
  const [meta, setMeta] = useState(null);
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [week, setWeek] = useState(1);
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState("entry");
  const [rows, setRows] = useState([]);
  const [dates, setDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    weeklyFormData().then((r) => {
      const d = r.data || {};
      setMeta(d);
      setClassId(d.classes?.[0]?.id ?? "");
      setTermId(d.terms?.find((t) => t.is_current)?.id ?? d.terms?.[0]?.id ?? "");
    }).catch(() => setErr("Could not load the form.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (classId && termId) load(); }, [classId, termId]); // eslint-disable-line
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(""), 4000); return () => clearTimeout(t); }, [flash]);

  function load() {
    setBusy(true); setErr("");
    weeklySheet({ class_id: classId, term_id: termId })
      .then((r) => { setRows(r.data?.data || []); setDates(r.data?.dates || {}); })
      .catch(() => setRows([])).finally(() => setBusy(false));
  }

  const weeks = useMemo(() => Array.from({ length: meta?.weeks || 13 }, (_, i) => i + 1), [meta]);

  /* ── entry grid: local edits for the chosen week ─────────────────────── */
  const cell = (r) => r.weeks?.[week] || {};
  const setCell = (id, patch) => setRows((rs) => rs.map((r) => (r.student_id === id
    ? { ...r, weeks: { ...r.weeks, [week]: { ...cell(r), ...patch } } } : r)));
  const livePct = (c) => (c.total > 0 && c.correct !== "" && c.correct != null ? Math.round((c.correct / c.total) * 1000) / 10 : null);

  async function save() {
    setErr(""); setFlash("");
    for (const r of rows) {
      const c = cell(r);
      const hasAny = c.total !== "" && c.total != null || c.correct !== "" && c.correct != null;
      if (hasAny && (!(Number(c.total) > 0) || Number(c.correct) < 0 || Number(c.correct) > Number(c.total))) {
        return setErr(<><b>{r.name}</b> — <span>Correct answers must be between 0 and the total questions.</span></>);
      }
    }
    setBusy(true);
    try {
      const payload = rows.map((r) => ({ student_id: r.student_id, total: cell(r).total ?? "", correct: cell(r).correct ?? "" }));
      const res = await saveWeekly({ class_id: classId, term_id: termId, week_no: week, exam_date: examDate, rows: payload });
      setFlash(res.data?.message || "Saved.");
      load();
    } catch (e) {
      setErr(e.response?.data?.message || "Could not save.");
    } finally { setBusy(false); }
  }

  /* ── Excel: template out, filled sheet in ──────────────────────────────── */
  function downloadTemplate() {
    const cls = meta?.classes?.find((c) => String(c.id) === String(classId))?.name || "";
    const sheet = XLSX.utils.aoa_to_sheet([
      [t("Student code"), t("Student"), t("Father"), t("Total questions"), t("Correct answers")],
      ...rows.map((r) => [r.code, r.name, r.father || "", "", ""]),
    ]);
    sheet["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Scores");
    XLSX.writeFile(wb, `weekly-${cls}-week-${week}.xlsx`);
  }

  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false });
      // Column A is the student code — the one stable key. Names can be misspelt.
      const byCode = new Map(rows.map((r) => [String(r.code).trim(), r.student_id]));
      let matched = 0; const unknown = [];
      const next = new Map();
      for (const line of data.slice(1)) {
        const [code, name, , total, correct] = line;
        if (!code && !name) continue;
        const id = byCode.get(String(code || "").trim());
        if (!id) { unknown.push(name || code); continue; }
        next.set(id, { total: toNum(total), correct: toNum(correct) });
        matched++;
      }
      setRows((rs) => rs.map((r) => (next.has(r.student_id)
        ? { ...r, weeks: { ...r.weeks, [week]: { ...cell(r), ...next.get(r.student_id) } } } : r)));
      setFlash(<><b>{matched}</b> <span>students filled from the file. Review, then Save.</span></>);
      if (unknown.length) setErr(<><span>Not on this class roster:</span> {unknown.slice(0, 5).join(", ")}{unknown.length > 5 ? "…" : ""}</>);
    } catch {
      setErr("Could not read that file. Use the downloaded template.");
    }
  }

  function exportResults() {
    const sheet = XLSX.utils.aoa_to_sheet([
      [t("Rank"), t("Student code"), t("Student"), ...weeks.map((w) => `W${w}`), t("Average"), t("Band")],
      ...ranked.map((r) => [r.rank ?? "", r.code, r.name, ...weeks.map((w) => r.weeks?.[w]?.pct ?? ""), r.average ?? "", r.band ?? ""]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Results");
    XLSX.writeFile(wb, "weekly-results.xlsx");
  }

  const ranked = useMemo(() => [...rows].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.name.localeCompare(b.name)), [rows]);
  const filled = rows.filter((r) => cell(r).total).length;
  const classAvg = useMemo(() => {
    const xs = rows.map((r) => r.average).filter((x) => x != null);
    return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
  }, [rows]);

  if (loading) return <Loading />;
  if (!meta?.classes?.length) {
    return <Page><Header icon={ICON.book} title="Weekly Assessments" /><EmptyState title="No classes on your timetable." /></Page>;
  }

  return (
    <Page>
      <Header
        icon={ICON.book}
        title="Weekly Assessments"
        subtitle="Questions asked, answers correct — the percentage, average and class rank follow."
      />

      {flash && <Banner kind="success" onClose={() => setFlash("")}>{flash}</Banner>}
      {err && <Banner kind="error" onClose={() => setErr("")}>{err}</Banner>}

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs font-semibold text-gray-600">Class
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </label>
          <label className="text-xs font-semibold text-gray-600">Term
            <Select value={termId} onChange={(e) => setTermId(e.target.value)}>
              {meta.terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </label>
          <div className="lg:col-span-2 flex items-end">
            <Segmented value={tab} onChange={setTab} options={[{ value: "entry", label: "Enter scores" }, { value: "results", label: "Results & ranking" }]} />
          </div>
        </div>
      </Card>

      {tab === "entry" ? (
        <>
          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-gray-600">Week
                <Select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
                  {weeks.map((w) => <option key={w} value={w}>{t("Week")} {w}{dates[w] ? ` · ${dates[w]}` : ""}</option>)}
                </Select>
              </label>
              <label className="text-xs font-semibold text-gray-600">Exam date
                <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </label>
              <div className="ms-auto flex flex-wrap gap-2">
                <Btn tone="ghost" onClick={downloadTemplate} disabled={!rows.length}>Download Excel template</Btn>
                <Btn tone="ghost" onClick={() => fileRef.current?.click()} disabled={!rows.length}>Import Excel</Btn>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importFile} />
                <Btn onClick={save} disabled={busy || !rows.length}>{busy ? <span>Saving…</span> : <><span>Save week</span> {week}</>}</Btn>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">{filled} / {rows.length} students filled. Leave both cells empty to clear a score.</p>
          </Card>

          <TableCard>
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>#</th><th className={thCls}>Student</th><th className={thCls}>Father</th>
                <th className={thCls}>Total questions</th><th className={thCls}>Correct answers</th><th className={thCls}>Percentage</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const c = cell(r); const pct = livePct(c);
                  return (
                    <tr key={r.student_id}>
                      <td className={tdCls}>{i + 1}</td>
                      <td className={tdCls}><div className="font-medium">{r.name}</div><div className="text-[10px] text-gray-400">{r.code}</div></td>
                      <td className={tdCls}>{r.father || "—"}</td>
                      <td className={tdCls}><Input type="number" min="1" inputMode="numeric" value={c.total ?? ""} onChange={(e) => setCell(r.student_id, { total: e.target.value })} /></td>
                      <td className={tdCls}><Input type="number" min="0" inputMode="numeric" value={c.correct ?? ""} onChange={(e) => setCell(r.student_id, { correct: e.target.value })} /></td>
                      <td className={tdCls}><PctChip pct={pct} bands={meta.bands} /></td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={6} className={`${tdCls} text-center text-gray-400`}>No active students in this class.</td></tr>}
              </tbody>
            </table>
          </TableCard>
        </>
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Stat label="Class average" value={classAvg != null ? `${classAvg}%` : "—"} />
              <Stat label="Students ranked" value={rows.filter((r) => r.rank).length} />
              <Legend bands={meta.bands} />
              <div className="ms-auto"><Btn tone="ghost" onClick={exportResults} disabled={!rows.length}>Export results</Btn></div>
            </div>
          </Card>

          <TableCard>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className={thCls}>Rank</th><th className={thCls}>Student</th>
                  {weeks.map((w) => <th key={w} className={`${thCls} text-center`} title={dates[w] || ""}>W{w}</th>)}
                  <th className={thCls}>Average</th><th className={thCls}>Trend</th><th className={thCls}>Band</th>
                </tr></thead>
                <tbody>
                  {ranked.map((r) => (
                    <tr key={r.student_id} className={r.rank === 1 ? "bg-amber-50/60" : ""}>
                      <td className={`${tdCls} font-bold`}>{r.rank ?? "—"}</td>
                      <td className={tdCls}><div className="font-medium">{r.name}</div><div className="text-[10px] text-gray-400">{r.code}</div></td>
                      {weeks.map((w) => <td key={w} className={`${tdCls} text-center`}><PctChip pct={r.weeks?.[w]?.pct} bands={meta.bands} small /></td>)}
                      <td className={`${tdCls} font-bold`}>{r.average != null ? `${r.average}%` : "—"}</td>
                      <td className={tdCls}><Trend points={weeks.map((w) => r.weeks?.[w]?.pct)} /></td>
                      <td className={tdCls}><BandPill band={r.band} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>
        </>
      )}
    </Page>
  );
}

/* ── small pieces ────────────────────────────────────────────────────────── */

const toNum = (v) => (v === undefined || v === null || String(v).trim() === "" ? "" : String(v).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

const bandOf = (pct, bands) => (pct == null ? null : pct >= bands.excellent ? "excellent" : pct >= bands.good ? "good" : "support");
const BAND_CLS = {
  excellent: "bg-emerald-100 text-emerald-800",
  good: "bg-amber-100 text-amber-800",
  support: "bg-red-100 text-red-700",
};
const BAND_LABEL = { excellent: "Excellent", good: "Good", support: "Needs support" };

function PctChip({ pct, bands, small }) {
  if (pct == null) return <span className="text-gray-300">—</span>;
  return <span className={`inline-block rounded-md font-semibold ${small ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs"} ${BAND_CLS[bandOf(pct, bands)]}`}>{pct}%</span>;
}

function BandPill({ band }) {
  if (!band) return <span className="text-gray-300">—</span>;
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${BAND_CLS[band]}`}>{BAND_LABEL[band]}</span>;
}

function Stat({ label, value }) {
  return <div><div className="text-[10px] uppercase tracking-wider text-gray-400">{label}</div><div className="text-lg font-bold text-gray-800">{value}</div></div>;
}

function Legend({ bands }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-500">
      <span className={`px-1.5 rounded ${BAND_CLS.excellent}`}>≥ {bands.excellent}%</span>
      <span className={`px-1.5 rounded ${BAND_CLS.good}`}>{bands.good}–{bands.excellent - 1}%</span>
      <span className={`px-1.5 rounded ${BAND_CLS.support}`}>&lt; {bands.good}%</span>
    </div>
  );
}

/** A sparkline of the weeks that have a score; gaps are skipped, not zeroed. */
function Trend({ points }) {
  const pts = points.map((p, i) => (p == null ? null : [i, p])).filter(Boolean);
  if (pts.length < 2) return <span className="text-gray-300">—</span>;
  const w = 80, h = 22, n = points.length - 1;
  const d = pts.map(([i, p], k) => `${k ? "L" : "M"}${(i / n) * w},${h - (p / 100) * h}`).join(" ");
  return <svg width={w} height={h} className="text-teal-600"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
