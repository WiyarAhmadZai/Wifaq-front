import { Pill } from "../../components/hr/HrUI";
import { DIMENSIONS } from "../../api/planning";

// Status → Pill tone mapping for plan workflow + discussion states.
const STATUS_TONES = {
  draft: "gray",
  submitted: "amber",
  approved: "blue",
  active: "emerald",
  completed: "teal",
  archived: "gray",
  // discussion/decision-record types
  approval: "emerald",
  rejection: "red",
  revision: "amber",
  override: "purple",
  abandonment: "red",
  cascade: "blue",
};

export function StatusPill({ status }) {
  return <Pill tone={STATUS_TONES[status] || "gray"}>{status}</Pill>;
}

const DIM_TONES = {
  cognitive: "blue",
  character: "purple",
  practical: "emerald",
  social_structural: "amber",
};

export function DimensionBadge({ dimension }) {
  const meta = DIMENSIONS.find((d) => d.value === dimension);
  return <Pill tone={DIM_TONES[dimension] || "gray"}>{meta?.label || dimension}</Pill>;
}

// Thin progress bar (0–100).
export function ProgressBar({ value = 0, tone }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const color =
    tone ||
    (v >= 75 ? "bg-emerald-500" : v >= 40 ? "bg-amber-500" : "bg-red-500");
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${v}%` }} />
    </div>
  );
}

const DIM_CELL = {
  cognitive: "bg-blue-50 text-blue-700",
  character: "bg-purple-50 text-purple-700",
  practical: "bg-emerald-50 text-emerald-700",
  social_structural: "bg-amber-50 text-amber-700",
};

/**
 * 4D balance widget. `counts` is { cognitive, character, practical,
 * social_structural }. Shows a cell per dimension + a coverage callout.
 */
export function Balance4D({ counts = {} }) {
  const covered = DIMENSIONS.filter((d) => (counts[d.value] || 0) > 0).length;
  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5">
        {DIMENSIONS.map((d) => {
          const n = counts[d.value] || 0;
          const cls = n > 0 ? DIM_CELL[d.value] : "bg-gray-50 text-gray-300";
          return (
            <div key={d.value} className={`rounded-lg py-2.5 text-center ${cls}`}>
              <div className="text-lg font-black leading-none">{n}</div>
              <div className="text-[9px] font-semibold mt-1 leading-tight">{d.label}</div>
            </div>
          );
        })}
      </div>
      <div
        className={`mt-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold ${
          covered === 4
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {covered === 4
          ? "✓ Balanced — all 4 dimensions covered."
          : `⚠ ${covered} of 4 dimensions covered.`}
      </div>
    </div>
  );
}

// Count objectives per dimension from a loaded plan.
export function balanceFromPlan(plan) {
  const counts = { cognitive: 0, character: 0, practical: 0, social_structural: 0 };
  (plan?.objectives || []).forEach((o) => {
    if (counts[o.primary_4d_dimension] != null) counts[o.primary_4d_dimension] += 1;
  });
  return counts;
}

// Average progress across all KRs of a plan (for list/dashboard rollups).
export function planProgress(plan) {
  const krs = (plan?.objectives || []).flatMap((o) => o.key_results || []);
  if (!krs.length) return 0;
  const sum = krs.reduce((acc, k) => acc + (Number(k.progress) || 0), 0);
  return Math.round(sum / krs.length);
}
