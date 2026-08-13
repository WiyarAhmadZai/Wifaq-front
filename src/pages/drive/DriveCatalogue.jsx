import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getTaxonomy, listCatalogue, saveCatalogue,
  uploadFiles, addLink, deleteFile, fileDownloadBlob,
} from "../../api/drive";
import { fmtDate } from "../../utils/formErrors";
import MediaThumb from "./MediaThumb";
import MediaPreviewModal from "./MediaPreviewModal";
import { releaseObjectUrls } from "./mediaPreview";

/* Drive — institutional catalogue (Drive Module spec v3).
 *
 * The spec re-positions Drive from a personal file manager into a tagged
 * repository: an item is found by WHAT it is (category, institution, status),
 * not by which folder someone happened to drop it in. This screen is that
 * catalogue; folder browsing still lives on the Files tab of the Drive page.
 */

const STATUS_TONE = {
  draft:        "bg-amber-100 text-amber-800",
  final:        "bg-emerald-100 text-emerald-800",
  needs_update: "bg-red-100 text-red-700",
};

const TYPE_ICON = {
  document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  image:    "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  video:    "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  audio:    "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z",
};

const CATEGORY_ICON = "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z";

const fmtSize = (n) => {
  if (!n) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = Number(n);
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
};

const labelOf = (list, key) => list?.find((o) => o.key === key)?.label || "";

const EMPTY_FORM = {
  category: "", sub_category: "", institution: "", title: "",
  file_type: "", edu_level: "", status: "draft", notes: "",
};

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none";
const lbl = "block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1";

/* Cards per row.
 *
 * Explicit rather than purely responsive: how many cards fit is a judgement
 * about how much detail you want to see per item, not only how wide the window
 * is. The choice is clamped to what the viewport can actually carry, so a 6-up
 * grid on a phone does not turn into six unreadable slivers.
 */
const COL_CHOICES = [2, 3, 4, 5, 6];

function useColumns() {
  const [choice, setChoice] = useState(() => {
    const saved = Number(localStorage.getItem("driveCols"));
    return COL_CHOICES.includes(saved) ? saved : 4;
  });
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The category rail eats ~240px, so the grid gets far less than the window.
  const max = width < 640 ? 1 : width < 900 ? 2 : width < 1200 ? 3 : 6;
  const pick = (n) => { setChoice(n); localStorage.setItem("driveCols", String(n)); };

  return { choice, effective: Math.min(choice, max), pick, capped: choice > max };
}

