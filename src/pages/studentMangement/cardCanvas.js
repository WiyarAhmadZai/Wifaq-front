import QRCode from "qrcode";

/**
 * The student ID card, drawn onto a canvas.
 *
 * Drawn rather than laid out in HTML, because everything the card has to do is
 * easier on a canvas: it becomes a PNG you can download with the student's own
 * name on the file, a hundred of them can be produced in a loop for a ZIP, and
 * printing one means printing a single image — no print stylesheet fighting
 * the rest of the application for what reaches the paper.
 *
 * Sizes are in millimetres and converted once, so the card is a true 85.6×54mm
 * at 300dpi: what comes out of a card printer is the right size, and what is
 * downloaded is sharp enough to send to a print shop.
 */

const TEAL = "#0D5C63";
const TEAL_LIGHT = "#19A79B";
const GOLD = "#E8A33D";
const INK = "#0A3A3E";

export const CARD_MM = { w: 85.6, h: 54 };
const DPI = 300;
const MM = DPI / 25.4;                      // one millimetre, in pixels
export const CARD_PX = { w: Math.round(CARD_MM.w * MM), h: Math.round(CARD_MM.h * MM) };

const mm = (v) => v * MM;

/** The Arabic-script face the card is set in — the same one the app uses. */
const FONT = '"Vazirmatn", "Noto Naskh Arabic", "Segoe UI", Tahoma, sans-serif';

/* Images are fetched once and kept: a bulk export of 400 cards should not
 * re-download the logo 400 times. */
