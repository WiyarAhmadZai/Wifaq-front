import { useEffect, useState } from 'react';
import { activityLogsApi } from '../../api/activityLogs';

/** Format an ISO timestamp into a readable local string. */
function formatTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="text-sm text-gray-800 mt-0.5 break-words">{children || '—'}</div>
    </div>
  );
}

/** Render a before/after diff. Only keys present in either side are shown. */
function ChangeDiff({ before, after }) {
  if (!before && !after) {
    return <p className="text-xs text-gray-400">No field-level changes recorded.</p>;
  }
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            <th className="px-3 py-2 text-left font-bold">Field</th>
            <th className="px-3 py-2 text-left font-bold">Before</th>
            <th className="px-3 py-2 text-left font-bold">After</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {keys.map((k) => {
            const b = before?.[k];
            const a = after?.[k];
            const changed = JSON.stringify(b) !== JSON.stringify(a);
            return (
              <tr key={k} className={changed ? 'bg-amber-50/40' : ''}>
                <td className="px-3 py-2 font-semibold text-gray-700 align-top">{k}</td>
                <td className="px-3 py-2 text-red-600 align-top break-all">{fmtVal(b)}</td>
                <td className="px-3 py-2 text-green-700 align-top break-all">{fmtVal(a)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function fmtVal(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Slide-over drawer showing the full audit record. Fetches the detailed record
 * (with morphed subject) on open; falls back to the row data passed in.
 */
export default function ActivityLogDrawer({ logId, fallback, onClose }) {
  const [record, setRecord] = useState(fallback || null);
  const [loading, setLoading] = useState(Boolean(logId));

  useEffect(() => {
    if (!logId) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await activityLogsApi.show(logId);
        if (alive) setRecord(res.data?.data || fallback);
      } catch {
        if (alive) setRecord(fallback);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [logId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!logId) return null;
  const r = record || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-xl overflow-y-auto animate-[slideIn_.2s_ease-out]">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800">Activity Detail</h2>
            <p className="text-[11px] text-gray-400">Record #{r.id}</p>
          </div>
          <button onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="absolute top-16 left-0 right-0 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 bg-teal-500 animate-pulse" />
          </div>
        )}

        <div className="p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700">
              {r.log_name || 'system'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
              {r.event || '—'}
            </span>
          </div>

          <Field label="Description">{r.description}</Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Time">{formatTime(r.created_at)}</Field>
            <Field label="IP Address">{r.ip_address}</Field>
          </div>

          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
            <Field label="Actor">
              {r.causer?.name || 'System'}
              {r.causer?.email && <div className="text-[11px] text-gray-400">{r.causer.email}</div>}
            </Field>
            <Field label="Subject">
              {r.subject?.type
                ? <>{r.subject.type} <span className="text-gray-400">#{r.subject.id}</span></>
                : '—'}
            </Field>
          </div>

          <Field label="Request URL">
            {r.url ? <span className="text-xs text-blue-600 break-all">{r.url}</span> : '—'}
          </Field>
          <Field label="User Agent">
            <span className="text-[11px] text-gray-500">{r.user_agent}</span>
          </Field>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Changes</p>
            <ChangeDiff before={r.changes?.before} after={r.changes?.after} />
          </div>

          {r.properties && Object.keys(r.properties).length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Raw Properties</p>
              <pre className="text-[11px] bg-gray-50 rounded-xl p-3 overflow-x-auto text-gray-700">
                {JSON.stringify(r.properties, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
