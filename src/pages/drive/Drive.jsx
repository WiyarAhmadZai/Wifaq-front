import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  listDrive, createFolder, uploadFiles, addLink, deleteFile, deleteFolder,
  fileRawBlob, fileDownloadBlob,
} from "../../api/drive";
import { fmtDate } from "../../utils/formErrors";

const fmtSize = (n) => {
  if (!n) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = Number(n);
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
};

const kindLabel = (f) => f.is_link ? "Link" : (f.media_type === "image" ? "Image" : f.media_type === "video" ? "Video" : "File");

// Windows-Explorer-style view modes.
const VIEWS = [
  { key: "large", label: "Large icons", d: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" },
  { key: "list", label: "List", d: "M4 6h16M4 12h16M4 18h16" },
  { key: "details", label: "Details", d: "M3 10h18M3 14h18M3 6h18M3 18h18" },
];

export default function Drive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = searchParams.get("folder") || "";

  const [data, setData] = useState({ current: null, breadcrumb: [], folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const [view, setView] = useState(() => localStorage.getItem("driveView") || "large");
  const changeView = (m) => { setView(m); localStorage.setItem("driveView", m); };

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ name: "", external_url: "", media_type: "file" });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pending, setPending] = useState([]);     // files queued in the upload modal
  const [dragOver, setDragOver] = useState(false);

  const goTo = (id) => setSearchParams(id ? { folder: String(id) } : {});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDrive(folderId);
      setData(res.data?.data || { current: null, breadcrumb: [], folders: [], files: [] });
    } catch {
      setData({ current: null, breadcrumb: [], folders: [], files: [] });
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => { load(); }, [load]);

  const newFolder = async () => {
    const { value } = await Swal.fire({
      title: "New folder", input: "text", inputPlaceholder: "Folder name",
      showCancelButton: true, confirmButtonText: "Create", confirmButtonColor: "#0d9488",
      inputValidator: (v) => (!v?.trim() ? "Enter a name" : undefined),
    });
    if (!value?.trim()) return;
    try { await createFolder(value.trim(), folderId || null); await load(); }
    catch (e) { Swal.fire("Error", e.response?.data?.message || "Could not create folder.", "error"); }
  };

  const openUpload = () => { setPending([]); setUploadOpen(true); };

  // Queue files chosen via the browse button or drag-and-drop into the modal.
  const queueFiles = (fileList) => {
    const arr = Array.from(fileList || []);
    if (arr.length) setPending((prev) => [...prev, ...arr]);
  };
  const onPickFiles = (e) => { queueFiles(e.target.files); e.target.value = ""; };
  const removePending = (i) => setPending((prev) => prev.filter((_, idx) => idx !== i));

  const doUpload = async () => {
    if (!pending.length) { Swal.fire("No files", "Choose at least one file to upload.", "warning"); return; }
    setBusy(true);
    try {
      await uploadFiles(folderId || null, pending);
      setUploadOpen(false); setPending([]);
      await load();
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Uploaded", timer: 1400, showConfirmButton: false });
    } catch (e2) {
      // Surface the real server validation message (e.g. size / type limits).
      const err = e2.response?.data;
      const detail = err?.errors ? Object.values(err.errors).flat().join("\n") : err?.message;
      Swal.fire("Upload failed", detail || "Could not upload. Check the file size and try again.", "error");
    } finally { setBusy(false); }
  };

  const saveLink = async () => {
    if (!linkForm.name.trim() || !linkForm.external_url.trim()) {
      Swal.fire("Missing info", "Give the link a name and a URL.", "warning"); return;
    }
    setBusy(true);
    try {
      await addLink(folderId || null, linkForm.name.trim(), linkForm.external_url.trim(), linkForm.media_type);
      setLinkOpen(false); setLinkForm({ name: "", external_url: "", media_type: "file" });
      await load();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not add link.", "error");
    } finally { setBusy(false); }
  };

  const removeFolder = async (f) => {
    const r = await Swal.fire({ title: `Delete "${f.name}"?`, text: "Everything inside is removed too. This cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Delete" });
    if (!r.isConfirmed) return;
    try { await deleteFolder(f.id); await load(); } catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed.", "error"); }
  };
  const removeFile = async (f) => {
    const r = await Swal.fire({ title: `Delete "${f.name}"?`, icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Delete" });
    if (!r.isConfirmed) return;
    try { await deleteFile(f.id); await load(); } catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed.", "error"); }
  };

  // Open: a link opens its URL; an uploaded file is streamed (auth blob) into a new tab.
  const openFile = async (f) => {
    if (f.is_link) { window.open(f.external_url, "_blank", "noopener"); return; }
    try {
      const res = await fileRawBlob(f.id);
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { Swal.fire("Error", "Could not open the file.", "error"); }
  };

  // Download: ONLY for uploaded files — actually saves the file to disk.
  const downloadFile = async (f) => {
    try {
      const res = await fileDownloadBlob(f.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { Swal.fire("Error", "Could not download.", "error"); }
  };

  // For links there is no file to download — copying the URL is the useful action.
  const copyLink = async (f) => {
    try {
      await navigator.clipboard.writeText(f.external_url);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Link copied", timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire("Link", f.external_url, "info");
    }
  };

  const isEmpty = data.folders.length === 0 && data.files.length === 0;

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">My Drive</h2>
          <p className="text-xs text-gray-500 mt-0.5">Your private files & links — only you can see them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={newFolder} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5">
            <Icon d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /> New folder
          </button>
          <button onClick={openUpload} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-bold flex items-center gap-1.5">
            <Icon d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /> Upload
          </button>
          <button onClick={() => setLinkOpen(true)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5">
            <Icon d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 115.656 5.656l-1.5 1.5" /> Add link
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onPickFiles} />
        </div>
      </div>

      {/* Breadcrumb + view switcher */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center flex-wrap gap-1 text-xs">
          <button onClick={() => goTo("")} className={`px-2 py-1 rounded hover:bg-gray-100 ${!folderId ? "font-bold text-teal-700" : "text-gray-500"}`}>Home</button>
          {(data.breadcrumb || []).map((c, i, arr) => (
            <span key={c.id} className="flex items-center gap-1">
              <span className="text-gray-300">/</span>
              <button onClick={() => goTo(c.id)} className={`px-2 py-1 rounded hover:bg-gray-100 ${i === arr.length - 1 ? "font-bold text-teal-700" : "text-gray-500"}`}>{c.name}</button>
            </span>
          ))}
        </div>
        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 flex-shrink-0">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => changeView(v.key)} title={v.label}
              className={`p-1.5 rounded ${view === v.key ? "bg-teal-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              <Icon className="w-4 h-4" d={v.d} />
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" /></div>
      ) : isEmpty ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-sm text-gray-400">This folder is empty. Upload files, add a link, or create a folder.</p>
        </div>
      ) : view === "details" ? (
        <DetailsView data={data} goTo={goTo} openFile={openFile} downloadFile={downloadFile} copyLink={copyLink} removeFile={removeFile} removeFolder={removeFolder} />
      ) : view === "list" ? (
        <ListView data={data} goTo={goTo} openFile={openFile} downloadFile={downloadFile} copyLink={copyLink} removeFile={removeFile} removeFolder={removeFolder} />
      ) : (
        <LargeView data={data} goTo={goTo} openFile={openFile} downloadFile={downloadFile} copyLink={copyLink} removeFile={removeFile} removeFolder={removeFolder} />
      )}

      {/* Upload modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setUploadOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 mb-1">Upload files</h3>
            <p className="text-[11px] text-gray-500 mb-3">{data.current ? `Into "${data.current.name}"` : "Into Home"} · up to 50 MB each.</p>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); queueFiles(e.dataTransfer.files); }}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-teal-300 bg-gray-50"}`}
            >
              <svg className="w-8 h-8 mx-auto text-teal-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
              <p className="text-xs font-semibold text-gray-700">Click to browse or drag files here</p>
              <p className="text-[10px] text-gray-400 mt-0.5">You can select multiple files</p>
            </div>

            {/* Queue */}
            {pending.length > 0 && (
              <div className="mt-3 max-h-44 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {pending.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-2 px-3 py-1.5">
                    <Icon className="w-4 h-4 text-gray-400" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    <span className="text-xs text-gray-700 flex-1 truncate" title={f.name}>{f.name}</span>
                    <span className="text-[10px] text-gray-400">{fmtSize(f.size)}</span>
                    {!busy && <button onClick={() => removePending(i)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setUploadOpen(false)} disabled={busy} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={doUpload} disabled={busy || pending.length === 0} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50">
                {busy ? "Uploading…" : `Upload${pending.length ? ` (${pending.length})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add-link modal */}
      {linkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setLinkOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 mb-3">Add a link</h3>
            <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">Name</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3" value={linkForm.name} onChange={(e) => setLinkForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Project video" />
            <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">URL</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3" value={linkForm.external_url} onChange={(e) => setLinkForm((s) => ({ ...s, external_url: e.target.value }))} placeholder="https://drive.google.com/…  or  https://youtu.be/…" />
            <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">Type</label>
            <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4" value={linkForm.media_type} onChange={(e) => setLinkForm((s) => ({ ...s, media_type: e.target.value }))}>
              <option value="file">File / document</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setLinkOpen(false)} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={saveLink} disabled={busy} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50">Add link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Per-file action buttons (download for files, copy-link for links) ── */
function FileActions({ f, openFile, downloadFile, copyLink, removeFile, compact }) {
  const cls = `p-1 ${compact ? "" : "bg-white/90 shadow-sm"} rounded text-gray-600 hover:text-teal-600`;
  return (
    <>
      {f.is_link ? (
        <button onClick={(e) => { e.stopPropagation(); copyLink(f); }} title="Copy link" className={cls}>
          <Icon d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M10 8h8a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8a2 2 0 012-2z" />
        </button>
      ) : (
        <button onClick={(e) => { e.stopPropagation(); downloadFile(f); }} title="Download" className={cls}>
          <Icon d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </button>
      )}
      <button onClick={(e) => { e.stopPropagation(); removeFile(f); }} title="Delete" className={`p-1 ${compact ? "" : "bg-white/90 shadow-sm"} rounded text-red-500 hover:text-red-700`}>✕</button>
    </>
  );
}

/* ── Large icons (thumbnails) ── */
function LargeView({ data, goTo, openFile, downloadFile, copyLink, removeFile, removeFolder }) {
  return (
    <>
      {data.folders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {data.folders.map((f) => (
            <div key={`fo-${f.id}`} className="group relative bg-white border border-gray-200 rounded-xl p-3 hover:border-teal-300 hover:shadow-sm cursor-pointer" onClick={() => goTo(f.id)}>
              <button onClick={(e) => { e.stopPropagation(); removeFolder(f); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs">✕</button>
              <div className="flex items-center gap-2">
                <FolderGlyph className="w-9 h-9" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{f.name}</p>
                  <p className="text-[10px] text-gray-400">{f.files_count || 0} files · {f.children_count || 0} folders</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.files.map((f) => (
            <div key={`fi-${f.id}`} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-teal-300 hover:shadow-sm">
              <div className="absolute top-1.5 right-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100">
                <FileActions f={f} openFile={openFile} downloadFile={downloadFile} copyLink={copyLink} removeFile={removeFile} />
              </div>
              <button onClick={() => openFile(f)} className="block w-full text-left">
                <DriveThumb file={f} />
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-800 truncate" title={f.name}>{f.name}</p>
                  <p className="text-[10px] text-gray-400">{kindLabel(f)}{f.size ? ` · ${fmtSize(f.size)}` : ""}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── List (compact rows) ── */
function ListView({ data, goTo, openFile, downloadFile, copyLink, removeFile, removeFolder }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
      {data.folders.map((f) => (
        <div key={`fo-${f.id}`} className="group flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => goTo(f.id)}>
          <FolderGlyph className="w-5 h-5" />
          <span className="text-xs font-medium text-gray-800 flex-1 truncate">{f.name}</span>
          <span className="text-[10px] text-gray-400 hidden sm:block">{f.files_count || 0} files</span>
          <button onClick={(e) => { e.stopPropagation(); removeFolder(f); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-1">✕</button>
        </div>
      ))}
      {data.files.map((f) => (
        <div key={`fi-${f.id}`} className="group flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => openFile(f)}>
          <FileGlyph file={f} className="w-5 h-5" />
          <span className="text-xs font-medium text-gray-800 flex-1 truncate" title={f.name}>{f.name}</span>
          <span className="text-[10px] text-gray-400 hidden sm:block w-24 text-right">{f.size ? fmtSize(f.size) : kindLabel(f)}</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <FileActions f={f} openFile={openFile} downloadFile={downloadFile} copyLink={copyLink} removeFile={removeFile} compact />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Details (table) ── */
function DetailsView({ data, goTo, openFile, downloadFile, copyLink, removeFile, removeFolder }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">Name</th>
            <th className="text-left px-3 py-2 font-semibold">Type</th>
            <th className="text-right px-3 py-2 font-semibold">Size</th>
            <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">Modified</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.folders.map((f) => (
            <tr key={`fo-${f.id}`} className="group hover:bg-gray-50 cursor-pointer" onClick={() => goTo(f.id)}>
              <td className="px-3 py-2"><div className="flex items-center gap-2"><FolderGlyph className="w-4 h-4" /><span className="font-medium text-gray-800 truncate">{f.name}</span></div></td>
              <td className="px-3 py-2 text-gray-500">Folder</td>
              <td className="px-3 py-2 text-right text-gray-400">—</td>
              <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{f.updated_at ? fmtDate(f.updated_at) : "—"}</td>
              <td className="px-3 py-2 text-right"><button onClick={(e) => { e.stopPropagation(); removeFolder(f); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">✕</button></td>
            </tr>
          ))}
          {data.files.map((f) => (
            <tr key={`fi-${f.id}`} className="group hover:bg-gray-50 cursor-pointer" onClick={() => openFile(f)}>
              <td className="px-3 py-2"><div className="flex items-center gap-2"><FileGlyph file={f} className="w-4 h-4" /><span className="font-medium text-gray-800 truncate" title={f.name}>{f.name}</span></div></td>
              <td className="px-3 py-2 text-gray-500">{kindLabel(f)}</td>
              <td className="px-3 py-2 text-right text-gray-500">{f.size ? fmtSize(f.size) : "—"}</td>
              <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{f.created_at ? fmtDate(f.created_at) : "—"}</td>
              <td className="px-3 py-2"><div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100"><FileActions f={f} openFile={openFile} downloadFile={downloadFile} copyLink={copyLink} removeFile={removeFile} compact /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Glyphs / thumbnails ── */
function FolderGlyph({ className = "w-6 h-6" }) {
  return <svg className={`${className} text-amber-400 flex-shrink-0`} fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" /></svg>;
}

function FileGlyph({ file, className = "w-6 h-6" }) {
  const color = file.media_type === "image" ? "text-emerald-400" : file.media_type === "video" ? "text-purple-400" : file.is_link ? "text-sky-400" : "text-gray-300";
  const d = file.media_type === "image"
    ? "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    : file.media_type === "video"
      ? "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
      : file.is_link
        ? "M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 115.656 5.656l-1.5 1.5"
        : "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";
  return <svg className={`${className} ${color} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;
}

// Thumbnail for the large view: external image links render directly; private
// uploaded images are fetched as an authenticated blob. Else a type icon.
function DriveThumb({ file }) {
  const [blobUrl, setBlobUrl] = useState(null);
  useEffect(() => {
    let url = null, cancelled = false;
    if (!file.is_link && file.media_type === "image") {
      fileRawBlob(file.id)
        .then((res) => { if (!cancelled) { url = URL.createObjectURL(res.data); setBlobUrl(url); } })
        .catch(() => {});
    }
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [file.id, file.is_link, file.media_type]);

  const src = file.is_link && file.media_type === "image" ? file.external_url : blobUrl;
  if (src) {
    return <div className="h-28 bg-gray-50 flex items-center justify-center overflow-hidden"><img src={src} alt={file.name} className="h-full w-full object-cover" /></div>;
  }
  return <div className="h-28 bg-gray-50 flex items-center justify-center"><FileGlyph file={file} className="w-10 h-10" /></div>;
}

function Icon({ d, className = "w-3.5 h-3.5" }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} /></svg>;
}
