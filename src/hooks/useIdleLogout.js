import { useEffect, useRef } from "react";

/**
 * Storage key holding the user's preferred idle-logout window, in minutes.
 * 0 disables the feature (stay signed in forever). Persisted per-device in
 * localStorage so the user only configures it once on each browser.
 */
export const IDLE_LOGOUT_STORAGE_KEY = "idle_logout_minutes";

/** Default if the user has never set a preference. */
export const DEFAULT_IDLE_MINUTES = 15;

/** A custom event the Settings page dispatches when the value is changed,
 *  so the running idle timer picks up the new value without a page reload. */
export const IDLE_LOGOUT_CHANGED_EVENT = "idle-logout-config-changed";

export function readIdleMinutes() {
  const raw = localStorage.getItem(IDLE_LOGOUT_STORAGE_KEY);
  if (raw === null || raw === undefined || raw === "") return DEFAULT_IDLE_MINUTES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_IDLE_MINUTES;
  return n;
}

export function writeIdleMinutes(minutes) {
  const n = Number(minutes);
  const safe = Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_IDLE_MINUTES;
  localStorage.setItem(IDLE_LOGOUT_STORAGE_KEY, String(safe));
  // Signal the live hook so the timer re-arms immediately.
  window.dispatchEvent(new CustomEvent(IDLE_LOGOUT_CHANGED_EVENT, { detail: safe }));
  return safe;
}

// Events that count as "user is still here". Kept narrow on purpose —
// mousemove on its own would reset the timer every frame even if the user
// only nudged the mouse to walk away from the desk; mousedown/keydown/scroll
// require real intent.
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click"];

/**
 * Auto-logout after `minutes` of inactivity.
 *
 *   useIdleLogout({ enabled: isAuthenticated, onLogout: () => auth.logout() })
 *
 * The hook reads the configured minutes from localStorage and re-arms when
 * the user changes the setting (via the IDLE_LOGOUT_CHANGED_EVENT).
 * Pass `minutes` to override the stored value (mainly useful for tests).
 */
export function useIdleLogout({ enabled, onLogout, minutes }) {
  const timerRef = useRef(null);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  useEffect(() => {
    if (!enabled) return undefined;

    let currentMinutes = minutes ?? readIdleMinutes();

    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const arm = () => {
      clear();
      // 0 (or negative) disables the feature entirely.
      if (!currentMinutes || currentMinutes <= 0) return;
      timerRef.current = setTimeout(() => {
        onLogoutRef.current?.();
      }, currentMinutes * 60 * 1000);
    };

    const onActivity = () => arm();

    const onConfigChanged = (e) => {
      const next = Number(e.detail);
      currentMinutes = Number.isFinite(next) && next >= 0 ? next : readIdleMinutes();
      arm();
    };

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, onActivity, { passive: true })
    );
    window.addEventListener(IDLE_LOGOUT_CHANGED_EVENT, onConfigChanged);

    arm();

    return () => {
      clear();
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      window.removeEventListener(IDLE_LOGOUT_CHANGED_EVENT, onConfigChanged);
    };
  }, [enabled, minutes]);
}
