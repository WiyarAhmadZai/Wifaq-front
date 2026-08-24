/**
 * Live DOM translator.
 *
 * WHY THIS EXISTS
 * The interface is ~370 files and ~106k lines of JSX written with English text
 * inline. Rewriting every one of those files to call t("…") would touch code on
 * every screen at once — a very large diff with a real chance of breaking a
 * page nobody looks at until a parent is standing at the desk. Instead the
 * dictionary is keyed by the ENGLISH TEXT ITSELF, and this module swaps that
 * text in the rendered DOM whenever the language is not English.
 *
 * What that buys us:
 *   • Every screen is covered without editing 370 files.
 *   • SweetAlert dialogs, react-select menus and anything else that renders
 *     outside the React root are covered too — they are just DOM.
 *   • Data from the database is never touched. A student's name or a note a
 *     teacher typed is not in the dictionary, so it is left exactly as it is.
 *     Only strings the developers wrote get translated.
 *
 * What it deliberately does not do:
 *   • It never reads or writes the value of an input, textarea or select — only
 *     the placeholder. Typing is never disturbed.
 *   • It never touches anything inside [data-no-i18n], <code>, <pre>, <script>
 *     or a contenteditable region.
 */

/** Tags whose text is never interface copy. */
const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "SVG", "PATH", "CANVAS",
]);

/** Attributes that hold user-visible copy. */
const ATTRS = ["placeholder", "title", "aria-label", "alt", "data-tooltip"];

// node → the English it was rendered with, so a second language switch still
// knows what the source said.
const textOrigins = new WeakMap();
const attrOrigins = new WeakMap(); // element → { attr: english }

let dict = new Map();        // english → translation (empty for English)
let reverse = new Map();     // translation → english (previous language)
let lang = "en";
let observer = null;
let applying = false;
const pending = new Set();

/** Split "  Save  " into ["  ", "Save", "  "] so spacing survives a swap. */
const parts = (raw) => {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
  return m ? [m[1], m[2], m[3]] : ["", raw, ""];
};

/**
 * JSX wraps long sentences over several source lines, so the rendered text node
 * carries the newlines and indentation with it. The dictionary is keyed on the
 * sentence as one line, so collapse runs of whitespace before looking up.
 */
const key = (core) => (/\s{2,}|\n/.test(core) ? core.replace(/\s+/g, " ") : core);

const skip = (el) => {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    if (SKIP_TAGS.has(n.tagName)) return true;
    if (n.hasAttribute?.("data-no-i18n")) return true;
    if (n.isContentEditable) return true;
  }
  return false;
};

/** The English a text node started life as. */
const englishOfText = (node, core) => {
  const stored = textOrigins.get(node);
  if (stored !== undefined) return stored;
  // Re-rendered by React under a non-English language, or translated by an
  // earlier pass we have no record of: come back through the reverse map.
  return reverse.get(core) ?? core;
};

function translateTextNode(node) {
  const raw = node.nodeValue;
  if (!raw || raw.length > 400 || !/[A-Za-z؀-ۿ]/.test(raw)) return;
  const [lead, core, trail] = parts(raw);
  if (!core) return;

  const english = englishOfText(node, key(core));
  const out = dict.get(english);

  if (out && out !== core) {
    textOrigins.set(node, english);
    node.nodeValue = lead + out + trail;
  } else if (!out && core !== english) {
    // Switching back to English (or to a language with no entry for this one).
    textOrigins.set(node, english);
    node.nodeValue = lead + english + trail;
  }
}

function translateAttrs(el) {
  let origins = attrOrigins.get(el);
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    const raw = el.getAttribute(attr);
    if (!raw || raw.length > 400) continue;
    const [lead, core, trail] = parts(raw);
    if (!core) continue;

    const english = origins?.[attr] ?? reverse.get(key(core)) ?? key(core);
    const out = dict.get(english);

    if (out && out !== core) {
      if (!origins) attrOrigins.set(el, (origins = {}));
      origins[attr] = english;
      el.setAttribute(attr, lead + out + trail);
    } else if (!out && core !== english) {
      if (!origins) attrOrigins.set(el, (origins = {}));
      origins[attr] = english;
      el.setAttribute(attr, lead + english + trail);
    }
  }
}

/** Walk a subtree and translate every text node and attribute inside it. */
function walk(root) {
  if (!root) return;

  if (root.nodeType === 3) {                    // a bare text node
    if (root.parentElement && !skip(root.parentElement)) translateTextNode(root);
    return;
  }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1 && skip(root)) return;

  if (root.nodeType === 1) translateAttrs(root);
  for (const el of root.querySelectorAll?.(ATTRS.map((a) => `[${a}]`).join(",")) || []) {
    if (!skip(el)) translateAttrs(el);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement && !SKIP_TAGS.has(n.parentElement.tagName) && n.nodeValue.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  const found = [];
  while (walker.nextNode()) found.push(walker.currentNode);
  for (const n of found) {
    if (!skip(n.parentElement)) translateTextNode(n);
  }
}

/** Run a pass with our own writes fenced off from the observer. */
function run(roots) {
  applying = true;
  try {
    for (const r of roots) walk(r);
  } finally {
    // Discard the records our own writes just generated, otherwise the next
    // callback would re-process everything we touched.
    observer?.takeRecords();
    applying = false;
  }
}

function flush() {
  if (!pending.size) return;
  const roots = [...pending];
  pending.clear();
  run(roots);
}

function onMutations(records) {
  if (applying) return;
  for (const r of records) {
    if (r.type === "childList") {
      for (const n of r.addedNodes) {
        if (n.nodeType === 1 || n.nodeType === 3) pending.add(n);
      }
    } else if (r.type === "characterData") {
      pending.add(r.target);
    } else if (r.type === "attributes" && r.target.nodeType === 1) {
      pending.add(r.target);
    }
  }
  // Translate in the same microtask the mutation arrived in, so a newly
  // rendered screen never flashes English first.
  flush();
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(onMutations);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
}

function stopObserver() {
  observer?.disconnect();
  observer = null;
}

/**
 * Point the translator at a language.
 *
 * @param {string} code        language code
 * @param {Map|object} forward english → translation for that language
 * @param {Map} back           translation → english for the language leaving
 */
export function setLanguage(code, forward, back) {
  lang = code;
  dict = forward instanceof Map ? forward : new Map(Object.entries(forward || {}));
  reverse = back instanceof Map ? back : new Map();

  // English still needs one pass — to put back whatever the last language
  // replaced — but no watching afterwards.
  run([document.body]);
  if (document.title) {
    const t = dict.get(document.title);
    if (t) document.title = t;
  }

  if (code === "en") stopObserver();
  else startObserver();
}

/** Re-translate everything now (used after a dictionary hot-reload). */
export function retranslate() {
  run([document.body]);
}

export function currentLanguage() {
  return lang;
}
