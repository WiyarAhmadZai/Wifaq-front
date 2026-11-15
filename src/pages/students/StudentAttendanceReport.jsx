import { useCallback, useEffect, useMemo, useState } from "react";
import { getAttendanceReport, getAttendanceClasses } from "../../api/studentAttendance";
import { useAuth } from "../../admin/context/AuthContext";
import AttendanceStatement from "../../components/students/AttendanceStatement";

/**
 * School-wide attendance analytics: daily, weekly, monthly, 6-month, annual.
 *
 * A half day counts as PRESENT — the student came to school. It is reported in
 * its own column, with its reason, so repeated early departures show up as a
 * pattern without being scored as absences.
 */

const RANGES = [
  { key: "daily",      label: "Today" },
  { key: "weekly",     label: "This week" },
  { key: "monthly",    label: "This month" },
  { key: "six_months", label: "6 months" },
  { key: "annual",     label: "This year" },
];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function StudentAttendanceReport() {
  const { hasPermission, isSuperAdmin } = useAuth();
  // The per-student sheet is its own grant — see the statement migration.
  const canStatement = hasPermission("student-attendance.statement")
    || hasPermission("student-attendance.manage") || isSuperAdmin;
  const [statementFor, setStatementFor] = useState(null);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("monthly");
  const [anchor, setAnchor] = useState(todayIso());
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAttendanceClasses()
      .then((r) => setClasses(r.data?.data || []))
      .catch(() => setClasses([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getAttendanceReport({
        range, date: anchor, ...(classId ? { class_id: classId } : {}),
      });
      setData(r.data?.data || null);
    } catch (e) {
      setData(null);
      setError(e.response?.data?.message || "Could not load the report.");
    } finally {
      setLoading(false);
    }
  }, [range, anchor, classId]);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals;

  // Tallest bucket drives the bar heights. Guard against 0 or every bar would
  // be full height on an empty period.
  const peak = useMemo(
    () => Math.max(1, ...(data?.series || []).map((s) => s.marked || 0)),
    [data]
  );

  // The server now emits only periods where a register was actually taken,
  // and never past today — so nothing here needs filtering.
  const series = data?.series || [];

  // Search narrows the concerns list by name, admission number or class.
  const concerns = useMemo(() => {
    const rows = data?.concerns || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) =>
      String(c.name || "").toLowerCase().includes(q)
      || String(c.admission_no || "").toLowerCase().includes(q)
      || String(c.class || "").toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="px-4 py-4 max-w-6xl mx-auto">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-800">Attendance Report</h2>
        <p className="text-xs text-gray-500">
          Present, absent and early-departure totals. A student who left early counts as
          present — they attended — and is also tracked as a half day so the pattern stays visible.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex gap-1 flex-wrap">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${
                range === r.key ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {r.label}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Anchor date</label>
          <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
        </div>
        {/* Class filter goes to the server — it narrows the totals and the
            trend, not just the table. */}
        <div className="min-w-[190px]">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name}{c.grade?.name ? ` · ${c.grade.name}` : ""}
              </option>
            ))}
          </select>
        </div>
        {/* Search is client-side: it filters the students already returned,
            so it stays instant and does not re-run the aggregation. */}
        <div className="min-w-[190px] flex-1">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Search student</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, admission no. or class…"
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
        </div>
        {data && (
          <p className="text-[10px] text-gray-400 ml-auto self-center">
            {data.from} → {data.to}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-14 text-xs text-gray-400">Loading…</div>
      ) : !t ? (
        <div className="text-center py-14 text-xs text-gray-400">No data for this period.</div>
      ) : (
        <>
          {/* Headline */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
            <Stat label="Attendance rate" value={`${t.attendance_rate}%`} tone="text-teal-700" big
                  hint={`${t.attended ?? t.days_present} attended of ${t.marked}`} />
            <Stat label="Present"  value={t.attended ?? t.present} tone="text-emerald-700"
                  hint={t.half_day > 0 ? `incl. ${t.half_day} who left early` : null} />
            <Stat label="Absent"   value={t.absent}   tone="text-red-700" />
            <Stat label="Left early" value={t.half_day} tone="text-amber-700" hint="counted present" />
            <Stat label="Records"  value={t.marked}   tone="text-gray-800" />
          </div>

          {/* Trend. Plain stacked bars — no chart library, so this stays
              readable when printed and adds no bundle weight. */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">Trend</h3>
            {series.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">
                No register was taken in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1.5 min-h-[140px]" style={{ minWidth: series.length * 34 }}>
                  {series.map((s) => {
                    const h = (n) => (s.marked ? Math.round((n / peak) * 110) : 0);
                    return (
                      <div key={s.label} className="flex flex-col items-center gap-1 flex-1 min-w-[28px]"
                           title={`${s.label} — present ${s.present}, absent ${s.absent}, half ${s.half_day} (${s.attendance_rate}%)`}>
                        <div className="w-full flex flex-col-reverse" style={{ height: 110 }}>
                          <div className="w-full bg-emerald-500 rounded-b" style={{ height: h(s.present) }} />
                          <div className="w-full bg-amber-400"            style={{ height: h(s.half_day) }} />
                          <div className="w-full bg-red-500 rounded-t"    style={{ height: h(s.absent) }} />
                        </div>
                        <span className="text-[8px] text-gray-400 whitespace-nowrap rotate-45 origin-left h-6">
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
              <Legend colour="bg-emerald-500" label="Present (full day)" />
              <Legend colour="bg-amber-400"   label="Left early (present)" />
              <Legend colour="bg-red-500"     label="Absent" />
            </div>
          </div>

          {/* The list that prompts a phone call */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-700">
                Students needing attention
                <span className="font-normal text-gray-400 ml-1">— most days missed in this period</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[11px]">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
                  <tr>
                    <th className="text-left px-3 py-2">Student</th>
                    <th className="text-left px-3 py-2">Class</th>
                    <th className="text-right px-3 py-2">Absent</th>
                    <th className="text-right px-3 py-2">Left early</th>
                    <th className="text-right px-3 py-2">Present</th>
                    <th className="text-right px-3 py-2">Days missed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {concerns.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-xs font-medium">
                      {search
                        ? <span className="text-gray-400">No student matches “{search}”.</span>
                        : <span className="text-emerald-600">No absences recorded in this period.</span>}
                    </td></tr>
                  ) : concerns.map((c) => (
                    <tr key={c.student_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-800">{c.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{c.admission_no}</div>
                        {canStatement && (
                          <button onClick={() => setStatementFor(c.student_id)}
                            className="mt-0.5 text-[9px] font-semibold text-teal-600 hover:text-teal-800 underline">
                            Monthly sheet / PDF
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{c.class || "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-700">{c.absent || "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-700">{c.half_day || "—"}</td>
                      {/* Present includes the days they left early — they attended. */}
                      <td className="px-3 py-2 text-right font-mono text-emerald-700">{c.present + c.half_day || "—"}</td>
                      {/* Only absences are missed days now. */}
                      <td className="px-3 py-2 text-right font-mono font-bold text-gray-800">{c.absent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {statementFor && (
        <AttendanceStatement studentId={statementFor} onClose={() => setStatementFor(null)} />
      )}
    </div>
  );
}

function Stat({ label, value, tone, hint, big }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`${big ? "text-2xl" : "text-lg"} font-bold ${tone}`}>{value}</p>
      {hint && <p className="text-[9px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Legend({ colour, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-2.5 h-2.5 rounded-sm ${colour}`} /> {label}
    </span>
  );
}
