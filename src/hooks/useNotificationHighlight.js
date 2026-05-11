import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * When the page is opened from a notification (`?from=notif`), do two things
 * automatically against the returned ref:
 *   1. scroll it into view
 *   2. add a brief ring "pulse" (`ring-4 ring-teal-300 animate-pulse`)
 *      for ~2.5s so the user's eye lands on the right card/row.
 *
 * Usage:
 *   const { ref, classes } = useNotificationHighlight();
 *   return <div ref={ref} className={`my-card ${classes}`}>…</div>;
 */
export function useNotificationHighlight({ enabled = true, durationMs = 2500 } = {}) {
  const location = useLocation();
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  const params = new URLSearchParams(location.search);
  const fromNotif = params.get("from") === "notif";

  useEffect(() => {
    if (!enabled || !fromNotif) return;
    // Run on next paint so the element has rendered.
    const raf = requestAnimationFrame(() => {
      try {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch { /* tolerate older browsers */ }
      setActive(true);
    });
    const tmr = setTimeout(() => setActive(false), durationMs);
    return () => { cancelAnimationFrame(raf); clearTimeout(tmr); };
  }, [enabled, fromNotif, durationMs, location.pathname]);

  return {
    ref,
    classes: active
      ? "ring-4 ring-teal-300 ring-offset-2 ring-offset-gray-50 transition-shadow duration-500"
      : "transition-shadow duration-500",
    arrived: fromNotif,
  };
}

/**
 * For list pages — caller passes the row id, the hook returns a per-row
 * `classes` string so the matching row is rung when arriving from a notification
 * with `?highlight=ID`.
 */
export function useNotificationRowHighlight() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const highlightId = params.get("highlight");
  const fromNotif = params.get("from") === "notif";

  // Returns helpers that callers wire to each row.
  return {
    isHighlighted: (id) => fromNotif && highlightId && String(id) === String(highlightId),
    ringClasses: "ring-2 ring-teal-400 ring-offset-1 bg-teal-50/40 transition-shadow duration-500",
  };
}
