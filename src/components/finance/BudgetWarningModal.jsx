import { useEffect, useState } from "react";

const fmt = (n) => Number(n || 0).toLocaleString();

/**
 * BudgetWarningModal — the user-facing half of Option B (soft warn + override).
 *
 * Open it whenever an API call returns a 409 with a `budget_breach` body. It
 * shows the per-budget breakdown of the worst overage, asks for a written
 * reason, and on Confirm calls `onConfirm(reason)`. The caller then re-submits
 * the same request with `budget_override_reason: reason` in the body — the
 * backend stamps it onto the resulting JournalEntry for audit.
 *
 * Designed to live next to any "commit / post / complete" button:
 *
 *   const [breach, setBreach] = useState(null);
 *   try { await post(...payload); }
 *   catch (e) {
 *     if (e.response?.status === 409 && e.response.data?.budget_breach) {
 *       setBreach(e.response.data.budget_breach);
 *       return;
 *     }
 *     throw e;
 *   }
 *
 *   <BudgetWarningModal
 *     breach={breach}
 *     onClose={() => setBreach(null)}
 *     onConfirm={async (reason) => {
 *       await post(...{ ...payload, budget_override_reason: reason });
 *       setBreach(null);
 *     }}
 *     canOverride={hasPermission("budgets.override")}
 *   />
 */
export default function BudgetWarningModal({
  breach,
  title,
  onClose,
  onConfirm,
  canOverride = false,
  busy = false,
}) {
  const [reason, setReason] = useState("");

  // Reset the textarea every time a new breach is loaded.
  useEffect(() => { setReason(""); }, [breach?.chart_code, breach?.requested]);

  if (!breach) return null;

  const worst = breach.worst_item;
  const ratio = worst && worst.allocated > 0
    ? Math.min(150, Math.round((worst.projected / worst.allocated) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header — amber gradient so it reads as a warning, not an error */}
        <div className="px-6 py-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold">{title || "Budget would be exceeded"}</h3>
              <p className="text-[11px] text-white/90 mt-0.5">
                Spending {fmt(breach.requested)} AFN on{" "}
                <span className="font-mono bg-white/15 px-1.5 py-0.5 rounded">
                  {breach.chart_code} {breach.chart_name}
                </span>{" "}
                would push at least one budget over its cap.
              </p>
            </div>
          </div>
        </div>

        {/* Body — per-budget breakdown */}
        <div className="px-6 py-5 overflow-y-auto space-y-4">
          {worst && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700">
                Worst affected budget
              </p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{worst.budget_name}</p>

              {/* Usage bar — visualises projection vs cap */}
              <div className="mt-3">
                <div className="flex items-end justify-between text-[11px] mb-1">
                  <span className="text-gray-600">
                    Spent <strong>{fmt(worst.spent)}</strong> + new{" "}
                    <strong>{fmt(worst.requested)}</strong> = <strong>{fmt(worst.projected)}</strong> AFN
                  </span>
                  <span className="font-bold text-red-700">
                    {ratio}% of {fmt(worst.allocated)}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600 transition-all"
                    style={{ width: `${Math.min(100, ratio)}%` }}
                  />
                  {ratio > 100 && (
                    <div
                      className="absolute top-0 right-0 h-full bg-red-600/30 border-l-2 border-red-700"
                      style={{ width: `${Math.min(50, ratio - 100)}%` }}
                    />
                  )}
                </div>
                <p className="text-[11px] text-red-700 font-semibold mt-1">
                  Over by {fmt(worst.over_by)} AFN
                </p>
              </div>
            </div>
          )}

          {/* All affected budgets (when more than one) */}
          {breach.all_items && breach.all_items.length > 1 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <p className="text-[10px] uppercase font-bold text-gray-500 px-3 py-2 bg-gray-50 border-b border-gray-100 tracking-wider">
                All affected budgets
              </p>
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-gray-50">
                  {breach.all_items.map((row, i) => (
                    <tr key={i} className={row.status === "breach" ? "bg-red-50/40" : ""}>
                      <td className="px-3 py-1.5 text-gray-700">{row.budget_name}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-600">
                        {fmt(row.spent)} + {fmt(row.requested)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold">
                        {fmt(row.projected)} / {fmt(row.allocated)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {row.status === "breach" ? (
                          <span className="text-[10px] font-bold text-red-700 uppercase">over</span>
                        ) : row.status === "alert" ? (
                          <span className="text-[10px] font-bold text-amber-700 uppercase">alert</span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 uppercase">ok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Override section */}
          {canOverride ? (
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                Reason for the override <span className="text-red-600">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Approved by GM on 2026-06-22 — emergency repair after pipe burst"
                rows={3}
                disabled={busy}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Stamped on the journal entry for audit. Required.
              </p>
            </div>
          ) : (
            <div className="px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[12px] text-gray-700">
              You don't have permission to override budget caps. Ask an admin
              with <code className="bg-white px-1.5 py-0.5 rounded text-[10px]">budgets.override</code> to
              approve this transaction.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          {canOverride && (
            <button
              type="button"
              onClick={() => onConfirm(reason.trim())}
              disabled={busy || reason.trim().length < 3}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? "Posting…" : "Override and proceed"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
