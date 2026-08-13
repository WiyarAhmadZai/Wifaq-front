import { useCallback, useEffect, useState } from "react";
import { fileObjectUrl, previewKind, embedUrl, KIND_LABEL } from "./mediaPreview";

/**
 * Full-size preview for a catalogue item.
 *
 * Internal media renders inline — images as <img>, video and audio in native
 * players, PDFs in a frame. External links render in an <iframe> when the
 * provider allows framing (YouTube, Vimeo, Google Docs, direct media), and fall
 * back to a clean "open in a new tab" panel when it does not, rather than
 * showing an empty white box.
 */
export default function MediaPreviewModal({ item, onClose, onDownload }) {
  const kind = previewKind(item);
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);
  const [frameFailed, setFrameFailed] = useState(false);

  const external = item?.is_link ? item.external_url : null;
  const frameSrc = external ? embedUrl(external) : null;

  // Internal media needs an authenticated fetch before it can be shown.
  useEffect(() => {
    if (!item || item.is_link) return;
    let alive = true;
    setError(null);
    fileObjectUrl(item.id)
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setError("Could not load this file."));
    return () => {
      alive = false;
    };
  }, [item]);

  // A framed page that never loads leaves the panel blank; give it a moment,
  // then offer the link instead.
  useEffect(() => {
    if (!frameSrc) return;
    const t = setTimeout(() => setFrameFailed((f) => f), 100);
    return () => clearTimeout(t);
  }, [frameSrc]);

  const close = useCallback(() => onClose?.(), [onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!item) return null;

  const Frame = ({ children }) => (
    <div className="w-full h-full flex items-center justify-center bg-[#0b1416]">{children}</div>
  );

  const openExternal = () => window.open(external, "_blank", "noopener");

  let body;
  if (error) {
    body = <Frame><p className="text-sm text-red-300">{error}</p></Frame>;
  } else if (external) {
    body = frameSrc && !frameFailed ? (
      <iframe
        src={frameSrc}
        title={item.title || item.name}
        className="w-full h-full border-0 bg-white"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer"
        onError={() => setFrameFailed(true)}
      />
    ) : (
      <Frame>
        <div className="text-center px-6 max-w-md">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5m6.5-6.5l1.5-1.5a4 4 0 115.656 5.656l-3 3a4 4 0 01-5.656 0" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white">This site can&apos;t be shown inside the page</p>
          <p className="text-xs text-gray-400 mt-1.5 break-all">{external}</p>
          <p className="text-[11px] text-gray-500 mt-2">
            Most websites block being embedded for security. Open it in a new tab instead.
          </p>
          <button
            onClick={openExternal}
            className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl"
          >
            Open in a new tab
          </button>
        </div>
      </Frame>
    );
  } else if (!src) {
    body = (
      <Frame>
        <div className="animate-spin rounded-full h-9 w-9 border-4 border-white/20 border-t-teal-400" />
      </Frame>
    );
  } else if (kind === "image") {
    body = <Frame><img src={src} alt={item.title || item.name} className="max-w-full max-h-full object-contain" /></Frame>;
  } else if (kind === "video") {
    body = <Frame><video src={src} controls autoPlay className="max-w-full max-h-full" /></Frame>;
  } else if (kind === "audio") {
    body = (
      <Frame>
        <div className="w-full max-w-lg px-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/15 text-teal-300 flex items-center justify-center mb-5">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white mb-4 break-words">{item.title || item.name}</p>
          <audio src={src} controls autoPlay className="w-full" />
        </div>
      </Frame>
    );
  } else if (kind === "pdf") {
    body = <iframe src={src} title={item.name} className="w-full h-full border-0 bg-white" />;
  } else {
    body = (
      <Frame>
        <div className="text-center px-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 text-gray-300 flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white">No preview for this file type</p>
          <p className="text-xs text-gray-400 mt-1">{item.name}</p>
          <button
            onClick={() => onDownload?.(item)}
            className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl"
          >
            Download
          </button>
        </div>
      </Frame>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={close}>
      <div
        className="bg-[#101a1c] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
          <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold uppercase tracking-wide text-teal-300 shrink-0">
            {KIND_LABEL[kind] || "File"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{item.title || item.name}</p>
            {item.title && item.name !== item.title && (
              <p className="text-[11px] text-gray-400 truncate">{item.name}</p>
            )}
          </div>
          {external && (
            <button onClick={openExternal} className="text-[11px] font-semibold text-teal-300 hover:text-teal-200 px-2 shrink-0">
              Open ↗
            </button>
          )}
          {!item.is_link && (
            <button onClick={() => onDownload?.(item)} className="text-[11px] font-semibold text-teal-300 hover:text-teal-200 px-2 shrink-0">
              Download
            </button>
          )}
          <button onClick={close} className="text-gray-400 hover:text-white shrink-0" title="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 h-[70vh]">{body}</div>
      </div>
    </div>
  );
}
