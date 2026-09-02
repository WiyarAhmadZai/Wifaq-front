import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/axios";

/**
 * One observation, in full.
 *
 * The timeline shows a summary; this is everything behind it — the bias-control
 * fields, who wrote it and when, and any photo evidence. Shared by the teacher
 * screen and the family page so a parent reads exactly what the school wrote,
 * with the edit and delete actions simply absent.
 *
 * Photos are fetched as authenticated blobs: they are photographs of children
 * and are served from a private, row-scoped route, so a plain <img src> would
 * get a 404.
 */

const TEAL = "#0D5C63";

const DIM_LABEL = {
  intellectual: "Intellectual",
  character: "Character",
  social: "Social",
  practical: "Practical",
};
const DIM_COLOR = {
  intellectual: "#14919B",
  character: "#C9A227",
  social: "#C2607A",
  practical: "#2E7D5B",
};
const CAT = {
  positive: { label: "Positive", emoji: "⭐", bg: "#e6f3ec", fg: "#2E7D5B" },
  routine: { label: "Routine", emoji: "📝", bg: "#eef3f3", fg: "#5d7273" },
  concern: { label: "Concerning", emoji: "⚠️", bg: "#fbf0db", fg: "#9a6a12" },
  urgent: { label: "Urgent", emoji: "🚨", bg: "#f7e3e1", fg: "#C0473F" },
};

/** Authenticated <img>. Holds one object URL and releases it on unmount. */
function AuthImage({ src, alt, className, onClick, title }) {
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

/** Full-screen photo viewer — Esc or a click anywhere closes it. */
function PhotoLightbox({ photos, index, onClose, onIndex }) {
  const photo = photos[index];

  const step = useCallback(
    (delta) => {
      const next = (index + delta + photos.length) % photos.length;
      onIndex(next);
    },
    [index, photos.length, onIndex],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    // The page behind must not scroll while the viewer is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, step]);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <AuthImage
        src={photo.url}
        alt={photo.name}
        className="max-h-[85vh] max-w-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="mt-3 flex items-center gap-4 text-white/80 text-xs" onClick={(e) => e.stopPropagation()}>
        {photos.length > 1 && (
          <>
            <button onClick={() => step(-1)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 font-bold">‹</button>
            <span>
              {index + 1} / {photos.length}
            </span>
            <button onClick={() => step(1)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 font-bold">›</button>
          </>
        )}
        <span className="truncate max-w-[40vw]">{photo.name}</span>
      </div>

      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold"
      >
        ✕
      </button>
    </div>
  );
}

export default function ObservationDetailModal({ observation, onClose, onEdit, onDelete, busy = false }) {
  const [lightbox, setLightbox] = useState(null); // photo index, or null
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      // While the viewer is open it owns Esc; closing it must not also close
      // the modal underneath.
      if (e.key === "Escape" && lightbox === null) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, lightbox]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  if (!observation) return null;

  const o = observation;
  const cat = CAT[o.category] || CAT.routine;
  const photos = o.photos || [];

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-3.5 flex items-start justify-between gap-3" style={{ background: TEAL }}>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">{o.student || "Observation"}</h2>
              <p className="text-[11px] text-white/70">
                {o.observed_on}
                {o.observer ? ` · recorded by ${o.observer}` : ""}
              </p>
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="text-white/70 hover:text-white text-lg leading-none shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                style={{ background: DIM_COLOR[o.dimension] || TEAL }}
              >
                {DIM_LABEL[o.dimension] || o.dimension}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: cat.bg, color: cat.fg }}>
                {cat.emoji} {cat.label}
              </span>
              {o.monitoring_flag && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: "#f7e3e1", color: "#C0473F" }}>
                  🔎 Under monitoring
                </span>
              )}
              {o.subject && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">{o.subject}</span>
              )}
            </div>

            <Block label="What was observed">{o.description}</Block>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {o.is_usual && <Field label="Usual for this student?" value={o.is_usual} />}
              {o.change_vs_before && <Field label="Change vs. before" value={o.change_vs_before} />}
            </div>

            {o.alternative_interpretation && (
              <Block label="Another interpretation" tone={{ background: "#fbf7ec", color: "#7a5410" }}>
                {o.alternative_interpretation}
              </Block>
            )}
            {o.urgency_reason && (
              <Block label="Why this is urgent" tone={{ background: "#f7e3e1", color: "#8d3a33" }}>
                {o.urgency_reason}
              </Block>
            )}
            {o.recommendation && (
              <Block label="Recommendation" tone={{ background: "#E8F6F6", color: TEAL }}>
                {o.recommendation}
              </Block>
            )}

            {/* Photo evidence — click to open full screen. */}
            {photos.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Photos ({photos.length}) · click to enlarge
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {photos.map((ph, i) => (
                    <button
                      key={ph.index ?? i}
                      type="button"
                      onClick={() => setLightbox(i)}
                      title={`${ph.name} — click for full screen`}
                      className="rounded-xl overflow-hidden border border-gray-200 hover:border-teal-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <AuthImage src={ph.url} alt={ph.name} className="w-full h-24 object-cover cursor-zoom-in" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {o.created_at && (
              <p className="text-[10px] text-gray-400 pt-1">Recorded {o.created_at}</p>
            )}
          </div>

          {/* Actions — only the ones this user is actually allowed to run. */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
            {o.deletable && onDelete && (
              <button
                onClick={() => onDelete(o)}
                disabled={busy}
                className="px-4 py-2 text-xs font-bold rounded-xl text-red-600 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}
            {o.editable && onEdit && (
              <button
                onClick={() => onEdit(o)}
                disabled={busy}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white disabled:opacity-50"
                style={{ background: TEAL }}
              >
                Edit
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-100">
              Close
            </button>
          </div>
        </div>
      </div>

      {lightbox !== null && (
        <PhotoLightbox photos={photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

function Block({ label, children, tone }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <div className="rounded-xl p-3 text-xs leading-relaxed whitespace-pre-line" style={tone || { background: "#f6f8f8", color: "#374151" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-xs font-semibold text-gray-800 mt-0.5 capitalize">{value}</p>
    </div>
  );
}

export { AuthImage };
