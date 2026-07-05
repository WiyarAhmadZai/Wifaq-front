import { DIMENSIONS } from "../../api/gradebook";
import {
  PageHeader as HrPageHeader, StatGrid, Section, Pill, InfoNote, EmptyState, Spinner,
} from "../../components/hr/HrUI";

export const TEAL = "#0D5C63";
export const GOLD = "#C9A227";
export const DIMAP = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));

/**
 * Resolve a stored file path/URL (e.g. a homework photo) against the backend
 * origin. The backend may store an absolute URL built from APP_URL (which can
 * carry the wrong host/port, e.g. http://localhost vs :8000) — so we keep only
 * its path and prepend the API origin the frontend actually talks to.
 */
const MEDIA_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/api\/?$/, "");
export function mediaUrl(u) {
  if (!u) return u;
  try { return MEDIA_ORIGIN + new URL(u).pathname; }
  catch { return MEDIA_ORIGIN + (String(u).startsWith("/") ? u : `/${u}`); }
}

// Re-export the app's shared building blocks so the gradebook pages use the very
// same components as the rest of the admin app (HR / Finance / Class Mgmt).
export { StatGrid, Section, Pill, InfoNote, EmptyState, Spinner };

/* ── Icons (reuse across gradebook pages) ─────────────────────────────── */
export const ICON = {
  book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.247",
  check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  cap: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
};

/* ── Layout ───────────────────────────────────────────────────────────── */

/** Standard gray admin page + centered container. `size`: "wide" | "form". */
export function Page({ children, size = "wide" }) {
  const w = size === "form" ? "max-w-2xl" : "max-w-6xl";
  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className={`${w} mx-auto`}>{children}</div>
    </div>
  );
}

/** Full-page loading state — spinner centered in the viewport. */
export function Loading() {
  return (
    <div className="min-h-[70vh] bg-gray-50/60 flex items-center justify-center">
      <Spinner />
    </div>
  );
}

/** Inline (in-content) loading — spinner centered horizontally with breathing room. */
export function LoadingRow() {
  return <div className="flex justify-center py-16"><Spinner /></div>;
}

/** The app's teal PageHeader banner, with an optional back link above it. */
export function Header({ icon = ICON.book, title, subtitle, actions, onBack }) {
  return (
    <>
      {onBack && (
        <button onClick={onBack} className="text-xs font-semibold text-gray-500 hover:text-teal-700 mb-2 inline-flex items-center gap-1">
          <span aria-hidden>←</span> Back
        </button>
      )}
      <HrPageHeader icon={icon} title={title} subtitle={subtitle} actions={actions} />
    </>
  );
}

export function Card({ children, className = "", pad = true, accent }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${pad ? "p-4 sm:p-5" : ""} ${className}`}
      style={accent ? { borderLeft: `4px solid ${accent}` } : undefined}>
      {children}
    </div>
  );
}

/* ── Table helpers (comfortable rows) ─────────────────────────────────── */
export function TableCard({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );
}
export const thCls = "px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100";
export const tdCls = "px-4 py-3 text-sm text-gray-700 border-b border-gray-50";

/* ── Bits ─────────────────────────────────────────────────────────────── */
const AV = ["#0D5C63", "#14919B", "#C9A227", "#2E7D5B", "#6b54a8", "#C2607A", "#3a5fa8"];
export function Avatar({ name, size = 36 }) {
  const s = (name || "?").trim();
  const c = AV[(s.charCodeAt(0) || 0) % AV.length];
  return (
    <span className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42, background: c }}>
      {s[0]?.toUpperCase() || "?"}
    </span>
  );
}

/** Inline alert (success / error) shown at the top of the content area. */
export function Banner({ kind = "success", children, onClose }) {
  const s = kind === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-emerald-50 border-emerald-200 text-emerald-700";
  return (
    <div className={`rounded-xl border px-4 py-2.5 text-sm font-semibold mb-4 flex items-center justify-between gap-3 ${s}`}>
      <span>{children}</span>
      {onClose && <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>}
    </div>
  );
}

export function Btn({ children, tone = "primary", onClick, disabled, full, size = "md", type = "button" }) {
  const tones = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    outline: "bg-white text-teal-700 border border-gray-200 hover:bg-teal-50",
    white:   "bg-white text-teal-700 hover:bg-teal-50",
    soft:    "bg-white/15 text-white hover:bg-white/25",
    danger:  "bg-red-600 text-white hover:bg-red-700",
    ghost:   "bg-transparent text-gray-600 border border-gray-200 hover:bg-gray-50",
  };
  const pad = size === "lg" ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-xs";
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${full ? "w-full" : ""} ${pad} rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone] || tones.primary}`}>
      {children}
    </button>
  );
}

