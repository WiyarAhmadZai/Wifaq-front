import { get, del } from './axios';

const BASE = '/activity-logs';

/**
 * Audit-log API client. Mirrors the backend ActivityLogController.
 * All calls go through the shared axios instance (auth token + 401 handling).
 */
export const activityLogsApi = {
  /**
   * @param {object} params { search, causer_id, log_name, event, subject_type,
   *                          date_from, date_to, sort, per_page, page }
   */
  list: (params = {}) => {
    // Strip empty values so the URL stays clean and Laravel `when()` skips them.
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    );
    return get(BASE, { params: clean });
  },

  show: (id) => get(`${BASE}/${id}`),

  // Distinct values that power the filter dropdowns.
  filters: () => get(`${BASE}/filters`),

  // Manual purge of records older than a date (requires activity-logs.delete).
  purgeOlderThan: (before) => del(BASE, { data: { before } }),
};
