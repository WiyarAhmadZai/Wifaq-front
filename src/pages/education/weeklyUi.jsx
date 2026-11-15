import { useState, useEffect, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import { get as apiGet, post as apiPost } from "../../api/axios";

/**
 * Shared presentation bits for the Weekly Recognition screens — same pattern as
 * gradebookUi.jsx / lessonPlanUi.jsx.
 *
 * The four development areas are the SAME ones the rest of the 4D engine uses;
 * this file only carries how they look, never a second source of truth for what
 * they are.
 */

/* Brand tokens — the SAME ones the rest of Education & Formation uses
   (see lessonPlanUi.jsx / EduDashboard.jsx). Kept in one place so the weekly
   screens can never drift into generic greys. */
export const TEAL   = "#0D5C63";   // primary brand
export const TEAL_LT= "#14919B";   // lighter teal accent
export const GOLD   = "#C9A227";   // recognition / award
export const DARK   = "#052528";   // table headers, deep chrome
export const PAPER  = "#F4F8F8";   // page background
export const TEXT   = "#0A3A3E";   // body copy
export const MUTED  = "#5A7A7E";   // secondary copy
export const BORDER = "#D0E0E0";   // card + divider lines
export const GOLD_LT   = "#FFF8E7";
export const GOLD_SOFT = "#E8D48B";
export const GOLD_DEEP = "#8A6F10";

/* The four development areas, in the system's own colours: intellectual teal,
   moral/character gold, social rose, practical green. The DB enum says "moral"
   where the lesson-plan module says "character" — same area, one palette. */
export const DIMS = {
  intellectual: { label: "Intellectual", fg: "#14919B", bg: "#E4F2F3" },
  moral:        { label: "Moral & Spiritual", fg: "#9A7B12", bg: "#FBF3DB" },
  practical:    { label: "Practical", fg: "#2E7D5B", bg: "#E6F3EC" },
  social:       { label: "Social", fg: "#B0546E", bg: "#FAEAEF" },
};

/* Reusable surface styles so every card on these screens matches. */
export const cardStyle   = { background: "#fff", border: `1px solid ${BORDER}` };
export const goldStyle   = { background: GOLD_LT, border: `1px solid ${GOLD_SOFT}`, color: GOLD_DEEP };

/** A development-area chip. Pass `onClick` to make it a selectable filter pill. */
export function DimPill({ d, onClick, selected }) {
  const s = DIMS[d] || DIMS.social;
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${onClick ? "cursor-pointer" : ""}`}
      style={{
        background: s.bg,
        color: s.fg,
        border: selected ? `1.5px solid ${s.fg}` : "1.5px solid transparent",
        opacity: onClick && selected === false ? 0.55 : 1,
      }}
    >
      {s.label}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
    </div>
  );
}

/**
 * Class first, then the student — the two controls of one choice.
 *
 * Picking out of every student at once meant scrolling past classes the teacher
 * was not thinking about; naming the class first cuts the list to the handful
 * that matters, and the search box then only has to separate names inside it.
 *
 * `students` is already scoped by the API — a teacher only ever receives the
 * students of the classes they teach — so the class list here is simply the
 * classes present in that payload, never a second permission check.
 */
export function StudentPicker({ students, value, onChange, scope, placeholder = "Type a name or code…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [classKey, setClassKey] = useState("");
  const boxRef = useRef(null);

  const selected = students.find((s) => String(s.id) === String(value)) || null;

  // Close when the click lands outside, so the list never sticks open.
  useEffect(() => {
    const onDocClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // The classes actually represented in the scoped list, with how many students
  // each holds. Students with no class yet still need to be reachable, so they
  // get their own bucket rather than disappearing behind the class step.
  const classes = useMemo(() => {
    const byKey = new Map();
    students.forEach((s) => {
      const key = classKeyOf(s);
      if (!byKey.has(key)) byKey.set(key, { key, label: cleanClass(s.class) || "No class", count: 0 });
      byKey.get(key).count += 1;
    });
    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [students]);

  // One class only? There is nothing to choose — treat it as chosen.
  const activeKey = classKey || (classes.length === 1 ? classes[0].key : "");

  const inClass = useMemo(
    () => (activeKey ? students.filter((s) => classKeyOf(s) === activeKey) : []),
    [students, activeKey],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? inClass.filter((s) => [s.name, s.code].some((v) => (v || "").toLowerCase().includes(q)))
      : inClass;
    return pool.slice(0, 200);
  }, [inClass, query]);

  const chooseClass = (key) => {
    setClassKey(key);
    setQuery("");
    if (value) onChange("");        // the standing pick belongs to the old class
    setOpen(Boolean(key));
  };

  const pick = (s) => { onChange(s.id); setQuery(""); setOpen(false); };

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-[10px] text-[#5A7A7E] mb-1">Class</label>
      <select
        value={activeKey}
        onChange={(e) => chooseClass(e.target.value)}
        className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none"
      >
        <option value="">
          {classes.length === 0 ? "No classes available" : "Select a class…"}
        </option>
        {classes.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label} ({c.count})
          </option>
        ))}
      </select>

      <label className="block text-[10px] text-[#5A7A7E] mb-1 mt-3">Student</label>

      {selected ? (
        <div className="w-full flex items-center gap-2 px-3 py-2 border rounded-xl text-sm bg-white"
          style={{ borderColor: TEAL }}>
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            style={{ background: TEAL }}>
            {cleanName(selected.name).split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </span>
          <span className="min-w-0">
            <bdi dir="auto" className="block font-semibold text-[#0A3A3E] truncate">{cleanName(selected.name)}</bdi>
            <span className="block text-[10px] text-[#8AA4A7]">
              {[cleanClass(selected.class) || "No class", selected.code].filter(Boolean).join(" · ")}
            </span>
          </span>
          <button type="button" onClick={() => { onChange(""); setOpen(true); }}
            className="ml-auto text-[#8AA4A7] hover:text-red-500 text-sm shrink-0" title="Choose someone else">
            ✕
          </button>
        </div>
      ) : (
        <input
          value={query}
          disabled={!activeKey}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={activeKey ? placeholder : "Select a class first"}
          className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none disabled:bg-[#F4F8F8] disabled:cursor-not-allowed"
        />
      )}

      {open && !selected && activeKey && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-[#D0E0E0] rounded-xl shadow-lg">
          {inClass.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-[#5A7A7E]">No students are enrolled in this class yet.</p>
          ) : matches.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-[#8AA4A7]">No student in this class matches “{query}”.</p>
          ) : (
            matches.map((s) => (
              <button key={s.id} type="button" onClick={() => pick(s)}
                className="w-full text-left px-3 py-2 hover:bg-[#E8F6F6] flex items-center justify-between gap-2">
                <bdi dir="auto" className="text-[13px] text-[#0A3A3E] truncate">{cleanName(s.name)}</bdi>
                {s.code && <span className="text-[10px] text-[#8AA4A7] shrink-0">{s.code}</span>}
              </button>
            ))
          )}
        </div>
      )}

      <p className="text-[10px] text-[#8AA4A7] mt-1">
        {students.length === 0
          ? (scope?.scoped
              ? "No students are assigned to your classes yet — ask an admin to link you to a class."
              : "No students found.")
          : activeKey
            ? `${inClass.length} student${inClass.length === 1 ? "" : "s"} in this class`
            : `${classes.length} class${classes.length === 1 ? "" : "es"} · ${students.length} students`}
        {scope?.scoped && ` · ${scope.label}`}
      </p>
    </div>
  );
}

/** One bucket per class, with the not-yet-enrolled kept reachable under "none". */
const classKeyOf = (s) => (s.class_id == null ? "none" : String(s.class_id));


/**
 * Some student records carry a bare "—" as a placeholder surname, and a student
 * may have no class yet. Rendering those raw produced names like "آسیه —" and
 * class lines reading "— · WEN-ST-26-0089". This drops parts that are only
 * punctuation so the real name is what shows.
 */
const PLACEHOLDER = /^[\s\-–—_.·]*$/;

export const cleanName = (name) =>
  String(name || "")
    .split(/\s+/)
    .filter((part) => part && !PLACEHOLDER.test(part))
    .join(" ") || "Unnamed student";

/** A class name, or null when there genuinely isn't one (never a bare dash). */
export const cleanClass = (cls) =>
  cls && !PLACEHOLDER.test(String(cls)) ? String(cls) : null;

/**
 * Names here are Dari/Pashto as often as English, so let the browser decide the
 * direction per string instead of forcing LTR and stranding the punctuation.
 */
export function StudentName({ name, className = "", style }) {
  return <bdi dir="auto" className={className} style={style}>{cleanName(name)}</bdi>;
}

/**
 * The signatory line on a certificate should read like a person or an office of
 * the school, never like a system account. Awards selected from an admin login
 * were printing "Super Admin" over the signature rule, which undercuts the
 * whole document. Real staff names pass through untouched.
 */
const SYSTEM_ACCOUNT = /^(super[\s_-]*admin(istrator)?|admin(istrator)?|system|root|test)$/i;

export const signatory = (name, fallback = "Academic Director") => {
  const n = String(name || "").trim();
  return !n || SYSTEM_ACCOUNT.test(n) ? fallback : n;
};

/**
 * Turn an axios failure into something the user can act on.
 *
 * The weekly screens used to report every failure as one fixed sentence
 * ("Failed to load the review"), which hid whether the API was down, the
 * session had expired, or the server had thrown — so nobody could tell what to
 * fix. This names the actual cause.
 */
export function describeError(err, fallback = "Something went wrong.") {
  // No response at all: the API is unreachable, CORS blocked it, or it timed out.
  if (!err?.response) {
    if (err?.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
    if (err?.message === "Network Error") {
      return "Cannot reach the server. Check that the Laravel API is running (php artisan serve).";
    }
    // A genuine JS error inside the try block lands here too — show it rather
    // than pretending the request failed.
    return err?.message ? `Unexpected error: ${err.message}` : fallback;
  }

  const { status, data } = err.response;
  const msg = data?.message || data?.error;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return msg || "You do not have permission to view this.";
  if (status === 404) return msg || "That record no longer exists.";
  if (status === 422 && data?.errors) {
    return Object.values(data.errors).flat().join(" ") || msg || fallback;
  }
  if (status >= 500) return msg ? `Server error: ${msg}` : "The server hit an error. Please try again.";
  return msg || `${fallback} (HTTP ${status})`;
}

/**
 * A conditional GET can resolve to an empty 304 body when the cached copy it
 * refers to is gone (see the retry note in api/axios.js). Callers must not treat
 * that empty string as real data.
 */
export const isEmptyPayload = (d) => d === "" || d === null || d === undefined;

/** A poster opened full screen — tap anywhere to close. */
export function PosterLightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <img src={src} alt="" className="max-h-full max-w-full rounded-xl shadow-2xl" />
    </div>
  );
}

/**
 * This week's topic and its poster, for everyone — staff on the dashboard,
 * parents and students on their own pages. Renders nothing without a topic.
 */
export function WeeklyTopicCard() {
  const [topic, setTopic] = useState(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGet("/weekly-recognition/current-topic").then((r) => alive && setTopic(r.data?.data || null)).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!topic) return null;
  return (
    <div className="rounded-2xl p-4 mb-4 flex items-center gap-4 shadow-sm" style={{ background: GOLD_LT, border: `1px solid ${GOLD_SOFT}` }}>
      {topic.poster_url && (
        <button onClick={() => setZoom(true)} className="shrink-0">
          <img src={topic.poster_url} alt="" className="h-24 w-24 object-cover rounded-xl border border-white shadow" />
        </button>
      )}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold" style={{ color: GOLD_DEEP }}>Topic of the week</div>
        <div className="text-base font-bold break-words" style={{ color: TEXT }} dir="auto">{topic.title}</div>
        {topic.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: MUTED }} dir="auto">{topic.description}</p>}
        {topic.poster_url && <button onClick={() => setZoom(true)} className="text-[11px] font-semibold mt-1" style={{ color: TEAL }}>View poster</button>}
        <TopicPlan topic={topic} />
      </div>
      {zoom && <PosterLightbox src={topic.poster_url} onClose={() => setZoom(false)} />}
    </div>
  );
}

export const GOAL_LABELS = ["Goal 1", "Goal 2", "Goal 3"];
export const DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

/** The week's goals and daily activities — only the filled ones, folded by default. */
export function TopicPlan({ topic, light = false }) {
  const [open, setOpen] = useState(false);
  const pick = (items, labels) => (items || []).map((x, i) => ({ ...x, label: labels[i] })).filter((x) => x.title || x.description);
  const goals = pick(topic?.goals, GOAL_LABELS);
  const days = pick(topic?.daily_activities, DAY_LABELS);
  if (!goals.length && !days.length) return null;
  const fg = light ? "#FFFFFF" : TEXT;
  const sub = light ? "rgba(255,255,255,0.85)" : MUTED;
  const block = (heading, list) => list.length > 0 && (
    <div className="mt-2">
      <div className="text-[11px] font-bold" style={{ color: fg }}>{heading}</div>
      {list.map((x) => (
        <div key={x.label} className="mt-1 text-xs" dir="auto">
          <span className="font-semibold" style={{ color: fg }}>{x.label}{x.title ? ": " : ""}</span>
          <span className="font-semibold" style={{ color: fg }}>{x.title}</span>
          {x.description && <div className="whitespace-pre-line" style={{ color: sub }}>{x.description}</div>}
        </div>
      ))}
    </div>
  );
  return (
    <div className="mt-2">
      <button onClick={() => setOpen((o) => !o)} className="text-[11px] font-semibold underline" style={{ color: light ? "#FFFFFF" : TEAL }}>
        {open ? "Hide goals & daily activities" : "Show goals & daily activities"}
      </button>
      {open && <>{block("Weekly goals", goals)}{block("Daily activities", days)}</>}
    </div>
  );
}

/* ════ Daily activities: on each teacher's profile, evaluated on Thursday ════ */

/** The five activity days of the school week; Thursday is for the evaluation. */
const WEEKDAY_LABELS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
const EVAL_STATUS = { done: "Done", partial: "Partly done", not_done: "Not done" };
const STATUS_TONE = { done: "#2E7D5B", partial: "#9A7B12", not_done: "#B0546E" };

const blankItems = () => Array.from({ length: 5 }, () => ({ status: "", rating: "", note: "" }));

/** The evaluation form — the five activities, each with how it went, a 1–5 rating and a note. */
function EvaluationForm({ data, onSaved, onCancel }) {
  const prev = data.evaluation;
  const [items, setItems] = useState(() => blankItems().map((b, i) => ({ ...b, ...(prev?.items?.[i] || {}), rating: prev?.items?.[i]?.rating || "" })));
  const [classIds, setClassIds] = useState(prev?.class_ids || []);
  const [note, setNote] = useState(prev?.note || "");
  const [busy, setBusy] = useState(false);
  const setItem = (i, patch) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const toggleClass = (id) => setClassIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const save = async () => {
    if (!items.some((x) => x.status)) { Swal.fire("Evaluation", "Mark how at least one activity went.", "info"); return; }
    setBusy(true);
    try {
      const r = await apiPost(`/weekly-recognition/topics/${data.topic.id}/evaluation`, {
        class_ids: classIds, note,
        items: items.map((x) => ({ status: x.status || null, rating: x.rating ? Number(x.rating) : null, note: x.note || null })),
      });
      Swal.fire({ icon: "success", title: "Evaluation saved.", timer: 1400, showConfirmButton: false });
      onSaved(r.data?.data);
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save.", "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-3 space-y-3">
      {data.classes?.length > 0 && (
        <div>
          <div className="text-[11px] font-bold mb-1" style={{ color: TEXT }}>Classes where you ran the activities</div>
          <div className="flex flex-wrap gap-1.5">
            {data.classes.map((c) => (
              <button key={c.id} type="button" onClick={() => toggleClass(c.id)}
                className="px-2.5 py-1 rounded-lg text-xs border"
                style={classIds.includes(c.id) ? { background: TEAL, color: "#fff", borderColor: TEAL } : { borderColor: BORDER, color: TEXT }}>
                <span data-no-i18n>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {data.activities.map((a, i) => (!a?.title && !a?.description) ? null : (
        <div key={i} className="rounded-xl p-3" style={{ border: `1px solid ${BORDER}`, background: "#fff" }}>
          <div className="text-xs font-bold" style={{ color: TEXT }} dir="auto">
            <span>{WEEKDAY_LABELS[i]}</span>{a.title ? ": " : ""}<span data-no-i18n>{a.title}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {Object.entries(EVAL_STATUS).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setItem(i, { status: items[i].status === k ? "" : k })}
                className="px-2.5 py-1 rounded-lg text-xs border"
                style={items[i].status === k ? { background: STATUS_TONE[k], color: "#fff", borderColor: STATUS_TONE[k] } : { borderColor: BORDER, color: TEXT }}>
                {label}
              </button>
            ))}
            <span className="ms-2 text-[11px]" style={{ color: MUTED }}>Rating</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setItem(i, { rating: items[i].rating === n ? "" : n })}
                className="text-lg leading-none" style={{ color: n <= (items[i].rating || 0) ? GOLD : "#D0D7D8" }} title={String(n)}>★</button>
            ))}
          </div>
          <input value={items[i].note || ""} onChange={(e) => setItem(i, { note: e.target.value })} dir="auto"
            placeholder="How did the students respond? (optional)"
            className="mt-2 w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-[#9CCBCB]" style={{ borderColor: BORDER }} />
        </div>
      ))}
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} dir="auto"
        placeholder="Overall note on this week's activities (optional)"
        className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#9CCBCB]" style={{ borderColor: BORDER }} />
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={busy}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
          {busy ? "Saving…" : "Submit evaluation"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs" style={{ color: MUTED }}>Cancel</button>}
      </div>
    </div>
  );
}

/**
 * On a teacher's own profile: today's activity of the weekly topic, to run in
 * their classes, and on Thursday the evaluation of the week's five activities.
 * Renders nothing for someone who is not a teacher or when the week has none.
 */
export function TeacherDailyActivity() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(false);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGet("/weekly-recognition/my-activity", { cache: false }).then((r) => alive && setData(r.data?.data || null)).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!data) return null;
  const { today, activities, evaluation } = data;
  const isThursday = today === "evaluation";
  const act = typeof today === "number" ? activities[today] : null;

  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ background: GOLD_LT, border: `1px solid ${GOLD_SOFT}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: GOLD_DEEP }}>Topic of the week</div>
          <div className="text-sm font-black" style={{ color: TEXT }} dir="auto" data-no-i18n>{data.topic.title}</div>
        </div>
        {evaluation
          ? <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✓ <span>Evaluation submitted</span></span>
          : isThursday && <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">Evaluation due today</span>}
      </div>

      {act && (act.title || act.description) && (
        <div className="mt-3 rounded-xl bg-white p-3" style={{ border: `1px solid ${GOLD_SOFT}` }}>
          <div className="text-[11px] font-bold" style={{ color: GOLD_DEEP }}>📌 <span>Today's activity</span> · <span>{WEEKDAY_LABELS[today]}</span></div>
          <div className="text-sm font-bold mt-1" style={{ color: TEXT }} dir="auto" data-no-i18n>{act.title}</div>
          {act.description && <div className="text-xs mt-1 whitespace-pre-line" style={{ color: MUTED }} dir="auto" data-no-i18n>{act.description}</div>}
          <div className="text-[11px] mt-2" style={{ color: MUTED }}>Run this activity in your classes today.</div>
        </div>
      )}
      {isThursday && !evaluation && !form && (
        <div className="mt-3 text-xs" style={{ color: TEXT }}>Today is Thursday — evaluate how this week's five activities went in your classes.</div>
      )}

      <div className="flex flex-wrap gap-3 mt-3">
        <button type="button" onClick={() => setAll((v) => !v)} className="text-[11px] font-semibold underline" style={{ color: TEAL }}>
          {all ? "Hide the week's activities" : "Show the week's activities"}
        </button>
        {!form && (isThursday || evaluation) && (
          <button type="button" onClick={() => setForm(true)} className="text-[11px] font-bold px-3 py-1 rounded-lg text-white" style={{ background: TEAL }}>
            {evaluation ? "Edit evaluation" : "Evaluate the activities"}
          </button>
        )}
        {!form && !isThursday && !evaluation && (
          <button type="button" onClick={() => setForm(true)} className="text-[11px] font-semibold underline" style={{ color: MUTED }}>Evaluate early</button>
        )}
      </div>
      {all && (
        <div className="mt-2 space-y-1">
          {activities.map((a, i) => (a?.title || a?.description) && (
            <div key={i} className="text-xs" dir="auto">
              <span className="font-semibold" style={{ color: today === i ? GOLD_DEEP : TEXT }}>{WEEKDAY_LABELS[i]}</span>
              {data.dates?.[i] && <span className="text-[10px]" style={{ color: MUTED }} data-no-i18n> ({data.dates[i]})</span>}
              <span style={{ color: TEXT }}>: </span>
              <span className="font-semibold" style={{ color: TEXT }} data-no-i18n>{a.title}</span>
              {a.description && <div className="whitespace-pre-line" style={{ color: MUTED }} data-no-i18n>{a.description}</div>}
            </div>
          ))}
        </div>
      )}
      {form && <EvaluationForm data={data} onCancel={() => setForm(false)} onSaved={(e) => { setData((d) => ({ ...d, evaluation: e })); setForm(false); }} />}
    </div>
  );
}

