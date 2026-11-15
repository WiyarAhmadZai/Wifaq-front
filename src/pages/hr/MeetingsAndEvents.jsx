import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { get } from "../../api/axios";
import { useAuth } from "../../admin/context/AuthContext";

const TEAL = "#0D5C63";
const TEAL_LT = "#14919B";
const GOLD = "#C9A227";
const BORDER = "#D0E0E0";
const MUTED = "#5A7A7E";

const KINDS = {
  meeting: { label: "Meeting", icon: "🗓", accent: TEAL,      wash: "#E8F6F6" },
  event:   { label: "Event",   icon: "🎉", accent: "#8A6F10", wash: "#FFF8E7" },
};

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
  </div>
);

const dayLabel = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};

/**
 * Meetings & Events — one place for both.
 *
 * They were two separate screens with two separate menu entries, which meant
 * "what is happening on Thursday" needed two visits and a mental merge. This
 * reads both APIs and interleaves them on one timeline; each row still opens
 * its own module's detail page, so nothing about either is re-implemented here.
 */
export default function MeetingsAndEvents() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [meetings, setMeetings] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const kind = searchParams.get("kind") || "all";
  const setKind = (k) => {
    const next = new URLSearchParams(searchParams);
    if (k === "all") next.delete("kind"); else next.set("kind", k);
    setSearchParams(next, { replace: true });
  };

  const canSeeMeetings = hasPermission("meetings.view");
  const canSeeEvents = hasPermission("events.view");

  const load = useCallback(async () => {
    // One failing module must not blank the other — a user may hold only one
    // of the two permissions.
    const [m, e] = await Promise.allSettled([
      canSeeMeetings ? get("/meetings") : Promise.resolve(null),
      canSeeEvents ? get("/events") : Promise.resolve(null),
    ]);
    const rows = (r) => {
      const d = r.status === "fulfilled" ? r.value?.data : null;
      return Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
    };
    setMeetings(rows(m));
    setEvents(rows(e));
    setLoading(false);
  }, [canSeeMeetings, canSeeEvents]);

  useEffect(() => { load(); }, [load]);

  /* One timeline. Meetings carry a start_time, events a start_date — both
     normalise to a sortable day so they can sit in the same list. */
  const items = useMemo(() => {
    const asMeeting = (m) => ({
      key: `m${m.id}`, id: m.id, kind: "meeting",
      title: m.title, when: m.start_time, end: m.end_time,
      location: m.location, status: m.status,
      who: m.organizer?.name || m.organizer_name,
      href: `/hr/meetings/show/${m.id}`,
    });
    const asEvent = (e) => ({
      key: `e${e.id}`, id: e.id, kind: "event",
      title: e.title, when: e.start_date, end: e.end_date,
      location: e.location, status: e.status,
      who: e.main_responsible?.name || e.mainResponsible?.name,
      href: `/hr/events/show/${e.id}`,
    });

    let all = [
      ...(kind === "event" ? [] : meetings.map(asMeeting)),
      ...(kind === "meeting" ? [] : events.map(asEvent)),
    ];

    const q = query.trim().toLowerCase();
    if (q) {
      all = all.filter((r) =>
        [r.title, r.location, r.who].some((v) => (v || "").toLowerCase().includes(q)));
    }

    return all.sort((a, b) => String(b.when || "").localeCompare(String(a.when || "")));
  }, [meetings, events, kind, query]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = items.filter((i) => String(i.when || "").slice(0, 10) >= today);
  const past = items.filter((i) => String(i.when || "").slice(0, 10) < today);

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Planner</p>
            <h1 className="text-base font-black text-white mt-0.5">Meetings &amp; Events</h1>
          </div>
          {/* One button, one form. Which kind it is becomes a toggle inside,
              so nobody has to classify the thing before describing it. */}
          {(hasPermission("meetings.create") || hasPermission("events.create")) && (
            <button onClick={() => navigate("/hr/meetings-events/create")}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
              + New meeting or event
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl overflow-hidden border" style={{ borderColor: BORDER }}>
            {[["all", `All (${meetings.length + events.length})`],
              ["meeting", `Meetings (${meetings.length})`],
              ["event", `Events (${events.length})`]].map(([k, label]) => (
              <button key={k} onClick={() => setKind(k)}
                className="px-3 py-1.5 text-xs font-semibold transition-colors"
                style={kind === k
                  ? { background: TEAL, color: "#fff" }
                  : { background: "#fff", color: "#0A3A3E" }}>
                {label}
              </button>
            ))}
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, place or person…"
            className="flex-1 min-w-[12rem] px-3 py-2 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none"
            style={{ borderColor: BORDER }} />
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border shadow-sm p-10 text-center" style={{ borderColor: BORDER }}>
            <div className="text-3xl mb-2">🗓</div>
            <p className="text-sm font-bold" style={{ color: "#0A3A3E" }}>Nothing scheduled</p>
            <p className="text-xs mt-1" style={{ color: MUTED }}>
              {query ? `Nothing matches “${query}”.` : "Create a meeting or an event to get started."}
            </p>
          </div>
        ) : (
          <>
            <Group title="Upcoming" rows={upcoming} navigate={navigate} />
            <Group title="Past" rows={past} navigate={navigate} muted />
          </>
        )}
      </div>
    </div>
  );
}

function Group({ title, rows, navigate, muted }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h2 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>
        {title} · {rows.length}
      </h2>
      <div className="space-y-2">
        {rows.map((r) => {
          const k = KINDS[r.kind];
          return (
            <button key={r.key} onClick={() => navigate(r.href)}
              className="w-full text-left bg-white rounded-2xl border shadow-sm px-4 py-3 flex items-center gap-3 hover:shadow transition-shadow"
              style={{ borderColor: BORDER, opacity: muted ? 0.75 : 1 }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: k.wash }}>{k.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <bdi dir="auto" className="text-sm font-bold truncate" style={{ color: "#0A3A3E" }}>{r.title}</bdi>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black"
                    style={{ background: k.wash, color: k.accent }}>{k.label}</span>
                </span>
                <span className="block text-[11px] mt-0.5" style={{ color: MUTED }}>
                  {dayLabel(r.when)}
                  {r.location ? ` · ${r.location}` : ""}
                  {r.who ? ` · ${r.who}` : ""}
                </span>
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: TEAL_LT }}>→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
