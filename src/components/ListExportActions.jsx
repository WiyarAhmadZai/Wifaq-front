import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { exportRowsToExcel, printRows, slug } from "../utils/listExport";

/**
 * Reusable Export-to-Excel + Print buttons for any list page.
 *
 * Props:
 *   getRows  : array | () => (array | Promise<array>)  — the records to output.
 *              Use a function that fetches ALL pages so the export isn't limited
 *              to the current page.
 *   columns  : [{ key, label, render?, exportValue?, noExport? }] — same config
 *              the list table uses.
 *   title    : used for the file name and the print header.
 *
 * Print opens a column picker: the user checks exactly which columns
 * the printed sheet carries, and the choice is remembered per list.
 * Excel always carries every column.
 */
export default function ListExportActions({ getRows, columns = [], title = "List", className = "" }) {
  const [busy, setBusy] = useState(null); // 'excel' | 'print' | null
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  // The columns a printed sheet can carry — the same rule the
  // export itself uses: it must have a label and not be marked noExport.
  const printable = (columns || []).filter((c) => c && c.label && !c.noExport);

  // Which of them are printed. Remembered per list, so a roster the
  // user prints every week keeps the columns they chose.
  const storageKey = `print-columns:${slug(title)}`;
  const [selected, setSelected] = useState(() => {
    const all = printable.map((c) => c.key);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved) && saved.length) {
        // Keep only keys that still exist on this list. A choice saved
        // against an older column set must not leave the sheet with no
        // columns at all — that printed a header banner over empty rows.
        const valid = saved.filter((k) => printable.some((c) => c.key === k));
        if (valid.length) return new Set(valid);
      }
    } catch { /* noop */ }
    return new Set(all);
  });

  const persist = (next) => {
    setSelected(next);
    try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* noop */ }
  };
  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    persist(next);
  };

  // Close the picker when the click lands outside it.
  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pickerOpen]);

  const resolveRows = async () =>
    typeof getRows === "function" ? await getRows() : Array.isArray(getRows) ? getRows : [];

  const run = async (mode) => {
    if (busy) return;
    setBusy(mode);
    try {
      const rows = await resolveRows();
      if (!rows || rows.length === 0) {
        Swal.fire({ icon: "info", title: "Nothing to export", text: "There are no records in this list.", confirmButtonColor: "#0d9488" });
        return;
      }
      if (mode === "excel") exportRowsToExcel(rows, columns, title);
      else printRows(rows, columns, title);
    } catch {
      Swal.fire({ icon: "error", title: "Export failed", text: "Could not prepare the list. Please try again.", confirmButtonColor: "#0d9488" });
    } finally {
      setBusy(null);
    }
  };

  // Print with the chosen columns only.
  const runPrint = async () => {
    if (selected.size === 0) {
      setPickerOpen(false);
      Swal.fire({ icon: "warning", title: "No columns selected", text: "Pick at least one column to print.", confirmButtonColor: "#0d9488" });
      return;
    }
    const chosen = printable.filter((c) => selected.has(c.key));
    setPickerOpen(false);
    setBusy("print");
    try {
      const rows = await resolveRows();
      if (!rows || rows.length === 0) {
        Swal.fire({ icon: "info", title: "Nothing to print", text: "There are no records in this list.", confirmButtonColor: "#0d9488" });
        return;
      }
      printRows(rows, chosen, title);
    } catch {
      Swal.fire({ icon: "error", title: "Print failed", text: "Could not prepare the list. Please try again.", confirmButtonColor: "#0d9488" });
    } finally {
      setBusy(null);
    }
  };

  const btn = "inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl border transition-colors disabled:opacity-50";

  return (
    <div className={`flex gap-2 ${className}`}>
      <button type="button" onClick={() => run("excel")} disabled={!!busy} title="Export all to Excel"
        className={`${btn} bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
        {busy === "excel" ? "Exporting…" : "Excel"}
      </button>
      <div className="relative" ref={pickerRef}>
        <button type="button" onClick={() => setPickerOpen((o) => !o)} disabled={!!busy} title="Print list — choose the columns"
          className={`${btn} bg-white border-gray-200 text-gray-700 hover:bg-gray-50`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" /></svg>
          Print
        </button>
        {pickerOpen && (
          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Print columns</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => persist(new Set(printable.map((c) => c.key)))}
                  className="text-[10px] font-semibold text-teal-700 hover:underline">All</button>
                <button type="button" onClick={() => persist(new Set())}
                  className="text-[10px] font-semibold text-gray-500 hover:underline">None</button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-1.5">
              {printable.map((c) => (
                <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selected.has(c.key)} onChange={() => toggle(c.key)}
                    className="w-3.5 h-3.5 accent-teal-600" />
                  <span className="text-xs text-gray-700">{c.label}</span>
                </label>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={() => setPickerOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button type="button" onClick={runPrint}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700">
                Print
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
