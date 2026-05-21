/**
 * Single source of truth for how dates are shown to users.
 * Project-wide rule: every visible date is day/Month/year → DD/MM/YYYY.
 *
 *   fmtDate("2026-05-19T10:00:00Z")  → "19/05/2026"
 *   fmtDateTime("2026-05-19T10:30")  → "19/05/2026 10:30"
 *
 * Empty / invalid input returns the dash placeholder, never "Invalid Date".
 * NOTE: only for *display*. Never use these for <input type="date">
 * values or API payloads — those must stay ISO (YYYY-MM-DD).
 */

function toDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  // Plain "YYYY-MM-DD" → treat as local date (avoid TZ off-by-one).
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const pad = (n) => String(n).padStart(2, "0");

/** DD/MM/YYYY — the canonical display format for the whole app. */
export function fmtDate(value, placeholder = "—") {
  const d = toDate(value);
  if (!d) return placeholder;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** DD/MM/YYYY HH:mm — for timestamps that need the time of day. */
export function fmtDateTime(value, placeholder = "—") {
  const d = toDate(value);
  if (!d) return placeholder;
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtMonth(year, monthIndex0, opts = {}) {
  const d = new Date(Number(year) || 2000, Number(monthIndex0) || 0, 1);
  if (isNaN(d.getTime())) return "—";
  const name = d.toLocaleString("en-US", { month: "long" });
  return opts.yearless ? name : `${name} ${d.getFullYear()}`;
}

export default fmtDate;
