import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Full-screen image viewer.
 *
 * Shows the image at its NATURAL size — the point is to see the photo as it
 * was uploaded, not a re-scaled thumbnail. Anything larger than the viewport
 * is shrunk to fit (a 4000px portrait scaled to fit is still the whole
 * picture; one cropped to 4000px is not), and a click toggles between fit and
 * 1:1 so a large image can still be inspected at full resolution.
 */
export default function ImageLightbox({ src, alt, onClose }) {
  const [actualSize, setActualSize] = useState(false);
  const [dims, setDims] = useState(null);

  // Escape closes. Registered on the window so it works before the image has
  // loaded and regardless of what holds focus.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // Lock the page behind the overlay; scrolling it while a full-screen
    // image is open just moves content the user cannot see.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 overflow-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {dims && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-white text-[11px]">
          {dims.w} × {dims.h} px · click the image to {actualSize ? "fit to screen" : "view actual size"} · Esc to close
        </div>
      )}

      <img
        src={src}
        alt={alt || "Profile photo"}
        onLoad={(e) => setDims({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
        onClick={() => setActualSize((v) => !v)}
        className={
          actualSize
            ? "max-w-none cursor-zoom-out"
            : "max-w-full max-h-[90vh] object-contain cursor-zoom-in"
        }
      />
    </div>,
    document.body
  );
}
