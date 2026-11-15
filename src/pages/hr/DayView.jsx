import { useCallback, useEffect, useRef, useState } from "react";
import { get } from "../../api/axios";
import { PageHeader, Spinner } from "../../components/hr/HrUI";
import DayDetail from "../../components/hr/DayDetail";

/**
 * Day View — one staff member's whole day, like the day
 * screen of Google/Mac Calendar: the timeline of everything
 * that holds their time, the tasks planned on the day, their
 * check-ins, and the free slots left in between.
 *
 * Pick anyone (the list is the same one the task forms use);
 * it opens on yourself. The server decides who may see whose
 * day — the person, their supervisors, whoever assigned them
 * a task — so a name that is not yours may come back "not
 * allowed", which the day view says plainly.
 */

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => iso(new Date());
const shiftDay = (d, by) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + by); return iso(x); };
const nice = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function DayView() {
  const [staff, setStaff] = useState(null);      // the person whose day it is
  const [date, setDate] = useState(today());
  const [term, setTerm] = useState("");
  const [list, setList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [myStaffId, setMyStaffId] = useState(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // Myself first, and the staff list to pick from.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [mine, all] = await Promise.all([
          get("/hr/staff-tasks/my-tasks", { cache: false, params: { month: today().slice(0, 7) } }),
          get("/hr/staff-tasks/staff-list"),
        ]);
        if (!alive) return;
        const id = mine.data?.my_staff_id ?? null;
        setMyStaffId(id);
        if (id) {
          const me = (all.data?.data || []).find((s) => Number(s.id) === Number(id));
          if (me) setStaff(me);
        }
        setList(Array.isArray(all.data?.data) ? all.data.data : []);
      } catch { /* the picker stays empty; the day still loads once a name is picked */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const close = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useCallback(() => {
    const q = term.trim().toLowerCase();
    return q ? list.filter((s) => s.full_name?.toLowerCase().includes(q) || s.employee_id?.toLowerCase().includes(q)) : list;
  }, [term, list]);

  const pick = (s) => { setStaff(s); setTerm(""); setShowDropdown(false); };

  return (
    <div className="px-4 py-5 space-y-4">
      <PageHeader title="Day View" subtitle="A staff member's whole day — timeline, tasks, check-ins and free time"
        icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />

      {/* Who + when */}
      <div className="flex flex-wrap items-end gap-3 bg-white rounded-xl border border-gray-200 p-3">
        <div className="relative min-w-[240px] flex-1 max-w-md" ref={dropdownRef}>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Staff member</label>
          <input type="text" value={term || (staff ? `${staff.full_name}${staff.employee_id ? ` (${staff.employee_id})` : ""}` : "")}
            placeholder="Search staff by name or ID…"
            onChange={(e) => { setTerm(e.target.value); setShowDropdown(true); }}
            onFocus={() => { setShowDropdown(true); if (staff) setTerm(""); }}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none" />
          {showDropdown && (
            <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto">
              {filtered().length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">No staff found</div>
              ) : filtered().map((s) => (
                <div key={s.id} onClick={() => pick(s)}
                  className={`px-4 py-2.5 cursor-pointer hover:bg-teal-50 border-b border-gray-50 last:border-0 ${staff?.id === s.id ? "bg-teal-50" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold shrink-0" data-no-i18n>{s.full_name?.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate" data-no-i18n>{s.full_name}</div>
                      <div className="text-[10px] text-gray-500" data-no-i18n>{s.employee_id}{s.department ? ` · ${s.department}` : ""}{s.role_title ? ` · ${s.role_title}` : ""}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Day</label>
          <div className="flex items-center gap-1">
            <button onClick={() => setDate((d) => shiftDay(d, -1))} className="px-2.5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50" aria-label="Previous day">‹</button>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            <button onClick={() => setDate((d) => shiftDay(d, 1))} className="px-2.5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50" aria-label="Next day">›</button>
            <button onClick={() => setDate(today())} className="px-3 py-2.5 rounded-xl border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-semibold">Today</button>
          </div>
        </div>

        {myStaffId && (!staff || Number(staff.id) !== Number(myStaffId)) && (
          <button onClick={() => { const me = list.find((s) => Number(s.id) === Number(myStaffId)); if (me) pick(me); }}
            className="px-3 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700">
            Back to my day
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : staff ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {/* The key remounts the view for each person/day. */}
          <DayDetail key={`${staff.id}-${date}`} staffId={staff.id} staffName={staff.full_name} date={date} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-sm text-gray-500">Pick a staff member to see their day.</p>
          <p className="text-xs text-gray-400 mt-1">It opens on you — {nice(date)}.</p>
        </div>
      )}
    </div>
  );
}
