import { useEffect, useRef, useState } from "react";
import { fileObjectUrl, isThumbnailable, previewKind } from "./mediaPreview";

/**
 * Card thumbnail.
 *
 * Real images and video frames are painted for internal media; everything else
 * gets a typed icon tile rather than a generic grey square. Bytes are only
 * fetched once the card scrolls into view, so a catalogue of hundreds does not
 * download every image on load.
 */

const TILE = {
  image: { bg: "bg-teal-50", fg: "text-teal-600", d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  video: { bg: "bg-rose-50", fg: "text-rose-600", d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  audio: { bg: "bg-amber-50", fg: "text-amber-600", d: "M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z" },
  pdf: { bg: "bg-red-50", fg: "text-red-600", d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  embed: { bg: "bg-cyan-50", fg: "text-cyan-600", d: "M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5m6.5-6.5l1.5-1.5a4 4 0 115.656 5.656l-3 3a4 4 0 01-5.656 0" },
  link: { bg: "bg-cyan-50", fg: "text-cyan-600", d: "M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5m6.5-6.5l1.5-1.5a4 4 0 115.656 5.656l-3 3a4 4 0 01-5.656 0" },
  file: { bg: "bg-gray-100", fg: "text-gray-500", d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
};

export default function MediaThumb({ item, onClick }) {
  const kind = previewKind(item);
  const wantsImage = isThumbnailable(item);
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  // Only start downloading once the card is actually on screen.
  useEffect(() => {
    if (!wantsImage || visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [wantsImage, visible]);

  useEffect(() => {
    if (!visible || !wantsImage) return;
    let alive = true;
    fileObjectUrl(item.id)
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [visible, wantsImage, item.id]);

  const tile = TILE[kind] || TILE.file;
  const showMedia = wantsImage && src && !failed;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      title={item.title || item.name}
      className="group relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center"
    >
      {showMedia && kind === "image" && (
        <img src={src} alt={item.title || item.name} className="w-full h-full object-cover" loading="lazy" />
      )}
      {showMedia && kind === "video" && (
        // preload="metadata" paints the first frame without pulling the file.
        <video src={src} preload="metadata" muted playsInline className="w-full h-full object-cover" />
      )}

      {!showMedia && (
        <div className={`w-full h-full ${tile.bg} flex flex-col items-center justify-center gap-1.5`}>
          <svg className={`w-8 h-8 ${tile.fg}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={tile.d} />
          </svg>
          {wantsImage && !failed && <span className="text-[10px] text-gray-400">loading…</span>}
        </div>
      )}

      {/* Play affordance so a video thumbnail doesn't read as a still image. */}
      {kind === "video" && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </span>
      )}

      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </button>
  );
}
