import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { get, put } from "../../api/axios";
import Select2 from "../../components/hr/Select2";

/**
 * What the generator needs to know before it replaces a timetable.
 *
 * Generating used to be one confirm dialog and a guess: six periods, six days,
 * every teacher free all week. None of those were true for every school, so the
 * result was correct on paper and wrong in the room, and somebody fixed it by
 * hand every term.
 *
 * Three questions, asked once, before anything is destroyed:
 *   · which days the school is closed
 *   · how many periods a day runs
 *   · when each teacher cannot be given a lesson
 *
 * The teacher grid saves as it is clicked, not on Generate. A teacher's week is
 * a fact about that teacher, not about this run — recording it should not
 * depend on finishing an unrelated action, and it is reused every term after.
 */

const DAY_LABELS = {
  saturday: "Saturday",
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

const DAYS = Object.keys(DAY_LABELS);

/* Friday is offered but starts closed.
 *
 * It used to be missing from the week entirely, which decided the question for
 * everyone: a school that teaches on Friday could not say so. Now it is a day
 * like any other — and, because almost every school here is closed then, one
 * somebody has to open deliberately rather than remember to shut. */
const DEFAULT_HOLIDAYS = ["friday"];

export default function GenerateScheduleModal({ open, onClose, onGenerate, generating }) {
  const [holidays, setHolidays] = useState(DEFAULT_HOLIDAYS);
  const [periods, setPeriods] = useState(6);

  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState("");
  const [blocked, setBlocked] = useState(() => new Set());   // "day-period"
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState("");                   // "", "saving", "saved"
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!open) return;
    get("/class-management/schedule/form-data")
      .then((r) => setTeachers(r.data?.teachers || []))
      .catch(() => setTeachers([]));
  }, [open]);

  // One teacher's week, whenever the picker changes.
  useEffect(() => {
    if (!teacherId) { setBlocked(new Set()); return; }
    setLoadingGrid(true);
    get(`/class-management/schedule/teacher-availability?teacher_id=${teacherId}&periods_per_day=${periods}`)
      .then((r) => {
        const next = new Set();
        (r.data?.data?.grid || []).forEach((c) => {
          if (!c.available) next.add(`${c.day}-${c.period}`);
        });
        setBlocked(next);
        setSaving("");
      })
      .catch(() => setBlocked(new Set()))
      .finally(() => setLoadingGrid(false));
  }, [teacherId, periods]);

  /* Saved as it is clicked, debounced so dragging across a row is one request.
   * The whole set is sent: a slot missing from it is available, which is what
   * an unticked box means — a diff could not express "cleared the last one". */
  const persist = useCallback((set) => {
    if (!teacherId) return;
    clearTimeout(saveTimer.current);
    setSaving("saving");
    saveTimer.current = setTimeout(() => {
      put("/class-management/schedule/teacher-availability", {
        teacher_id: teacherId,
        blocked: [...set].map((k) => {
          const i = k.lastIndexOf("-");
          return { day: k.slice(0, i), period: Number(k.slice(i + 1)) };
        }),
      })
        .then(() => setSaving("saved"))
        .catch(() => {
          setSaving("");
          Swal.fire("Not saved", "That change did not reach the server. Check the connection and try again.", "error");
        });
    }, 500);
  }, [teacherId]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const toggle = (day, period) => {
    setBlocked((prev) => {
      const next = new Set(prev);
      const key = `${day}-${period}`;
      if (next.has(key)) next.delete(key); else next.add(key);
      persist(next);
      return next;
    });
  };

  const toggleWholeDay = (day) => {
    setBlocked((prev) => {
      const next = new Set(prev);
      const cells = Array.from({ length: periods }, (_, i) => `${day}-${i + 1}`);
      // If any of the day is still free, block all of it; otherwise free it.
      const anyFree = cells.some((c) => !next.has(c));
      cells.forEach((c) => (anyFree ? next.add(c) : next.delete(c)));
      persist(next);
      return next;
    });
  };

  const workingDays = useMemo(() => DAYS.filter((d) => !holidays.includes(d)), [holidays]);

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ value: String(t.id), label: t.name })),
    [teachers],
  );

  if (!open) return null;

  const chosen = teachers.find((t) => String(t.id) === String(teacherId));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Before generating the timetable</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            The existing timetable is only replaced once a new one has been produced successfully.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* ── the school week ───────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Which days is the school closed?
            </p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const off = holidays.includes(d);
                return (
                  <button key={d} type="button"
                    onClick={() => setHolidays((h) => (off ? h.filter((x) => x !== d) : [...h, d]))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      off ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-gray-700 border-gray-200 hover:border-teal-300"
                    }`}>
                    {DAY_LABELS[d]}{off ? " — closed" : ""}
                  </button>
                );
              })}
            </div>
            {workingDays.length === 0 && (
              <p className="text-[11px] text-red-600 mt-1.5">Every day is closed — there would be nothing to schedule.</p>
            )}
          </div>

          {/* ── the length of a day ───────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              How many periods are taught each day?
            </p>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={10} value={periods}
                onChange={(e) => setPeriods(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500" />
              <span className="text-[11px] text-gray-400">
                {workingDays.length} working day{workingDays.length === 1 ? "" : "s"} × {periods} = {workingDays.length * periods} slots per class
              </span>
            </div>
          </div>

          {/* ── each teacher's week ───────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              When can each teacher NOT be given a lesson?
            </p>
            <Select2 size="sm" value={teacherId} onChange={(v) => setTeacherId(v || "")}
              placeholder="Search for a teacher…" options={teacherOptions} />

            {!teacherId && (
              <p className="text-[11px] text-gray-400 mt-2">
                Pick a teacher to mark the times they are not available. A teacher you never
                open is treated as free all week.
              </p>
            )}

            {teacherId && (
              <div className="mt-3">
                {loadingGrid ? (
                  <p className="text-[11px] text-gray-400">Loading {chosen?.name}'s week…</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="p-1.5" />
                            {Array.from({ length: periods }, (_, i) => (
                              <th key={i} className="p-1.5 text-[10px] font-semibold text-gray-500 w-12">P{i + 1}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {DAYS.map((day) => {
                            const closed = holidays.includes(day);
                            return (
                              <tr key={day} className={closed ? "opacity-40" : ""}>
                                <td className="p-1.5 pr-3 whitespace-nowrap">
                                  {/* A whole day off is the commonest case, so it
                                      is one click rather than six. */}
                                  <button type="button" onClick={() => !closed && toggleWholeDay(day)}
                                    disabled={closed}
                                    className="text-[11px] font-semibold text-gray-600 hover:text-teal-700 disabled:cursor-not-allowed">
                                    {DAY_LABELS[day]}
                                  </button>
                                </td>
                                {Array.from({ length: periods }, (_, i) => {
                                  const period = i + 1;
                                  const isBlocked = blocked.has(`${day}-${period}`);
                                  return (
                                    <td key={period} className="p-0.5">
                                      <button type="button" disabled={closed}
                                        onClick={() => toggle(day, period)}
                                        title={isBlocked ? "Not available — no lesson will be given here" : "Available"}
                                        className={`w-10 h-9 rounded-lg border text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                                          isBlocked
                                            ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                            : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                        }`}>
                                        {isBlocked ? "✕" : "✓"}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-gray-400">
                        Click a cell to switch it. Click a day name to switch the whole day.
                        Red means no lesson will be scheduled there.
                      </p>
                      {/* Saved as you click — say so, so nobody hunts for a
                          Save button that does not exist. */}
                      <span className="text-[10px] whitespace-nowrap ml-3">
                        {saving === "saving" && <span className="text-gray-400">Saving…</span>}
                        {saving === "saved" && <span className="text-green-600">Saved automatically</span>}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 bg-gray-50 flex items-center justify-between gap-2 rounded-b-2xl">
          <p className="text-[10px] text-amber-700">
            Generating clears this term's timetable and builds a new one.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={generating}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-xs font-medium disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={() => onGenerate({ holidays, periods_per_day: periods })}
              disabled={generating || workingDays.length === 0}
              className="px-5 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-xs font-semibold disabled:opacity-50">
              {generating ? "Generating…" : "Generate timetable"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
