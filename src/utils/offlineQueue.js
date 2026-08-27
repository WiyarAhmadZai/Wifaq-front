/**
 * Writes that survive losing the connection.
 *
 * A teacher fills in an observation standing in a corridor on school wifi. If
 * the connection drops between opening the form and pressing Record, the POST
 * fails and everything they typed is gone — and they find out only when the
 * error appears, minutes of work later.
 *
 * So a failed write is not an error here, it is a queued write. It goes into
 * localStorage, the user is told it is held, and it is sent the moment the
 * browser reports it is back online (and on the next page load, in case the
 * tab was closed in between). Nothing is lost to a dropped connection short of
 * clearing site data.
 *
 * Deliberately small: this is a durable outbox, not a sync engine. It handles
 * plain JSON POSTs, keeps them in order, and stops retrying a request the
 * SERVER rejected — a 422 will be a 422 forever, and retrying it every time
 * the network flickers would bury the user in failures they cannot act on.
 */

const KEY = "wen.offlineQueue.v1";
const MAX_ITEMS = 200;

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return []; // storage disabled or corrupt — behave as an empty outbox
  }
};

const write = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_ITEMS)));
    return true;
  } catch {
    return false; // quota or private mode: the caller still gets `false` back
  }
};

/** Ids come from the clock plus a counter — unique enough for one outbox. */
let seq = 0;
const nextId = () => `q${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Everything still waiting to be sent. */
export const pending = () => read();
export const pendingCount = () => read().length;

/**
 * Hold a write for later.
 * @param {{url: string, method?: string, body: object, label?: string}} req
 * @returns {string|null} the queue id, or null if storage refused it
 */
export const enqueue = (req) => {
  const item = {
    id: nextId(),
    url: req.url,
    method: (req.method || "POST").toUpperCase(),
    body: req.body,
    label: req.label || "",
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };
  const list = read();
  list.push(item);
  return write(list) ? item.id : null;
};

export const remove = (id) => write(read().filter((i) => i.id !== id));
export const clear = () => write([]);

/** A failure the server will repeat no matter how often we retry it. */
const isPermanent = (err) => {
  const s = err?.response?.status;
  // No response at all means the request never reached anyone — that is the
  // offline case, and it is exactly what we DO want to retry.
  if (!s) return false;
  return s === 400 || s === 401 || s === 403 || s === 404 || s === 409 || s === 422;
};

/**
 * Try to send everything held, oldest first.
 *
 * Stops at the first network failure: if one request cannot reach the server
 * the next one will not either, and draining the whole queue against a dead
 * connection just burns the retry counter.
 *
 * @param {(item) => Promise<any>} send  performs one request
 * @returns {Promise<{sent: number, failed: Array, remaining: number}>}
 */
export const flush = async (send) => {
  let list = read();
  const failed = [];
  let sent = 0;

  for (const item of [...list]) {
    try {
      await send(item);
      sent += 1;
      list = read().filter((i) => i.id !== item.id);
      write(list);
    } catch (err) {
      if (isPermanent(err)) {
        // The server has an opinion and it will not change. Drop it from the
        // outbox and hand it back so the caller can tell the user why.
        list = read().filter((i) => i.id !== item.id);
        write(list);
        failed.push({ item, error: err });
        continue;
      }
      // Still offline. Leave this and everything after it for the next attempt.
      list = read().map((i) => (i.id === item.id ? { ...i, attempts: (i.attempts || 0) + 1 } : i));
      write(list);
      break;
    }
  }

  return { sent, failed, remaining: read().length };
};

/**
 * Run `onChange` whenever the browser's connectivity changes, and once now.
 * Returns an unsubscribe function.
 *
 * `navigator.onLine` only knows whether there is *a* network, not whether the
 * server is reachable, so it is a hint for the UI — the queue itself is driven
 * by requests actually succeeding or failing.
 */
export const watchConnection = (onChange) => {
  const fire = () => onChange(navigator.onLine !== false);
  window.addEventListener("online", fire);
  window.addEventListener("offline", fire);
  fire();
  return () => {
    window.removeEventListener("online", fire);
    window.removeEventListener("offline", fire);
  };
};
