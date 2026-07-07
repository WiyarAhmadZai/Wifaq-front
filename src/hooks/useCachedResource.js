import { useCallback, useEffect, useRef, useState } from 'react';
import { get, peekCache } from '../api/axios';

/**
 * useCachedResource — stale-while-revalidate data loading for any page.
 *
 * Paints instantly from the local API cache (if present), then revalidates
 * against the server. The backend answers `304 Not Modified` when nothing has
 * changed, so an unchanged resource costs one tiny round-trip and never blanks
 * the screen. Changed data arrives as a normal 200 and swaps in.
 *
 * Usage:
 *   const { data, loading, fromCache, refetch } = useCachedResource('/hr/departments/list');
 *   const rows = data?.data ?? [];
 *
 * @param {string|null} url      Request URL (null/undefined disables fetching).
 * @param {object}      options
 * @param {object}      options.params    Axios params (also part of the cache key).
 * @param {boolean}     options.enabled   Skip fetching while false (default true).
 * @param {Array}       options.deps      Extra deps that trigger a refetch.
 * @param {Function}    options.select    Transform applied to `response.data`.
 * @returns {{ data:any, loading:boolean, error:any, fromCache:boolean, refetch:Function }}
 */
export function useCachedResource(url, options = {}) {
  const { params, enabled = true, deps = [], select } = options;
  const selectRef = useRef(select);
  selectRef.current = select;

  const shape = useCallback(
    (raw) => (selectRef.current ? selectRef.current(raw) : raw),
    []
  );

  // Seed synchronously from cache so the very first render already has data.
  const [data, setData] = useState(() => {
    if (!url || !enabled) return null;
    const cached = peekCache(url, params);
    return cached != null ? shape(cached) : null;
  });
  const [loading, setLoading] = useState(() => {
    if (!url || !enabled) return false;
    return peekCache(url, params) == null; // only spin when nothing cached
  });
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!url || !enabled) return;

    const cached = peekCache(url, params);
    if (cached != null) {
      setData(shape(cached));
      setFromCache(true);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const res = await get(url, params ? { params } : undefined);
      if (!mounted.current) return;
      setData(shape(res.data));
      setFromCache(Boolean(res.fromCache));
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      // Keep any cached data visible on failure; only surface the error when
      // we have nothing to show.
      if (cached == null) setError(e);
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, JSON.stringify(params), shape]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  return { data, loading, error, fromCache, refetch: load };
}

export default useCachedResource;
