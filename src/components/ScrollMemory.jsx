import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Restores the scroll position when the user goes Back.
 *
 * The app never had scroll handling of its own: React Router keeps the DOM
 * mounted across a navigation, so the window simply stayed wherever it was.
 * Opening the tenth row of a long list and pressing Back landed the user at
 * the top of the list again — they had to scroll down and find their place by
 * hand every single time.
 *
 * Positions are keyed by `location.key`, the id React Router gives each
 * history entry, so going Back twice restores two different positions and a
 * fresh visit to the same URL correctly starts at the top. sessionStorage
 * keeps them alive across a reload but not across tabs or sessions.
 *
 * Restoring cannot happen in one shot: list pages paint empty, fetch, then
 * grow, so an immediate scrollTo would be clamped to a page that is still a
 * few hundred pixels tall. We retry on animation frames for a short window
 * and stop as soon as the document is tall enough to honour the target.
 */
const KEY = "app.scrollPositions";
const RESTORE_WINDOW_MS = 1200;

const readAll = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {}; // private mode or corrupt entry — scrolling is cosmetic
  }
};

const writeAll = (map) => {
  try {
    // Bounded: a long session must not grow this entry without limit.
    const entries = Object.entries(map).slice(-60);
    sessionStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* quota — ignore */ }
};

export default function ScrollMemory() {
  const location = useLocation();
  const navigationType = useNavigationType(); // PUSH | POP | REPLACE
  const currentKey = useRef(location.key);
  const lastPath = useRef(location.pathname);

  // Track the live position for whichever entry is on screen. Written on every
  // scroll (rAF-coalesced) because there is no reliable "about to navigate"
  // event — by the time the location changes the old scrollTop is already gone.
  useEffect(() => {
    currentKey.current = location.key;
    let frame = null;
    const capture = () => {
      const map = readAll();
      map[currentKey.current] = window.scrollY || document.documentElement.scrollTop || 0;
      writeAll(map);
    };
    // Scroll fires far more often than it needs storing, so writes are
    // coalesced to one per frame.
    const record = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = null; capture(); });
    };
    // Seed a brand-new entry with wherever the page currently sits, so an
    // entry the user never scrolls (a filter change mid-list, say) still has a
    // position to come back to. Only when the entry is new — on a Back the
    // stored position IS the answer, and seeding would overwrite it with the
    // scroll position of the page being left.
    if (readAll()[currentKey.current] === undefined) capture();
    window.addEventListener("scroll", record, { passive: true });
    return () => {
      // Cleanup runs while `currentKey` still points at the entry being left,
      // and before anything has scrolled the new page — so this is the last
      // and most accurate reading of where the user was. Synchronous, because
      // a queued frame would be cancelled below before it ever ran.
      if (frame) { cancelAnimationFrame(frame); frame = null; }
      capture();
      window.removeEventListener("scroll", record);
    };
  }, [location.key]);

  useEffect(() => {
    // Browsers try to restore scroll themselves on Back. In an SPA the content
    // is not there yet when they do it, so they get it wrong — we take over.
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

    const saved = navigationType === "POP" ? readAll()[location.key] : undefined;
    const samePage = lastPath.current === location.pathname;
    lastPath.current = location.pathname;

    if (typeof saved !== "number") {
      // Changing a filter, a search or a page number rewrites the query string
      // but the user has not gone anywhere — yanking them to the top of a list
      // they are reading would be its own bug. Only a real page change resets.
      if (!samePage) window.scrollTo(0, 0);
      return;
    }
    const target = saved;
    if (target === 0) {
      window.scrollTo(0, 0);
      return;
    }

    // Keep trying while the page is still filling in.
    let cancelled = false;
    const started = performance.now();
    const attempt = () => {
      if (cancelled) return;
      window.scrollTo(0, target);
      const reached = Math.abs((window.scrollY || 0) - target) < 2;
      if (!reached && performance.now() - started < RESTORE_WINDOW_MS) {
        requestAnimationFrame(attempt);
      }
    };
    requestAnimationFrame(attempt);
    return () => { cancelled = true; };
  }, [location.key, location.pathname, navigationType]);

  return null;
}
