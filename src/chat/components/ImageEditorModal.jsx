import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FiX, FiSend, FiRotateCw, FiCrop, FiEdit3, FiCornerUpLeft, FiPlus, FiCheck, FiTrash2,
} from 'react-icons/fi';

/**
 * WhatsApp-style "look before you send" for images.
 *
 * Every image that reaches the composer — picked, dropped or pasted — passes
 * through here first. The sender sees it large, can rotate it, crop it, draw on
 * it (circle the thing they mean), write a caption, and only then send. Several
 * images share one caption, exactly as WhatsApp does.
 *
 * Edits are kept as data, not baked in, until Send: rotation, a crop rectangle
 * and a list of pen strokes, all in the coordinates of the rotated image. That
 * is what makes undo and "reset crop" free, and what lets a rotation after a
 * crop keep the crop in the right place.
 */

const PEN_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ffffff', '#111827'];
const MAX_EXPORT_EDGE = 2048; // px — a phone screenshot is plenty at this size

const blank = (file) => ({
  id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
  file,
  src: URL.createObjectURL(file),
  img: null,          // decoded HTMLImageElement
  rotation: 0,        // 0 | 90 | 180 | 270, clockwise
  crop: null,         // { x, y, w, h } in rotated-image pixels, or null
  strokes: [],        // [{ color, size, points: [{x,y}] }] in rotated-image pixels
});

/** Width/height of the image once rotated. */
const rotatedSize = (img, rotation) =>
  rotation % 180 === 0
    ? { w: img.naturalWidth, h: img.naturalHeight }
    : { w: img.naturalHeight, h: img.naturalWidth };

/** Paint the rotated source image to fill a W×H canvas context. */
function drawRotated(ctx, img, rotation, w, h) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  ctx.restore();
}

function drawStrokes(ctx, strokes, scale = 1) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    if (!s?.points?.length) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size * scale;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x * scale, s.points[0].y * scale);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x * scale, s.points[i].y * scale);
    if (s.points.length === 1) ctx.lineTo(s.points[0].x * scale + 0.1, s.points[0].y * scale);
    ctx.stroke();
  }
}

/** Rotate a point 90° clockwise inside a w×h frame. */
const rotPoint = (p, h) => ({ x: h - p.y, y: p.x });
const rotRect = (r, h) => ({ x: h - r.y - r.h, y: r.x, w: r.h, h: r.w });

