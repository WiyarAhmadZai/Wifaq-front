import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Select2-style teacher picker: type to search, pick several, each name
 * carrying its own counts.
 *
 * A plain <select multiple> is unusable once a school has thirty teachers —
 * you cannot search it, and ctrl-clicking to add a second name is a trick most
 * people never find. This is a text box that filters, chips for what is
 * chosen, and the counts beside every name so "who has how much waiting" is
 * answered before you even select anyone.
 *
 * `options` is [{ id, name, total, in_review, approved, returned }].
 */

const TEAL = "#0D5C63";

export default function TeacherMultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = "All teachers",
  // Which count to print beside each name, and what to call it.
  countKey = "in_review",
  countLabel = "in review",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);

  // Click-away closes the list. Without it the panel stays over the cards.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = useMemo(
    () => options.filter((o) => value.includes(o.id)),
    [options, value],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => (o.name || "").toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div ref={boxRef} className="relative min-w-[15rem]">
      {/* The control itself: chips for what is picked, or the placeholder. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-1.5 flex-wrap px-2.5 py-1.5 rounded-xl border bg-white text-left transition-colors hover:border-teal-400"
        style={{ borderColor: open ? TEAL : "#dbe8e8", minHeight: "2.25rem" }}
      >
        {selected.length === 0 ? (
          <span className="text-[11px] font-bold text-gray-400">{placeholder}</span>
        ) : (
          selected.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold"
              style={{ background: "#E8F6F6", color: TEAL }}
            >
              {o.name}
              <span
                role="button"
                tabIndex={-1}
                title="Remove"
                onClick={(e) => { e.stopPropagation(); toggle(o.id); }}
                className="opacity-60 hover:opacity-100"
              >
                ✕
              </span>
            </span>
          ))
        )}
        <span className="ms-auto text-[10px] text-gray-400">▾</span>
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 w-full rounded-xl border bg-white shadow-lg overflow-hidden"
          style={{ borderColor: "#dbe8e8" }}
        >
          <div className="p-2 border-b" style={{ borderColor: "#eef4f4" }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teacher name…"
              className="w-full px-2.5 py-1.5 rounded-lg text-[11px] border focus:outline-none"
              style={{ borderColor: "#dbe8e8" }}
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {shown.length === 0 && (
              <p className="px-3 py-3 text-[11px] text-gray-400">No teacher matches that.</p>
            )}
            {shown.map((o) => {
              const on = value.includes(o.id);
              return (
                <label
                  key={o.id}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${on ? "bg-teal-50" : "hover:bg-gray-50"}`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(o.id)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-[11px] font-bold text-gray-700 flex-1 truncate">{o.name}</span>
                  {/* The whole point of the picker: how much, and in what state. */}
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <Count n={o[countKey]} label={countLabel} tone={{ bg: "#fbf0db", fg: "#9a6a12" }} />
                    <Count n={o.approved} label="approved" tone={{ bg: "#e6f3ec", fg: "#2E7D5B" }} />
                    {o.returned > 0 && (
                      <Count n={o.returned} label="returned" tone={{ bg: "#f7e3e1", fg: "#C0473F" }} />
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          {value.length > 0 && (
            <button
              type="button"
              onClick={() => { onChange([]); setQuery(""); }}
              className="w-full px-3 py-2 text-[11px] font-bold border-t hover:bg-gray-50"
              style={{ borderColor: "#eef4f4", color: TEAL }}
            >
              Clear teacher filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Count({ n, label, tone }) {
  return (
    <span
      title={`${n} ${label}`}
      className="px-1.5 py-0.5 rounded text-[9px] font-black leading-none"
      style={{ background: tone.bg, color: tone.fg, opacity: n ? 1 : 0.35 }}
    >
      {n || 0}
    </span>
  );
}