/** For the tarbiyati lead: every teacher's evaluation of one week, and who has not sent theirs. */
export function EvaluationsModal({ topic, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    apiGet(`/weekly-recognition/topics/${topic.id}/evaluations`, { cache: false })
      .then((r) => setData(r.data?.data || { submitted: [], missing: [], activities: [] }))
      .catch(() => setData({ submitted: [], missing: [], activities: [] }));
  }, [topic.id]);

  return (
    <div className="fixed inset-0 z-[900] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-white rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER }}>
          <div>
            <div className="text-sm font-black" style={{ color: TEXT }}>Activity evaluations</div>
            <div className="text-[11px]" style={{ color: MUTED }} dir="auto" data-no-i18n>{topic.title}</div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500">✕</button>
        </div>
        {!data ? <Spinner /> : (
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><span>Submitted</span>: <span data-no-i18n>{data.submitted.length}</span></span>
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200"><span>Not submitted</span>: <span data-no-i18n>{data.missing.length}</span></span>
            </div>
            {data.submitted.length === 0 && <p className="text-xs" style={{ color: MUTED }}>No teacher has submitted an evaluation for this week yet.</p>}
            {data.submitted.map((e) => (
              <div key={e.id} className="rounded-xl p-3" style={{ border: `1px solid ${BORDER}` }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold" style={{ color: TEXT }} data-no-i18n>{e.teacher}</div>
                  {e.classes?.length > 0 && <div className="text-[11px]" style={{ color: MUTED }} data-no-i18n>{e.classes.join("، ")}</div>}
                </div>
                <div className="mt-2 grid gap-1">
                  {e.items.map((it, i) => (it?.status || it?.rating || it?.note) && (
                    <div key={i} className="text-xs flex flex-wrap items-center gap-2" dir="auto">
                      <span className="font-semibold" style={{ color: TEXT }}>{WEEKDAY_LABELS[i]}</span>
                      {data.activities[i]?.title && <span style={{ color: MUTED }} data-no-i18n>({data.activities[i].title})</span>}
                      {it.status && <span className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold" style={{ background: STATUS_TONE[it.status] }}>{EVAL_STATUS[it.status]}</span>}
                      {it.rating && <span style={{ color: GOLD }} data-no-i18n>{"★".repeat(it.rating)}</span>}
                      {it.note && <span style={{ color: TEXT }} data-no-i18n>— {it.note}</span>}
                    </div>
                  ))}
                </div>
                {e.note && <div className="mt-2 text-xs italic" style={{ color: MUTED }} dir="auto" data-no-i18n>{e.note}</div>}
              </div>
            ))}
            {data.missing.length > 0 && (
              <div>
                <div className="text-[11px] font-bold mb-1" style={{ color: MUTED }}>Teachers who have not submitted yet</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.missing.map((n) => <span key={n} className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700" data-no-i18n>{n}</span>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
