import { useState } from "react";
import Swal from "sweetalert2";
import { exportRowsToExcel, printRows } from "../utils/listExport";

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
 */
export default function ListExportActions({ getRows, columns = [], title = "List", className = "" }) {
  const [busy, setBusy] = useState(null); // 'excel' | 'print' | null

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
    } catch (e) {
      Swal.fire({ icon: "error", title: "Export failed", text: "Could not prepare the list. Please try again.", confirmButtonColor: "#0d9488" });
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
      <button type="button" onClick={() => run("print")} disabled={!!busy} title="Print list"
        className={`${btn} bg-white border-gray-200 text-gray-700 hover:bg-gray-50`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" /></svg>
        {busy === "print" ? "Preparing…" : "Print"}
      </button>
    </div>
  );
}
