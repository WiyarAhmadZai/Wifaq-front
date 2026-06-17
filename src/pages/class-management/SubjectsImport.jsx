import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { post } from '../../api/axios';
import Swal from 'sweetalert2';

const CATEGORIES = ['Maarif Subjects', 'Taqwayati Mayari', 'Taqwayati Takhasosi'];

// Column order used for both the template and parsing. `grade` is the grade
// NAME (resolved to grade_id on the server).
const COLUMNS = [
  'grade', 'subject_name', 'subject_code', 'category', 'field', 'book_name',
  'author', 'edition', 'total_pages', 'chapters', 'start_date',
  'expected_completion_date', 'weekly_hours', 'status',
];

const EXAMPLE_ROWS = [
  ['Grade 1', 'Mathematics', 'MATH-G1', 'Maarif Subjects', '', 'Math Book 1', 'A. Ahmadi', '1st', '120', '1-10', '2026-01-01', '2026-06-30', '5', 'active'],
  ['Grade 1', 'Fiqh', 'FIQH-G1', 'Taqwayati Mayari', '', 'Fiqh Basics', 'M. Karimi', '2nd', '80', '1-6', '', '', '3', 'active'],
];

export default function SubjectsImport({ grades = [], onImported }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const reset = () => { setFileName(''); setRows([]); setResult(null); if (fileRef.current) fileRef.current.value = ''; };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: the data the user fills (headers + a couple of example rows).
    const ws = XLSX.utils.aoa_to_sheet([COLUMNS, ...EXAMPLE_ROWS]);
    ws['!cols'] = COLUMNS.map(c => ({ wch: Math.max(14, c.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Subjects');

    // Sheet 2: instructions + the list of valid grade names to copy from.
    const info = [
      ['HOW TO USE THIS TEMPLATE'],
      [''],
      ['1. Fill one subject per row in the "Subjects" sheet.'],
      ['2. Delete the two example rows before importing.'],
      ['3. Required columns: grade, subject_name, subject_code, category.'],
      ['4. subject_code must be UNIQUE (no duplicates).'],
      ['5. category must be EXACTLY one of:'],
      ...CATEGORIES.map(c => ['', c]),
      ['6. field is only used when category = "Taqwayati Takhasosi".'],
      ['7. Dates must be in YYYY-MM-DD format (e.g. 2026-01-31).'],
      ['8. total_pages / weekly_hours must be whole numbers (weekly_hours 1-20).'],
      ['9. status: active or inactive (defaults to active).'],
      [''],
      ['VALID GRADE NAMES (type exactly as shown):'],
      ...grades.map(g => ['', g.name]),
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(info);
    wsInfo['!cols'] = [{ wch: 6 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Instructions');

    XLSX.writeFile(wb, 'subjects-import-template.xlsx');
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      // Use the "Subjects" sheet if present, else the first sheet.
      const sheet = wb.Sheets['Subjects'] || wb.Sheets[wb.SheetNames[0]];
      // raw:false -> formatted strings (dates come out readable); defval:'' -> keep empty cells.
      const parsed = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
      // Keep only known columns and drop fully-empty rows.
      const cleaned = parsed
        .map(r => {
          const o = {};
          COLUMNS.forEach(c => { o[c] = (r[c] ?? '').toString().trim(); });
          return o;
        })
        .filter(o => Object.values(o).some(v => v !== ''));
      setRows(cleaned);
      if (cleaned.length === 0) {
        Swal.fire('Empty file', 'No data rows were found in the "Subjects" sheet.', 'warning');
      }
    } catch (err) {
      Swal.fire('Could not read file', 'Make sure it is a valid .xlsx or .csv file.', 'error');
      reset();
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await post('/class-management/subjects/import', { rows });
      const data = res.data;
      setResult(data);
      if (data.created > 0) onImported?.();
      if (data.failed_count === 0) {
        Swal.fire({ icon: 'success', title: 'Imported!', text: `${data.created} subject(s) added.`, timer: 2000, showConfirmButton: false });
      }
    } catch (err) {
      Swal.fire('Import failed', err.response?.data?.message || 'Server error during import.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const close = () => { setOpen(false); reset(); };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors flex items-center gap-2 font-semibold text-xs">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        Import Excel
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={close}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Import Subjects from Excel</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Download the template, fill it, then upload.</p>
              </div>
              <button onClick={close} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Step 1: template */}
              <div className="flex items-start gap-3 p-3 bg-teal-50 border border-teal-100 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-800">Download the template</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Includes example rows and the list of valid grade names.</p>
                  <button onClick={downloadTemplate}
                    className="mt-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700">
                    Download .xlsx template
                  </button>
                </div>
              </div>

              {/* Step 2: upload */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-gray-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-800">Upload your filled file</p>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile}
                    className="mt-2 block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                  {fileName && <p className="text-[11px] text-gray-500 mt-1.5">{fileName} — <span className="font-semibold text-gray-700">{rows.length}</span> row(s) detected</p>}
                </div>
              </div>

              {/* Results */}
              {result && (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                    <span className="text-xs font-semibold text-emerald-700">{result.created} added</span>
                    {result.failed_count > 0 && <span className="text-xs font-semibold text-red-600">{result.failed_count} skipped</span>}
                  </div>
                  {result.failed_count > 0 && (
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {result.failed.map((f, i) => (
                        <div key={i} className="px-4 py-2">
                          <p className="text-[11px] font-semibold text-gray-700">Row {f.row}{f.subject_code ? ` · ${f.subject_code}` : ''}</p>
                          <ul className="list-disc list-inside text-[11px] text-red-600">
                            {f.errors.map((e, j) => <li key={j}>{e}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0">
              <button onClick={close} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50">Close</button>
              <button onClick={handleImport} disabled={rows.length === 0 || importing}
                className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                {importing && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {importing ? 'Importing...' : `Import ${rows.length || ''} row(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
