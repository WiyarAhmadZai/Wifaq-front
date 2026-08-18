import { useState, useEffect, useMemo, useRef } from "react";

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
 * One searchable student picker — type to filter, click to choose.
 *
 * Replaces the old search-box-plus-dropdown pair: two fields for one value made
 * the dropdown look broken (it only listed whatever the other box had already
 * narrowed down). Here the typing and the choosing are the same control.
 *
 * `students` is already scoped by the API — a teacher only ever receives the
 * students of the classes they teach — so this never has to filter by role.
 */
export function StudentPicker({ students, value, onChange, scope, placeholder = "Type a name, class or code…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const selected = students.find((s) => String(s.id) === String(value)) || null;

  // Close when the click lands outside, so the list never sticks open.
  useEffect(() => {
    const onDocClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? students.filter((s) => [s.name, s.class, s.code].some((v) => (v || "").toLowerCase().includes(q)))
      : students;
    return pool.slice(0, 50);
  }, [students, query]);

  // Group by class so a teacher covering several classes can scan by class.
  const groups = useMemo(() => {
    const byClass = new Map();
    matches.forEach((s) => {
      const key = cleanClass(s.class) || "No class";
      if (!byClass.has(key)) byClass.set(key, []);
      byClass.get(key).push(s);
    });
    return [...byClass.entries()];
  }, [matches]);

  const pick = (s) => { onChange(s.id); setQuery(""); setOpen(false); };

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-[10px] text-[#5A7A7E] mb-1">Student</label>

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
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none"
        />
      )}

      {open && !selected && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-[#D0E0E0] rounded-xl shadow-lg">
          {students.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-[#5A7A7E]">
              {scope?.scoped
                ? "No students are assigned to your classes yet — ask an admin to link you to a class."
                : "No students found."}
            </p>
          ) : matches.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-[#8AA4A7]">No student matches “{query}”.</p>
          ) : (
            groups.map(([className, list]) => (
              <div key={className}>
                <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#8AA4A7] bg-[#F4F8F8] sticky top-0">
                  {className}
                </div>
                {list.map((s) => (
                  <button key={s.id} type="button" onClick={() => pick(s)}
                    className="w-full text-left px-3 py-2 hover:bg-[#E8F6F6] flex items-center justify-between gap-2">
                    <bdi dir="auto" className="text-[13px] text-[#0A3A3E] truncate">{cleanName(s.name)}</bdi>
                    {s.code && <span className="text-[10px] text-[#8AA4A7] shrink-0">{s.code}</span>}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {scope?.scoped && (
        <p className="text-[10px] text-[#8AA4A7] mt-1">
          {students.length} student{students.length === 1 ? "" : "s"} · {scope.label}
        </p>
      )}
    </div>
  );
}

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
