import { get, post, del, clearApiCache } from './axios';

const BASE = '/trash';

/**
 * Trash / recycle-bin API client. Mirrors the backend TrashController.
 *
 * Cache note: the axios layer auto-invalidates cached GETs by deriving a
 * resource path from the mutation URL. That heuristic cannot work here — a
 * restore lives at `/trash/student/restore/5` but the rows it brings back
 * belong to `/student-management/students`, a path the trash module has no
 * mapping for. Every mutation below therefore clears the whole API cache.
 * Restores are rare, admin-initiated actions, so the extra refetching is a
 * fair price for never showing a stale list after one.
 */
export const trashApi = {
  /** All trashable resources with their trashed counts, grouped by module. */
  resources: () => get(`${BASE}/resources`),

  /** @param {object} params { search, page, per_page } */
  list: (resource, params = {}) => {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    );
    return get(`${BASE}/${resource}`, { params: clean });
  },

  restore: async (resource, id) => {
    const res = await post(`${BASE}/${resource}/restore/${id}`);
    clearApiCache();
    return res;
  },

  restoreMany: async (resource, ids) => {
    const res = await post(`${BASE}/${resource}/restore-many`, { ids });
    clearApiCache();
    return res;
  },

  forceDelete: async (resource, id) => {
    const res = await del(`${BASE}/${resource}/force-delete/${id}`);
    clearApiCache();
    return res;
  },

  forceDeleteMany: async (resource, ids) => {
    const res = await del(`${BASE}/${resource}/force-delete-many`, { data: { ids } });
    clearApiCache();
    return res;
  },
};

export default trashApi;
