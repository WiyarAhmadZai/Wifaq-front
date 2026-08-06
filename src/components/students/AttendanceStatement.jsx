import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import { getStudentStatement, downloadStudentStatementPdf } from "../../api/studentAttendance";

/**
 * One student's monthly attendance sheet.
 *
 * Deliberately shared between the office and the parent portal so both read
 * the same document — a statement that says one thing to staff and another to
 * a parent is worse than no statement.
 *
 * The rule it exists to make visible: a day the student left early is
 * **Present — left early**, counted as attendance, with the reason beside it.
 * A parent who knows their child came home at 11 must not see a bare "Present"
 * and conclude the school lost track of them.
 */

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TONE = {
  present:  { row: "", text: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  half_day: { row: "bg-amber-50/40", text: "text-amber-800", chip: "bg-amber-50 text-amber-800 border-amber-200" },
  absent:   { row: "bg-red-50/40", text: "text-red-700", chip: "bg-red-50 text-red-700 border-red-200" },
  // Weekend / holiday. Listed so a parent does not read the gaps as missing
  // records — and greyed, because it is not attendance either way.
  closed:   { row: "bg-gray-50", text: "text-gray-500", chip: "bg-gray-100 text-gray-600 border-gray-300" },
};

export default function AttendanceStatement({ studentId, onClose, embedded = false }) {
  // Read once on mount. A `new Date()` in the render body is a fresh object
  // every pass, which would re-fire the year list on every keystroke.
  const [thisYear] = useState(() => new Date().getFullYear());
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await getStudentStatement(studentId, { year, month });
      setData(r.data?.data || null);
    } catch (e) {
      setData(null);
      setError(e.response?.data?.message || "Could not load this statement.");
    } finally {
      setLoading(false);
    }
  }, [studentId, year, month]);

  useEffect(() => { load(); }, [load]);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadStudentStatementPdf(studentId, {
        year, month,
        filename: `attendance-${data?.student?.admission_no || studentId}-${year}-${String(month).padStart(2, "0")}.pdf`,
      });
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not download the PDF.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const t = data?.totals;
  const attended = t ? (t.attended ?? t.present + t.half_day) : 0;

  const years = useMemo(() => [thisYear, thisYear - 1, thisYear - 2], [thisYear]);

  const body = (
    <div className={embedded ? "" : "bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"}>
      {/* Toolbar — never printed */}
      <div className={`flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50 print:hidden ${embedded ? "rounded-t-xl border border-gray-200" : ""}`}>
        <h3 className="text-sm font-bold text-gray-800 mr-auto">
          Monthly attendance{data ? ` — ${data.student.name}` : ""}
        </h3>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
          className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => window.print()} disabled={!data}
          className="px-3 py-1.5 text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 disabled:opacity-40">
          Print
        </button>
        <button onClick={download} disabled={!data || downloading}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-40">
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
        {!embedded && (
          <button onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100">
            Close
          </button>
        )}
      </div>

      <div id="attendance-statement" className={`px-5 py-4 overflow-y-auto bg-white ${embedded ? "border-x border-b border-gray-200 rounded-b-xl" : ""}`}>
        {loading ? (
          <p className="text-center py-10 text-xs text-gray-400">Loading…</p>
        ) : error ? (
          <p className="text-center py-10 text-xs text-red-600">{error}</p>
        ) : !data ? (
          <p className="text-center py-10 text-xs text-gray-400">No statement available.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b-2 border-teal-600">
              <div>
                <p className="text-base font-bold text-gray-900">{data.student.name}</p>
                <p className="text-[11px] text-gray-500">
                  <span className="font-mono">{data.student.admission_no || "—"}</span>
                  {data.student.class ? ` · ${data.student.class}` : ""}
                  {data.student.parent_name ? ` · Parent: ${data.student.parent_name}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-teal-700">{data.period.label}</p>
                <p className="text-[10px] text-gray-400">{data.period.from} → {data.period.to}</p>
              </div>
            </div>

            {/* Headline. Attended leads; early departures are inside it and
                then broken out, so nothing is hidden either way.
                Screen only — the printed sheet carries the same figures in a
                compact summary row instead of four cards. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4 print:hidden">
              <Cell label="Days attended" value={attended} tone="text-emerald-700" big />
              <Cell label="of which left early" value={t.half_day} tone="text-amber-700" />
              <Cell label="Days absent" value={t.absent} tone="text-red-700" />
              <Cell label="Attendance" value={`${t.attendance_rate}%`} tone="text-teal-700" big />
            </div>

            <p className="text-[10px] text-gray-500 mb-3 print:hidden">
              A day your child left early counts as <strong>attended</strong> — they were in school.
              It is listed separately below, with the reason, so nothing is hidden.
              {t.closed_days > 0 && (
                <> The school was closed on <strong>{t.closed_days}</strong> day(s) this month;
                those are listed with their reason and do not affect attendance.</>
              )}
            </p>

            {/* Print-only summary line: the same four numbers on one row. */}
            <p className="hidden print:block text-[10px] my-2">
              <strong>Days attended:</strong> {attended} &nbsp;·&nbsp;
              <strong>of which left early:</strong> {t.half_day} &nbsp;·&nbsp;
              <strong>Days absent:</strong> {t.absent} &nbsp;·&nbsp;
              <strong>Attendance:</strong> {t.attendance_rate}%
              &nbsp;— a day the student left early counts as attended.
            </p>

            {data.days.length === 0 ? (
              <p className="text-center py-8 text-xs text-gray-400 italic">
                No attendance recorded for {data.period.label}.
              </p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full min-w-[520px] text-[11px]">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
                    <tr>
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-3 py-2">Day</th>
                      <th className="text-left px-3 py-2">Attendance</th>
                      <th className="text-left px-3 py-2">Left at</th>
                      <th className="text-left px-3 py-2">Reason / note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.days.map((d) => {
                      const tone = TONE[d.status] || TONE.present;
                      return (
                        <tr key={d.date} className={tone.row}>
                          <td className="px-3 py-2 font-mono text-gray-700">{d.date}</td>
                          <td className="px-3 py-2 text-gray-400">{d.weekday}</td>
                          <td className="px-3 py-2">
                            <span className={`status-chip px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tone.chip}`}>
                              {d.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-600">{d.left_at || "—"}</td>
                          <td className="px-3 py-2 text-gray-700">{d.comment || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-[10px] text-gray-400 mt-3">
              If any entry looks wrong, please contact the school office so the record can be corrected.
            </p>
          </>
        )}
      </div>
    </div>
  );

  if (embedded) return body;

  // Portalled to <body>: a `fixed` overlay is only viewport-relative while no
  // ancestor sets a transform/filter, and this opens from deep in a table.
  return createPortal(
    <div className="attendance-print-host fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:static print:bg-white print:p-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/*
        Print = heading + table, nothing else.

        The screen version carries stat cards, an explanatory paragraph and a
        modal shell; on paper those are noise and pushed the table onto a
        second page. This strips the app root, flattens the fixed overlay back
        into normal flow, hides the chrome, and turns the coloured status
        "chips" into plain bordered text — a printer renders a filled pill as a
        grey smear.
      */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: #fff !important; }
          body > #root { display: none !important; }
          .attendance-print-host {
            position: static !important;
            padding: 0 !important;
            background: #fff !important;
            backdrop-filter: none !important;
            display: block !important;
          }
          .attendance-print-host > div {
            max-width: none !important; max-height: none !important;
            box-shadow: none !important; border-radius: 0 !important;
            overflow: visible !important;
          }
          #attendance-statement { padding: 0 !important; overflow: visible !important; }
          .print\\:hidden { display: none !important; }
          /* Table borders survive the printer's colour stripping. */
          #attendance-statement table { border-collapse: collapse !important; width: 100% !important; }
          #attendance-statement th, #attendance-statement td {
            border: 1px solid #999 !important; padding: 4px 6px !important; font-size: 10px !important;
          }
          #attendance-statement thead th { background: #eee !important; -webkit-print-color-adjust: exact; }
          /* Status chips → plain text; a filled pill prints as a grey blob. */
          #attendance-statement .status-chip {
            background: transparent !important; border: none !important;
            padding: 0 !important; font-weight: bold !important;
          }
          #attendance-statement tr { page-break-inside: avoid; }
          #attendance-statement thead { display: table-header-group; }
        }
      `}</style>
      {body}
    </div>,
    document.body
  );
}

function Cell({ label, value, tone, big }) {
  return (
    <div className="border border-gray-200 rounded-lg px-3 py-2">
      <p className="text-[9px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`${big ? "text-xl" : "text-lg"} font-bold ${tone}`}>{value}</p>
    </div>
  );
}
