/**
 * Rich-text helpers shared by the editor, the viewer, and any list or email
 * that has to show a description as plain text. Kept out of the component
 * file so Fast Refresh keeps working there.
 */

/* Tags we keep. Everything else — scripts, styles, event handlers, iframes —
   is stripped on the way in AND on the way out, so pasted content from Word
   or a web page can never carry anything executable into the page. */
const ALLOWED = new Set([
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SUB", "SUP",
  "H2", "H3", "P", "BR", "DIV", "BLOCKQUOTE",
  "UL", "OL", "LI", "A", "SPAN",
]);

/* Tags whose CONTENT must go too — unwrapping a pasted Word <style> block
   would leave a page of CSS as visible text, and a <script>'s body is never
   prose. */
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "NOSCRIPT", "TEMPLATE", "HEAD", "TITLE", "META", "LINK", "SVG", "MATH"]);

/* Block-level tags that may carry a writing direction and an alignment. */
const BLOCKS = new Set(["H2", "H3", "P", "DIV", "BLOCKQUOTE", "LI", "UL", "OL"]);

/* The only inline styles that survive, and what a value may look like. A
   colour is a hex/rgb/hsl/named token; a font is a plain family list; sizes
   are px/em/rem/%. Nothing with url(), expression(), or a semicolon. */
const COLOUR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-z]{3,20})$/i;
const STYLE_RULES = {
  "color":            COLOUR,
  "background-color": COLOUR,
  "font-family":      /^[\w\s,'"-]{1,120}$/,
  "font-size":        /^(\d{1,3}(\.\d+)?(px|em|rem|%|pt)|xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large)$/,
  "text-align":       /^(left|right|center|justify|start|end)$/,
};

/* Browsers hand back sizes two ways — <font size="1..7"> or a CSS keyword —
   depending on the command and the engine. Both become the same em scale so a
   "Large" chosen in Chrome looks the same when read back in Firefox. */
const SIZE_EM = {
  "xx-small": ".65em", "x-small": ".75em", "small": ".875em", "medium": "1em",
  "large": "1.15em", "x-large": "1.4em", "xx-large": "1.75em", "xxx-large": "2.25em",
};
const FONT_SIZE_KEY = { 1: "x-small", 2: "small", 3: "medium", 4: "large", 5: "x-large", 6: "xx-large", 7: "xxx-large" };

function cleanStyle(raw) {
  const kept = [];
  String(raw || "").split(";").forEach((decl) => {
    const i = decl.indexOf(":");
    if (i < 0) return;
    const prop = decl.slice(0, i).trim().toLowerCase();
    let val = decl.slice(i + 1).trim().replace(/\s*!important$/i, "");
    const rule = STYLE_RULES[prop];
    if (!rule || !rule.test(val) || /url\(|expression\(/i.test(val)) return;
    // "No highlight" / default colour: drop the declaration instead of keeping noise.
    if ((prop === "background-color" || prop === "color") && /^(transparent|inherit|initial)$/i.test(val)) return;
    if (prop === "font-size" && SIZE_EM[val.toLowerCase()]) val = SIZE_EM[val.toLowerCase()];
    kept.push(`${prop}:${val}`);
  });
  return kept.join(";");
}

/**
 * Turn the non-breaking spaces a contentEditable leaves behind into ordinary
 * ones.
 *
 * Typing a space at the end of a line makes every browser insert U+00A0
 * instead of a plain space — otherwise the caret would sit on a space the
 * layout has already collapsed. That is an editing artefact, not something
 * the writer asked for, and serialising it back out writes the literal text
 * `&nbsp;`. In a message with no other markup nothing downstream treats the
 * result as HTML, so the reader is shown the five characters `&nbsp;` at the
 * end of their sentence. Normalising here means it is never stored.
 */
const normalizeSpaces = (node) => {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (t.nodeValue.includes("\u00A0")) t.nodeValue = t.nodeValue.replace(/\u00A0/g, " ");
  }
};

/**
 * Entities back to the characters they stand for, for the places that show a
 * body as PLAIN TEXT — a list row, a bubble with no markup in it. React
 * escapes whatever it renders, so a decoded "<script>" is still printed, not
 * run.
 */
export function decodeEntities(text) {
  const s = String(text ?? "");
  if (!s.includes("&")) return s;
  const box = document.createElement("textarea");
  box.innerHTML = s;
  return box.value;
}

export function sanitizeHtml(html) {
  if (!html) return "";
  const box = document.createElement("div");
  box.innerHTML = html;
  normalizeSpaces(box);

  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType !== 1) return;
      if (DROP.has(child.tagName)) { child.remove(); return; }

      // Browsers still emit <font> for colour/face/size commands; convert it
      // to the <span style> form we allow rather than dropping the styling.
      if (child.tagName === "FONT") {
        const span = document.createElement("span");
        const parts = [];
        if (child.getAttribute("color")) parts.push(`color:${child.getAttribute("color")}`);
        if (child.getAttribute("face")) parts.push(`font-family:${child.getAttribute("face")}`);
        if (FONT_SIZE_KEY[child.getAttribute("size")]) parts.push(`font-size:${FONT_SIZE_KEY[child.getAttribute("size")]}`);
        if (child.getAttribute("style")) parts.push(child.getAttribute("style"));
        const st = cleanStyle(parts.join(";"));
        if (st) span.setAttribute("style", st);
        while (child.firstChild) span.appendChild(child.firstChild);
        child.replaceWith(span);
        child = span;
      }

      if (!ALLOWED.has(child.tagName)) {
        // Unwrap: keep the text and children, drop the tag itself.
        const frag = document.createDocumentFragment();
        while (child.firstChild) frag.appendChild(child.firstChild);
        child.replaceWith(frag);
        walk(node);
        return;
      }

      // Legacy align="" (what execCommand emits without styleWithCSS) → CSS.
      const align = child.getAttribute("align");
      if (align && BLOCKS.has(child.tagName) && /^(left|right|center|justify)$/i.test(align)) {
        child.setAttribute("style", `text-align:${align.toLowerCase()};${child.getAttribute("style") || ""}`);
      }
      [...child.attributes].forEach((a) => {
        const name = a.name.toLowerCase();
        if (name === "href" && child.tagName === "A" && /^https?:\/\//i.test(a.value)) return;
        if (name === "style") {
          const st = cleanStyle(a.value);
          if (st) { child.setAttribute("style", st); return; }
        }
        if (name === "dir" && BLOCKS.has(child.tagName) && /^(ltr|rtl|auto)$/i.test(a.value)) {
          child.setAttribute("dir", a.value.toLowerCase()); return;
        }
        child.removeAttribute(a.name);
      });
      if (child.tagName === "A") { child.setAttribute("target", "_blank"); child.setAttribute("rel", "noopener noreferrer"); }
      walk(child);
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
  // Not markup, but it may still carry entities — messages written before
  // normalizeSpaces existed end in a literal `&nbsp;`.
  if (!isRichText(html)) return decodeEntities(html).replace(/\u00A0/g, " ").trim();
  const box = document.createElement("div");
  box.innerHTML = html.replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "$&\n").replace(/<br\s*\/?>/gi, "\n");
  return (box.textContent || "").replace(/\u00A0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
