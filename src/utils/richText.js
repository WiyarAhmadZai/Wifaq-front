/**
 * Rich-text helpers shared by the editor, the viewer, and any list or email
 * that has to show a description as plain text. Kept out of the component
 * file so Fast Refresh keeps working there.
 */

/* Tags we keep. Everything else — scripts, styles, event handlers, iframes —
   is stripped on the way in AND on the way out, so pasted content from Word
   or a web page can never carry anything executable into the page. */
const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "H2", "H3", "P", "BR", "UL", "OL", "LI", "A", "DIV"]);

export function sanitizeHtml(html) {
  if (!html) return "";
  const box = document.createElement("div");
  box.innerHTML = html;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 1) {
        if (!ALLOWED.has(child.tagName)) {
          // Unwrap: keep the text and children, drop the tag itself.
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          child.replaceWith(frag);
          walk(node);
          return;
        }
        // Only an href survives, and only if it is a real web link.
        [...child.attributes].forEach((a) => {
          if (child.tagName === "A" && a.name === "href" && /^https?:\/\//i.test(a.value)) return;
          child.removeAttribute(a.name);
        });
        if (child.tagName === "A") { child.setAttribute("target", "_blank"); child.setAttribute("rel", "noopener noreferrer"); }
        walk(child);
      }
    });
  };
  walk(box);
  return box.innerHTML;
}

/** True when a saved value already carries markup (vs. legacy plain text). */
export const isRichText = (v) => /<\/?[a-z][\s\S]*>/i.test(String(v || ""));

/** Plain text for places that cannot show HTML: table cells, email subjects. */
export function richTextToPlain(html) {
  if (!html) return "";
  if (!isRichText(html)) return String(html);
  const box = document.createElement("div");
  box.innerHTML = html.replace(/<\/(p|div|li|h[1-6])>/gi, "$&\n").replace(/<br\s*\/?>/gi, "\n");
  return (box.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

