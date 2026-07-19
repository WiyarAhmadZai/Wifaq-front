import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FiSearch, FiList, FiCalendar, FiChevronLeft, FiChevronRight, FiGift, FiX } from "react-icons/fi";
import { birthdaysApi } from "../../api/birthdays";
import { API_BASE_URL } from "../../api/axios";

const TEAL = "#0D5C63";
const ORIGIN = (API_BASE_URL || "http://localhost:8000").replace(/\/api\/?$/, "");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SCOPES = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "Next 7 days" },
  { key: "month", label: "This month" },
  { key: "upcoming", label: "Next 30 days" },
];

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

const COLORS = ["bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500"];
const colorFor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
};

const photoUrl = (p) => (p ? (p.startsWith("http") ? p : `${ORIGIN}/storage/${p}`) : null);

// "in 3 days" / "Today 🎂" / "Tomorrow"
const untilLabel = (d) => {
  if (d === 0) return "Today 🎂";
  if (d === 1) return "Tomorrow";
  return `in ${d} days`;
};

function Avatar({ person, size = 40 }) {
  const url = photoUrl(person.photo);
  if (url) {
    return <img src={url} alt={person.name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${colorFor(person.name)}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(person.name)}
    </div>
  );
}

/**
 * Shared DOB page used by the Student / Teacher / Staff birthday screens.
 * Two views: a filterable list and a month calendar showing which day each
 * person's birthday falls on.
 */
