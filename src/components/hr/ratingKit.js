import { useCallback, useEffect, useMemo, useState } from "react";
import { get } from "../../api/axios";

/**
 * The non-visual half of the ratings system.
 *
 * Kept apart from StaffRatings.jsx so that this file can export helpers and a
 * hook without turning that file into a module of mixed components and values
 * (which breaks React Fast Refresh).
 */

/** What each kind of rated work is called on screen. Mirrors the backend keys. */
export const RATEABLE_LABEL = {
  staff_task: "Task",
  lesson_plan: "Lesson plan",
  daily_work: "Daily work",
  vats_observation: "Staff observation",
  student_observation: "Student observation",
  student_profile: "شناسنامه",
  meeting: "Meeting",
};

/** A score in one word — a number alone is forgettable, a judgement is not. */
export const scoreWord = (v) =>
  v == null ? "Not rated" : v >= 4.5 ? "Outstanding" : v >= 3.5 ? "Good" : v >= 2.5 ? "Needs work" : "Poor";

/** Every list on the screen re-reads its scores when this fires. */
export function broadcastRatingChange() {
  window.dispatchEvent(new Event("staff-ratings:changed"));
}

/**
 * Ratings for a whole list in ONE request, keyed by row id.
 *
 *   const { map } = useBulkRatings("lesson_plan", items.map((i) => i.id));
 *   …
 *   <RatePill type="lesson_plan" id={item.id} entry={map[item.id]} />
 *
 * Before this, a list could show its stars only by asking fifty times — which
 * is why lists showed none at all and ratings looked like a detail-page feature.
 */
export function useBulkRatings(type, ids = []) {
  const [map, setMap] = useState({});
  const key = useMemo(
    () => [...new Set(ids.map(Number).filter(Boolean))].sort((a, b) => a - b).join(","),
    [ids],
  );

  const load = useCallback(() => {
    if (!type || !key) return;
    get("/staff-ratings/bulk", { cache: false, params: { rateable_type: type, ids: key } })
      .then((r) => setMap(r.data?.data || {}))
      .catch(() => {});   // a list works perfectly without its stars
  }, [type, key]);

  useEffect(() => { load(); }, [load]);

  // A rating saved anywhere on the page refreshes every list on it.
  useEffect(() => {
    window.addEventListener("staff-ratings:changed", load);
    return () => window.removeEventListener("staff-ratings:changed", load);
  }, [load]);

  return { map, reload: load };
}
