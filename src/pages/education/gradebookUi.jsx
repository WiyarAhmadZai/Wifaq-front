import { DIMENSIONS } from "../../api/gradebook";
import { TEAL, GOLD } from "./lessonPlanUi";

export { TEAL, GOLD };
export const PAPER = "#F4F8F8";
export const DIMAP = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));

/** Colour a normalised (0–10) score green / amber / red. */
export function scoreColor(v) {
  if (v == null) return "#9aa7a8";
  if (v >= 8) return "#2E7D5B";
  if (v >= 6) return "#9a6a12";
  return "#C0473F";
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
        <input
          type="number" min="0" max={max} step={step} value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(0, parseFloat(e.target.value) || 0)))}
          className="w-20 text-center text-sm border rounded-lg px-2 py-1.5" style={{ borderColor: "#dbe8e8" }}
        />
        <input
          type="range" min="0" max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 accent-teal-700"
        />
        <span className="text-2xl font-black tabular-nums" style={{ color: scoreColor((value / max) * 10) }}>
          {fmtScore(value)}
        </span>
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 mt-1">
        <span>Weak</span><span>Excellent · /{max}</span>
      </div>
      <div className="h-1.5 rounded-full mt-1" style={{ background: "#d8e2e2" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(to right, ${TEAL}, #2E7D5B)` }} />
      </div>
    </div>
  );
}

/** The 4-button dimension picker. */
export function DimensionPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {DIMENSIONS.map((d) => (
        <button
          key={d.key} type="button" onClick={() => onChange(d.key)}
          className="px-3 py-2 rounded-lg text-xs font-bold border transition-all"
          style={value === d.key
            ? { background: d.color, color: "#fff", borderColor: d.color }
            : { background: "#fff", color: d.color, borderColor: "#dbe8e8" }}
        >
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
        <button
          key={t.id} type="button" onClick={() => onChange(t.id)}
          className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
          style={value === t.id
            ? { background: DIMAP[dimension]?.color || TEAL, color: "#fff", borderColor: "transparent" }
            : { background: "#fff", color: t.is_positive ? "#3a5553" : "#C0473F", borderColor: "#dbe8e8" }}
        >
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
      <div className="flex h-3 rounded-full overflow-hidden" style={{ background: "#e6eded" }}>
        {DIMENSIONS.map((d) => (
          <div key={d.key} title={`${d.label}: ${balance[d.key] ?? 0}%`}
            style={{ width: `${balance[d.key] ?? 0}%`, background: d.color }} />
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
