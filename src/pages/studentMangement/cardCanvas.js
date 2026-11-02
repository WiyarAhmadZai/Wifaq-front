import QRCode from "qrcode";
import wifaqLogo from "../../assets/wifaq-logo.png";
import cardBackground from "../../assets/student-card-bg.jpg";

/**
 * The student ID card, drawn onto a canvas.
 *
 * Drawn rather than laid out in HTML, because everything the card has to do is
 * easier on a canvas: it becomes a PNG you can download with the student's own
 * name on the file, a hundred of them can be produced in a loop for a ZIP, and
 * printing one means printing a single image — no print stylesheet fighting
 * the rest of the application for what reaches the paper.
 *
 * The artwork is the school's own design (assets/student-card-bg.jpg); the
 * card fills it in. Positions are fractions of that artwork, so they hold at
 * any resolution. Portrait, a true 54×85.6mm at 300dpi: what comes out of a card printer is the right size, and what is
 * downloaded is sharp enough to send to a print shop.
 */

const TEAL = "#0D5C63";
const GOLD = "#C99A12";
const INK = "#0A3A3E";

export const CARD_MM = { w: 54, h: 85.6 };
const DPI = 300;
const MM = DPI / 25.4;                      // one millimetre, in pixels
export const CARD_PX = { w: Math.round(CARD_MM.w * MM), h: Math.round(CARD_MM.h * MM) };


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
 * Two variants, because the school needs two different things from one card:
 *   "photo"      — the child's ID card, with their picture. The everyday one.
 *   "conference" — the same card WITHOUT the picture, for conferences and
 *                  events where a printed photograph of a child should not be
 *                  handed around. The fields simply take the space back.
 *
 * @param {object} card   what the server returned for this student
 * @param {object} opts   { logo: HTMLImageElement|null, variant: "photo"|"conference" }
 * @returns {Promise<HTMLCanvasElement>}
 */
export const CARD_VARIANTS = {
  photo: "With photo",
  conference: "Without photo (conferences)",
};

export async function drawCard(card, opts = {}) {
  const withPhoto = opts.variant !== "conference";
  const canvas = document.createElement("canvas");
  canvas.width = CARD_PX.w;
  canvas.height = CARD_PX.h;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const X = (f) => f * W;               // fractions of the artwork → pixels
  const Y = (f) => f * H;

  const [background, logo, photo, qr] = await Promise.all([
    loadImage(cardBackground),
    opts.logo !== undefined ? Promise.resolve(opts.logo) : loadImage(wifaqLogo),
    withPhoto ? loadImage(card.photo_url) : Promise.resolve(null),
    card.scan_url
      ? QRCode.toDataURL(card.scan_url, {
          errorCorrectionLevel: "M",       // fewer, larger modules: reads off plastic
          margin: 0,
          width: 600,
          color: { dark: "#000000", light: "#FFFFFF" },
        }).then(loadImage)
      : Promise.resolve(null),
  ]);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  if (background) ctx.drawImage(background, 0, 0, W, H);

  /* The sample's own name and QR code are part of the artwork: paint them out. */
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, X(0.215), Y(0.521), X(0.6), Y(0.056), X(0.03));
  ctx.fill();
  roundRect(ctx, X(0.4235), Y(0.8342), X(0.1766), Y(0.1173), X(0.03));
  ctx.fill();

  /* ── the Wifaq logo, top corner ────────────────────────────────────────── */
  if (logo) {
    const w = X(0.22);
    const h = (logo.height / logo.width) * w;
    ctx.drawImage(logo, X(0.95) - w, Y(0.035), w, h);
  }

  /* ── the photo, inside the frame — or the logo on the conference card ──── */
  const fx = X(0.357), fy = Y(0.140), fw = X(0.333), fh = Y(0.266);
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, X(0.045));
  ctx.clip();
  if (photo) {
    // Cover, not stretch — a squashed face on an ID card is worse than a crop.
    const scale = Math.max(fw / photo.width, fh / photo.height);
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    ctx.drawImage(photo, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh);
  } else if (!withPhoto && logo) {
    const w = fw * 0.8;
    const h = (logo.height / logo.width) * w;
    ctx.drawImage(logo, fx + (fw - w) / 2, fy + (fh - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#B6C6C6";
    ctx.font = `600 ${X(0.05)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("عکس", fx + fw / 2, fy + fh / 2);
  }
  ctx.restore();

  ctx.direction = "rtl";
  ctx.textBaseline = "middle";

  /* ── the name, larger than everything else, in the sample's gold ───────── */
  if (card.full_name) {
    ctx.textAlign = "center";
    ctx.fillStyle = GOLD;
    const size = fitText(ctx, card.full_name, X(0.56), Y(0.036), "800");
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.fillText(card.full_name, X(0.514), Y(0.551));
  }

  /* ── the values, written after the printed labels ──────────────────────── */
  [
    [card.father_name, 0.718, 0.640, 0.19],
    [card.date_of_birth, 0.608, 0.710, 0.19],
    [card.student_id, 0.532, 0.783, 0.24],
  ].forEach(([value, right, y, left]) => {
    if (!value) return;
    ctx.textAlign = "right";
    ctx.fillStyle = INK;
    const size = fitText(ctx, String(value), X(right - left), Y(0.021), "700");
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.fillText(String(value), X(right), Y(y));
  });

  /* ── the QR code, in its box ───────────────────────────────────────────── */
  if (qr) {
    const q = X(0.156);
    ctx.drawImage(qr, X(0.5117) - q / 2, Y(0.8928) - q / 2, q, q);
  } else {
    ctx.fillStyle = TEAL;
    ctx.font = `600 ${X(0.03)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("QR", X(0.5117), Y(0.8928));
  }

  return canvas;
}

/** A file name that says whose card this is, so nobody has to rename anything. */
export function cardFileName(card, variant = "photo") {
  const parts = [card.full_name, card.student_id, variant === "conference" ? "conference" : null]
    .filter(Boolean).join(" - ");
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
