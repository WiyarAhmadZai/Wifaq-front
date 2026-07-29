import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { get, put, post, del } from "../../api/axios";
import Swal from "sweetalert2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";
import { DateField } from "../../components/hr/HrUI";

/**
 * The school's working calendar, edited from the attendance screen.
 *
 * Two controls, one consequence. Both write to the same `holidays` table that
 * WorkCalendarService reads, and that service is what payroll's
 * LeaveDeductionService consults before it charges anybody a day — so a day
 * closed here is a day nobody is marked absent for AND nobody is docked for.
 * There is no second switch to remember.
 *
 *   Weekend       — which weekdays repeat as rest days, every week.
 *   Close a day   — one date off for every staff member, with the reason kept
 *                   on the record. Does NOT consume anyone's annual leave: a
 *                   school closure is the school's decision, not their leave.
 */

// Sunday-first, matching Carbon's dayOfWeek on the server (0 = Sunday).
const WEEKDAYS = [
  { n: 0, short: "Sun", long: "Sunday" },
  { n: 1, short: "Mon", long: "Monday" },
  { n: 2, short: "Tue", long: "Tuesday" },
  { n: 3, short: "Wed", long: "Wednesday" },
  { n: 4, short: "Thu", long: "Thursday" },
  { n: 5, short: "Fri", long: "Friday" },
  { n: 6, short: "Sat", long: "Saturday" },
];

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none";