const inputCls = "w-full text-sm rounded-lg px-3 py-2 bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400";
export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </label>
  );
}
export function Select({ children, ...p }) { return <select {...p} className={inputCls}>{children}</select>; }
export function Input(p) { return <input {...p} className={inputCls} />; }
export function Textarea(p) { return <textarea {...p} className={`${inputCls} resize-none`} />; }

/** iOS-style segmented control (light). */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex p-1 rounded-xl gap-1 w-full bg-gray-100">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${value === o.value ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Domain helpers ───────────────────────────────────────────────────── */

/** Colour a normalised (0–10) score green / amber / red. */
export function scoreColor(v) {
  if (v == null) return "#9aa7a8";
  if (v >= 8) return "#1A7A4C";
  if (v >= 6) return "#B26500";
  return "#B22929";
}

/** Format a decimal score without trailing zeros ("8.50" → "8.5"). */
export function fmtScore(v) {
  if (v == null || v === "") return "—";
  return String(parseFloat(v));
}

/** A big, touch-friendly 0–max score slider. Steps 0.5 for small maxes, 1 for large. */
export function GradeSlider({ value, max = 10, onChange }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const step = max > 20 ? 1 : 0.5;
  return (
    <div>
      <div className="flex items-center gap-3">
        <input type="number" min="0" max={max} step={step} value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(0, parseFloat(e.target.value) || 0)))}
          className="w-20 text-center text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        <input type="range" min="0" max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1 accent-teal-700" />
        <span className="text-2xl font-black tabular-nums w-14 text-right" style={{ color: scoreColor((value / max) * 10) }}>{fmtScore(value)}</span>
      </div>
      <div className="h-1.5 rounded-full mt-2 bg-gray-200">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(to right, ${TEAL}, #1A7A4C)` }} />
      </div>
    </div>
  );
}

/** The 4-button dimension picker. */
export function DimensionPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {DIMENSIONS.map((d) => (
        <button key={d.key} type="button" onClick={() => onChange(d.key)}
          className="px-3 py-2 rounded-lg text-xs font-bold border transition-all"
          style={value === d.key ? { background: d.color, color: "#fff", borderColor: d.color } : { background: "#fff", color: d.color, borderColor: "#e5e7eb" }}>
          {d.label}
        </button>
      ))}
    </div>
  );
}

/** Qualitative-tag picker filtered to the chosen dimension. */
export function TagPicker({ tags, dimension, value, onChange }) {
  const list = (tags && tags[dimension]) || [];
  if (!dimension) return <p className="text-[11px] text-gray-400">Pick a dimension first.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          className="px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all"
          style={value === t.id ? { background: DIMAP[dimension]?.color || TEAL, color: "#fff", borderColor: "transparent" } : { background: "#fff", color: t.is_positive ? "#374151" : "#B22929", borderColor: "#e5e7eb" }}>
          {t.name_en}
        </button>
      ))}
    </div>
  );
}

/** Horizontal 4D balance bar from a {intellectual,character,social,practical} percent map. */
export function BalanceBar({ balance }) {
  if (!balance) return null;
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        {DIMENSIONS.map((d) => (
          <div key={d.key} title={`${d.label}: ${balance[d.key] ?? 0}%`} style={{ width: `${balance[d.key] ?? 0}%`, background: d.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {DIMENSIONS.map((d) => (
          <span key={d.key} className="inline-flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            {d.label} {balance[d.key] ?? 0}%
          </span>
        ))}
      </div>
    </div>
  );
}
