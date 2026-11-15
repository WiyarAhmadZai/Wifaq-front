import { useCallback, useEffect, useRef, useState } from 'react';
import { activityLogsApi } from '../api/activityLogs';

const EMPTY_META = { current_page: 1, last_page: 1, per_page: 25, total: 0 };

/**
 * Reusable data hook for the activity-log list. Owns filters, pagination,
 * and the loading / empty / error lifecycle so the page component stays thin.
 *
 * Debounces refetches when filters change and ignores out-of-order responses
 * (a fast typist can outrun the network).
 */
export function useActivityLogs(initialFilters = {}) {
  const [filters, setFilters] = useState({
    search: '',
    causer_id: '',
    log_name: '',
    event: '',
    subject_type: '',
    date_from: '',
    date_to: '',
    sort: 'newest',
    ...initialFilters,
  });

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Guard against race conditions between overlapping requests.
  const requestId = useRef(0);

  const fetchPage = useCallback(
    async (page = 1) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const res = await activityLogsApi.list({ ...filters, page });
        if (id !== requestId.current) return; // a newer request superseded this one
        setItems(res.data?.data || []);
        setMeta(res.data?.meta || EMPTY_META);
      } catch (err) {
        if (id !== requestId.current) return;
        setItems([]);
        setError(
          err.response?.data?.message ||
            (err.response?.status === 403
              ? 'You do not have permission to view the activity log.'
              : 'Failed to load activity logs. Please try again.')
        );
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [filters]
  );

  // Debounce: refetch from page 1 whenever any filter changes.
  useEffect(() => {
    const t = setTimeout(() => fetchPage(1), 300);
    return () => clearTimeout(t);
  }, [fetchPage]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      causer_id: '',
      log_name: '',
      event: '',
      subject_type: '',
      date_from: '',
      date_to: '',
      sort: 'newest',
    });
  }, []);

  return {
    items,
    meta,
    loading,
    error,
    filters,
    updateFilter,
    resetFilters,
    goToPage: fetchPage,
    refresh: () => fetchPage(meta.current_page),
  };
}
