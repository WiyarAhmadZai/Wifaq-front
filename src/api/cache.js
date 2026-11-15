/**
 * apiCache
 * --------
 * A tiny, persistent stale-while-revalidate cache for GET API responses.
 *
 * Goal (per product requirement): every system page that loads data from the
 * database should paint *instantly* from a locally-stored copy, and only swap
 * in fresh data when the server says something actually changed.
 *
 * Design
 *  - Each cache entry stores `{ etag, data, ts }` keyed by the exact request
 *    (method + url + serialized params).
 *  - `data` is the full axios `response.data` (payload + pagination meta), so
 *    a page can render it verbatim without re-shaping.
 *  - `etag` is the backend's ETag. It is replayed via `If-None-Match`; a 304
 *    response means "no new changes" → we keep the cached copy.
 *  - Persisted to localStorage so the cache survives reloads and new tabs.
 *    Falls back to an in-memory Map if storage is unavailable/full.
 *
 * The cache is intentionally per-browser and cleared on login/logout so one
 * user never sees another user's cached rows.
 */

const PREFIX = 'wf_cache::';
const INDEX_KEY = 'wf_cache_index'; // ordered list of keys for LRU-ish eviction
const MAX_ENTRIES = 300; // safety cap so a huge session can't blow the quota
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // hard expiry: 24h (revalidation still runs)

// In-memory mirror. Doubles as the fallback store when localStorage throws
// (private mode, quota exceeded, disabled storage).
const mem = new Map();

function storageAvailable() {
  try {
    const k = '__wf_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
const HAS_LS = typeof window !== 'undefined' && storageAvailable();

/** Stable stringify so `{a:1,b:2}` and `{b:2,a:1}` produce the same key. */
function stableStringify(obj) {
  if (obj == null) return '';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => `${k}:${stableStringify(obj[k])}`).join(',') + '}';
}

/**
 * Build a deterministic cache key from an axios request config.
 * Only GET is cacheable; callers should check `isCacheable` first.
 */
/**
 * Which API this cache entry came from.
 *
 * Part of the key on purpose. Without it, entries are stored under the bare
 * path, so pointing VITE_API_BASE_URL at a different backend (production →
 * local, or between environments) makes the app paint the PREVIOUS server's
 * rows from localStorage — the same names and balances, from the wrong
 * database, with nothing on screen to say so.
 */
const API_ORIGIN = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api')
  .replace(/\/+$/, '');

export function keyFromConfig(config) {
  const method = (config.method || 'get').toLowerCase();
  // config.url may already contain a query string (CrudPage builds URLs that
  // way); config.params is axios' structured params. Fold both in.
  const url = config.url || '';
  const params = config.params ? stableStringify(config.params) : '';
  const origin = (config.baseURL || API_ORIGIN).replace(/\/+$/, '');
  return `${method} ${origin}${url}${params ? ' ?' + params : ''}`;
}

export function isCacheable(config) {
  const method = (config.method || 'get').toLowerCase();
  // Opt-out escape hatch: `config.cache === false` bypasses caching entirely.
  return method === 'get' && config.cache !== false;
}

function readIndex() {
  if (!HAS_LS) return [...mem.keys()];
  try {
    return JSON.parse(window.localStorage.getItem(INDEX_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeIndex(keys) {
  if (!HAS_LS) return;
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

/** Touch a key so it becomes most-recently-used, evicting the oldest if over cap. */
function bumpIndex(key) {
  let idx = readIndex().filter((k) => k !== key);
  idx.push(key);
  while (idx.length > MAX_ENTRIES) {
    const victim = idx.shift();
    rawRemove(victim);
  }
  writeIndex(idx);
}

function rawRemove(key) {
  mem.delete(key);
  if (HAS_LS) {
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  }
}

/** Return the cached entry `{ etag, data, ts }` for a key, or null. */
export function getEntry(key) {
  if (mem.has(key)) return mem.get(key);
  if (!HAS_LS) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    mem.set(key, entry); // warm the in-memory mirror
    return entry;
  } catch {
    return null;
  }
}

/** Store/replace a cache entry. Never throws — degrades to memory-only. */
export function setEntry(key, etag, data) {
  const entry = { etag: etag || null, data, ts: Date.now() };
  mem.set(key, entry);
  if (HAS_LS) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
      bumpIndex(key);
    } catch {
      // Quota exceeded → drop the oldest entries and retry once.
      try {
        const idx = readIndex();
        for (let i = 0; i < Math.ceil(idx.length / 2); i++) rawRemove(idx[i]);
        writeIndex(idx.slice(Math.ceil(idx.length / 2)));
        window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
        bumpIndex(key);
      } catch {
        /* stay memory-only */
      }
    }
  }
  return entry;
}

/**
 * Freshness check for stale-while-revalidate. An entry past its TTL is still
 * *usable* for instant paint, but callers may choose to show a spinner. We
 * treat anything under TTL as "fresh enough to trust between revalidations".
 */
export function isFresh(entry, ttl = DEFAULT_TTL_MS) {
  return !!entry && typeof entry.ts === 'number' && Date.now() - entry.ts < ttl;
}

/**
 * Invalidate cached reads after a mutation. Pass a URL fragment (e.g.
 * "/hr/departments") and every cached GET whose key contains it is dropped, so
 * the next read re-fetches fresh. Called automatically by the axios layer on
 * POST/PUT/PATCH/DELETE.
 */
export function invalidate(urlFragment) {
  if (!urlFragment) return;
  const frag = String(urlFragment);
  const survivors = [];
  for (const key of readIndex()) {
    if (key.includes(frag)) rawRemove(key);
    else survivors.push(key);
  }
  writeIndex(survivors);
  // Also sweep the in-memory mirror (covers memory-only fallback mode).
  for (const key of [...mem.keys()]) {
    if (key.includes(frag)) mem.delete(key);
  }
}

/** Wipe the entire API cache (login/logout, or manual "force refresh"). */
export function clearAll() {
  for (const key of readIndex()) rawRemove(key);
  writeIndex([]);
  mem.clear();
  if (HAS_LS) {
    // Belt-and-braces: remove any stray prefixed keys not in the index.
    try {
      const toRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PREFIX)) toRemove.push(k);
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }
}

export default {
  keyFromConfig,
  isCacheable,
  getEntry,
  setEntry,
  isFresh,
  invalidate,
  clearAll,
};
