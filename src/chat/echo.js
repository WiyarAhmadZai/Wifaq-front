// Laravel Echo client wired to the Laravel Reverb WebSocket server.
//
// Auth model: this SPA uses Sanctum BEARER tokens (localStorage), not session
// cookies. So channel authorization can't rely on the default cookie flow — we
// supply a custom `authorizer` that POSTs to /broadcasting/auth through the
// shared axios instance, which attaches `Authorization: Bearer <token>`.
//
// The instance is a singleton created on demand (after login) and torn down on
// logout so a stale socket never lingers across sessions.
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import api, { API_BASE_URL } from '../api/axios';

// laravel-echo's reverb/pusher broadcaster reads Pusher off the global.
window.Pusher = Pusher;

// Backend origin (strip the trailing /api from the configured API base).
const ORIGIN = (API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');

// Reverb connection settings. Env vars are primary; the fallbacks match the
// backend .env defaults so real-time still works even if the Vite dev server
// was started BEFORE VITE_REVERB_* were added (env is only read at dev-server
// start — restart `npm run dev` after changing it). Change these in .env for prod.
const REVERB = {
  key: import.meta.env.VITE_REVERB_APP_KEY || 'wifaqchatkey',
  host: import.meta.env.VITE_REVERB_HOST || '127.0.0.1',
  port: Number(import.meta.env.VITE_REVERB_PORT || 8080),
  scheme: import.meta.env.VITE_REVERB_SCHEME || 'http',
};

/* A loopback Reverb host baked into a build only works when the page itself
 * is served locally — on a real domain it points at the visitor's own
 * machine, so the socket can never open and pusher-js retries forever,
 * flooding the console. Detect that and skip the connection entirely; the
 * app stays fully usable, just without live chat updates. Set
 * VITE_REVERB_HOST/PORT/SCHEME to the public Reverb endpoint to enable it. */
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1', '[::1]', '0.0.0.0'];
const isLoopback = (h) => LOOPBACK_HOSTS.includes(String(h || '').toLowerCase());
const REVERB_UNREACHABLE = isLoopback(REVERB.host) && !isLoopback(window.location.hostname);
let warnedUnreachable = false;

let echoInstance = null;

export function getEcho() {
  if (echoInstance) return echoInstance;

  const token = localStorage.getItem('token');
  if (!token) return null; // not authenticated yet

  if (REVERB_UNREACHABLE) {
    if (!warnedUnreachable) {
      warnedUnreachable = true;
      console.info(`[chat] Live chat off: VITE_REVERB_HOST is "${REVERB.host}", which is not reachable from ${window.location.hostname}. Point it at the public Reverb endpoint to enable real-time updates.`);
    }
    return null;
  }

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: REVERB.key,
    wsHost: REVERB.host,
    wsPort: REVERB.port,
    wssPort: REVERB.port,
    forceTLS: REVERB.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    // Custom token-based channel authorization.
    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        api
          .post(`${ORIGIN}/broadcasting/auth`, {
            socket_id: socketId,
            channel_name: channel.name,
          })
          .then((res) => callback(false, res.data))
          .catch((err) => callback(true, err));
      },
    }),
  });

  // Surface connection state so a dead Reverb server is obvious in the console
  // instead of failing silently ("messages only show on refresh").
  try {
    const conn = echoInstance.connector?.pusher?.connection;
    if (conn) {
      conn.bind('connected', () => console.info('[chat] Reverb connected'));
      conn.bind('disconnected', () => console.warn('[chat] Reverb disconnected'));
      conn.bind('error', (e) => console.warn('[chat] Reverb connection error', e));
      conn.bind('unavailable', () =>
        console.warn(`[chat] Reverb unavailable at ${REVERB.scheme}://${REVERB.host}:${REVERB.port} — is "php artisan reverb:start" running?`));
    }
  } catch { /* ignore */ }

  return echoInstance;
}

// The current Reverb socket id, sent as `X-Socket-Id` on mutating chat requests
// so the server's `broadcast()->toOthers()` excludes THIS tab (no echoing our
// own message back to us — prevents duplicate bubbles on the sender side).
/**
 * Is the live socket actually carrying events right now?
 *
 * False when the configured Reverb host is unreachable (the loopback case
 * above), when the server is down, or before the handshake completes. The
 * chat falls back to polling while this is false, so a message still arrives
 * without a page refresh — just a few seconds later instead of instantly.
 */
export function isRealtimeLive() {
  if (REVERB_UNREACHABLE) return false;
  try {
    return echoInstance?.connector?.pusher?.connection?.state === 'connected';
  } catch {
    return false;
  }
}

/** Why realtime is off, for the UI to explain rather than fail silently. */
export function realtimeStatus() {
  if (REVERB_UNREACHABLE) {
    return { live: false, reason: 'unconfigured', host: REVERB.host };
  }
  const state = (() => {
    try { return echoInstance?.connector?.pusher?.connection?.state || 'initialized'; }
    catch { return 'unknown'; }
  })();
  return { live: state === 'connected', reason: state, host: REVERB.host };
}
export function getSocketId() {
  try {
    return echoInstance?.socketId() || null;
  } catch {
    return null;
  }
}

export function disconnectEcho() {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch {
      /* ignore */
    }
    echoInstance = null;
  }
}
