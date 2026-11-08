import api from '../api/axios';

/**
 * Web Push for calls: once the person allows notifications, this browser is
 * registered with the server, so an incoming call rings on their screen even
 * when the system's tab is closed. Tapping it opens the system, where the
 * ring screen is waiting.
 *
 * Silent no-op where push is unavailable (no service worker, no PushManager,
 * or the server has no VAPID keys yet).
 */

const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

let running = null;

/** Tell the service worker the interface language, so a call notification
 *  (shown while the system is closed) reads in it. */
function tellWorkerLanguage() {
  const html = (document.documentElement.lang || 'en').toLowerCase();
  const lang = html.startsWith('fa') ? 'dr' : html.startsWith('ps') ? 'ps' : 'en';
  navigator.serviceWorker.ready
    .then((reg) => reg.active && reg.active.postMessage({ type: 'set-lang', lang }))
    .catch(() => {});
}

/** Subscribe this browser (idempotent; safe to call often). */
export function enableCallPush() {
  if (running) return running;
  running = (async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    tellWorkerLanguage();
    const key = (await api.get('/chat/push/key', { cache: false })).data?.key;
    if (!key) return;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
    }
    await api.post('/chat/push/subscribe', sub.toJSON());
  })().catch(() => { /* push is a bonus — never break the page */ }).finally(() => { running = null; });
  return running;
}

/**
 * Ask for notification permission on the person's first click (browsers only
 * allow the question after a gesture), then subscribe.
 */
export function askOnFirstClick() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return () => {};
  const once = () => {
    window.removeEventListener('pointerdown', once);
    Notification.requestPermission().then((p) => { if (p === 'granted') enableCallPush(); }).catch(() => {});
  };
  window.addEventListener('pointerdown', once);
  return () => window.removeEventListener('pointerdown', once);
}
