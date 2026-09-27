import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  FiDatabase, FiDownload, FiTrash2, FiClock, FiCheckCircle, FiAlertTriangle, FiHardDrive,
} from "react-icons/fi";
import { get, post, put, del } from "../../api/axios";

/**
 * Backups — super-admin only.
 *
 * One job: make sure the school always has a copy of its records that does
 * not depend on the server or the internet. So the page is three things, in
 * order of how often they matter: a big "Back up now" button, a choice of how
 * often it happens by itself, and the list of copies to download.
 */

// Mirrors App\Models\BackupSetting::FREQUENCIES.
const FREQUENCIES = [
  { key: "off", label: "Off", hint: "Only when you press the button" },
  { key: "daily", label: "Every day", hint: "Best if data changes a lot" },
  { key: "weekly", label: "Every week", hint: "A good balance" },
  { key: "monthly", label: "Every month", hint: "Recommended minimum" },
  { key: "6_months", label: "Every 6 months", hint: "Twice a year" },
  { key: "yearly", label: "Every year", hint: "Once a year" },
];

const KEEP_OPTIONS = [3, 6, 12, 24];

const fmtSize = (b) => (b == null ? "—" : b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${(b / 1048576).toFixed(1)} MB`);
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}) : "—");

export default function Backups() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const poll = useRef(null);

  const load = useCallback(() =>
    get("/system/backups", { cache: false })
      .then((r) => { setData(r.data?.data); setError(""); })
      .catch((e) => setError(e.response?.data?.message || "Could not load backups.")), []);

  useEffect(() => { load(); }, [load]);

  // While a backup is being made, check every few seconds until it is done.
  const running = !!data?.running;
  useEffect(() => {
    if (!running) return undefined;
    poll.current = setInterval(load, 3000);
    return () => clearInterval(poll.current);
  }, [running, load]);

  const toast = (icon, title) => Swal.fire({ toast: true, position: "top-end", icon, title, timer: 2200, showConfirmButton: false });

  const backupNow = async () => {
    setStarting(true);
    try {
      await post("/system/backups");
      await load();
    } catch (e) {
      toast("error", e.response?.data?.message || "Could not start the backup.");
    } finally {
      setStarting(false);
    }
  };

  const saveSettings = async (patch) => {
    const next = { ...data.settings, ...patch };
    setSaving(true);
    try {
      await put("/system/backups/settings", { frequency: next.frequency, keep_count: next.keep_count });
      await load();
      toast("success", "Saved");
    } catch (e) {
      toast("error", e.response?.data?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const download = async (b) => {
    try {
      const r = await get(`/system/backups/${b.id}/link`, { cache: false });
      const a = document.createElement("a");
      a.href = r.data?.data?.url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast("error", e.response?.data?.message || "Could not download.");
    }
  };

  const remove = async (b) => {
    const ok = await Swal.fire({
      icon: "warning", title: "Delete this backup?", text: "The file will be removed from the server.",
      showCancelButton: true, confirmButtonText: "Delete", cancelButtonText: "Cancel", confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    try {
      await del(`/system/backups/${b.id}`);
      await load();
    } catch (e) {
      toast("error", e.response?.data?.message || "Could not delete.");
    }
  };

  if (!data) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
        {error
          ? <p className="text-sm text-red-600">{error}</p>
          : <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-600" />}
      </div>
    );
  }

  const last = data.backups.find((b) => b.status === "done");
  const frequency = data.settings.frequency;

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center">
          <FiDatabase className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Backups</h1>
          <p className="text-xs text-gray-500 mt-0.5">A full copy of all records and uploaded files.</p>
        </div>
      </div>

      {/* 1 — Back up now */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6 text-center">
        {running ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600" />
            <p className="text-sm font-semibold text-teal-700">Backing up…</p>
            <p className="text-xs text-gray-500">This can take a few minutes. You can leave this page.</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500 mb-4">
              {last ? (
                <span className="inline-flex items-center gap-1.5">
                  <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Last backup:</span>
                  <span className="font-semibold text-gray-700" data-no-i18n>{fmtDate(last.finished_at)} · {fmtSize(last.size)}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <FiAlertTriangle className="w-3.5 h-3.5" />
                  <span>No backup has been taken yet.</span>
                </span>
              )}
            </div>
            <button
              onClick={backupNow}
              disabled={starting}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-sm disabled:opacity-50"
            >
              <FiHardDrive className="w-4 h-4" />
              {starting ? "Starting…" : "Back up now"}
            </button>
          </>
        )}
        <p className="mt-5 text-[11px] text-gray-600 bg-teal-50/70 border border-teal-100 rounded-lg px-4 py-2.5 text-start">
          Download each backup to a computer or a USB drive. If the internet or the server stops working, that copy is what the system is restored from.
        </p>
      </section>

      {/* 2 — Automatic backup */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FiClock className="w-4 h-4 text-gray-400" />
          <div>
            <h2 className="text-sm font-bold text-gray-800">Automatic backup</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">How often should the system back itself up?</p>
          </div>
        </header>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FREQUENCIES.map((opt) => {
            const active = frequency === opt.key;
            return (
              <button
                key={opt.key}
                disabled={saving}
                onClick={() => !active && saveSettings({ frequency: opt.key })}
                className={`text-start p-4 rounded-xl border-2 transition-all ${
                  active ? "border-teal-500 bg-teal-50/60 shadow-sm" : "border-gray-100 hover:border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-semibold text-sm ${active ? "text-teal-700" : "text-gray-800"}`}>{opt.label}</span>
                  {active && <FiCheckCircle className="w-4 h-4 text-teal-500 shrink-0" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">{opt.hint}</p>
              </button>
            );
          })}
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            {data.next_auto_at ? (
              <>
                <span>Next automatic backup:</span>
                <span className="font-semibold text-gray-800" data-no-i18n>{fmtDate(data.next_auto_at)}</span>
              </>
            ) : <span>Automatic backup is off.</span>}
          </span>
          {frequency !== "off" && (
            <label className="inline-flex items-center gap-2">
              <span>Keep the last</span>
              <select
                value={data.settings.keep_count}
                disabled={saving}
                onChange={(e) => saveSettings({ keep_count: Number(e.target.value) })}
                className="px-2 py-1 border border-gray-200 rounded-lg bg-white text-xs"
                data-no-i18n
              >
                {KEEP_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>automatic backups</span>
            </label>
          )}
        </div>
      </section>

      {/* 3 — The copies */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Saved backups</h2>
        </header>
        {data.backups.length === 0 ? (
          <p className="p-8 text-center text-xs text-gray-400">No backups yet. Press “Back up now” to make the first one.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.backups.map((b) => (
              <li key={b.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800" data-no-i18n>{fmtDate(b.started_at)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      b.trigger === "auto" ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {b.trigger === "auto" ? "Automatic" : "Manual"}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {b.status === "done" && <span data-no-i18n>{fmtSize(b.size)}</span>}
                    {b.status === "running" && <span className="text-teal-600">Backing up…</span>}
                    {b.status === "failed" && <span className="text-red-600" title={b.error || ""}>Failed</span>}
                    {b.created_by && <span data-no-i18n> · {b.created_by}</span>}
                  </div>
                </div>
                {b.available && (
                  <button onClick={() => download(b)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">
                    <FiDownload className="w-3.5 h-3.5" /> Download
                  </button>
                )}
                {b.status !== "running" && (
                  <button onClick={() => remove(b)} title="Delete"
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
