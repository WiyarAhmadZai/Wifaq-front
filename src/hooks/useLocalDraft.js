import { useEffect, useRef } from "react";

/**
 * Keep a copy of an in-progress form in the browser, so losing the connection
 * does not lose the work.
 *
 * Teachers write a lesson plan in one sitting — four dimensions, goals and
 * activities. When the internet dropped mid-way the page had nothing but React
 * state, so everything typed so far was gone and the plan had to be started
 * again. This writes the form to localStorage as they type; the form reads it
 * back on load and offers to restore it.
 *
 * It is a safety net, not storage: the copy is cleared the moment the server
 * accepts a save, so a stale draft can never overwrite newer server data.
 *
 *   useLocalDraft(`lesson-plan:${id}`, form, { enabled: !loading });
 *   const saved = readDraft(`lesson-plan:${id}`);   // { savedAt, data } | null
 *   clearDraft(`lesson-plan:${id}`);
 */

const NS = "wen.draft.";

/** Whatever is wrong with storage (private mode, quota, disabled) is not worth
 *  breaking a form over — the draft is a bonus, the form still works. */
const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export function readDraft(key) {
  return safe(() => {
    const raw = localStorage.getItem(NS + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.data ? parsed : null;
  });
}

export function clearDraft(key) {
  safe(() => localStorage.removeItem(NS + key));
}

export function writeDraft(key, data) {
  safe(() => localStorage.setItem(NS + key, JSON.stringify({ savedAt: Date.now(), data })));
}

/** How long ago the draft was written, in words. */
export function draftAge(savedAt) {
  const mins = Math.max(0, Math.round((Date.now() - savedAt) / 60000));
  if (mins < 1) return "a moment ago";
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.round(mins / 60);
  if (hrs === 1) return "about an hour ago";
  if (hrs < 24) return `about ${hrs} hours ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export default function useLocalDraft(key, value, { enabled = true, delay = 800 } = {}) {
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled || !key) return undefined;

    clearTimeout(timer.current);
    timer.current = setTimeout(() => writeDraft(key, value), delay);

    return () => clearTimeout(timer.current);
  }, [key, value, enabled, delay]);

  // A tab closed mid-sentence should still keep the last keystrokes: the
  // debounce above may not have fired yet.
  useEffect(() => {
    if (!enabled || !key) return undefined;

    const flush = () => writeDraft(key, value);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [key, value, enabled]);
}
