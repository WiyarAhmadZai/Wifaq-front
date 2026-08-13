import { useCallback, useEffect, useRef, useState } from "react";
import { get } from "../api/axios";

/**
 * "Download Your Welcome Letter" — a button that first asks which language,
 * then downloads that language's PDF.
 *
 * Used on the user's own profile. The PDF is rendered server-side from the same
 * Blade template as the emailed and printed copies, so all three always match.
 */

const LANGS = [
  { code: "ps", label: "پښتو", english: "Pashto" },
  { code: "fa", label: "دری", english: "Dari" },
  { code: "en", label: "English", english: "English" },
];

export default function WelcomeLetterDownload({ userName = "" }) {
  const [open, setOpen] = useState(false);
  const [busyLang, setBusyLang] = useState(null);
  const [error, setError] = useState(null);
  const wrapRef = useRef(null);

  // Close on outside click and on Esc, like the other popovers on this page.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const download = useCallback(
    async (lang) => {
      setBusyLang(lang);
      setError(null);
      try {
        const res = await get(`/profile/welcome-letter/pdf?lang=${lang}`, {
          cache: false,
          responseType: "blob",
          headers: { Accept: "application/pdf" },
        });
        const url = window.URL.createObjectURL(
          new Blob([res.data], { type: "application/pdf" })
        );
        const slug = (userName || "staff").trim().toLowerCase().replace(/\s+/g, "-");
        const a = document.createElement("a");
        a.href = url;
        a.download = `welcome-letter-${slug}-${lang}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Give the browser a tick to start the download before revoking.
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        setOpen(false);
      } catch {
        setError("Could not generate the PDF. Please try again.");
      } finally {
        setBusyLang(null);
      }
    },
    [userName]
  );

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 bg-white text-teal-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
        title="Download your welcome letter as a PDF"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Your Welcome Letter
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-700">Choose a language</p>
            <p className="text-[10px] text-gray-400">The PDF downloads in the language you pick.</p>
          </div>

          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => download(l.code)}
              disabled={busyLang !== null}
              className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-teal-50 disabled:opacity-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-800">{l.label}</span>
              {busyLang === l.code ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-teal-200 border-t-teal-600 animate-spin" />
              ) : (
                <span className="text-[10px] text-gray-400">{l.english}</span>
              )}
            </button>
          ))}

          {error && (
            <p className="px-3 py-2 text-[11px] text-red-600 border-t border-gray-100">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