export default function ImageEditorModal({ files, onCancel, onSend, initialCaption = '' }) {
  const [items, setItems] = useState(() => files.map(blank));
  const [active, setActive] = useState(0);
  const [tool, setTool] = useState('none'); // none | crop | pen
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [caption, setCaption] = useState(initialCaption);
  const [sending, setSending] = useState(false);
  const [dragRect, setDragRect] = useState(null); // crop in progress, canvas px
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const drawing = useRef(null); // { stroke } while the pen is down
  const addRef = useRef(null);

  const item = items[active];

  // Decode each image once; the object URL is released when the modal closes.
  useEffect(() => {
    items.forEach((it, idx) => {
      if (it.img) return;
      const img = new Image();
      img.onload = () => setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, img } : p)));
      img.src = it.src;
    });
  }, [items]);

  useEffect(() => () => items.forEach((it) => URL.revokeObjectURL(it.src)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes; Ctrl+Z undoes; the page behind must not scroll. Bound once —
  // `undo` is reached through a ref so the listener never goes stale.
  const undoRef = useRef(() => {});
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') cancelRef.current();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoRef.current(); }
    };
    document.addEventListener('keydown', onKey);
    // Bound once for the life of the modal. It used to re-run on every
    // parent render (onCancel is a fresh function each time), and the second
    // run captured "hidden" as the value to restore — so closing the editor
    // left the page unable to scroll.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);

  const update = (patch) => setItems((prev) => prev.map((p, i) => (i === active ? { ...p, ...patch } : p)));

  // ── Display geometry ───────────────────────────────────────────────────────
  // The visible canvas shows the rotated image, cropped when a crop is applied,
  // scaled to fit the stage. `scale` maps rotated-image px → canvas px.
  const geo = useMemo(() => {
    if (!item?.img || !wrapRef.current) return null;
    const { w: rw, h: rh } = rotatedSize(item.img, item.rotation);
    const view = item.crop || { x: 0, y: 0, w: rw, h: rh };
    const maxW = wrapRef.current.clientWidth - 16;
    const maxH = wrapRef.current.clientHeight - 16;
    const scale = Math.min(maxW / view.w, maxH / view.h, 1);
    return { rw, rh, view, scale, cw: Math.round(view.w * scale), ch: Math.round(view.h * scale) };
  }, [item?.img, item?.rotation, item?.crop, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Repaint whenever anything visible changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !geo || !item?.img) return;
    canvas.width = geo.cw;
    canvas.height = geo.ch;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, geo.cw, geo.ch);
    ctx.save();
    ctx.scale(geo.scale, geo.scale);
    ctx.translate(-geo.view.x, -geo.view.y);
    drawRotated(ctx, item.img, item.rotation, geo.rw, geo.rh);
    drawStrokes(ctx, item.strokes);
    // `drawing.current` is a pen stroke ({ points }) OR a crop drag
    // ({ origin }). Only the stroke can be painted; handing the crop drag
    // to drawStrokes read `.points` on it and threw inside this effect —
    // which unmounts the whole app to a white page.
    if (drawing.current?.points) drawStrokes(ctx, [drawing.current]);
    ctx.restore();

    // Crop-in-progress: dim everything outside the dragged rectangle.
    if (dragRect) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(0, 0, geo.cw, geo.ch);
      ctx.clearRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
      ctx.save();
      ctx.scale(geo.scale, geo.scale);
      ctx.translate(-geo.view.x, -geo.view.y);
      ctx.beginPath();
      ctx.rect(
        (dragRect.x / geo.scale) + geo.view.x, (dragRect.y / geo.scale) + geo.view.y,
        dragRect.w / geo.scale, dragRect.h / geo.scale,
      );
      ctx.clip();
      drawRotated(ctx, item.img, item.rotation, geo.rw, geo.rh);
      drawStrokes(ctx, item.strokes);
      ctx.restore();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
      ctx.setLineDash([]);
    }
  }, [geo, item, dragRect]);

  // ── Pointer handling (mouse + touch through pointer events) ────────────────
  const toCanvas = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: Math.max(0, Math.min(r.width, e.clientX - r.left)), y: Math.max(0, Math.min(r.height, e.clientY - r.top)) };
  };
  const toImage = (p) => ({ x: p.x / geo.scale + geo.view.x, y: p.y / geo.scale + geo.view.y });

  const onPointerDown = (e) => {
    if (!geo || tool === 'none') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCanvas(e);
    if (tool === 'pen') {
      drawing.current = { color, size: Math.max(3, 6 / geo.scale), points: [toImage(p)] };
      setDragRect(null);
    } else if (tool === 'crop') {
      drawing.current = { origin: p };
      setDragRect({ x: p.x, y: p.y, w: 0, h: 0 });
    }
  };
  const onPointerMove = (e) => {
    if (!drawing.current || !geo) return;
    const p = toCanvas(e);
    if (tool === 'pen') {
      drawing.current.points.push(toImage(p));
      // Force a repaint without touching state for every point.
      setDragRect((d) => (d === null ? null : d));
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(geo.scale, geo.scale);
      ctx.translate(-geo.view.x, -geo.view.y);
      drawStrokes(ctx, [drawing.current]);
      ctx.restore();
    } else if (tool === 'crop') {
      const o = drawing.current.origin;
      setDragRect({ x: Math.min(o.x, p.x), y: Math.min(o.y, p.y), w: Math.abs(p.x - o.x), h: Math.abs(p.y - o.y) });
    }
  };
  const onPointerUp = () => {
    if (!drawing.current) return;
    if (tool === 'pen') {
      const stroke = drawing.current;
      drawing.current = null;
      update({ strokes: [...item.strokes, stroke] });
    } else {
      drawing.current = null;
    }
  };

  const applyCrop = () => {
    if (!dragRect || !geo || dragRect.w < 8 || dragRect.h < 8) { setDragRect(null); return; }
    const tl = toImage({ x: dragRect.x, y: dragRect.y });
    update({
      crop: {
        x: Math.round(tl.x), y: Math.round(tl.y),
        w: Math.round(dragRect.w / geo.scale), h: Math.round(dragRect.h / geo.scale),
      },
    });
    setDragRect(null);
    setTool('none');
  };

  const rotate = () => {
    if (!item?.img) return;
    const { h } = rotatedSize(item.img, item.rotation);
    update({
      rotation: (item.rotation + 90) % 360,
      crop: item.crop ? rotRect(item.crop, h) : null,
      strokes: item.strokes.map((s) => ({ ...s, points: s.points.map((p) => rotPoint(p, h)) })),
    });
    setDragRect(null);
  };

  const undo = () => {
    if (!item) return;
    if (dragRect) { setDragRect(null); return; }
    if (item.strokes.length) update({ strokes: item.strokes.slice(0, -1) });
    else if (item.crop) update({ crop: null });
  };
  undoRef.current = undo;

  const removeItem = (idx) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      URL.revokeObjectURL(prev[idx].src);
      return next;
    });
    setActive((a) => Math.max(0, Math.min(a, items.length - 2)));
    if (items.length === 1) onCancel();
  };

  const addMore = (list) => {
    const more = Array.from(list || []).filter((f) => f.type?.startsWith('image/'));
    if (more.length) setItems((prev) => [...prev, ...more.map(blank)].slice(0, 10));
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportItem = (it) =>
    new Promise((resolve) => {
      const { w: rw, h: rh } = rotatedSize(it.img, it.rotation);
      const view = it.crop || { x: 0, y: 0, w: rw, h: rh };
      // Cap the longest edge — a 4000px photo is wasted bandwidth in a chat.
      const scale = Math.min(1, MAX_EXPORT_EDGE / Math.max(view.w, view.h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(view.w * scale));
      canvas.height = Math.max(1, Math.round(view.h * scale));
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.translate(-view.x, -view.y);
      drawRotated(ctx, it.img, it.rotation, rw, rh);
      drawStrokes(ctx, it.strokes);

      // PNG keeps a screenshot crisp and transparent; everything else goes out
      // as JPEG so a phone photo does not arrive at 8 MB.
      const keepPng = it.file.type === 'image/png' || it.file.type === 'image/gif' || it.file.type === 'image/webp';
      const type = keepPng ? 'image/png' : 'image/jpeg';
      const untouched = it.rotation === 0 && !it.crop && it.strokes.length === 0 && scale === 1;
      if (untouched) { resolve(it.file); return; }

      canvas.toBlob((blob) => {
        const base = (it.file.name || 'image').replace(/\.[^.]+$/, '');
        resolve(new File([blob], `${base}.${keepPng ? 'png' : 'jpg'}`, { type }));
      }, type, 0.92);
    });

  const send = async () => {
    if (sending || items.some((it) => !it.img)) return;
    setSending(true);
    try {
      const out = await Promise.all(items.map(exportItem));
      await onSend(out, caption.trim());
    } finally {
      setSending(false);
    }
  };

  const onCaptionKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const Tool = ({ id, icon, label }) => (
    <button
      type="button"
      onClick={() => { setTool((t) => (t === id ? 'none' : id)); setDragRect(null); }}
      title={label}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
        tool === id ? 'bg-teal-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
    >
      {icon}
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-[#0b141a] flex flex-col text-white" role="dialog" aria-modal="true">
      {/* Top bar — tools */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button onClick={onCancel} title="Close" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
          <FiX className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button onClick={undo} title="Undo" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <FiCornerUpLeft className="w-4 h-4" />
          </button>
          <button onClick={rotate} title="Rotate" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <FiRotateCw className="w-4 h-4" />
          </button>
          <Tool id="crop" icon={<FiCrop className="w-4 h-4" />} label="Crop" />
          <Tool id="pen" icon={<FiEdit3 className="w-4 h-4" />} label="Draw" />
          {tool === 'pen' && (
            <div className="flex items-center gap-1 ms-1">
              {PEN_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} title={c}
                  className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
          )}
          {tool === 'crop' && (
            <>
              {dragRect && dragRect.w > 8 && (
                <button onClick={applyCrop} className="ms-1 px-3 h-10 rounded-full bg-teal-500 hover:bg-teal-600 text-xs font-bold flex items-center gap-1">
                  <FiCheck className="w-4 h-4" /> Apply crop
                </button>
              )}
              {item?.crop && (
                <button onClick={() => { update({ crop: null }); setDragRect(null); }} className="ms-1 px-3 h-10 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold">
                  Reset crop
                </button>
              )}
            </>
          )}
        </div>

        <span className="text-xs text-white/60 w-10 text-end">{items.length > 1 ? `${active + 1}/${items.length}` : ''}</span>
      </div>

      {/* Stage */}
      <div ref={wrapRef} className="flex-1 min-h-0 flex items-center justify-center p-2">
        {item?.img ? (
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`rounded-lg shadow-2xl max-w-full max-h-full touch-none ${
              tool === 'pen' ? 'cursor-crosshair' : tool === 'crop' ? 'cursor-crosshair' : 'cursor-default'}`}
          />
        ) : (
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white" />
        )}
      </div>

      {tool !== 'none' && (
        <p className="text-center text-[11px] text-white/60 pb-1">
          {tool === 'crop' ? 'Drag over the part to keep, then Apply crop.' : 'Draw on the image. Ctrl+Z undoes a stroke.'}
        </p>
      )}

      {/* Bottom — thumbnails, caption, send */}
      <div className="px-4 pb-4 pt-2 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {items.map((it, i) => (
            <div key={it.id} className="relative flex-shrink-0">
              <button
                onClick={() => { setActive(i); setTool('none'); setDragRect(null); }}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${i === active ? 'border-teal-400' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <img src={it.src} alt="" className="w-full h-full object-cover" />
              </button>
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} title="Remove"
                  className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center">
                  <FiTrash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {items.length < 10 && (
            <>
              <button onClick={() => addRef.current?.click()} title="Add another image"
                className="w-14 h-14 rounded-lg border-2 border-dashed border-white/30 text-white/60 hover:text-white hover:border-white/60 flex items-center justify-center flex-shrink-0">
                <FiPlus className="w-5 h-5" />
              </button>
              <input ref={addRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { addMore(e.target.files); e.target.value = ''; }} />
            </>
          )}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            autoFocus
            rows={1}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={onCaptionKey}
            placeholder="Add a caption…"
            className="flex-1 resize-none max-h-24 px-4 py-2.5 rounded-2xl bg-white/10 text-sm text-white placeholder-white/50 outline-none focus:bg-white/15"
          />
          <button
            onClick={send}
            disabled={sending || items.some((it) => !it.img)}
            title="Send"
            className="w-12 h-12 rounded-full bg-teal-500 hover:bg-teal-600 disabled:opacity-40 flex items-center justify-center flex-shrink-0"
          >
            {sending
              ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
              : <FiSend className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
