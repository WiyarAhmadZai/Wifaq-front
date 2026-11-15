import { useEffect, useState } from "react";
import { getMyChildrenAttendance } from "../../api/studentAttendance";
import AttendanceStatement from "../../components/students/AttendanceStatement";

/**
 * Parent portal — a parent's own children's attendance.
 *
 * No permission gates this page. Access is decided by the family that owns the
 * login, checked per request on the server, so a parent reaches their own
 * children and nobody else's. This is also where the absence notification
 * links to.
 *
 * It reuses the same statement component the office uses, so a parent reads
 * exactly the document the school hands out — including the reason their child
 * went home early, and the fact that it still counts as attendance.
 */
export default function MyChildrenAttendance() {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyChildrenAttendance()
      .then((r) => {
        const d = r.data?.data;
        const kids = d?.children || [];
        setChildren(kids);
        setSummary(d?.summary || null);
        // One child is the common case — open straight onto their sheet
        // instead of asking a parent to pick from a list of one.
        if (kids.length >= 1) setSelected(kids[0].id);
      })
      .catch((e) => setError(e.response?.data?.message || "Could not load your children's attendance."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="px-4 py-14 text-center text-xs text-gray-400">Loading…</div>;
  }

  if (error) {
    return <div className="px-4 py-14 text-center text-xs text-red-600">{error}</div>;
  }

  if (children.length === 0) {
    return (
      <div className="px-4 py-14 text-center">
        <p className="text-sm text-gray-700 font-medium">No children linked to your account</p>
        <p className="text-xs text-gray-400 mt-1">
          Please contact the school office if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto">
      <div className="mb-4 print:hidden">
        <h2 className="text-base font-bold text-gray-800">My Children — Attendance</h2>
        <p className="text-xs text-gray-500">
          Pick a child and a month to see their record. A day your child left early counts as
          present and shows the reason the school recorded.
        </p>
      </div>

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4 print:hidden">
          {children.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`px-3 py-2 rounded-xl border text-left transition ${
                selected === c.id
                  ? "bg-teal-50 border-teal-300 ring-1 ring-teal-200"
                  : "bg-white border-gray-200 hover:border-teal-200"}`}>
              <p className={`text-xs font-semibold ${selected === c.id ? "text-teal-800" : "text-gray-800"}`}>{c.name}</p>
              <p className="text-[10px] text-gray-400 font-mono">{c.admission_no}{c.class ? ` · ${c.class}` : ""}</p>
            </button>
          ))}
        </div>
      )}

      {summary && (summary.absent > 0 || summary.half_day > 0) && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 print:hidden">
          <p className="text-[11px] text-amber-900">
            This month across your children: <strong>{summary.absent}</strong> absence(s)
            and <strong>{summary.half_day}</strong> early departure(s).
            Early departures still count as attendance.
          </p>
        </div>
      )}

      {selected && <AttendanceStatement studentId={selected} embedded />}
    </div>
  );
}
