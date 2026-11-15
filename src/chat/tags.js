/**
 * What a message IS, so a mailbox can be read without opening it.
 *
 * Six tags, mirroring App\Support\MessageTag on the server — the server
 * validates against that list, the composer offers this one, and the two must
 * not drift. Order is roughly most to least pressing, which is also the order
 * they appear in the picker.
 *
 * `hint` is what the picker shows under the label. It is the whole point of
 * having named tags: without it "Priority" and "Urgent" mean whatever each
 * person assumes, and the scheme stops being worth scanning.
 */

export const TAGS = [
  {
    key: "urgent",
    icon: "🔴",
    label: "Urgent",
    hint: "Needs action today",
    fg: "#B91C1C", bg: "#FEE2E2", border: "#FCA5A5",
  },
  {
    key: "institutional",
    icon: "🏛️",
    label: "Institutional",
    hint: "Policy, strategy or leadership",
    fg: "#0D5C63", bg: "#E0F2F1", border: "#9CCBCB",
  },
  {
    key: "priority",
    icon: "⭐",
    label: "Priority",
    hint: "Important, not time-critical",
    fg: "#A07A12", bg: "#FEF3C7", border: "#E8D9A0",
  },
  {
    key: "task",
    icon: "🗒️",
    label: "Task",
    hint: "Routine or operational",
    fg: "#1D4ED8", bg: "#DBEAFE", border: "#93C5FD",
  },
  {
    key: "info",
    icon: "ℹ️",
    label: "Info",
    hint: "For your information only",
    fg: "#4B5563", bg: "#F3F4F6", border: "#D1D5DB",
  },
  {
    key: "personal",
    icon: "👤",
    label: "Personal",
    hint: "Not institutional",
    fg: "#7E22CE", bg: "#F3E8FF", border: "#D8B4FE",
  },
];

const BY_KEY = Object.fromEntries(TAGS.map((t) => [t.key, t]));

/** The tag record for a stored key, or null for an untagged message. */
export const tagByKey = (key) => (key ? BY_KEY[key] || null : null);

/* ── Auto-suggest ──────────────────────────────────────────────────────────
 *
 * A suggestion, never a decision: whatever this returns is pre-selected and
 * can be changed with one click before sending, and it never overrides a tag
 * the sender has already picked. Guessing wrong is expected — that is exactly
 * why the manual picker is the primary control and this only nudges it.
 *
 * Keywords are given in English, Dari and Pashto because the same mailbox
 * carries all three, and a scheme that only recognised English would quietly
 * do nothing for most of the messages actually sent here.
 */

const KEYWORDS = [
  ["urgent", [
    "urgent", "emergency", "immediately", "right now", "asap", "today", "deadline",
    "عاجل", "فوری", "فوراً", "اضطراری", "همدا اوس", "بیړني", "بیړنی", "نن",
  ]],
  ["institutional", [
    "policy", "strategy", "strategic", "board", "circular", "directive", "regulation",
    "leadership", "committee", "governance",
    "پالیسی", "مقرره", "استراتیژی", "رهبری", "کمیته", "بورد", "مصوبه",
    "تګلاره", "لارښوونه", "مشرتابه", "کمېټه",
  ]],
  ["priority", [
    "important", "priority", "please prioritise", "please prioritize", "key",
    "مهم", "اولویت", "لومړیتوب", "ارزښتناک",
  ]],
  ["task", [
    "task", "please do", "assign", "assigned", "complete", "submit", "report by",
    "follow up", "checklist",
    "وظیفه", "کار", "اجرا", "تکمیل", "ارسال", "پیګیری",
    "دنده", "ترسره", "وسپارل", "بشپړ",
  ]],
  ["info", [
    "fyi", "for your information", "just so you know", "no action", "announcement",
    "reminder", "notice",
    "اطلاع", "اطلاعیه", "آگاهی", "یادآوری", "خبر",
    "خبرتیا", "معلومات", "یادونه",
  ]],
  ["personal", [
    "personal", "private", "leave request", "family", "birthday", "congratulations",
    "شخصی", "خصوصی", "رخصتی", "خانواده", "تبریک",
    "شخصي", "کورنۍ", "مبارکي", "رخصتي",
  ]],
];

/** Roles whose messages are institutional far more often than not. */
const LEADERSHIP = ["super-admin", "admin", "principal", "director", "hr-manager"];

/**
 * Suggest a tag for a draft. Returns a tag key, or null when nothing is clear
 * enough to be worth pre-selecting — a wrong guess costs more than no guess.
 *
 * @param {string} text  the draft, plain or HTML
 * @param {string[]} roles the sender's roles
 */
export function suggestTag(text, roles = []) {
  const plain = String(text || "")
    .replace(/<[^>]*>/g, " ")     // the draft is HTML; match words, not markup
    .toLowerCase();

  if (plain.trim().length < 3) return null;

  // Keywords win over role: a principal writing "urgent" means urgent, not
  // "institutional because a principal wrote it".
  for (const [key, words] of KEYWORDS) {
    if (words.some((w) => plain.includes(w))) return key;
  }

  // Nothing in the words — fall back to who is writing, and only for the one
  // role where the guess is reliable enough to be useful.
  if (roles.some((r) => LEADERSHIP.includes(r))) return "institutional";

  return null;
}
