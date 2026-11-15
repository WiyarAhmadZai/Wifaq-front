import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nContext";

/**
 * The language picker in the top bar: English · دری · پښتو.
 *
 * Picking one flips the whole interface — every label, button, table heading
 * and alert the system ships with — and remembers the choice for next time.
 * Anything typed in by a user or held in the database keeps the language it
 * was written in.
 */
export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, languages } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const active = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className="relative" ref={box} data-no-i18n>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-teal-700 hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
        </svg>
        {!compact && <span className="hidden sm:inline">{active.short}</span>}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute end-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50"
        >
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === lang}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs transition-colors ${
                l.code === lang ? "bg-teal-50 text-teal-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={l.dir === "rtl" ? "text-sm" : ""} style={l.dir === "rtl" ? { fontFamily: "Vazirmatn, 'Noto Naskh Arabic', sans-serif" } : undefined}>
                  {l.native}
                </span>
                {l.native !== l.label && <span className="text-[10px] text-gray-400">{l.label}</span>}
              </span>
              {l.code === lang && (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