export default function DriveCatalogue() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [tax, setTax] = useState(null);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const category = searchParams.get("category") || "";
  const [filters, setFilters] = useState({
    sub_category: "", institution: "", file_type: "", edu_level: "", status: "", q: "",
  });

  const { choice: cols, effective: effectiveCols, pick: pickCols, capped } = useColumns();
  // Past four across there is not enough width for notes and secondary lines,
  // so the card sheds them rather than clipping everything.
  const dense = effectiveCols >= 4;

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    getTaxonomy()
      .then((r) => setTax(r.data?.data || null))
      .catch(() => setTax(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCatalogue({ ...filters, category });
      setItems(res.data?.data?.items || []);
      setCounts(res.data?.data?.category_counts || {});
    } catch {
      setItems([]); setCounts({});
    } finally {
      setLoading(false);
    }
  }, [filters, category]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, filters.q]);

  const categories = tax?.categories || [];
  const activeCategory = categories.find((c) => c.key === category) || null;
  const showsEduLevel = category === tax?.edu_level_category;

  const pickCategory = (key) => {
    setSearchParams(key ? { category: key } : {});
    // Sub-category keys only mean something inside their own category.
    setFilters((f) => ({ ...f, sub_category: "", edu_level: "" }));
  };

  // Item currently open in the preview overlay (null = closed).
  const [preview, setPreview] = useState(null);

  // Object URLs are shared between thumbnails and the preview; release them
  // when the page goes away so the blobs are not held for the whole session.
  useEffect(() => () => releaseObjectUrls(), []);

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([k, v]) => k !== "q" && v).length,
    [filters],
  );

  // Preview in place. Images and video play inline, PDFs frame, and external
  // links embed where the provider allows it — no more blind jump to a new tab.
  const openItem = (item) => setPreview(item);

  const download = async (item) => {
    if (item.is_link) { window.open(item.external_url, "_blank", "noopener"); return; }
    try {
      const res = await fileDownloadBlob(item.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = item.name; a.click();
      URL.revokeObjectURL(url);
    } catch {
      Swal.fire("Error", "Could not download this file.", "error");
    }
  };

  const remove = async (item) => {
    const ok = await Swal.fire({
      title: "Remove from Drive?",
      text: item.title || item.name,
      icon: "warning", showCancelButton: true, confirmButtonText: "Remove",
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    setBusy(true);
    try { await deleteFile(item.id); await load(); }
    catch { Swal.fire("Error", "Could not remove this item.", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Header total={items.length} onAdd={() => setAddOpen(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 mt-5">
        <CategoryRail
          categories={categories}
          counts={counts}
          active={category}
          onPick={pickCategory}
        />

        <div className="min-w-0">
          <FilterBar
            cols={cols}
            pickCols={pickCols}
            capped={capped}
            tax={tax}
            filters={filters}
            setFilter={setFilter}
            activeCategory={activeCategory}
            showsEduLevel={showsEduLevel}
            activeFilterCount={activeFilterCount}
            onClear={() => setFilters({ sub_category: "", institution: "", file_type: "", edu_level: "", status: "", q: "" })}
          />

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-7 h-7 border-2 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState hasFilters={activeFilterCount > 0 || !!filters.q} onAdd={() => setAddOpen(true)} />
          ) : (
            <div className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))` }}>
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  tax={tax}
                  busy={busy}
                  dense={dense}
                  onOpen={() => openItem(item)}
                  onDownload={() => download(item)}
                  onEdit={() => setEditing(item)}
                  onDelete={() => remove(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {addOpen && (
        <AddDialog
          tax={tax}
          defaultCategory={category}
          onClose={() => setAddOpen(false)}
          onSaved={async () => { setAddOpen(false); await load(); }}
        />
      )}

      {preview && (
        <MediaPreviewModal
          key={preview.id}
          item={preview}
          onClose={() => setPreview(null)}
          onDownload={(it) => download(it)}
        />
      )}

      {editing && (
        <EditDialog
          tax={tax}
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

function Header({ total, onAdd }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={CATEGORY_ICON} />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Drive</h1>
          <p className="text-xs text-gray-500">
            WEN&apos;s internal repository — {total} item{total === 1 ? "" : "s"} in view
          </p>
        </div>
      </div>
      <button onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-xs font-semibold hover:from-teal-700 hover:to-cyan-700 shadow-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add to Drive
      </button>
    </div>
  );
}

/* Category rail. Part 1 categories are marked "Ready" because the spec loads
 * those three first and the rest arrive in later phases — without the marker
 * every category looks equally populated when most are still empty. */
function CategoryRail({ categories, counts, active, onPick }) {
  const total = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0);
  return (
    <aside className="lg:sticky lg:top-4 self-start">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
        <button onClick={() => onPick("")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
            !active ? "bg-teal-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}>
          <span>All categories</span>
          <span className={!active ? "text-teal-100" : "text-gray-400"}>{total}</span>
        </button>

        <div className="mt-1 space-y-0.5 max-h-[60vh] overflow-y-auto">
          {categories.map((c) => {
            const n = Number(counts[c.key] || 0);
            const on = active === c.key;
            return (
              <button key={c.key} onClick={() => onPick(c.key)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                  on ? "bg-teal-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}>
                <span className="min-w-0">
                  <span className="block text-xs font-medium truncate">{c.label}</span>
                  {c.immediate && (
                    <span className={`text-[9px] font-semibold uppercase tracking-wide ${on ? "text-teal-100" : "text-teal-600"}`}>
                      Ready
                    </span>
                  )}
                </span>
                <span className={`text-[11px] font-semibold flex-shrink-0 ${on ? "text-teal-100" : n ? "text-gray-500" : "text-gray-300"}`}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function FilterBar({ tax, filters, setFilter, activeCategory, showsEduLevel, activeFilterCount, onClear, cols, pickCols, capped }) {
  const sel = "px-2.5 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none";
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={filters.q} onChange={(e) => setFilter("q", e.target.value)}
            placeholder="Search title, file name or notes…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none" />
        </div>

        {/* Sub-category only makes sense once a category narrows the list. */}
        {activeCategory && (
          <select value={filters.sub_category} onChange={(e) => setFilter("sub_category", e.target.value)} className={sel}>
            <option value="">All sub-categories</option>
            {activeCategory.subs.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        )}

        <select value={filters.institution} onChange={(e) => setFilter("institution", e.target.value)} className={sel}>
          <option value="">All institutions</option>
          {(tax?.institutions || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>

        <select value={filters.file_type} onChange={(e) => setFilter("file_type", e.target.value)} className={sel}>
          <option value="">All file types</option>
          {(tax?.file_types || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>

        {showsEduLevel && (
          <select value={filters.edu_level} onChange={(e) => setFilter("edu_level", e.target.value)} className={sel}>
            <option value="">All edu levels</option>
            {(tax?.edu_levels || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        )}

        <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className={sel}>
          <option value="">Any status</option>
          {(tax?.statuses || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>

        {(activeFilterCount > 0 || filters.q) && (
          <button onClick={onClear} className="text-xs font-medium text-teal-600 hover:text-teal-700 px-2">
            Clear
          </button>
        )}

        {/* Cards per row. Hidden below lg because the viewport already
          * dictates the count there and the control would only mislead. */}
        <div className="hidden lg:flex items-center gap-1.5 ml-auto" title={capped ? "Limited by the window width" : "Cards per row"}>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Per row</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {COL_CHOICES.map((n) => (
              <button key={n} type="button" onClick={() => pickCols(n)}
                className={`w-7 py-1 text-[11px] font-semibold transition-colors ${cols === n ? "bg-teal-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, tax, busy, dense, onOpen, onDownload, onEdit, onDelete }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md hover:border-teal-200 transition-all ${dense ? "p-2 gap-1.5" : "p-3 gap-2.5"}`}>
      {/* Real preview instead of a grey placeholder — this is what makes the
          grid scannable at a glance. */}
      <div className="relative">
        <MediaThumb item={item} onClick={onOpen} />
        {item.status && (
          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${STATUS_TONE[item.status] || "bg-gray-100 text-gray-600"}`}>
            {labelOf(tax?.statuses, item.status)}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <button onClick={onOpen} className="text-left w-full">
          <p className={`font-semibold text-gray-900 leading-snug break-words hover:text-teal-700 line-clamp-2 ${dense ? "text-xs" : "text-sm"}`}>
            {item.title || item.name}
          </p>
        </button>
        {!dense && item.name !== item.title && (
          <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.name}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {item.institution && (
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-semibold">{item.institution}</span>
        )}
        {item.sub_category && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-semibold">
            {labelOf(tax?.categories?.find((c) => c.key === item.category)?.subs, item.sub_category) || item.sub_category}
          </span>
        )}
        {item.edu_level && (
          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-semibold">
            {labelOf(tax?.edu_levels, item.edu_level)}
          </span>
        )}
        {item.is_link && (
          <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-md text-[10px] font-semibold">Link</span>
        )}
      </div>

      {!dense && item.notes && <p className="text-[11px] text-gray-500 line-clamp-2">{item.notes}</p>}

      <div className={`flex items-center justify-between border-t border-gray-100 mt-auto ${dense ? "pt-1.5" : "pt-2"}`}>
        <span className="text-[10px] text-gray-400 truncate">
          {dense
            ? fmtDate(item.created_at)
            : `${item.creator?.name || "—"} · ${fmtDate(item.created_at)}${item.size ? ` · ${fmtSize(item.size)}` : ""}`}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <IconBtn title="Open" onClick={onOpen} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" tone="text-teal-600 hover:bg-teal-50" />
          {!item.is_link && (
            <IconBtn title="Download" onClick={onDownload} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" tone="text-gray-500 hover:bg-gray-100" />
          )}
          <IconBtn title="Edit details" onClick={onEdit} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" tone="text-blue-600 hover:bg-blue-50" />
          <IconBtn title="Remove" onClick={onDelete} disabled={busy} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" tone="text-red-600 hover:bg-red-50" />
        </div>
      </div>
    </div>
  );
}

function IconBtn({ title, onClick, d, tone, disabled }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${tone}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
      </svg>
    </button>
  );
}

function EmptyState({ hasFilters, onAdd }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={CATEGORY_ICON} />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-700 mt-4">
        {hasFilters ? "Nothing matches these filters" : "Nothing catalogued here yet"}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {hasFilters ? "Try clearing a filter." : "Add the first item to start building this category."}
      </p>
      {!hasFilters && (
        <button onClick={onAdd} className="mt-4 px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl">
          Add to Drive
        </button>
      )}
    </div>
  );
}

/* Shared catalogue fields, used by both dialogs so the vocabulary and the
 * category/sub-category dependency are defined once. */
function CatalogueFields({ tax, form, set }) {
  const cat = (tax?.categories || []).find((c) => c.key === form.category);
  const showsEdu = form.category === tax?.edu_level_category;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Category</label>
          <select value={form.category} className={inp}
            onChange={(e) => set({ category: e.target.value, sub_category: "", edu_level: "" })}>
            <option value="">Uncategorised</option>
            {(tax?.categories || []).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Sub-category</label>
          <select value={form.sub_category} className={inp} disabled={!cat}
            onChange={(e) => set({ sub_category: e.target.value })}>
            <option value="">{cat ? "None" : "Pick a category first"}</option>
            {(cat?.subs || []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Title</label>
          <input value={form.title} onChange={(e) => set({ title: e.target.value })}
            placeholder="Short descriptive name" className={inp} />
        </div>
        <div>
          <label className={lbl}>Institution</label>
          <select value={form.institution} className={inp} onChange={(e) => set({ institution: e.target.value })}>
            <option value="">Not set</option>
            {(tax?.institutions || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>File type</label>
          <select value={form.file_type} className={inp} onChange={(e) => set({ file_type: e.target.value })}>
            <option value="">Detect automatically</option>
            {(tax?.file_types || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        {/* Spec: edu level applies to the Waiting-Room Edu category only. */}
        {showsEdu && (
          <div>
            <label className={lbl}>Edu level / age group</label>
            <select value={form.edu_level} className={inp} onChange={(e) => set({ edu_level: e.target.value })}>
              <option value="">Not set</option>
              {(tax?.edu_levels || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={lbl}>Status</label>
          <select value={form.status} className={inp} onChange={(e) => set({ status: e.target.value })}>
            {(tax?.statuses || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Notes</label>
          <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2}
            placeholder="Usage restrictions, source, version history…" className={inp} />
        </div>
      </div>
    </>
  );
}

function Dialog({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddDialog({ tax, defaultCategory, onClose, onSaved }) {
  const [mode, setMode] = useState("upload");     // upload | link
  const [form, setForm] = useState({ ...EMPTY_FORM, category: defaultCategory || "" });
  const [files, setFiles] = useState([]);
  const [link, setLink] = useState({ name: "", external_url: "", media_type: "file" });
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const canSave = mode === "upload" ? files.length > 0 : link.name && link.external_url;

  const submit = async () => {
    setSaving(true);
    try {
      if (mode === "upload") await uploadFiles(null, files, form);
      else await addLink(null, link.name, link.external_url, link.media_type, form);
      await onSaved();
    } catch (e) {
      const errs = e.response?.data?.errors;
      Swal.fire("Could not save", errs ? Object.values(errs).flat().join("\n") : (e.response?.data?.message || "Something went wrong."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="Add to Drive" subtitle="Catalogue details apply to everything in this upload." onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs w-fit">
          {["upload", "link"].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 font-semibold ${mode === m ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              {m === "upload" ? "Upload files" : "Add a link"}
            </button>
          ))}
        </div>

        {mode === "upload" ? (
          <div>
            <label className={lbl}>Files</label>
            <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))}
              className="w-full text-xs file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 file:text-xs file:font-semibold" />
            {files.length > 1 && (
              <p className="text-[11px] text-gray-500 mt-1">
                {files.length} files — each keeps its own file name as its title.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Link name</label>
              <input value={link.name} onChange={(e) => setLink((l) => ({ ...l, name: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Renders as</label>
              <select value={link.media_type} onChange={(e) => setLink((l) => ({ ...l, media_type: e.target.value }))} className={inp}>
                <option value="file">File</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>URL</label>
              <input value={link.external_url} onChange={(e) => setLink((l) => ({ ...l, external_url: e.target.value }))}
                placeholder="https://…" dir="ltr" className={inp} />
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <CatalogueFields tax={tax} form={form} set={set} />
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
        <button onClick={submit} disabled={!canSave || saving}
          className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl disabled:opacity-40">
          {saving ? "Saving…" : "Save to Drive"}
        </button>
      </div>
    </Dialog>
  );
}

function EditDialog({ tax, item, onClose, onSaved }) {
  const [form, setForm] = useState({
    category: item.category || "", sub_category: item.sub_category || "",
    institution: item.institution || "", title: item.title || item.name || "",
    file_type: item.file_type || "", edu_level: item.edu_level || "",
    status: item.status || "draft", notes: item.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    setSaving(true);
    try { await saveCatalogue(item.id, form); await onSaved(); }
    catch (e) {
      const errs = e.response?.data?.errors;
      Swal.fire("Could not save", errs ? Object.values(errs).flat().join("\n") : "Something went wrong.", "error");
    } finally { setSaving(false); }
  };

  return (
    <Dialog title="Catalogue details" subtitle={item.name} onClose={onClose}>
      <div className="p-5">
        <CatalogueFields tax={tax} form={form} set={set} />
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl disabled:opacity-40">
          {saving ? "Saving…" : "Save details"}
        </button>
      </div>
    </Dialog>
  );
}
