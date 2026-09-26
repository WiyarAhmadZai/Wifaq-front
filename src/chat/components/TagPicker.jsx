import { useEffect, useRef, useState } from "react";
import { TAGS, tagByKey } from "../tags";

/**
 * The tag control in the composer, and the little marker everywhere a tagged
 * message is shown.
 *
 * `TagChip` is the read-only marker — icon plus label in the list, icon alone
 * where space is tight. `TagPicker` is the button beside Send: it shows the
 * current choice, opens the six options with their meanings, and always offers
 * "No tag", because a suggestion that cannot be refused is not a suggestion.
 */

/** The marker shown in the inbox list, on a bubble, or beside a subject. */
export function TagChip({ tag, size = "sm", iconOnly = false, title }) {
  const t = tagByKey(tag);
  if (!t) return null;

  const label = title || `${t.label} — ${t.hint}`;

  if (iconOnly) {
    return (
      <span title={label} aria-label={label}
        className={size === "xs" ? "text-[10px] leading-none" : "text-xs leading-none"}>
        {t.icon}
      </span>
    );
  }

  /* Deliberately slight. A tag is a hint about a message, not a headline over
     it — at full weight it read as louder than the words underneath. */
  return (
    <span title={label}
      className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap leading-none ${
        size === "xs" ? "px-1.5 py-[3px] text-[9px]" : "px-2 py-0.5 text-[10px] border"
      }`}
      style={{ color: t.fg, background: t.bg, borderColor: t.border }}>
      <span className="leading-none">{t.icon}</span>
      <span>{t.label}</span>
    </span>
  );
}

/** The picker beside Send. `suggested` lights up a tag this draft looks like. */
export default function TagPicker({ value, onChange, suggested }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const current = tagByKey(value);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const pick = (key) => { onChange(key); setOpen(false); };

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={current ? `${current.label} — ${current.hint}` : "Mark what kind of message this is"}
        className="p-2 rounded-lg transition-colors flex items-center justify-center w-9 h-9"
        style={current
          ? { color: current.fg, background: current.bg, boxShadow: `inset 0 0 0 1px ${current.border}` }
          : undefined}
      >
        {current
          ? <span className="text-sm leading-none">{current.icon}</span>
          : <TagGlyph className={`w-5 h-5 ${suggested ? "text-teal-500" : "text-gray-400"}`} />}
        {/* Something was suggested but not chosen yet — a quiet dot, not a
            dialog, so a suggestion never interrupts writing. */}
        {!current && suggested && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-teal-500" />
        )}
      </button>

      {open && (
        <div role="menu"
          className="absolute bottom-full mb-2 end-0 w-64 p-1.5 bg-white rounded-2xl shadow-xl border z-40"
          style={{ borderColor: "#D0E0E0" }}>
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            What kind of message is this?
          </div>

          {TAGS.map((t) => {
            const active = value === t.key;
            return (
              <button key={t.key} type="button" role="menuitem" onClick={() => pick(t.key)}
                className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-xl text-start transition-colors ${
                  active ? "" : "hover:bg-gray-50"
                }`}
                style={active ? { background: t.bg } : undefined}>
                <span className="text-sm leading-5">{t.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold" style={{ color: t.fg }}>
                    {t.label}
                    {suggested === t.key && !active && (
                      <span className="ms-1.5 font-normal text-[9px] text-teal-600">suggested</span>
                    )}
                  </span>
                  <span className="block text-[10px] text-gray-500 truncate">{t.hint}</span>
                </span>
                {active && <span className="text-[10px]" style={{ color: t.fg }}>✓</span>}
              </button>
            );
          })}

          <button type="button" role="menuitem" onClick={() => pick(null)}
            className="w-full mt-1 px-2 py-1.5 rounded-xl text-start text-xs text-gray-500 hover:bg-gray-50 border-t"
            style={{ borderColor: "#EEF4F4" }}>
            No tag
          </button>
        </div>
      )}
    </div>
  );
}

function TagGlyph({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 10V5a2 2 0 012-2z" />
    </svg>
  );
}