const imageCache = new Map();

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (imageCache.has(src)) return imageCache.get(src);

  const p = new Promise((resolve) => {
    const img = new Image();
    // Student photos come from the API on another origin; without this the
    // canvas is tainted and toBlob() throws instead of returning a card.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);      // a missing photo is not a failure
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

/** Draw text that fits, shrinking a long name rather than letting it run off. */
function fitText(ctx, text, maxWidth, startSize, weight = "600") {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && size > startSize * 0.55) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  return size;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Render one card.
 *
 * @param {object} card   what the server returned for this student
 * @param {object} opts   { logo: HTMLImageElement|null }
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function drawCard(card, opts = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_PX.w;
  canvas.height = CARD_PX.h;
  const ctx = canvas.getContext("2d");

  const [logo, photo, qr] = await Promise.all([
    opts.logo !== undefined ? Promise.resolve(opts.logo) : loadImage("/wifaq-logo.png"),
    loadImage(card.photo_url),
    card.scan_url
      ? QRCode.toDataURL(card.scan_url, {
          errorCorrectionLevel: "H",       // survives a scratched corner
          margin: 0,
          width: 600,
          color: { dark: INK, light: "#FFFFFF" },
        }).then(loadImage)
      : Promise.resolve(null),
  ]);

  /* ── the card body ─────────────────────────────────────────────────────── */
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* ── the wave along the bottom ─────────────────────────────────────────── */
  const waveTop = canvas.height - mm(15);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, waveTop + mm(5));
  ctx.bezierCurveTo(
    canvas.width * 0.25, waveTop - mm(4),
    canvas.width * 0.55, waveTop + mm(8),
    canvas.width, waveTop - mm(2),
  );
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fillStyle = TEAL;
  ctx.fill();

  // Its gold edge.
  ctx.beginPath();
  ctx.moveTo(0, waveTop + mm(5));
  ctx.bezierCurveTo(
    canvas.width * 0.25, waveTop - mm(4),
    canvas.width * 0.55, waveTop + mm(8),
    canvas.width, waveTop - mm(2),
  );
  ctx.lineWidth = mm(0.7);
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.restore();

  /* ── the border, drawn inside so nothing is clipped at the page edge ───── */
  ctx.lineWidth = mm(1.2);
  ctx.strokeStyle = GOLD;
  roundRect(ctx, mm(0.6), mm(0.6), canvas.width - mm(1.2), canvas.height - mm(1.2), mm(3));
  ctx.stroke();

  ctx.lineWidth = mm(0.5);
  ctx.strokeStyle = TEAL_LIGHT;
  roundRect(ctx, mm(1.6), mm(1.6), canvas.width - mm(3.2), canvas.height - mm(3.2), mm(2.4));
  ctx.stroke();

  /* ── the logo, top-left ────────────────────────────────────────────────── */
  if (logo) {
    const h = mm(8);
    const w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, mm(4), mm(3), w, h);
  } else {
    ctx.textAlign = "left";
    ctx.fillStyle = TEAL;
    ctx.font = `800 ${mm(4)}px ${FONT}`;
    ctx.fillText("WIFAQ", mm(4), mm(8));
  }

  /* ── the photo, top-right ──────────────────────────────────────────────── */
  const pw = mm(18);
  const ph = mm(22);
  const px = canvas.width - mm(4) - pw;
  const py = mm(12);

  ctx.save();
  roundRect(ctx, px, py, pw, ph, mm(1.8));
  ctx.clip();
  if (photo) {
    // Cover, not stretch — a squashed face on an ID card is worse than a crop.
    const scale = Math.max(pw / photo.width, ph / photo.height);
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    ctx.drawImage(photo, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#EEF3F3";
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = "#B6C6C6";
    ctx.font = `600 ${mm(2.6)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("عکس", px + pw / 2, py + ph / 2);
  }
  ctx.restore();

  ctx.lineWidth = mm(0.45);
  ctx.strokeStyle = TEAL;
  roundRect(ctx, px, py, pw, ph, mm(1.8));
  ctx.stroke();

  /* ── the four fields, right-aligned like the rest of the card ──────────── */
  const rows = [
    ["اسم", card.full_name, true],
    ["ولد", card.father_name, false],
    ["تاریخ تولد", card.date_of_birth, false],
    ["ایدی نمبر کارت", card.student_id, true],
  ];

  const labelRight = px - mm(2.5);      // labels hug the photo
  const valueLeft = mm(4.5);
  let y = mm(17);                       // last row lands at 33.5mm, clear of the wave

  ctx.textBaseline = "alphabetic";
  rows.forEach(([label, value, strong]) => {
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = TEAL;
    ctx.font = `700 ${mm(2.7)}px ${FONT}`;
    const labelText = `${label}:`;
    ctx.fillText(labelText, labelRight, y);
    const labelWidth = ctx.measureText(labelText).width;

    // The dotted rule the sample writes on.
    const lineRight = labelRight - labelWidth - mm(1.5);
    ctx.save();
    ctx.setLineDash([mm(0.5), mm(0.5)]);
    ctx.lineWidth = mm(0.25);
    ctx.strokeStyle = "#9CCBCB";
    ctx.beginPath();
    ctx.moveTo(valueLeft, y + mm(1.1));
    ctx.lineTo(lineRight, y + mm(1.1));
    ctx.stroke();
    ctx.restore();

    if (value) {
      ctx.fillStyle = INK;
      const size = fitText(ctx, String(value), lineRight - valueLeft - mm(2),
        mm(strong ? 3 : 2.8), strong ? "800" : "600");
      ctx.font = `${strong ? "800" : "600"} ${size}px ${FONT}`;
      ctx.fillText(String(value), lineRight - mm(1), y);
    }

    y += mm(5.5);
  });

  /* ── the QR code, on the wave ──────────────────────────────────────────── */
  if (qr) {
    const q = mm(12);
    const qx = mm(4);
    const qy = canvas.height - q - mm(1.8);
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, qx - mm(0.8), qy - mm(0.8), q + mm(1.6), q + mm(1.6), mm(1));
    ctx.fill();
    ctx.drawImage(qr, qx, qy, q, q);
  }

  /* ── the class, on the wave opposite the code ──────────────────────────── */
  if (card.class) {
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 ${mm(2.9)}px ${FONT}`;
    ctx.fillText(`صنف: ${card.class}`, canvas.width - mm(4.5), canvas.height - mm(7.5));

    ctx.font = `600 ${mm(2.1)}px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("مکتب وفاق — رشد همه جانبه انسان", canvas.width - mm(4.5), canvas.height - mm(3.5));
  }

  return canvas;
}

/** A file name that says whose card this is, so nobody has to rename anything. */
export function cardFileName(card) {
  const parts = [card.full_name, card.student_id].filter(Boolean).join(" - ");
  // Windows refuses these outright; a slash in a name would also break a ZIP.
  return `${parts.replace(/[\\/:*?"<>|]/g, "-").trim() || "student-card"}.png`;
}

/** The card as a PNG blob, ready to download or to drop into a ZIP. */
export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Hand one blob to the browser as a download. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Print one card, and only that card.
 *
 * A hidden iframe containing nothing but the image: the application's own
 * pages never reach the printer, so there is no eight-page print-out and no
 * print stylesheet to keep in step with the rest of the app.
 */
export function printCard(dataUrl) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);

  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>card</title><style>
    @page { size: ${CARD_MM.w}mm ${CARD_MM.h}mm; margin: 0; }
    html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    img { display: block; width: ${CARD_MM.w}mm; height: ${CARD_MM.h}mm; }
  </style></head><body><img src="${dataUrl}"></body></html>`);
  doc.close();

  const go = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    // Left in place briefly: removing it while the dialog is open cancels it.
    setTimeout(() => frame.remove(), 60000);
  };

  const img = doc.querySelector("img");
  if (img && !img.complete) img.onload = go;
  else setTimeout(go, 120);
}
