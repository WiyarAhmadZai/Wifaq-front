import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A print-only sheet: shows an on-screen preview of exactly what will come out
 * of the printer, and prints just that.
 *
 * Why a portal: the printable content normally sits deep inside the app
 * Layout (sidebar + topbar + scroll containers). Printing it in place drags all
 * that chrome onto the page. Portalling to <body> puts the sheet OUTSIDE #root,
 * so the print CSS can `display: none` the whole app in one rule — the same
 * approach the payroll receipt already uses, and the reason it prints one clean
 * page instead of several phantom ones.
 *
 * Two preview modes:
 *   • bleed  — a fixed-layout document (the certificate). Its type is sized in
 *              px for a full page, so the preview renders it at exact design
 *              size and SCALES it. Shrinking the box instead clipped the
 *              artwork, which is exactly what it used to do.
 *   • normal — fluid documents (run sheets). Capped width, scrolls if long.
 */

/** Design size of a full page at ~96dpi, in CSS px. */
const PAGE = {
  portrait:  { w: 794,  h: 1123 },
  landscape: { w: 1123, h: 794 },
};

/** Room the toolbar + modal padding take out of the viewport. */
const CHROME_Y = 150;
const CHROME_X = 80;
export default function PrintSheet({ open, onClose, size = "A4", orientation = "portrait",
                                    title = "Print", bleed = false, actions = null, children }) {
  // Esc closes the preview — printing shouldn't trap the user.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    // The preview is a modal; stop the page behind it from scrolling.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const page0 = PAGE[orientation] || PAGE.portrait;
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open || !bleed) return;
    const fit = () => setScale(Math.max(0.25, Math.min(
      1,
      (window.innerHeight - CHROME_Y) / page0.h,
      (window.innerWidth - CHROME_X) / page0.w,
    )));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [open, bleed, page0.w, page0.h]);

  if (!open) return null;

  const page = PAGE[orientation] || PAGE.portrait;
  const shellWidth = bleed ? page.w * scale : (orientation === "landscape" ? 980 : 760);

  return createPortal(
    <div className="wen-print-host fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm overflow-y-auto p-4 sm:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>

      <style>{`
        @media print {
          @page { size: ${size} ${orientation}; margin: ${bleed ? "6mm" : "12mm"}; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          /* Hide the whole app — the sheet lives outside #root. */
          body > #root { display: none !important; }
          /* The overlay becomes the page itself. */
          .wen-print-host {
            position: static !important;
            inset: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            backdrop-filter: none !important;
            overflow: visible !important;
            z-index: auto !important;
          }
          .wen-print-paper {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          /* The on-screen fit-to-viewport scaling must not reach the printer —
             the page is already the right size there. */
          .wen-print-scale {
            transform: none !important;
            width: 100% !important;
            height: auto !important;
          }
          .wen-print-hide { display: none !important; }
          /* Keep the brand colours — browsers drop backgrounds by default. */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          tr, .wen-no-break { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      {/* Preview toolbar — never printed. */}
      <div className="wen-print-hide mx-auto mb-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ width: shellWidth, maxWidth: "100%" }}>
        <div className="text-white">
          <div className="text-sm font-bold">{title}</div>
          <div className="text-[11px] opacity-70">Preview — this is exactly what prints.</div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {actions}
          <button onClick={() => window.print()}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "#0D5C63" }}>
            🖨 Print
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/15 text-white hover:bg-white/25">
            Close
          </button>
        </div>
      </div>

      {bleed ? (
        // Fixed-layout page: render at design size, scale to fit. The outer box
        // takes the scaled footprint so the modal reserves no dead space.
        <div className="wen-print-paper bg-white mx-auto rounded-xl shadow-2xl overflow-hidden"
          style={{ width: shellWidth, height: page.h * scale }}>
          <div className="wen-print-scale" id="wen-print-content"
            style={{ width: page.w, height: page.h, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {children}
          </div>
        </div>
      ) : (
        <div className="wen-print-paper bg-white mx-auto rounded-xl shadow-2xl p-10"
          style={{ width: shellWidth, maxWidth: "100%" }}>
          {children}
        </div>
      )}
    </div>,
    document.body
  );
}

/** Shared letterhead for anything printed out of the education module. */
export function PrintHeader({ subtitle }) {
  return (
    <div className="text-center border-b-2 pb-4 mb-6" style={{ borderColor: "#0D5C63" }}>
      <div className="text-lg font-bold tracking-wide" style={{ color: "#0D5C63" }}>
        Wifaq Education Network
      </div>
      {subtitle && <div className="text-[11px] uppercase tracking-[2px] text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}