export default function BirthdayPage({ type, title, subtitle }) {
  const [view, setView] = useState("list");
  const [scope, setScope] = useState("all");
  const [month, setMonth] = useState(""); // "" = any month (list view)
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [meta, setMeta] = useState(null);

  // Calendar state
  const today = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [cal, setCal] = useState(null);
  // Day drill-down: { day, people } — set when a filled calendar cell is clicked.
  const [dayDetail, setDayDetail] = useState(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await birthdaysApi.list(type, {
        scope,
        month: month || undefined,
        search: search || undefined,
        days: 30,
        page,
        per_page: perPage,
      });
      setRows(res.data?.data || []);
      setMeta(res.data?.meta || null);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to load birthdays", "error");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [type, scope, month, search, page, perPage]);

  // Any filter change puts us back on page 1 (otherwise you can land on an
  // out-of-range page for the new, smaller result set).
  useEffect(() => { setPage(1); }, [type, scope, month, search, perPage]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await birthdaysApi.calendar(type, calYear, calMonth);
      setCal(res.data?.data || null);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to load calendar", "error");
      setCal(null);
    } finally {
      setLoading(false);
    }
  }, [type, calYear, calMonth]);

  useEffect(() => {
    if (view === "list") {
      const t = setTimeout(loadList, search ? 300 : 0); // debounce typing
      return () => clearTimeout(t);
    }
    loadCalendar();
  }, [view, loadList, loadCalendar, search]);

  const shiftMonth = (delta) => {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setCalMonth(m);
    setCalYear(y);
  };

  const todayCount = rows.filter((r) => r.is_today).length;

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <FiGift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{title}</h1>
            <p className="text-xs text-teal-100 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-5xl mx-auto">
        {/* View toggle + filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white">
            <button onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${view === "list" ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
              style={view === "list" ? { background: TEAL } : {}}>
              <FiList className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${view === "calendar" ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
              style={view === "calendar" ? { background: TEAL } : {}}>
              <FiCalendar className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>

          {view === "list" && (
            <>
              {SCOPES.map((s) => (
                <button key={s.key} onClick={() => setScope(s.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${scope === s.key ? "text-white" : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"}`}
                  style={scope === s.key ? { background: TEAL } : {}}>
                  {s.label}
                </button>
              ))}
              <select value={month} onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="">Any month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <div className="relative flex-1 min-w-[180px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or ID"
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} />
          </div>
        ) : view === "list" ? (
          <>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>
                {meta?.total
                  ? <>Showing <b className="text-gray-800">{meta.from}–{meta.to}</b> of <b className="text-gray-800">{meta.total}</b></>
                  : <><b className="text-gray-800">0</b> people</>}
              </span>
              {todayCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                  🎂 {todayCount} birthday{todayCount === 1 ? "" : "s"} today
                </span>
              )}
              <label className="ml-auto flex items-center gap-1.5">
                <span>Per page</span>
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
              {rows.length === 0 && (
                <p className="text-center py-12 text-xs text-gray-400">No birthdays match these filters.</p>
              )}
              {rows.map((p) => (
                <div key={`${p.type}-${p.id}`}
                  className={`flex items-center gap-3 px-4 py-3 ${p.is_today ? "bg-amber-50/60" : ""}`}>
                  <Avatar person={p} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {p.name} {p.is_today && <span className="ml-1">🎂</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {p.subtitle || "—"}{p.code ? ` · ${p.code}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-700">
                      {MONTHS[p.month - 1]?.slice(0, 3)} {p.day}
                    </p>
                    <p className="text-[10px] text-gray-400">{p.dob} · turns {p.turning_age}</p>
                  </div>
                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                    p.is_today ? "bg-amber-100 text-amber-700"
                      : p.days_until <= 3 ? "bg-rose-100 text-rose-700"
                      : "bg-gray-100 text-gray-500"}`}>
                    {untilLabel(p.days_until)}
                  </span>
                </div>
              ))}
            </div>

            {meta && meta.last_page > 1 && (
              <Pagination meta={meta} onChange={setPage} />
            )}
          </>
        ) : (
          <CalendarView
            cal={cal}
            calYear={calYear}
            calMonth={calMonth}
            onPrev={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}
            today={today}
            onDayClick={(day, people) => setDayDetail({ day, people })}
          />
        )}
      </div>

      {dayDetail && (
        <DayDetailModal
          day={dayDetail.day}
          month={calMonth}
          year={calYear}
          people={dayDetail.people}
          onClose={() => setDayDetail(null)}
        />
      )}
    </div>
  );
}

/** Page navigation for the birthday list. Shows a windowed set of page numbers. */
function Pagination({ meta, onChange }) {
  const { current_page: current, last_page: last } = meta;

  // Window of at most 5 page numbers centred on the current page.
  const start = Math.max(1, Math.min(current - 2, last - 4));
  const end = Math.min(last, start + 4);
  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);

  const btn = "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
      <button onClick={() => onChange(1)} disabled={current === 1}
        className={`${btn} bg-white border-gray-200 text-gray-600 hover:bg-gray-50`}>« First</button>
      <button onClick={() => onChange(current - 1)} disabled={current === 1}
        className={`${btn} bg-white border-gray-200 text-gray-600 hover:bg-gray-50`}>
        <FiChevronLeft className="w-3.5 h-3.5" />
      </button>

      {start > 1 && <span className="px-1 text-xs text-gray-400">…</span>}
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`${btn} ${p === current ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          style={p === current ? { background: TEAL } : {}}>
          {p}
        </button>
      ))}
      {end < last && <span className="px-1 text-xs text-gray-400">…</span>}

      <button onClick={() => onChange(current + 1)} disabled={current === last}
        className={`${btn} bg-white border-gray-200 text-gray-600 hover:bg-gray-50`}>
        <FiChevronRight className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onChange(last)} disabled={current === last}
        className={`${btn} bg-white border-gray-200 text-gray-600 hover:bg-gray-50`}>Last »</button>

      <span className="ml-2 text-[11px] text-gray-400">Page {current} of {last}</span>
    </div>
  );
}

/** Full list of everyone with a birthday on one calendar day. */
function DayDetailModal({ day, month, year, people, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              🎂 {MONTHS[month - 1]} {day}, {year}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {people.length} birthday{people.length === 1 ? "" : "s"} on this day
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {people.map((p) => (
            <div key={`${p.type}-${p.id}`} className="flex items-center gap-3 px-5 py-3">
              <Avatar person={p} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {p.subtitle || "—"}{p.code ? ` · ${p.code}` : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold text-gray-700">turns {p.turning_age}</p>
                <p className="text-[10px] text-gray-400">{p.dob}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarView({ cal, calYear, calMonth, onPrev, onNext, today, onDayClick }) {
  if (!cal) return <p className="text-center py-12 text-xs text-gray-400">No calendar data.</p>;

  const isCurrentMonth = today.getFullYear() === calYear && today.getMonth() + 1 === calMonth;
  const todayDay = today.getDate();

  // Leading blanks so day 1 lands on the right weekday.
  const cells = [];
  for (let i = 0; i < cal.first_weekday; i++) cells.push(null);
  for (let d = 1; d <= cal.days_in_month; d++) cells.push(d);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <FiChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800">{MONTHS[calMonth - 1]} {calYear}</p>
          <p className="text-[10px] text-gray-400">{cal.total} birthday{cal.total === 1 ? "" : "s"} this month</p>
        </div>
        <button onClick={onNext} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-1 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (d === null) return <div key={`b-${i}`} className="min-h-[84px] border-b border-r border-gray-50 bg-gray-50/40" />;
          const people = cal.days?.[d] || [];
          const isToday = isCurrentMonth && d === todayDay;
          const hasPeople = people.length > 0;
          return (
            <div key={d}
              onClick={hasPeople ? () => onDayClick(d, people) : undefined}
              role={hasPeople ? "button" : undefined}
              tabIndex={hasPeople ? 0 : undefined}
              onKeyDown={hasPeople ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDayClick(d, people); } } : undefined}
              title={hasPeople ? `View all ${people.length} birthday${people.length === 1 ? "" : "s"} on this day` : undefined}
              className={`min-h-[84px] p-1.5 border-b border-r border-gray-50 transition-colors ${
                isToday ? "bg-teal-50/70" : hasPeople ? "bg-amber-50/40" : ""
              } ${hasPeople ? "cursor-pointer hover:bg-amber-100/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-400" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold ${isToday ? "text-teal-700" : "text-gray-500"}`}>{d}</span>
                {hasPeople && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800">
                    🎂 {people.length}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {people.slice(0, 3).map((p) => (
                  <div key={`${p.type}-${p.id}`} title={`${p.name} — turns ${p.turning_age}`}
                    className="text-[9px] leading-tight text-gray-700 bg-white rounded px-1 py-0.5 truncate border border-gray-100">
                    {p.name}
                  </div>
                ))}
                {people.length > 3 && (
                  <div className="text-[9px] font-semibold px-1" style={{ color: TEAL }}>
                    +{people.length - 3} more — view all
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
