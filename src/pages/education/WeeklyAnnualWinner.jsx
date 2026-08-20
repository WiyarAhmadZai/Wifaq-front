import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import {
  DimPill, Spinner, StudentName, cleanClass, cleanName, describeError,
  isEmptyPayload, TEAL, GOLD_LT, GOLD_SOFT, GOLD_DEEP,
} from "./weeklyUi";

/**
 * Student of the Year — the annual end of the weekly recognition ladder.
 *
 * Nothing is chosen on this screen. The weekly announcements already made every
 * decision; this counts them and names whoever won the most weeks in the
 * academic year. That is why there is no save button anywhere here: a stored
 * winner would go stale the moment an award is undone, so the standing is
 * recomputed from the weekly history on every load.
 */
export default function WeeklyAnnualWinner() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [yearId, setYearId] = useState("");

  const load = useCallback(async (id) => {
    const url = `/weekly-recognition/annual-winner${id ? `?year_id=${id}` : ""}`;
    const cached = peekCache(url);
    if (!isEmptyPayload(cached)) { setData(cached); setLoading(false); }
    try {
      const res = await get(url);
      if (!isEmptyPayload(res?.data)) setData(res.data);
    } catch (err) {
      Swal.fire("Error", describeError(err, "Failed to work out the annual winner."), "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(yearId); }, [load, yearId]);

  if (loading && !data) return <Spinner />;

  const winner    = data?.winner || null;
  const standings = data?.standings || [];
  const stats     = data?.stats || {};
  const years     = data?.years || [];
  const year      = data?.year || null;
  const tiedWith  = data?.tied_with || 0;
  const runnersUp = standings.filter((s) => s.student_id !== winner?.student_id);

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">Annual Winner — Student of the Year</h1>
            <p className="text-xs text-[#CFE6E6] mt-0.5">
              Worked out automatically from the weekly winners. Nothing to select here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={yearId || year?.id || ""}
              onChange={(e) => { setYearId(e.target.value); setLoading(true); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/15 text-white border-0 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id} className="text-[#0A3A3E]">
                  {y.name}{y.is_current ? " (current)" : ""}
                </option>
              ))}
            </select>
            <button onClick={() => navigate("/education/weekly-recognition/history")}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
              🏆 Weekly winners
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-5xl mx-auto">
        {!winner ? (
          <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-10 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm font-bold text-[#0A3A3E]">No annual winner yet</p>
            <p className="text-xs text-[#5A7A7E] mt-1">
              No weekly winner has been selected in {year?.name || "this academic year"} yet.
              The annual winner appears as soon as the first week is awarded.
            </p>
          </div>
        ) : (
          <>
            {/* The winner. Deliberately the largest thing on the page — it is
                the announcement, not a row in a report. */}
            <div className="rounded-2xl border shadow-sm p-6 text-center"
              style={{ background: GOLD_LT, borderColor: GOLD_SOFT }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD_DEEP }}>
                Student of the Year · {year?.name}
              </div>
              <div className="text-4xl my-3">🏆</div>
              <StudentName name={winner.student}
                className="block text-2xl font-bold" style={{ color: GOLD_DEEP }} />
              <div className="text-xs mt-1" style={{ color: GOLD_DEEP, opacity: 0.85 }}>
                {[cleanClass(winner.class) || "No class", winner.code].filter(Boolean).join(" · ")}
              </div>

              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70">
                <span className="text-2xl font-bold" style={{ color: GOLD_DEEP }}>{winner.wins}</span>
                <span className="text-xs font-semibold" style={{ color: GOLD_DEEP }}>
                  {winner.wins === 1 ? "week won" : "weeks won"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                {(winner.dimensions || []).map((d) => <DimPill key={d} d={d} />)}
              </div>

              {tiedWith > 0 && (
                <p className="text-[11px] mt-4 px-3 py-2 rounded-xl bg-white/70 inline-block" style={{ color: GOLD_DEEP }}>
                  ⚖️ {tiedWith === 1 ? "One other student" : `${tiedWith} other students`} also won {winner.wins} weeks —
                  decided on the tie-breaks below.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat value={stats.weeks_recognised ?? 0} label="Weeks awarded" />
              <Stat value={stats.distinct_students ?? 0} label="Students honoured" />
              <Stat value={winner.nominations ?? 0} label="Winner's nominations" />
              <Stat value={(winner.dimensions || []).length} label="Areas covered" />
            </div>

            {/* The weeks behind the number — the evidence for the title. */}
            <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#D0E0E0]">
                <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider">
                  Weeks won by {cleanName(winner.student)}
                </h3>
              </div>
              <ul className="divide-y divide-[#D0E0E0]">
                {(winner.weeks || []).map((w, i) => (
                  <li key={`${w.week_start}-${i}`} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <span className="text-sm text-[#0A3A3E]">{w.topic || "Untitled topic"}</span>
                    <span className="text-xs text-[#5A7A7E] whitespace-nowrap">{w.week_start} → {w.week_end}</span>
                  </li>
                ))}
              </ul>
            </div>

            {runnersUp.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#D0E0E0] flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider">
                    {data?.can_see_standings ? "Full standings" : "Runners-up"}
                  </h3>
                  {!data?.can_see_standings && (
                    <span className="text-[11px] text-[#8AA4A7]">Top 3 only</span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-white" style={{ background: "#052528" }}>
                        <th className="px-4 py-2.5 font-semibold">#</th>
                        <th className="px-4 py-2.5 font-semibold">Student</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Weeks won</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Nominations</th>
                        <th className="px-4 py-2.5 font-semibold">Areas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D0E0E0]">
                      {runnersUp.map((s) => (
                        <tr key={s.student_id} className="hover:bg-[#F4F8F8]/70">
                          <td className="px-4 py-2.5 text-xs font-bold text-[#5A7A7E]">{s.rank}</td>
                          <td className="px-4 py-2.5">
                            <StudentName name={s.student} className="text-sm font-semibold text-[#0A3A3E] block" />
                            <div className="text-[11px] text-[#5A7A7E]">{cleanClass(s.class) || "No class"}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-sm font-bold" style={{ color: GOLD_DEEP }}>{s.wins}</td>
                          <td className="px-4 py-2.5 text-center text-xs text-[#5A7A7E]">{s.nominations}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {(s.dimensions || []).map((d) => <DimPill key={d} d={d} />)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Stated out loud so whoever announces the result can defend it. */}
        <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
          <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider mb-2">How this is decided</h3>
          <ol className="text-xs text-[#5A7A7E] space-y-1 list-decimal list-inside">
            {(data?.criteria || []).map((c) => <li key={c}>{c}</li>)}
          </ol>
          {year && (
            <p className="text-[11px] text-[#8AA4A7] mt-3">
              Counting weeks from {year.start} {year.end ? `to ${year.end}` : "onwards"}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="bg-white rounded-2xl border border-[#D0E0E0] p-4 shadow-sm">
      <div className="text-2xl font-bold" style={{ color: TEAL }}>{value}</div>
      <div className="text-[11px] text-[#5A7A7E] mt-0.5">{label}</div>
    </div>
  );
}
