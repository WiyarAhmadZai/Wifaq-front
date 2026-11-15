import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { get } from "../../api/axios";
import Select2 from "../../components/hr/Select2";

/**
 * Observation Reports — one PDF per student with only their evaluation record:
 * how many positive / routine / concern / urgent observations, by dimension,
 * the cards they received and of which kind, and the observations themselves.
 *
 * Search a student and download theirs, or download everyone on the list as
 * one ZIP of separate PDFs. The ZIP takes the same filters as the list, so it
 * holds exactly the students on screen. What each person may see is decided
 * by the server (leadership: everyone; teachers: their own classes and their
 * own observations).
 */

const PAGE = 50;

/** Save a blob response as a file. The API needs the token, so no plain link. */
function saveBlob(res, fallbackName, type) {
  const cd = res.headers?.["content-disposition"] || "";
  const m = /filename="?([^";]+)"?/i.exec(cd);
  const url = URL.createObjectURL(new Blob([res.data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = m ? m[1] : fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick — Firefox cancels the download if it goes too soon.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A failed blob request carries its JSON error as a blob too. */
async function blobError(err) {
  try {
    const text = await err.response?.data?.text?.();
    return JSON.parse(text)?.message;
  } catch {
    return null;
  }
}

export default function ObservationReports() {
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [onlyWithData, setOnlyWithData] = useState(true);
  const [debounced, setDebounced] = useState("");
  const [state, setState] = useState({ key: null, rows: [], classes: [], error: "" });
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [zipping, setZipping] = useState(false);

  // Typing is debounced so every keystroke is not a request.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(() => {
    const p = { only_with_data: onlyWithData ? 1 : 0 };
    if (debounced) p.search = debounced;
    if (classId) p.class_id = classId;
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [debounced, classId, from, to, onlyWithData]);
  const key = JSON.stringify(params);

  useEffect(() => {
    let live = true;
    get("/student-observations/reports", { params, cache: false })
      .then((r) => live && setState({ key, rows: r.data?.data || [], classes: r.data?.classes || [], error: "" }))
      .catch((e) => live && setState((s) => ({ ...s, key, rows: [], error: e.response?.data?.message || "Could not load the students." })));
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const loading = state.key !== key;
  const rows = state.rows;

  const totals = useMemo(() => rows.reduce((t, r) => ({
    obs: t.obs + r.observations.total,
    positive: t.positive + r.observations.positive,
    complaints: t.complaints + r.observations.concern + r.observations.urgent,
    cards: t.cards + r.cards.total,
  }), { obs: 0, positive: 0, complaints: 0, cards: 0 }), [rows]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * PAGE, current * PAGE);

  const downloadOne = async (row) => {
    setBusyId(row.id);
    try {
      const p = {};
      if (from) p.from = from;
      if (to) p.to = to;
      const res = await get(`/student-observations/reports/${row.id}/pdf`, { params: p, responseType: "blob", cache: false });
      saveBlob(res, `observation-report-${row.id}.pdf`, "application/pdf");
    } catch (e) {
      Swal.fire({ icon: "error", title: "Download failed", text: (await blobError(e)) || "Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const downloadAll = async () => {
    const ok = await Swal.fire({
      icon: "question",
      title: "Download all reports?",
      html: `<div><b>${rows.length}</b> <span>students</span></div><div style="margin-top:6px">Each student gets a separate PDF, all in one ZIP file. This can take a minute.</div>`,
      showCancelButton: true,
      confirmButtonText: "Download ZIP",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#0d9488",
    });
    if (!ok.isConfirmed) return;
    setZipping(true);
    try {
      const res = await get("/student-observations/reports/zip", { params, responseType: "blob", cache: false, timeout: 0 });
      saveBlob(res, "student-observation-reports.zip", "application/zip");
    } catch (e) {
      Swal.fire({ icon: "error", title: "Download failed", text: (await blobError(e)) || "Please try again." });
    } finally {
      setZipping(false);
    }
  };

  const input = "px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white";

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Observation Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">Each student's observations and cards as a PDF — one student, or everyone on the list as a ZIP.</p>
        </div>
        <button onClick={downloadAll} disabled={zipping || loading || rows.length === 0}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">
          {zipping ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Preparing ZIP…</span></>
          ) : (
            <><span>⬇</span><span>Download all as ZIP</span> <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-xs">{rows.length}</span></>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Search student</label>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Name or student ID…" className={`${input} w-full`} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Class</label>
          <Select2 value={classId} onChange={(v) => { setClassId(v ? String(v) : ""); setPage(1); }}
            options={state.classes.map((c) => ({ value: c.id, label: c.name }))} placeholder="All classes" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={`${input} w-full`} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
          <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={`${input} w-full`} />
        </div>
        <label className="sm:col-span-2 lg:col-span-5 inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={onlyWithData} onChange={(e) => { setOnlyWithData(e.target.checked); setPage(1); }}
            className="w-4 h-4 text-teal-600 rounded" />
          <span>Only students who have observations or cards</span>
        </label>
      </div>

      {/* Totals for what is on the list */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Students", value: rows.length, cls: "text-gray-800" },
          { label: "Observations", value: totals.obs, cls: "text-teal-700" },
          { label: "Positive", value: totals.positive, cls: "text-emerald-700" },
          { label: "Complaints", value: totals.complaints, cls: "text-red-700" },
          { label: "Cards", value: totals.cards, cls: "text-amber-700" },
        ].map((b) => (
          <div key={b.label} className="bg-white rounded-xl border border-gray-200 px-3 py-2">
            <div className={`text-xl font-bold ${b.cls}`}>{b.value}</div>
            <div className="text-[11px] text-gray-500">{b.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {state.error ? (
          <div className="p-8 text-center text-sm text-red-600">{state.error}</div>
        ) : loading && rows.length === 0 ? (
          <div className="p-10 text-center"><span className="inline-block w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No students match.</div>
        ) : (
          <div className={`overflow-x-auto ${loading ? "opacity-50" : ""}`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="text-start px-3 py-2">Student</th>
                  <th className="text-start px-3 py-2">Class</th>
                  <th className="px-2 py-2">Observations</th>
                  <th className="px-2 py-2 text-emerald-700">Positive</th>
                  <th className="px-2 py-2">Routine</th>
                  <th className="px-2 py-2 text-amber-700">Concern</th>
                  <th className="px-2 py-2 text-red-700">Urgent</th>
                  <th className="px-2 py-2">Cards</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-800">{r.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono" dir="ltr">{r.code || "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.class || "—"}</td>
                    <td className="px-2 py-2 text-center font-bold">{r.observations.total}</td>
                    <td className="px-2 py-2 text-center text-emerald-700">{r.observations.positive}</td>
                    <td className="px-2 py-2 text-center text-gray-600">{r.observations.routine}</td>
                    <td className="px-2 py-2 text-center text-amber-700">{r.observations.concern}</td>
                    <td className="px-2 py-2 text-center text-red-700">{r.observations.urgent}</td>
                    <td className="px-2 py-2 text-center whitespace-nowrap">
                      <span className="font-bold">{r.cards.total}</span>
                      {r.cards.total > 0 && (
                        <span className="text-[11px] text-gray-500"> (<span className="text-emerald-700">{r.cards.best}</span> / <span className="text-red-700">{r.cards.bad}</span>)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-end">
                      <button onClick={() => downloadOne(r)} disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 disabled:opacity-50 whitespace-nowrap">
                        {busyId === r.id
                          ? <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                          : <span>⬇</span>}
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
            <button onClick={() => setPage(current - 1)} disabled={current <= 1} className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40">‹</button>
            <span dir="ltr">{current} / {pages}</span>
            <button onClick={() => setPage(current + 1)} disabled={current >= pages} className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40">›</button>
          </div>
        )}
      </div>
      <p className="text-[11px] text-gray-400">Cards column: total (best / concern).</p>
    </div>
  );
}
