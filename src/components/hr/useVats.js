import { useState, useEffect, useCallback } from "react";
import { get } from "../../api/axios";

/**
 * Single source of truth for the VATS recognition/concern model.
 *
 * Every VATS page (dashboard, slips, cards) should read its headline
 * numbers from here so the whole system tells one consistent story:
 * slips + observations roll into recognition/concern events, which roll
 * into pending card tiers. Step 2 pages stay aware of step 1.
 *
 * Backed by GET /vats/slips/thresholds — the same endpoint the cards
 * page uses to decide who can be sent a card.
 */
export function useVatsThresholds() {
  const [rows, setRows] = useState([]);
  const [targets, setTargets] = useState({ positive: 10, concern: 3 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get("/vats/slips/thresholds");
      setRows(r.data?.data || []);
      setTargets(r.data?.targets || { positive: 10, concern: 3 });
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Keep all VATS pages in sync after any slip/observation/card change.
    const onRefresh = () => refresh();
    window.addEventListener("wen:vats-refresh", onRefresh);
    return () => window.removeEventListener("wen:vats-refresh", onRefresh);
  }, [refresh]);

  // Org-wide rollups
  const totals = rows.reduce(
    (a, r) => {
      a.recognition += r.positive || 0;
      a.concern += r.concern || 0;
      a.positiveSlips += r.positive_slips || 0;
      a.positiveObs += r.positive_obs || 0;
      a.concernSlips += r.concern_slips || 0;
      a.concernObs += r.concern_obs || 0;
      a.pendingPositive += r.positive_pending || 0;
      a.pendingConcern += r.concern_pending || 0;
      return a;
    },
    {
      recognition: 0, concern: 0,
      positiveSlips: 0, positiveObs: 0, concernSlips: 0, concernObs: 0,
      pendingPositive: 0, pendingConcern: 0,
    }
  );

  // Staff who have at least one card waiting to be sent (the action queue).
  const eligible = rows.filter((r) => (r.suggest_cards || []).length > 0);

  // Healthy culture metric: recognition : concern, target ≥ 3:1
  const ratio =
    totals.concern > 0
      ? totals.recognition / totals.concern
      : totals.recognition > 0
      ? Infinity
      : 0;

  return { rows, targets, totals, eligible, ratio, loading, refresh };
}

/** Fire after any slip / observation / card mutation so every VATS page re-syncs. */
export function broadcastVatsChange() {
  window.dispatchEvent(new CustomEvent("wen:vats-refresh"));
  // Notifications bell also refreshes on this existing event.
  window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
}
