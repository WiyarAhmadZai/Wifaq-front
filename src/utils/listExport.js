import * as XLSX from "xlsx";

// Shared Excel-export + Print helpers for list pages.
// Works off the same column config the lists already use:
//   { key, label, render?(value,item), exportValue?(item), noExport? }
// For each cell it prefers exportValue(), then a render() that returns a
// string/number, then the raw (dot-path) field. React elements (badges/buttons)
// are treated as empty so the output stays plain text.

const REACT_ELEMENT = typeof Symbol === "function" ? Symbol.for("react.element") : 0xeac7;
const REACT_ELEMENT2 = typeof Symbol === "function" ? Symbol.for("react.transitional.element") : 0;
const isReactEl = (v) => v && typeof v === "object" && (v.$$typeof === REACT_ELEMENT || v.$$typeof === REACT_ELEMENT2);

const getPath = (obj, path) =>
  String(path || "").split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

function cellValue(col, item) {
  if (typeof col.exportValue === "function") {
    const v = col.exportValue(item);
    return v == null ? "" : v;
  }
  if (typeof col.render === "function") {
    try {
      const r = col.render(getPath(item, col.key), item);
      if (typeof r === "string" || typeof r === "number") return r;
      if (r != null && !isReactEl(r) && typeof r !== "object") return r;
    } catch { /* fall through to raw value */ }
  }
  const v = getPath(item, col.key);
  if (v == null) return "";
  return typeof v === "object" ? "" : v;
}

function buildMatrix(rows, columns) {
  const cols = (columns || []).filter((c) => c && c.label && !c.noExport);
  const computed = (rows || []).map((it) => cols.map((c) => cellValue(c, it)));
  // Drop columns that are empty for every row (e.g. action-only columns).
  const keep = cols.map((_, ci) => computed.some((r) => String(r[ci] ?? "").trim() !== ""));
  const headers = cols.filter((_, ci) => keep[ci]).map((c) => c.label);
  const data = computed.map((r) => r.filter((_, ci) => keep[ci]));
  return { headers, data };
}

const pad = (n) => String(n).padStart(2, "0");
const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
};
const slug = (s) => String(s || "list").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "list";

export function exportRowsToExcel(rows, columns, title = "list") {
  const { headers, data } = buildMatrix(rows, columns);
  // Title rows: school name + list name, then the table.
  const aoa = [[SCHOOL_NAME], [title], [], headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = headers.map((h, i) => {
    const widest = Math.max(h.length, ...data.map((r) => String(r[i] ?? "").length), 0);
    return { wch: Math.max(12, Math.min(45, widest + 2)) };
  });
  if (headers.length > 1) {
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    ];
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${slug(title)}-${stamp()}.xlsx`);
}

// School name shown as the header on every printed page.
export const SCHOOL_NAME = "Wifaq Educational Network";

export function printRows(rows, columns, title = "List") {
  const { headers, data } = buildMatrix(rows, columns);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const colCount = Math.max(1, headers.length);
  // School name + report line live INSIDE <thead> so they sit above the columns
  // (no overlap) and repeat on every printed page.
  const thead =
    `<tr><th class="brand" colspan="${colCount}">${esc(SCHOOL_NAME)}</th></tr>` +
    `<tr><th class="report" colspan="${colCount}">${esc(title)} &middot; ${data.length} record(s) &middot; ${esc(new Date().toLocaleString())}</th></tr>` +
    `<tr>${headers.map((h) => `<th class="col">${esc(h)}</th>`).join("")}</tr>`;
  const tbody = data.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:8px}
    @page{size:A4 landscape;margin:10mm}
    table{width:100%;border-collapse:collapse;font-size:11px}
    thead{display:table-header-group}
    td,th.col{border:1px solid #cbd5e1;padding:5px 8px;text-align:left;vertical-align:top}
    th.col{background:#ccfbf1;color:#0f766e;font-weight:700}
    th.brand{border:none;border-bottom:2px solid #0f766e;color:#0f766e;font-size:17px;font-weight:800;text-align:center;padding:6px 4px 8px}
    th.report{border:none;color:#555;font-weight:600;font-size:11px;text-align:center;padding:6px 4px 10px}
    tbody tr:nth-child(even) td{background:#f8fafc}
  </style></head><body>
    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
  </body></html>`;

  // Print via a hidden iframe so the current page is NOT navigated away from
  // (no new tab/window).
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", visibility: "hidden" });
  document.body.appendChild(iframe);

  const cleanup = () => { try { iframe.remove(); } catch { /* noop */ } };
  const doc = iframe.contentWindow?.document;
  if (!doc) { cleanup(); return false; }
  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  win.onafterprint = cleanup;
  setTimeout(() => {
    try { win.focus(); win.print(); } catch { /* noop */ }
    setTimeout(cleanup, 60000); // fallback cleanup if onafterprint never fires
  }, 250);
  return true;
}
