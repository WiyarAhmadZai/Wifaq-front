/* ============================================================
 * Shared tokens & tiny components for the 4D Lesson Plan module.
 * Keeps the teacher form, dashboard, review queue, analytics and
 * templates pages consistent with the Education & Formation look.
 * ============================================================ */

export const TEAL = "#0D5C63", TEAL_LT = "#14919B", GOLD = "#C9A227", PAPER = "#F4F8F8";

/** The four dimensions — the spine of every plan. */
export const DIMENSIONS = [
  {
    key: "intellectual", label: "Intellectual", hint: "learning · thinking", color: "#14919B",
    types: ["Recitation / reading", "Text analysis", "Memorization", "Q&A", "Exercise solving"],
  },
  {
    key: "character", label: "Character", hint: "values · faith", color: "#C9A227",
    types: ["Adab before knowledge", "Honesty", "Patience in learning", "Respect for the teacher", "Trust in God"],
  },
  {
    key: "social", label: "Social", hint: "cooperation · discussion", color: "#C2607A",
    types: ["Group work", "Class discussion", "Paired Q&A", "Individual presentation"],
  },
  {
    key: "practical", label: "Practical", hint: "skill · application", color: "#2E7D5B",
    types: ["Reading practice", "Notebook writing", "Drawing / summary", "Real-life application"],
  },
];
export const DIMAP = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));

export const MATERIALS = ["Textbook", "Board", "Projector", "Practice cards", "Worksheet", "Audio"];

/** Status meta — labels & colours for the lifecycle. */
export const STATUS = {
  draft:                 { label: "Draft",          bg: "#eef3f3", fg: "#5d7273" },
  submitted:             { label: "Pending review",  bg: "#fbf0db", fg: "#9a6a12" },
  in_review:             { label: "In review",       bg: "#e6eef9", fg: "#3a5fa8" },
  approved:              { label: "Approved",         bg: "#e6f3ec", fg: "#2E7D5B" },
  returned_for_revision: { label: "Needs revision",   bg: "#f7e3e1", fg: "#C0473F" },
  delivered:             { label: "Delivered",        bg: "#e0f1f2", fg: "#0D5C63" },
  reflected:             { label: "Reflected",        bg: "#eee9f6", fg: "#6b54a8" },
};

export const DAY_LABEL = {
  saturday: "Sat", sunday: "Sun", monday: "Mon",
  tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
};

/** JS Date -> our weekday key (Fri is not a school day). */
export function weekdayKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][d.getDay()];
}

export const StatusPill = ({ status }) => {
  const s = STATUS[status] || { label: status, bg: "#eef3f3", fg: "#5d7273" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
};

/** Four little dots showing which dimensions are filled. */
export const DimensionDots = ({ filled = 0, size = 8 }) => (
  <span className="inline-flex items-center gap-1">
    {DIMENSIONS.map((d, i) => (
      <span key={d.key} className="rounded-full" title={d.label}
        style={{ width: size, height: size, background: i < filled ? d.color : "#d8e2e2" }} />
    ))}
  </span>
);

export const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} />
  </div>
);

export const Hero = ({ title, subtitle, right }) => (
  <div className="px-5 py-4 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Education &amp; Formation</p>
      <h1 className="text-base font-black text-white mt-0.5">{title}</h1>
      {subtitle && <p className="text-[11px] text-white/70 mt-0.5">{subtitle}</p>}
    </div>
    {right}
  </div>
);

/** A toggleable chip used for the dimension "type" and materials pickers. */
export const Chip = ({ on, onClick, children, color = TEAL_LT }) => (
  <button type="button" onClick={onClick}
    className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
    style={on ? { background: color, color: "#fff", borderColor: color } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
    {children}
  </button>
);
