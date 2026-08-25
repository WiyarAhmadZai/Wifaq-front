/**
 * Re-extract every UI string from the CURRENT source and report what the
 * shipped dictionary is missing.
 *
 * This is the check that matters. The earlier coverage test compared ps/dr
 * against en.js — but en.js is generated from the same part files, so a string
 * that never made it into a part was invisible to it. This one compares
 * against the source of truth: the code.
 */
import fs from "fs";
import path from "path";
import url from "url";

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "../src");
const en = (await import(url.pathToFileURL(path.join(root, "i18n/en.js")).href)).default;

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/[\\/]i18n$/.test(p)) walk(p); }
    else if (/\.(jsx|js)$/.test(f) && !/[\\/]i18n[\\/]/.test(p)) files.push(p);
  }
})(root);

/**
 * Commented-out code is not shipped UI. Stripping comments first stops a
 * disabled menu item or a note from being reported as an untranslated string.
 */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")           // block comments
    .replace(/^[ \t]*\/\/.*$/gm, "");           // whole-line // comments

const noise = (s) => {
  // "children ?" and friends: JSX code caught between a => and a <tag>. Real
  // copy never puts a space before its question mark.
  if (/\s[?:]$/.test(s)) return true;
  if (/\?\s*\(|=>|&&|\|\||\.\w+\(|\bconst\b|\breturn\b/.test(s)) return true;
  if (/^[A-Z_]{2,}$/.test(s) && s.length > 6) return true;
  if (/^\d/.test(s) && !/[A-Za-z]{3}/.test(s)) return true;
  return false;
};

/**
 * JSX writes &amp; / &apos; / &nbsp; in the source, but the BROWSER renders
 * them as & ' and a space — and the DOM translator matches on what is
 * rendered. Compare like for like or every "A &amp; B" reads as missing when
 * "A & B" is already translated.
 */
const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&apos;/g, "'").replace(/&quot;/g, '"')
   .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&hellip;/g, "…");

const found = new Map();
const add = (s, f) => {
  s = decode(s).replace(/\s+/g, " ").trim();
  if (!s || s.length < 2 || s.length > 120) return;
  if (!/[A-Za-z]{2}/.test(s)) return;
  if (/^[a-z0-9_.-]+$/.test(s) && !/ /.test(s)) return;
  if (/[{}<>$`]/.test(s)) return;
  if (/^(https?:|\/|#|\.)/.test(s)) return;
  if (/-/.test(s) && /\b(px|rem|bg|text|flex|grid|rounded|border|gap|py|px|mt|mb|ml|mr|w|h|p|m)-/.test(s)) return;
  if (noise(s)) return;
  if (!found.has(s)) found.set(s, new Set());
  found.get(s).add(f.replace(root, "src").replace(/\\/g, "/"));
};

const ATTR = "placeholder|title|alt|aria-label|label|heading|subtitle|emptyText|confirmText|cancelText";
const PROP = "label|title|text|message|subtitle|placeholder|header|desc|description|hint|tooltip|confirmButtonText|cancelButtonText|denyButtonText";

for (const f of files) {
  const src = stripComments(fs.readFileSync(f, "utf8"));
  for (const m of src.matchAll(/>\s*([A-Za-z][^<>{}\n]{1,110}?)\s*</g)) add(m[1], f);
  for (const m of src.matchAll(new RegExp(`\\b(${ATTR})\\s*=\\s*"([^"]{2,110})"`, "g"))) add(m[2], f);
  for (const m of src.matchAll(new RegExp(`\\b(${PROP})\\s*:\\s*"([^"]{2,110})"`, "g"))) add(m[2], f);
  for (const m of src.matchAll(/(?:Swal\.fire|alert|confirm)\(\s*"([^"]{2,110})"/g)) add(m[1], f);
  for (const m of src.matchAll(/Swal\.fire\(\s*"[^"]*"\s*,\s*"([^"]{2,110})"/g)) add(m[1], f);
  // Single-quoted variants — the first sweep only looked at double quotes.
  for (const m of src.matchAll(new RegExp(`\\b(${ATTR})\\s*=\\s*'([^']{2,110})'`, "g"))) add(m[2], f);
  for (const m of src.matchAll(new RegExp(`\\b(${PROP})\\s*:\\s*'([^']{2,110})'`, "g"))) add(m[2], f);
  for (const m of src.matchAll(/(?:Swal\.fire|alert|confirm)\(\s*'([^']{2,110})'/g)) add(m[1], f);
}

const missing = [...found.entries()].filter(([s]) => !(s in en));
console.log(`extracted from source: ${found.size}   in dictionary: ${Object.keys(en).length}   MISSING: ${missing.length}`);

if (process.argv[2] === "--list") {
  const byFile = new Map();
  for (const [s, where] of missing) {
    const key = [...where][0];
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push(s);
  }
  for (const [f, list] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n### ${f}  (${list.length})`);
    for (const s of list) console.log(s);
  }
}
/**
 * Untranslatable by design — these fall through to English on purpose:
 * brand names, currency and document codes, and the email / phone / ID
 * samples used as input placeholders. Translating them would make them wrong.
 */
const ALLOWED = new Set([
  "Facebook", "Instagram", "Twitter/X", "YouTube",
  "USD", "USDT", "NGO", "ID", "CV", "CV:", "URL", "NEXT", "Pos",
  "Branch 1", "Branch 2",
]);

const SAMPLE = /@|\+93|7XX|7xx|XXX|WEN-ST|DEPT-|dd\/mm|curriculum_expert|KBL-|=>|\?\s*\(|===/;

const real = missing.filter(([s]) => !ALLOWED.has(s) && !SAMPLE.test(s));

if (real.length) {
  console.error(`\n${real.length} user-facing string(s) have no translation:\n`);
  for (const [s, where] of real) console.error(`  ${JSON.stringify(s)}   ${[...where][0]}`);
  console.error("\nAdd them to src/i18n/en.js, ps.js and dr.js, then re-run this script.");
  process.exit(1);
}

console.log("OK — every user-facing string is translated.");
