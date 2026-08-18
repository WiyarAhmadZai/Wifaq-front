import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { get, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { DimPill, Spinner, StudentName, cleanClass, cleanName, TEAL } from "./weeklyUi";


/**
 * Per-week winners over time, plus a per-student tally. Shares the student's
 * recognition history rather than keeping a parallel one — every award here is
 * also a card on the student's timeline.
 */
export default function WeeklyHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const cached = peekCache("/weekly-recognition/history");
    if (cached) { setData(cached); setLoading(false); }
    try {
      const res = await get("/weekly-recognition/history");
      setData(res.data);
    } catch {
      Swal.fire("Error", "Failed to load the recognition history", "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const awards = useMemo(() => {
    const rows = data?.awards || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((a) => [a.student, a.topic, a.class].some((v) => (v || "").toLowerCase().includes(q)));
  }, [data, search]);

  if (loading) return <Spinner />;

  const stats = data?.stats || {};
  const top = (data?.per_student || [])[0];

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">Weekly Recognition History</h1>
            <p className="text-xs text-[#CFE6E6] mt-0.5">
              Shared with the student recognition module — not a separate record.
            </p>
          </div>
          <button onClick={() => navigate("/education/weekly-recognition")}
            className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
            🎯 This week
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-[#D0E0E0] p-4 shadow-sm">
            <div className="text-2xl font-bold" style={{ color: TEAL }}>{stats.weeks_recognised ?? 0}</div>
            <div className="text-[11px] text-[#5A7A7E] mt-0.5">Weeks recognised</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#D0E0E0] p-4 shadow-sm">
            <div className="text-2xl font-bold" style={{ color: TEAL }}>{stats.distinct_students ?? 0}</div>
            <div className="text-[11px] text-[#5A7A7E] mt-0.5">Students honoured</div>
          </div>
          <div className="rounded-2xl border p-4 shadow-sm" style={{ background: "#FFF8E7", borderColor: "#E8D48B" }}>
            <div className="text-2xl font-bold" style={{ color: "#8A6F10" }}>{top?.wins ?? 0}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "#8A6F10" }}>
              {top ? `${cleanName(top.student)}'s wins` : "Most wins"}
            </div>
          </div>
        </div>

        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by student, class or topic…"
          className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none" />

        <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D0E0E0] flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider">Weekly winners</h3>
            <span className="text-[11px] text-[#8AA4A7]">{awards.length} shown</span>
          </div>

          {awards.length === 0 ? (
            <p className="text-xs text-[#8AA4A7] px-4 py-8 text-center">No weekly recognitions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-white" style={{ background: "#052528" }}>
                    <th className="px-4 py-2.5 font-semibold">Week</th>
                    <th className="px-4 py-2.5 font-semibold">Topic</th>
                    <th className="px-4 py-2.5 font-semibold">Best performer</th>
                    <th className="px-4 py-2.5 font-semibold">Areas</th>
                    <th className="px-4 py-2.5 font-semibold text-center">Noms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0E0E0]">
                  {awards.map((a) => (
                    <tr key={a.id} className="hover:bg-[#F4F8F8]/70">
                      <td className="px-4 py-2.5 text-xs text-[#5A7A7E] whitespace-nowrap">
                        {a.week_start} → {a.week_end}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#0A3A3E]">{a.topic}</td>
                      <td className="px-4 py-2.5">
                        <StudentName name={a.student} className="text-sm font-semibold text-[#0A3A3E] block" />
                        <div className="text-[11px] text-[#5A7A7E]">{cleanClass(a.class) || "No class"}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(a.dimensions || []).map((d) => <DimPill key={d} d={d} />)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs font-bold" style={{ color: "#8A6F10" }}>
                        {a.nominations}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(data?.per_student || []).length > 1 && (
          <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
            <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider mb-2">Wins per student</h3>
            <div className="flex flex-wrap gap-2">
              {data.per_student.map((p) => (
                <span key={p.student_id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-[#F4F8F8] border border-[#D0E0E0]">
                  <StudentName name={p.student} className="font-semibold text-[#0A3A3E]" />
                  <span className="text-[#8AA4A7]">{cleanClass(p.class)}</span>
                  <span className="font-bold" style={{ color: "#8A6F10" }}>×{p.wins}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
