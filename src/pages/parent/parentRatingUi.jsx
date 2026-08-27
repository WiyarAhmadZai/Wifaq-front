/**
 * Shared vocabulary for parent engagement ratings.
 *
 * The five dimensions are what the handbook actually asks of a family
 * partnership (§9.3, §11, §12): do they answer, do they do what they said, do
 * they turn up, do they support the child at home, do they work with us.
 *
 * Fee payment is deliberately absent. §2.1 says a father who pays late may be
 * in economic hardship, and §13.4 forbids shaming a family over money — so
 * money stays with finance and this measures partnership.
 */

import { TEAL, MUTED, BORDER, GOLD_LT, GOLD_SOFT, GOLD_DEEP } from "./parentCommsUi";

export { TEAL, MUTED, BORDER, GOLD_LT, GOLD_SOFT, GOLD_DEEP };

export const DIMENSIONS = [
  {
    key: "responsiveness",
    label: "Responsiveness",
    fa: "پاسخگویی",
    hint: "Answers calls and replies to messages within a reasonable time.",
  },
  {
    key: "follow_through",
    label: "Follow-through",
    fa: "پیگیری وعده‌ها",
    hint: "Does what they said they would do — sends the note, returns the form, comes back.",
  },
  {
    key: "presence",
    label: "Presence",
    fa: "حضور",
    hint: "Attends parent meetings, quarterly sessions and workshops.",
  },
  {
    key: "home_support",
    label: "Home support",
    fa: "همکاری در خانه",
    hint: "Supports the child's learning and tarbiya at home — routine, homework, environment.",
  },
  {
    key: "cooperation",
    label: "Cooperation",
    fa: "همکاری و احترام متقابل",
    hint: "Works with the school as a partner; respectful even when raising a concern.",
  },
];

/** 1-5, worded so two raters mean the same thing by a 3. */
export const SCALE = [
  { value: 1, label: "Very weak", fa: "خیلی ضعیف" },
  { value: 2, label: "Weak", fa: "ضعیف" },
  { value: 3, label: "Acceptable", fa: "قابل قبول" },
  { value: 4, label: "Good", fa: "خوب" },
  { value: 5, label: "Excellent", fa: "عالی" },
];

export const TIERS = {
  golden: {
    label: "Golden Record", fa: "سابقه طلایی",
    bg: GOLD_LT, fg: GOLD_DEEP, border: GOLD_SOFT,
    note: "An exemplary partner. Recognise them.",
  },
  good: {
    label: "Good standing", fa: "وضعیت خوب",
    bg: "#E6F3EC", fg: "#2E7D5B", border: "#B7DCC8",
    note: "A reliable partnership.",
  },
  fair: {
    label: "Fair", fa: "متوسط",
    bg: "#E8F6F6", fg: TEAL, border: "#BFE3E3",
    note: "Engaged, with room to grow.",
  },
  needs_engagement: {
    label: "Needs engagement", fa: "نیاز به تعامل بیشتر",
    bg: "#FFF4E5", fg: "#9A5B00", border: "#F0D0A0",
    note: "The school should reach out — this is a prompt for a care call, not a verdict.",
  },
  watch: {
    label: "Watch", fa: "تحت مراقبت",
    bg: "#FAEAEF", fg: "#B0546E", border: "#EFCBD6",
    note: "Under active pastoral follow-up. Requires a decision, never an average.",
  },
  restricted: {
    label: "Admission review", fa: "بررسی پذیرش",
    bg: "#F5E1E6", fg: "#8C2F4A", border: "#E0B4C0",
    note: "The next admission goes to the committee. Never an automatic refusal.",
  },
};

export const tierOptions = () =>
  Object.entries(TIERS).map(([value, cfg]) => ({ value, label: cfg.label }));

export const tierLabel = (value) => TIERS[value]?.label ?? (value || "Not rated");

export function TierPill({ value, small = false }) {
  const cfg = TIERS[value];
  if (!cfg) {
    return <span className="text-[11px]" style={{ color: MUTED }}>Not rated</span>;
  }
  return (
    <span
      className={`${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"} rounded-full font-semibold border whitespace-nowrap`}
      style={{ background: cfg.bg, color: cfg.fg, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}

/** 0-100 score chip. Colour follows the tier the score would produce. */
export function ScoreChip({ value, raterCount }) {
  if (value == null) return <span style={{ color: MUTED }}>—</span>;
  const tier = value >= 85 ? "golden" : value >= 70 ? "good" : value >= 45 ? "fair" : "needs_engagement";
  const cfg = TIERS[tier];
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="px-2 py-0.5 rounded-lg text-xs font-bold border"
        style={{ background: cfg.bg, color: cfg.fg, borderColor: cfg.border }}>
        {value}
      </span>
      {raterCount != null && (
        <span className="text-[10px]" style={{ color: MUTED }}>
          {raterCount} rater{raterCount === 1 ? "" : "s"}
        </span>
      )}
    </span>
  );
}

/** The five-point picker. Plain radios — a slider hides which value is chosen. */
export function ScaleInput({ value, onChange, disabled = false }) {
  return (
    <div className="flex flex-wrap gap-1">
      {SCALE.map((s) => {
        const active = Number(value) === s.value;
        return (
          <button
            key={s.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s.value)}
            title={s.label}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50"
            style={active
              ? { background: TEAL, color: "#fff", borderColor: TEAL }
              : { background: "#fff", color: MUTED, borderColor: BORDER }}
          >
            {s.value} · {s.label}
          </button>
        );
      })}
    </div>
  );
}

/** A star for the row action. Filled once the family has a standing. */
export function StarIcon({ filled = false, className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M11.048 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.176 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.673z" />
    </svg>
  );
}
