import axios from 'axios';
import apiCache, {
  keyFromConfig,
  isCacheable,
  getEntry,
  setEntry,
  invalidate,
} from './cache';

// Create axios instance with base URL and timeout
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  // 304 (Not Modified) is a *successful* conditional-GET, not an error. Accept
  // it so the response interceptor can hydrate the body from the local cache.
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
});

// Request interceptor: auth token + conditional-GET (ETag) replay
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // For cacheable GETs, replay the stored ETag so the server can answer 304
    // ("no new changes") whenever the data is unchanged.
    if (isCacheable(config)) {
      const key = keyFromConfig(config);
      const entry = getEntry(key);
      if (entry?.etag) {
        config.headers['If-None-Match'] = entry.etag;
      }
      // Stash the key so the response interceptor doesn't recompute it.
      config.__cacheKey = key;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Derive the resource path to invalidate from a mutation URL.
 * Strips the query string, a trailing numeric id, and a trailing action verb
 * (store/update/create/delete/destroy) so both the list and show caches for
 * that resource are dropped.
 *   /hr/departments/update/5  -> /hr/departments
 *   /branches/store           -> /branches
 *   /class-management/subjects/7 (REST PUT) -> /class-management/subjects
 */
function resourceFragment(url = '') {
  const path = String(url).split('?')[0].replace(/\/+$/, '');
  const parts = path.split('/');
  const ACTIONS = new Set(['store', 'update', 'create', 'delete', 'destroy', 'edit']);
  while (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last) || ACTIONS.has(last.toLowerCase())) {
      parts.pop();
    } else {
      break;
    }
  }
  return parts.join('/');
}

// Response interceptor: cache writes, 304 hydration, mutation invalidation,
// and the existing 401/403 handling.
api.interceptors.response.use(
  (response) => {
    const config = response.config || {};
    const method = (config.method || 'get').toLowerCase();

    // --- Reads: populate the cache or serve from it on 304 ------------------
    if (method === 'get' && isCacheable(config)) {
      const key = config.__cacheKey || keyFromConfig(config);

      if (response.status === 304) {
        // Server confirms nothing changed → return the cached copy verbatim.
        const entry = getEntry(key);
        if (entry) {
          response.data = entry.data;
          response.fromCache = true;
          // Refresh recency so it isn't evicted while actively in use.
          setEntry(key, entry.etag, entry.data);
        }
      } else if (response.status === 200) {
        const etag = response.headers?.etag || response.headers?.ETag || null;
        // Only cache real, non-empty JSON payloads.
        if (response.data !== undefined && response.data !== '') {
          setEntry(key, etag, response.data);
        }
      }
    }

    // --- Writes: drop the affected resource's cached reads -----------------
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      invalidate(resourceFragment(config.url));
    }

    return response;
  },
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      // A lost session belongs to the previous user — never leak their cached
      // rows to whoever logs in next.
      apiCache.clearAll();
      // Avoid redirect loop if already on /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    // 403: don't auto-redirect — let the calling page show its own error.
    // Components/guards handle UX; this keeps API calls deterministic.
    return Promise.reject(error);
  }
);

// Export the configured axios instance
export default api;

// Export API base URL for constructing storage URLs
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Re-export cache controls so pages/AuthContext can clear or peek the cache.
export { getEntry as getCachedEntry, invalidate as invalidateCache } from './cache';
export const clearApiCache = () => apiCache.clearAll();

/**
 * Read a cached GET response synchronously (no network). Returns the full
 * `response.data` (payload + meta) or null. Used for instant "paint from cache"
 * before the revalidating request resolves.
 */
export const peekCache = (url, params) => {
  const entry = getEntry(keyFromConfig({ method: 'get', url, params }));
  return entry ? entry.data : null;
};

// Export common HTTP methods
export const get = (url, config = {}) => api.get(url, config);
export const post = (url, data = {}, config = {}) => api.post(url, data, config);
export const put = (url, data = {}, config = {}) => api.put(url, data, config);
export const patch = (url, data = {}, config = {}) => api.patch(url, data, config);
export const del = (url, config = {}) => api.delete(url, config);
