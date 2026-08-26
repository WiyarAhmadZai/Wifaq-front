/**
 * Shared presentation bits for the Parent Communication screens — same pattern
 * as weeklyUi.jsx / gradebookUi.jsx.
 *
 * One source of truth for the vocabulary the module speaks: method, direction,
 * category, outcome and follow-up status. The labels live here so the list, the
 * form, the detail page, the follow-up board, the report and BOTH exports
 * (Excel and Print) can never disagree about what "care" or "no_answer" means.
 */

export const TEAL = "#0D5C63";
export const TEXT = "#0A3A3E";
export const MUTED = "#8AA4A7";
export const BORDER = "#D0E0E0";
export const GOLD_LT = "#FFF8E7";
export const GOLD_SOFT = "#E8D48B";
export const GOLD_DEEP = "#8A6F10";

/** How the contact happened. */
export const METHODS = {
  phone: { label: "Phone call", fa: "تماس تلیفونی", bg: "#E8F6F6", fg: TEAL, border: "#BFE3E3" },
  in_person: { label: "In-person meeting", fa: "جلسه حضوری", bg: "#E6F3EC", fg: "#2E7D5B", border: "#B7DCC8" },
  message: { label: "Message (WhatsApp/SMS)", fa: "پیام", bg: GOLD_LT, fg: GOLD_DEEP, border: GOLD_SOFT },
  email: { label: "Email", fa: "ایمیل", bg: "#EEF2FF", fg: "#4338CA", border: "#C7D2FE" },
  other: { label: "Other", fa: "سایر", bg: "#F4F8F8", fg: MUTED, border: BORDER },
};

/** Who reached out first. */
export const DIRECTIONS = {
  school: { label: "School initiated", fa: "مکتب" },
  parent: { label: "Parent initiated", fa: "والدین" },
};

/**
 * The four contact purposes from the handbook (§5.1), with the healthy mix it
 * asks for. The report measures the real spread against these targets, which is
 * why the number lives beside the label rather than in the report screen alone.
 */
export const CATEGORIES = {
  informational: { label: "Informational", fa: "اطلاعی", target: 30, bg: "#E8F6F6", fg: TEAL, border: "#BFE3E3" },
  coordination: { label: "Coordination", fa: "هماهنگی", target: 20, bg: "#EEF2FF", fg: "#4338CA", border: "#C7D2FE" },
  care: { label: "Care", fa: "مراقبتی", target: 40, bg: "#E6F3EC", fg: "#2E7D5B", border: "#B7DCC8" },
  accountability: { label: "Accountability", fa: "حسابدهی", target: 10, bg: "#FAEAEF", fg: "#B0546E", border: "#EFCBD6" },
};

/** Did we actually get through. The dead-number case is its own outcome
 *  because it is a data-quality problem, not a conversation. */
export const OUTCOMES = {
  reached: { label: "Reached", fa: "برقرار شد", bg: "#E6F3EC", fg: "#2E7D5B", border: "#B7DCC8" },
  no_answer: { label: "No answer", fa: "پاسخ نداد", bg: GOLD_LT, fg: GOLD_DEEP, border: GOLD_SOFT },
  wrong_number: { label: "Wrong / dead number", fa: "شماره نادرست", bg: "#FAEAEF", fg: "#B0546E", border: "#EFCBD6" },
  declined: { label: "Declined to talk", fa: "نخواست صحبت کند", bg: "#F4F8F8", fg: MUTED, border: BORDER },
  rescheduled: { label: "Rescheduled", fa: "به وقت دیگر", bg: "#EEF2FF", fg: "#4338CA", border: "#C7D2FE" },
};

export const FOLLOW_UP_STATUS = {
  pending: { label: "Pending", fa: "در جریان", bg: GOLD_LT, fg: GOLD_DEEP, border: GOLD_SOFT },
  completed: { label: "Completed", fa: "تکمیل", bg: "#E6F3EC", fg: "#2E7D5B", border: "#B7DCC8" },
  cancelled: { label: "Cancelled", fa: "لغو شد", bg: "#F4F8F8", fg: MUTED, border: BORDER },
};

export const CONTACT_PERSON = {
  father: { label: "Father", fa: "پدر" },
  mother: { label: "Mother", fa: "مادر" },
  guardian: { label: "Guardian", fa: "سرپرست" },
  other: { label: "Other", fa: "سایر" },
};

/** Turn a lookup map into the { value, label } list a <select> wants. */
export const optionsOf = (map) =>
  Object.entries(map).map(([value, cfg]) => ({ value, label: cfg.label }));

/** Plain-text label for a coded value — what the Excel and Print exports use. */
export const labelOf = (map, value) => map[value]?.label ?? (value || "—");

/** The coloured chip used across every screen in the module. */
export function Pill({ map, value, fallback = "—" }) {
  const cfg = map[value];
  if (!cfg) return <span style={{ color: MUTED }}>{fallback}</span>;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap"
      style={{ background: cfg.bg || "#F4F8F8", color: cfg.fg || MUTED, borderColor: cfg.border || BORDER }}
    >
      {cfg.label}
    </span>
  );
}

/** Date + time, in the short form every table in the system uses. */
export const fmtDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
};

export const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

/** A pending follow-up whose due date has passed. */
export const isOverdue = (row) =>
  row?.status === "pending" && row?.due_date && new Date(row.due_date) < new Date(new Date().toDateString());

/** "WEN-FM-26-0001 — Ahmad Zai" for a family row, however it arrived. */
export const familyLabel = (family) => {
  if (!family) return "—";
  const name = family.father_name || family.mother_name || "";
  return [family.family_id, name].filter(Boolean).join(" — ") || "—";
};

export const studentLabel = (student) => {
  if (!student) return "—";
  return [student.student_id, [student.first_name, student.last_name].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" — ") || "—";
};
