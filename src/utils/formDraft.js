/**
 * Local, per-user autosave for long forms.
 *
 * Planning an event or a meeting is not a single sitting, and the forms are
 * long: a title, dates, a team, a checklist, an agenda. Anything that took the
 * user off the page — a mistaken Back, a refresh, a closed tab, a 422 from a
 * half-filled section — used to throw all of it away and hand back a blank
 * form.
 *
 * This is the safety net UNDER the server-side draft, not a replacement for
 * it: the server draft is the shared, cross-device copy the user chooses to
 * save, while this keeps the keystrokes between those saves. Once the server
 * holds the work, the local copy is cleared so the two can never disagree.
 *
 * Keyed per user so a shared workstation never hands one person's half-written
 * plan to the next one who signs in.
 */

/** Storage key for one form. `id` is null for a not-yet-saved record. */
export const draftKey = (scope, userId, id) =>
  `form.draft.${scope}.${userId ?? "anon"}.${id ?? "new"}`;

/** Read a stored draft, or null when there is none (or storage is unusable). */
export const readDraft = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Shape check — an entry written by an older version of the form is not
    // worth guessing at, so treat it as absent.
    if (!parsed || typeof parsed !== "object" || !parsed.data) return null;
    return { data: parsed.data, savedAt: parsed.savedAt ? new Date(parsed.savedAt) : null };
  } catch {
    return null; // storage disabled, quota, or corrupt JSON
  }
};

/** Write (or overwrite) the draft for this form. */
export const writeDraft = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false; // private mode or quota — the server draft still works
  }
};

/** Drop the local copy — call this once the server has the work. */
export const clearDraft = (key) => {
  try {
    localStorage.removeItem(key);
  } catch { /* nothing to do */ }
};

/** "just now" / "4 minutes ago" / a date, for the restore banner. */
export const draftAgeLabel = (savedAt) => {
  if (!savedAt) return "";
  const mins = Math.round((Date.now() - savedAt.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return savedAt.toLocaleString();
};
