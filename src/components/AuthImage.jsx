import { useEffect, useState } from "react";
import api from "../api/axios";

/**
 * Pictures of children, shown honestly.
 *
 * Two kinds of image URL exist in this app and they cannot be mixed:
 *
 *   • a signed Drive URL — minted by the server into a payload the caller was
 *     already allowed to read, so a plain <img src> works;
 *   • a private API route (an observation photo, a gallery file's /raw) —
 *     authenticated with a bearer token, which an <img> tag cannot carry, so
 *     the bytes have to be fetched and handed to the browser as an object URL.
 *
 * `AuthImage` renders the second kind and releases the object URL on unmount;
 * a leaked blob URL keeps the whole photograph in memory for the tab's life.
 *
 * `FullScreenImage` is the zoom: one image, the whole viewport, and a ✕ that
 * puts the screen back exactly where it was — it never navigates, so the tab
 * the viewer was opened from is still the tab they come home to.
 */

/** @param {{src:string, alt?:string, className?:string, onClick?:Function, title?:string}} p */
export function AuthImage({ src, alt, className, onClick, title }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let alive = true;

    api
      .get(src, { responseType: "blob" })
      .then((r) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(r.data);
        setUrl(objectUrl);
      })
      .catch(() => alive && setFailed(true));

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 text-[10px] text-gray-400`}>
        unavailable
      </div>
    );
  }
  if (!url) {
    return <div className={`${className} bg-gray-100 animate-pulse`} />;
  }
  return <img src={url} alt={alt} title={title} onClick={onClick} className={className} />;
}

/**
 * Full-page zoom.
 *
 * Give it `src` for a URL the browser can fetch on its own, or `authSrc` for a
 * private API route. Esc, the ✕, the caption bar's backdrop and a click on the
 * dark all close it; the image itself swallows the click so zooming in on a
 * face does not throw the viewer away.
 */
export function FullScreenImage({ src, authSrc, alt = "", caption, onClose }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(4, s + 0.25));
      if (e.key === "-") setScale((s) => Math.max(1, s - 0.25));
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll while a child's photo fills the screen.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const image = {
    alt,
    onClick: (e) => e.stopPropagation(),
    onDoubleClick: () => setScale((s) => (s > 1 ? 1 : 2)),
    style: { transform: `scale(${scale})`, transition: "transform .18s ease-out" },
    className: "max-h-[86vh] max-w-full object-contain rounded-lg select-none cursor-zoom-in",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Image"}
      className="fixed inset-0 z-[1000] bg-black/92 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      {/* The ✕ is the way out — top right, where a closed thing is looked for. */}
      <button
        type="button"
        onClick={onClose}
        title="Close"
        aria-label="Close"
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white
                   text-2xl leading-none flex items-center justify-center transition-colors"
      >
        ✕
      </button>

      {authSrc ? <AuthImage src={authSrc} {...image} /> : <img src={src} {...image} />}

      {(caption || scale !== 1) && (
        <div className="mt-3 flex items-center gap-3 text-white/80 text-xs" onClick={(e) => e.stopPropagation()}>
          {caption ? <bdi dir="auto" className="max-w-[70vw] truncate">{caption}</bdi> : null}
          <button type="button" onClick={() => setScale(scale > 1 ? 1 : 2)}
            className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-semibold">
            {scale > 1 ? "Zoom out" : "Zoom in"}
          </button>
        </div>
      )}
    </div>
  );
}
