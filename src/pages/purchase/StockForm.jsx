import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post, put, peekCache } from "../../api/axios";
import { getChartOfAccounts } from "../../api/financial";

const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Stock Item form.
 *
 * Inventory IS a current asset — every item we hold has real value on the
 * Balance Sheet. So this form makes the asset mapping a first-class field:
 * the user picks WHICH inventory bucket (1310 Office Supplies, 1320
 * Teaching Materials, 1330 Cleaning Supplies, 1340 Uniform Stock, 1350
 * Books & Stationery) the item rolls up under. With that link in place,
 * the Stock list page can show total inventory value per bucket and the
 * Balance Sheet's Inventory line stays accurate.
 *
 * The legacy free-text `category` field is kept for backwards compat but
 * the user typically sets it via the same bucket pick — we set both.
 */
export default function StockForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [chartAccounts, setChartAccounts] = useState([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [form, setForm] = useState({
    item_name: "",
    asset_chart_account_id: "",
    category: "",
    quantity: 0,
    unit: "pcs",
    unit_price: "",
    min_stock_level: 0,
    location: "",
    notes: "",
    status: "active",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Load chart of accounts on mount; pre-load the existing item on edit.
  useEffect(() => {
    getChartOfAccounts({ per_page: 1000 })
      .then((r) => setChartAccounts(r.data?.data?.data || r.data?.data || []))
      .catch(() => setChartAccounts([]))
      .finally(() => setLoadingChart(false));

    if (isEdit) {
      const __cached = peekCache(`/purchase/stock/show/${id}`);
      if (__cached?.data) {
        const d = __cached.data;
        setForm({
          item_name: d.item_name || "",
          asset_chart_account_id: d.asset_chart_account_id || "",
          category: d.category || "",
          quantity: d.quantity ?? 0,
          unit: d.unit || "pcs",
          unit_price: d.unit_price ?? "",
          min_stock_level: d.min_stock_level ?? 0,
          location: d.location || "",
          notes: d.notes || "",
          status: d.status || "active",
        });
        setLoading(false);
      }
      get(`/purchase/stock/show/${id}`)
        .then((r) => {
          const d = r.data?.data;
          if (d) {
            setForm({
              item_name: d.item_name || "",
              asset_chart_account_id: d.asset_chart_account_id || "",
              category: d.category || "",
              quantity: d.quantity ?? 0,
              unit: d.unit || "pcs",
              unit_price: d.unit_price ?? "",
              min_stock_level: d.min_stock_level ?? 0,
              location: d.location || "",
              notes: d.notes || "",
              status: d.status || "active",
            });
          }
        })
        .catch(() => Swal.fire("Error", "Failed to load stock item.", "error"))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  /**
   * Which accounts may hold stock value.
   *
   * The 1300s are the conventional Inventory block, so they stay the preferred
   * answer. But insisting on them made the form unusable on any chart that
   * numbers its accounts differently: a school that adds its own "Inventory"
   * account under Assets with, say, code 1230 got "No inventory accounts
   * found" and a dead end — the item could not be saved at all.
   *
   * So: 13xx if they exist, otherwise every other active asset account, which
   * is the widest set that is still correct. Stock is a current asset; posting
   * it anywhere that is not an asset would misstate the Balance Sheet, so
   * `type === "Asset"` is the one rule kept absolute.
   *
   * Level-1 roll-up headers (1000 "Assets") are dropped — posting to a parent
   * total is what makes a chart stop adding up.
   */
  const assetAccounts = useMemo(
    () =>
      chartAccounts
        .filter((c) => c.type === "Asset" && c.is_active !== false)
        .sort((a, b) => String(a.code).localeCompare(String(b.code))),
    [chartAccounts]
  );

  const inventoryBuckets = useMemo(() => {
    const thirteens = assetAccounts.filter(
      (c) => String(c.code).startsWith("13") && (c.level ?? 1) >= 3
    );
    if (thirteens.length > 0) return thirteens;

    // Fallback: any postable asset account, with the ones that are obviously
    // meant for stock first. A chart with a hand-added "Inventory" account
    // should not make the user hunt for it among the bank accounts.
    const LIKELY = /inventor|stock|supplie|store|material|uniform/i;
    return assetAccounts
      .filter((c) => (c.level ?? 1) > 1)
      .sort((a, b) => {
        const rank = (c) => (LIKELY.test(c.name || "") ? 0 : 1);
        return rank(a) - rank(b) || String(a.code).localeCompare(String(b.code));
      });
  }, [assetAccounts]);

  /** True when we are showing the fallback rather than a real 13xx block. */
  const usingFallbackBuckets = useMemo(
    () => inventoryBuckets.length > 0 && !String(inventoryBuckets[0].code).startsWith("13"),
    [inventoryBuckets]
  );

  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  // When the user picks an inventory bucket, also default the free-text
  // `category` to the bucket name so legacy reports keep working.
  const pickBucket = (chartId) => {
    const chart = inventoryBuckets.find((c) => String(c.id) === String(chartId));
    setForm((p) => ({
      ...p,
      asset_chart_account_id: chartId,
      category: p.category || chart?.name?.toLowerCase().replace(/\s+/g, "-") || "",
    }));
  };

  const liveValue = (Number(form.quantity) || 0) * (Number(form.unit_price) || 0);

  const submit = async () => {
    setSaving(true);
    setErrors({});
    const payload = { ...form };
    if (!payload.asset_chart_account_id) delete payload.asset_chart_account_id;
    try {
      if (isEdit) {
        await put(`/purchase/stock/edit/${id}`, payload);
      } else {
        await post("/purchase/stock/store", payload);
      }
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: isEdit ? "Stock updated" : "Stock created",
        timer: 1500,
        showConfirmButton: false,
      });
      navigate("/purchase/stock");
    } catch (e) {
      if (e.response?.status === 422 && e.response.data?.errors) {
        setErrors(e.response.data.errors);
      } else {
        Swal.fire("Error", e.response?.data?.message || "Save failed.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-600" />
      </div>
    );
  }

  const pickedBucket = inventoryBuckets.find(
    (c) => String(c.id) === String(form.asset_chart_account_id)
  );

  return (
    <div className="px-4 py-5 max-w-3xl mx-auto space-y-4">
      {/* ───── Hero ───── */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-2xl shadow-lg overflow-hidden">
        <div className="relative px-6 py-5">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="relative flex items-start gap-4">
            <button
              onClick={() => navigate("/purchase/stock")}
              className="mt-1 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Back"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold">
                Stock = Inventory Asset
              </p>
              <h1 className="text-xl sm:text-2xl font-black mt-1">
                {isEdit ? "Edit stock item" : "Add a stock item"}
              </h1>
              <p className="text-[11px] text-indigo-100 mt-1 max-w-xl">
                Every item the school keeps on hand is a current asset. Pick the
                inventory bucket below so the value rolls up correctly under
                Assets → Inventory on the Balance Sheet.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ───── Form ───── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
        {/* Asset bucket — first because it's the most important choice. */}
        <Field
          label="Inventory bucket on the books *"
          help="Which asset line does this item roll up to? Pick the one that matches what the item IS."
          error={errors.asset_chart_account_id?.[0]}
        >
          {loadingChart ? (
            <div className="px-3 py-2.5 text-xs text-gray-400">Loading inventory categories…</div>
          ) : inventoryBuckets.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
              No asset accounts found. Add one under Finance → Chart of Accounts
              (type <strong>Asset</strong>) — an “Inventory” account is the usual choice.
            </div>
          ) : (
            <>
            {/* Say which list this is. Without it, a chart that has no 13xx
                block looks like it is offering the wrong accounts. */}
            {usingFallbackBuckets && (
              <div className="mb-2 px-3 py-2 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-xl">
                No 13xx inventory accounts on this chart, so every asset account is listed.
                Pick the one you keep stock value in.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {inventoryBuckets.map((c) => {
                const selected = String(form.asset_chart_account_id) === String(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickBucket(c.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      selected
                        ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200"
                        : "bg-white border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          selected ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.code}
                      </span>
                      <span className={`text-sm font-bold ${selected ? "text-indigo-800" : "text-gray-800"}`}>
                        {c.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            </>
          )}
        </Field>

        {/* Identity */}
        <Field label="Item name *" error={errors.item_name?.[0]}>
          <input
            type="text"
            value={form.item_name}
            onChange={(e) => set("item_name", e.target.value)}
            placeholder="e.g. A4 paper ream"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </Field>

        {/* Quantity + Unit + Price grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Quantity on hand *" error={errors.quantity?.[0]}>
            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 text-right font-mono"
            />
          </Field>
          <Field label="Unit *" error={errors.unit?.[0]}>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="pcs / kg / box…"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300"
            />
          </Field>
          <Field label="Unit price (AFN)" error={errors.unit_price?.[0]}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={(e) => set("unit_price", e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 text-right font-mono"
            />
          </Field>
        </div>

        {/* Live asset value preview — makes the bookkeeping connection tangible */}
        {liveValue > 0 && pickedBucket && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-700">
                This item's contribution to Assets
              </p>
              <p className="text-[11px] text-indigo-900 mt-0.5">
                Rolls up under{" "}
                <strong>{pickedBucket.code} {pickedBucket.name}</strong> on the Balance Sheet.
              </p>
            </div>
            <p className="text-lg font-black font-mono text-indigo-800">{fmt(liveValue)} AFN</p>
          </div>
        )}

        {/* Less critical fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Reorder level"
            help="Flag the item as Low when on-hand falls to this. Leave at 0 to never warn."
            error={errors.min_stock_level?.[0]}
          >
            <input
              type="number"
              min="0"
              value={form.min_stock_level}
              onChange={(e) => set("min_stock_level", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 text-right font-mono"
            />
          </Field>
          <Field label="Storage location" error={errors.location?.[0]}>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Storeroom A, Cabinet 3…"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300"
            />
          </Field>
        </div>

        <Field label="Notes" error={errors.notes?.[0]}>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Optional context — supplier, brand, expiry, etc."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300"
          />
        </Field>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={() => navigate("/purchase/stock")}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !form.item_name.trim() || !form.unit.trim()}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add stock item"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, help, error, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-700 mb-1.5">{label}</label>
      {children}
      {help && !error && <p className="text-[10px] text-gray-500 mt-1">{help}</p>}
      {error && <p className="text-[10px] text-red-600 mt-1 font-medium">{error}</p>}
    </div>
  );
}
