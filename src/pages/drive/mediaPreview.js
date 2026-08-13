import { fileRawBlob } from "../../api/drive";

/**
 * Shared media helpers for the Drive catalogue.
 *
 * Internal files live behind an authenticated endpoint, so the browser cannot
 * simply point <img src> at them — the bearer token would never be sent. We
 * fetch the bytes once and hand back an object URL instead, memoised per file
 * id so a card thumbnail and the full-size preview share one download and a
 * re-render never refetches.
 */

// file id -> Promise<objectURL>. Promises (not URLs) so two callers racing for
// the same file share a single request.
const objectUrls = new Map();

export function fileObjectUrl(id) {
  if (!objectUrls.has(id)) {
    objectUrls.set(
      id,
      fileRawBlob(id)
        .then((res) => URL.createObjectURL(res.data))
        .catch((e) => {
          // Don't cache a failure — a later retry should be allowed.
          objectUrls.delete(id);
          throw e;
        }),
    );
  }
  return objectUrls.get(id);
}

/** Release everything — call when leaving the page so blobs aren't leaked. */
export function releaseObjectUrls() {
  objectUrls.forEach((p) => p.then(URL.revokeObjectURL).catch(() => {}));
  objectUrls.clear();
}

/**
 * How a catalogue item should be rendered:
 *   image | video | audio | pdf | embed (external, framable) | link (external)
 */
export function previewKind(item) {
  if (item?.is_link) {
    return embedUrl(item.external_url) ? "embed" : "link";
  }

  const mime = (item?.mime || "").toLowerCase();
  const name = (item?.name || "").toLowerCase();

  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|webm|ogg|mov|m4v)$/.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/.test(name)) return "audio";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";

  // Fall back to the catalogue's own classification.
  if (item?.file_type === "image") return "image";
  if (item?.file_type === "video") return "video";
  if (item?.file_type === "audio") return "audio";

  return "file";
}

/** True when a card should try to paint a real thumbnail rather than an icon. */
export function isThumbnailable(item) {
  return !item?.is_link && ["image", "video"].includes(previewKind(item));
}

/**
 * Turn a shareable URL into one that is actually embeddable.
 *
 * Most sites refuse to be framed (X-Frame-Options / frame-ancestors), so we
 * only claim "embed" for providers with a documented embed path. Everything
 * else is offered as a link instead of an iframe that would render blank.
 */
export function embedUrl(raw) {
  if (!raw) return null;

  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  // YouTube — watch links, share links and existing embeds.
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
    if (u.pathname.startsWith("/embed/")) return raw;
    if (u.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
  }
  if (host === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;

  // Vimeo.
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  }

  // Google Docs / Sheets / Slides / Drive — swap the trailing verb for preview.
  if (host === "docs.google.com" || host === "drive.google.com") {
    return raw.replace(/\/(edit|view|share)(\?.*)?$/, "/preview");
  }

  // Anything served as a page we control, plus direct media and PDFs, frames fine.
  if (/\.(pdf|png|jpe?g|gif|webp|svg|mp4|webm)$/i.test(u.pathname)) return raw;

  return null;
}

/** Short, human label for the kind — used on badges. */
export const KIND_LABEL = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  embed: "Embed",
  link: "Link",
  file: "File",
};
