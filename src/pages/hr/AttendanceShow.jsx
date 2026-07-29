import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get } from "../../api/axios";
import Swal from "sweetalert2";

// ── formatters ────────────────────────────────────────────────────────────────
const fmtDate = (v) => (v ? String(v).slice(0, 10) : "—");
const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = String(t).slice(0, 5).split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
};
// working_hours is stored as decimal hours (0.17 = 10 min).
const fmtDuration = (hoursDecimal) => {
  if (hoursDecimal === null || hoursDecimal === undefined || hoursDecimal === "") return "—";
  const totalMin = Math.round(Number(hoursDecimal) * 60);
  if (isNaN(totalMin) || totalMin <= 0) return "0 min";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h}h ${m}m`;
};

const STATUS_STYLES = {
  present: "bg-emerald-100 text-emerald-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
  half_day: "bg-blue-100 text-blue-700",
  leave: "bg-purple-100 text-purple-700",
  pending: "bg-gray-100 text-gray-500",
};
const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
    {(status || "pending").replace(/_/g, " ").toUpperCase()}
  </span>
);

export default function AttendanceShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await get(`/hr/attendances/${id}`);
        const rec = res.data?.data || res.data;
        if (!alive) return;
        setRecord(rec);

        // Pull this employee's full attendance history for the stats + timeline.
        if (rec?.employee_id) {
          const hist = await get(`/hr/attendances?employee_id=${rec.employee_id}&per_page=500`);
          const rows = hist.data?.data || hist.data || [];
          if (alive) setHistory(Array.isArray(rows) ? rows : []);
        }
      } catch (e) {
        Swal.fire("Error", e.response?.data?.message || "Failed to load attendance record", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // ── derived statistics ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const s = { total: 0, present: 0, absent: 0, late: 0, half_day: 0, leave: 0, hours: 0, monthPresent: 0, monthTotal: 0 };
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    for (const r of history) {
      s.total += 1;
      if (s[r.status] !== undefined) s[r.status] += 1;
      s.hours += Number(r.working_hours || 0);
      // Compare on the raw Y-m-d the API sends, not on the DD/MM/YYYY display
      // string — "29/07/2026" never starts with "2026-07", so this counter was
      // stuck at zero.
      if (String(r.date).startsWith(ym)) {
        s.monthTotal += 1;
        if (["present", "late", "half_day"].includes(r.status)) s.monthPresent += 1;
      }
    }
    const presentLike = s.present + s.late + s.half_day;
    s.rate = s.total ? Math.round((presentLike / s.total) * 100) : 0;
    s.avgHours = presentLike ? s.hours / presentLike : 0;
    return s;
  }, [history]);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [history],
  );

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-9 w-9 border-4 border-teal-100 border-t-teal-600" />
      </div>
    );
  }
  if (!record) {
    return <div className="p-8 text-center text-gray-400">Attendance record not found.</div>;
  }

  const employeeName = record.employee?.full_name || record.employee?.application?.full_name || `Employee #${record.employee_id}`;

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/hr/attendance")} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{employeeName}</h1>
            <p className="text-xs text-gray-500">
              {record.employee?.role_title_en || record.employee?.department || "Staff"} · Attendance
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/hr/attendance/edit/${id}`)}
          className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
        >
          Edit this record
        </button>
      </div>

      {/* Selected record */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">Selected day — {fmtDate(record.date)}</h2>
          <StatusBadge status={record.status} />
        </header>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Detail label="Arrived" value={fmtTime(record.arrived)} />
          <Detail label="Check out" value={fmtTime(record.check_out)} />
          <Detail label="Working hours" value={fmtDuration(record.working_hours)} />
          <Detail label="Recorded by" value={record.recorder?.name || "—"} />
          {record.notes && <Detail label="Notes" value={record.notes} full />}
        </div>
      </section>

      {/* Statistics */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Statistics (all recorded days)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total days" value={stats.total} tone="text-gray-800" />
          <StatCard label="Present" value={stats.present + stats.late + stats.half_day} tone="text-emerald-600" />
          <StatCard label="Absent" value={stats.absent} tone="text-red-600" />
          <StatCard label="Late" value={stats.late} tone="text-amber-600" />
          <StatCard label="Attendance rate" value={`${stats.rate}%`} tone="text-teal-700" />
          <StatCard label="Total hours" value={fmtDuration(stats.hours)} tone="text-gray-800" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <StatCard label="Avg / present day" value={fmtDuration(stats.avgHours)} tone="text-gray-800" />
          <StatCard label="Leave days" value={stats.leave} tone="text-purple-600" />
          <StatCard label="This month present" value={`${stats.monthPresent}${stats.monthTotal ? ` / ${stats.monthTotal}` : ""}`} tone="text-gray-800" />
        </div>
      </section>

      {/* History timeline */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
          <h2 className="text-sm font-bold text-gray-700">Attendance history ({sortedHistory.length})</h2>
        </header>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-white sticky top-0 shadow-sm">
              <tr className="text-left text-[10px] font-bold text-gray-500 uppercase">
                <th className="px-5 py-2.5">Date</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5">Arrived</th>
                <th className="px-5 py-2.5">Check out</th>
                <th className="px-5 py-2.5">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedHistory.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-gray-400">No attendance history yet.</td></tr>
              )}
              {sortedHistory.map((r) => (
                <tr key={r.id} className={`hover:bg-gray-50 ${String(r.id) === String(id) ? "bg-teal-50/60" : ""}`}>
                  <td className="px-5 py-2.5 text-gray-700 font-medium">{fmtDate(r.date)}</td>
                  <td className="px-5 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-2.5 text-gray-600">{fmtTime(r.arrived)}</td>
                  <td className="px-5 py-2.5 text-gray-600">{fmtTime(r.check_out)}</td>
                  <td className="px-5 py-2.5 text-gray-600">{fmtDuration(r.working_hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const Detail = ({ label, value, full }) => (
  <div className={full ? "col-span-2 sm:col-span-4" : ""}>
    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
    <div className="text-sm text-gray-800 mt-0.5">{value}</div>
  </div>
);

const StatCard = ({ label, value, tone = "text-gray-800" }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
    <div className={`text-xl font-bold mt-0.5 ${tone}`}>{value}</div>
  </div>
);