export default function WorkCalendarModal({ onClose }) {
  const { canCreate, canUpdate, canDelete } = useResourcePermissions("holidays");
  const canEditWeekend = canUpdate || canCreate;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [weekend, setWeekend] = useState([]);          // committed server state
  const [draftWeekend, setDraftWeekend] = useState([]); // what the toggles show
  const [cal, setCal] = useState(null);                // { closures, working_days, … }
  const [holidays, setHolidays] = useState([]);        // one-off rows, for delete
  const [loading, setLoading] = useState(true);
  const [savingWeekend, setSavingWeekend] = useState(false);

  const [closeDate, setCloseDate] = useState(new Date().toISOString().slice(0, 10));
  const [closeReason, setCloseReason] = useState("");
  const [closing, setClosing] = useState(false);

  const loadCalendar = async (y = year, m = month) => {
    try {
      const [c, h] = await Promise.all([
        get(`/holidays/calendar`, { params: { year: y, month: m } }),
        get(`/holidays`, { params: { year: y } }),
      ]);
      setCal(c.data?.data || null);
      setHolidays((h.data?.data || []).filter((x) => !x.recurring));
    } catch {
      setCal(null);
      setHolidays([]);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const w = await get("/holidays/weekend-days");
        if (!alive) return;
        const days = w.data?.data?.days || [];
        setWeekend(days);
        setDraftWeekend(days);
      } catch {
        if (alive) { setWeekend([]); setDraftWeekend([]); }
      }
      await loadCalendar();
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCalendar(year, month); }, [year, month]);

  const toggleDay = (n) =>
    setDraftWeekend((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort()));

  const weekendDirty =
    JSON.stringify([...draftWeekend].sort()) !== JSON.stringify([...weekend].sort());

  const saveWeekend = async () => {
    setSavingWeekend(true);
    try {
      const r = await put("/holidays/weekend-days", { days: draftWeekend });
      setWeekend(draftWeekend);
      await loadCalendar();
      Swal.fire({
        icon: "success", title: "Weekend updated",
        text: r.data?.message || "", timer: 2200, showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not save the weekend.", "error");
    } finally {
      setSavingWeekend(false);
    }
  };

  const closeDay = async (e) => {
    e.preventDefault();
    if (!closeReason.trim()) {
      Swal.fire("Reason required", "Say why the school is closed — it goes on the record and on the payslip explanation.", "warning");
      return;
    }
    setClosing(true);
    try {
      const r = await post("/holidays/close-day", { date: closeDate, reason: closeReason.trim() });
      setCloseReason("");
      const d = new Date(closeDate);
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
      await loadCalendar(d.getFullYear(), d.getMonth() + 1);
      Swal.fire({ icon: "success", title: "Day closed", text: r.data?.message || "", timer: 2600, showConfirmButton: false });
    } catch (err) {
      Swal.fire(
        err.response?.status === 409 ? "Already closed" : "Failed",
        err.response?.data?.message || "Could not close that day.",
        err.response?.status === 409 ? "info" : "error"
      );
    } finally {
      setClosing(false);
    }
  };

  const reopen = async (holiday) => {
    const c = await Swal.fire({
      icon: "warning",
      title: "Re-open this day?",
      html: `<p style="font-size:13px"><b>${holiday.name}</b> on ${String(holiday.date).slice(0, 10)}.<br/>Staff become expected at work again, and absences on that date will start costing salary.</p>`,
      showCancelButton: true, confirmButtonText: "Re-open", confirmButtonColor: "#b91c1c",
    });
    if (!c.isConfirmed) return;
    try {
      await del(`/holidays/${holiday.id}`);
      await loadCalendar();
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not re-open that day.", "error");
    }
  };

  const closures = cal?.closures || {};
  const closureDates = Object.keys(closures).sort();
  const daysInMonth = cal?.days_in_month || new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-4 bg-[#0D5C63] flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Work Calendar</h2>
            <p className="text-[11px] text-teal-100 mt-0.5">
              Weekends and closed days. Nobody is marked absent on these dates, and no salary is deducted for them.
            </p>
          </div>
          <button onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/15 flex-shrink-0">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-6 overflow-y-auto">

            {/* ── Weekly rest days ───────────────────────────────────── */}
            <section>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">Weekend</h3>
              <p className="text-[11px] text-gray-500 mb-2.5">
                Tick the days the school is closed every week. Applies from the next attendance sheet and the next payroll run.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => {
                  const on = draftWeekend.includes(d.n);
                  return (
                    <button key={d.n} type="button" disabled={!canEditWeekend}
                      onClick={() => toggleDay(d.n)} title={d.long}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        on ? "bg-teal-600 border-teal-600 text-white"
                           : "bg-white border-gray-200 text-gray-600 hover:border-teal-300"
                      } ${canEditWeekend ? "" : "opacity-60 cursor-not-allowed"}`}>
                      {d.short}
                    </button>
                  );
                })}
              </div>
              {canEditWeekend ? (
                <div className="flex items-center gap-2 mt-2.5">
                  <button type="button" onClick={saveWeekend} disabled={!weekendDirty || savingWeekend}
                    className="px-4 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    {savingWeekend ? "Saving…" : "Save weekend"}
                  </button>
                  {weekendDirty && (
                    <button type="button" onClick={() => setDraftWeekend(weekend)}
                      className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50">
                      Reset
                    </button>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {draftWeekend.length === 0
                      ? "No weekend — every day is a working day."
                      : draftWeekend.map((n) => WEEKDAYS[n].long).join(", ")}
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 mt-2">You don't have permission to change the weekend.</p>
              )}
            </section>

            {/* ── Close a day for everyone ───────────────────────────── */}
            <section className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">Close a day for all staff</h3>
              <p className="text-[11px] text-gray-500 mb-2.5">
                One date off for everybody — Eid, mourning, weather, anything. The reason is kept on the record.
                This does <strong>not</strong> use up anyone's annual leave and never reduces a salary.
              </p>
              {canCreate ? (
                <form onSubmit={closeDay} className="flex flex-wrap items-end gap-2">
                  <div className="w-44">
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Date</label>
                    <DateField className={inp} value={closeDate} onChange={(e) => setCloseDate(e.target.value)} required />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Reason *</label>
                    <input type="text" className={inp} maxLength={255} value={closeReason}
                      onChange={(e) => setCloseReason(e.target.value)}
                      placeholder="e.g. Eid al-Fitr · Public mourning day" required />
                  </div>
                  <button type="submit" disabled={closing}
                    className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50">
                    {closing ? "Closing…" : "Close this day"}
                  </button>
                </form>
              ) : (
                <p className="text-[10px] text-gray-400">You don't have permission to close a day.</p>
              )}
            </section>

            {/* ── Month view ─────────────────────────────────────────── */}
            <section className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Month</h3>
                <div className="flex items-center gap-1.5">
                  <select value={month} onChange={(e) => setMonth(+e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-teal-500">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <input type="number" value={year} onChange={(e) => setYear(+e.target.value)}
                    className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-teal-500" />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d.n} className="text-center text-[9px] font-bold uppercase tracking-wider text-gray-400 py-1">
                    {d.short}
                  </div>
                ))}
                {Array.from({ length: firstWeekday }).map((_, i) => <div key={`pad-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const closed = closures[iso];
                  const isWeekend = closed?.type === "weekend";
                  return (
                    <div key={iso} title={closed ? closed.name : "Working day"}
                      className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold border ${
                        !closed ? "bg-white border-gray-100 text-gray-700"
                        : isWeekend ? "bg-gray-100 border-gray-200 text-gray-500"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}>
                      {day}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" /> Working ({cal?.working_days ?? "—"})</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" /> Weekend</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200 inline-block" /> Closed day</span>
              </div>

              {closureDates.filter((d) => closures[d].type !== "weekend").length > 0 && (
                <div className="mt-3 border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {closureDates
                    .filter((d) => closures[d].type !== "weekend")
                    .map((d) => {
                      const row = holidays.find((h) => String(h.date).slice(0, 10) === d);
                      return (
                        <div key={d} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{closures[d].name}</p>
                            <p className="text-[10px] text-gray-400">{d} · nobody marked absent, no salary deducted</p>
                          </div>
                          {canDelete && row && (
                            <button onClick={() => reopen(row)}
                              className="px-2 py-1 text-[10px] font-semibold text-red-600 border border-red-200 rounded hover:bg-red-50 flex-shrink-0">
                              Re-open
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </section>

            {/* ── How this reaches payroll ───────────────────────────── */}
            <section className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">How this affects salary</h3>
              <ul className="text-[11px] text-gray-600 space-y-1.5 list-disc pl-4">
                <li><strong>Weekend and closed days cost nothing.</strong> Payroll drops them before it counts a single chargeable day, even if an “absent” mark was left on one.</li>
                <li><strong>Approved leave is paid</strong> while the staff member's annual allowance lasts — the <em>Annual leave days</em> figure on their contract. Days taken beyond it are unpaid.</li>
                <li><strong>Rejected leave, leave never approved, and plain absence are unpaid</strong>, charged at salary ÷ days in month.</li>
                <li>Every deduction appears as its own line on the payslip and in the payroll journal entry, so the reason is always visible.</li>
              </ul>
            </section>
          </div>
        )}

        <div className="flex justify-end px-6 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
