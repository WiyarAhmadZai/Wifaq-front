import { useCallback, useEffect, useRef, useState } from "react";
import { get, post } from "../api/axios";

/**
 * The HR welcome letter, viewable in English / Dari / Pashto, printable, and
 * downloadable as PDF.
 *
 * Two modes, one component:
 *   • `staffId`  — HR opens any staff member's letter from /hr/staff.
 *   • `selfMode` — the signed-in user's own copy, shown once on first login.
 *
 * The letter is a complete HTML document (same Blade template the email and the
 * PDF use), so it renders inside an <iframe> rather than in the page: that
 * keeps its RTL direction, Amiri font and print layout from leaking into — or
 * being overridden by — the app's Tailwind styles.
 */

const LANGS = [
  { code: "en", label: "English" },
  { code: "fa", label: "دری" },
  { code: "ps", label: "پښتو" },
  { code: "ar", label: "العربية" },
];

export default function WelcomeLetterModal({
  staffId = null,
  staffName = "",
  selfMode = false,
  defaultLang = "fa",
  // { en: '<html>…', … } already fetched by the caller. The first-login wizard
  // passes what its own /profile/welcome-letter check returned, so the letter
  // is never rendered server-side twice for the same page load.
  initialLetters = null,
  onClose,
}) {
  const [lang, setLang] = useState(defaultLang);
  // Filled lazily per language in HR mode; all three at once in self mode
  // (the /profile endpoint returns every language in one hit).
  const [letters, setLetters] = useState(initialLetters || {});
  const [loading, setLoading] = useState(!initialLetters);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const frameRef = useRef(null);

  const html = letters[lang];

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    const load = async () => {
      // Already have this language cached from an earlier tab click.
      if (letters[lang]) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (selfMode) {
          const res = await get("/profile/welcome-letter", { cache: false });
          const payload = res.data?.data;
          const map = {};
          Object.entries(payload?.letters || {}).forEach(([code, v]) => {
            map[code] = v.html;
          });
          if (alive) setLetters(map);
        } else {
          const res = await get(`/hr/staff/${staffId}/welcome-letter?lang=${lang}`, {
            cache: false,
            // The endpoint streams HTML, not the JSON envelope axios defaults to.
            headers: { Accept: "text/html" },
            responseType: "text",
          });
          if (alive) setLetters((prev) => ({ ...prev, [lang]: res.data }));
        }
      } catch (e) {
        if (alive) {
          setError(
            e?.response?.status === 403
              ? "You do not have permission to view this letter."
              : "Could not load the welcome letter."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
    // `letters` is deliberately not a dependency — including it would re-run
    // the effect on every successful fetch and loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, staffId, selfMode]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }, []);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const url = selfMode
        ? `/profile/welcome-letter/pdf?lang=${lang}`
        : `/hr/staff/${staffId}/welcome-letter?lang=${lang}&format=pdf`;
      const res = await get(url, {
        cache: false,
        responseType: "blob",
        headers: { Accept: "application/pdf" },
      });
      const blobUrl = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" })
      );
      const slug = (staffName || "staff").trim().toLowerCase().replace(/\s+/g, "-");
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `welcome-letter-${slug}-${lang}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a tick to start the download before revoking.
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [lang, selfMode, staffId, staffName]);

  const handleClose = useCallback(async () => {
    // In self mode, closing IS the acknowledgement — the wizard never reopens.
    if (selfMode) {
      try {
        await post("/profile/welcome-letter/ack");
      } catch {
        // Non-fatal: worst case the user sees the letter once more.
      }
    }
    onClose?.();
  }, [selfMode, onClose]);

  // Esc closes, matching every other modal in the app.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-teal-800 text-white">
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">
              {selfMode ? "Welcome to Wifaq" : "Welcome Letter"}
            </h2>
            {staffName && (
              <p className="text-teal-200 text-[11px] truncate">{staffName}</p>
            )}
          </div>

          {/* Language switcher */}
          <div className="flex items-center gap-1 bg-teal-900/50 rounded-lg p-0.5 shrink-0">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  lang === l.code
                    ? "bg-white text-teal-800"
                    : "text-teal-100 hover:text-white"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleClose}
            className="text-teal-200 hover:text-white shrink-0"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Letter */}
        <div className="flex-1 min-h-0 bg-[#F0EEE9]">
          {loading && (
            <div className="h-full min-h-[50vh] flex items-center justify-center">
              <div className="animate-spin rounded-full h-9 w-9 border-4 border-teal-100 border-t-teal-600" />
            </div>
          )}
          {!loading && error && (
            <div className="h-full min-h-[50vh] flex items-center justify-center px-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {!loading && !error && html && (
            <iframe
              ref={frameRef}
              srcDoc={html}
              title="Welcome letter"
              className="w-full h-[65vh] border-0 bg-white"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-white">
          <button
            onClick={handlePrint}
            disabled={loading || !!error}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button
            onClick={handleDownload}
            disabled={loading || !!error || downloading}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? "Preparing…" : "Download PDF"}
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {selfMode ? "Got it" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
