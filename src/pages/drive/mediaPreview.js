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

/**
 * Something an <img>, <video> or new tab can load for this file.
 *
 * Every uploaded file arrives with `url` — a signed link the browser fetches
 * directly, with no bearer token and so no CORS. Prefer it: pulling the bytes
 * through axios as a blob failed outright in production (net::ERR_FAILED), a
 * video had to download completely before it could start, and it could never
 * seek. The authenticated blob remains only as the fallback for a row that
 * somehow has no url.
 */
export function fileObjectUrl(item) {
  if (item && typeof item === "object") {
    if (item.url && !item.is_link) return Promise.resolve(item.url);
    return blobUrl(item.id);
  }
  return blobUrl(item);
}

function blobUrl(id) {
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

  // A document is written in Drive, not uploaded to it: there is nothing to
  // preview or stream, so it is its own kind and opens in the editor.
  if (item?.media_type === "doc") return "doc";

  const mime = (item?.mime || "").toLowerCase();
  const name = (item?.name || "").toLowerCase();

  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|webm|ogg|mov|m4v)$/.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/.test(name)) return "audio";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (officeScheme(item)) return "office";

  // Fall back to the catalogue's own classification.
  if (item?.file_type === "image") return "image";
  if (item?.file_type === "video") return "video";
  if (item?.file_type === "audio") return "audio";

  return "file";
}

/**
 * Which desktop Office app owns this file — or null if it is not an Office one.
 *
 * Deliberately NOT a web viewer. Sending a school document to Microsoft's
 * online viewer to render it would mean handing a child's record, or a
 * colleague's contract, to a third party just to look at it. The file never
 * leaves: it is opened by the copy of Word or Excel already on the machine,
 * and if there is none it is simply downloaded.
 */
export function officeScheme(item) {
  if (!item || item.is_link || item.media_type === "doc") return null;
  // Drive calls it `name`, a meeting/event attachment `original_name` — one
  // helper serves both so neither screen needs its own copy of this list.
  const name = (item.name || item.original_name || "").toLowerCase();
  const mime = (item.mime || item.mime_type || "").toLowerCase();

  if (/\.(docx?|dotx?|docm|rtf|odt)$/.test(name)
    || mime.includes("wordprocessingml") || mime === "application/msword") return "ms-word";

  if (/\.(xlsx?|xlsm|xlsb|xltx?|csv|ods)$/.test(name)
    || mime.includes("spreadsheetml") || mime === "application/vnd.ms-excel"
    || mime === "text/csv") return "ms-excel";

  if (/\.(pptx?|pptm|potx?|ppsx?|odp)$/.test(name)
    || mime.includes("presentationml") || mime === "application/vnd.ms-powerpoint") return "ms-powerpoint";

  return null;
}

/**
 * Hand an Office file to the app installed on this machine; download it if
 * there is none.
 *
 * Office registers the ms-word: / ms-excel: / ms-powerpoint: schemes when it
 * installs. Launching one succeeds silently and fails silently — there is no
 * error event either way — so the only usable signal is whether this tab lost
 * focus, which it does when the OS brings the app forward. No hand-over inside
 * the grace period means nothing is installed, and the file is saved instead.
 *
 * Must be called straight from a click: browsers only allow a custom-scheme
 * launch during a user gesture.
 */
export function openInOfficeApp(item, { onFallback, graceMs = 1500 } = {}) {
  const scheme = officeScheme(item);
  /* `office_url` ends in the real filename. Word and Excel decide what a file
     is from the URL, not the Content-Type, so the plain `url` — which ends in
     "/image?expires=…" — made Office answer "doesn't recognize the command it
     was given". An attachment's own URL already carries its extension, so it
     needs no second form. */
  const url = item?.office_url || item?.url;
  if (!scheme || !url) { onFallback?.(); return false; }

  let handedOver = false;
  const noteHandOver = () => { handedOver = true; };
  window.addEventListener("blur", noteHandOver);
  document.addEventListener("visibilitychange", noteHandOver);

  try {
    /* `ofv` = open for VIEW. `ofe` (edit) asks Office to save back over the
       same URL, which only works against WebDAV/SharePoint — over a plain
       signed link it fails outright. Viewing is also all that was asked for:
       the file opens read-only in the app already on this machine. */
    window.location.href = `${scheme}:ofv|u|${url}`;
  } catch {
    handedOver = false;
  }

  setTimeout(() => {
    window.removeEventListener("blur", noteHandOver);
    document.removeEventListener("visibilitychange", noteHandOver);
    if (!handedOver) onFallback?.();
  }, graceMs);

  return true;
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
