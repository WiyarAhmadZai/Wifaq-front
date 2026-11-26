import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { get, del } from "../../api/axios";
import { uploadTaskEvidence } from "../../api/taskEvidence";
import { useAuth } from "../../admin/context/AuthContext";

/**
 * Evidence for a staff task — screenshots or files that show the work was
 * done. Always OPTIONAL: a task completes with or without it.
 *
 *   <EvidencePicker>     choose files inside a "complete the task" dialog
 *   uploadTaskEvidence() send them once the task is saved (api/taskEvidence)
 *   <TaskEvidencePanel>  the list on the task page, where the assigner /
 *                        supervisor opens each file to verify the work
 *
 * Files sit on the private disk, so they are fetched through the API with the
 * user's session (as blobs) rather than linked to /storage directly.
 */

const MAX_FILES = 10;
const MAX_MB = 20;
const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.mp4,.mov";

const prettySize = (b) => {
  if (!b) return "";
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(b / 1024))} KB`;
};

const iconFor = (mime = "", name = "") => {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (mime.startsWith("image/")) return "🖼";
  if (mime.includes("pdf") || ext === "pdf") return "📕";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["ppt", "pptx"].includes(ext)) return "📽";
  if (["doc", "docx"].includes(ext)) return "📄";
  if (mime.startsWith("video/")) return "🎬";
  if (ext === "zip") return "🗜";
  return "📎";
};

/** A file picker for a completion dialog. `files` is a plain File[]. */
export function EvidencePicker({ files, onChange, hint = "Optional — a screenshot, photo or document that shows the work is done." }) {
  const inputRef = useRef(null);

  const add = (list) => {
    const picked = Array.from(list || []);
    const tooBig = picked.filter((f) => f.size > MAX_MB * 1048576);
    const ok = picked.filter((f) => f.size <= MAX_MB * 1048576);
    const next = [...files, ...ok].slice(0, MAX_FILES);
    onChange(next);
    if (tooBig.length) {
      Swal.fire("File too large", `${tooBig.map((f) => f.name).join(", ")} — each file must be ${MAX_MB} MB or smaller.`, "warning");
    } else if (files.length + ok.length > MAX_FILES) {
      Swal.fire("Too many files", `Up to ${MAX_FILES} files at a time.`, "info");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Evidence <span className="normal-case font-normal text-gray-400">(optional)</span>
        </label>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="text-[11px] font-semibold text-teal-700 hover:underline">
          📎 Attach files
        </button>
      </div>
      <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
        onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {files.length === 0 ? (
        <button type="button" onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
          className="w-full rounded-xl border border-dashed border-gray-300 px-3 py-3 text-[11px] text-gray-400 hover:border-teal-400 hover:text-teal-600">
          {hint}
        </button>
      ) : (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs">
              <span>{iconFor(f.type, f.name)}</span>
              <span className="flex-1 truncate" dir="auto">{f.name}</span>
              <span className="text-[10px] text-gray-400">{prettySize(f.size)}</span>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))}
                aria-label={`Remove ${f.name}`} className="text-gray-400 hover:text-red-600">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Fetch one evidence file as a blob URL (the file is not publicly reachable). */
async function blobUrl(taskId, id, download = false) {
  const r = await get(`/hr/staff-tasks/${taskId}/evidence/${id}${download ? "?download=1" : ""}`, {
    responseType: "blob",
    cache: false,
  });
  return URL.createObjectURL(r.data);
}

function Thumb({ taskId, item, onOpen }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url;
    let alive = true;
    blobUrl(taskId, item.id).then((u) => { url = u; if (alive) setSrc(u); }).catch(() => {});
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [taskId, item.id]);

  return (
    <button type="button" onClick={() => onOpen(item)} title={item.original_name}
      className="block aspect-square w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 hover:ring-2 hover:ring-teal-400">
      {src
        ? <img src={src} alt={item.original_name} className="h-full w-full object-cover" />
        : <span className="flex h-full items-center justify-center text-2xl">🖼</span>}
    </button>
  );
}

/**
 * The evidence on the task page. Everyone who may see the task may open the
 * files; the assignee (`canUpload`) may add more; the uploader or a
 * super-admin may remove one.
 */
export function TaskEvidencePanel({ taskId, evidence = [], canUpload = false, onChanged }) {
  const { user, isSuperAdmin } = useAuth();
  const [pending, setPending] = useState([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { url, name }

  const images = evidence.filter((e) => e.is_image);
  const others = evidence.filter((e) => !e.is_image);

  const open = async (item) => {
    try {
      const url = await blobUrl(taskId, item.id);
      if (item.is_image) setPreview({ url, name: item.original_name });
      else window.open(url, "_blank", "noopener");
    } catch {
      Swal.fire("Error", "Could not open the file.", "error");
    }
  };

  const download = async (item) => {
    try {
      const url = await blobUrl(taskId, item.id, true);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.original_name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      Swal.fire("Error", "Could not download the file.", "error");
    }
  };

  const remove = async (item) => {
    const r = await Swal.fire({ title: "Remove this file?", text: item.original_name, icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626" });
    if (!r.isConfirmed) return;
    try { await del(`/hr/staff-tasks/${taskId}/evidence/${item.id}`); onChanged?.(); }
    catch (e) { Swal.fire("Error", e.response?.data?.message || "Could not remove the file.", "error"); }
  };

  const upload = async () => {
    setBusy(true);
    try {
      await uploadTaskEvidence(taskId, pending);
      setPending([]);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Evidence attached", timer: 1400, showConfirmButton: false });
      onChanged?.();
    } catch (e) {
      Swal.fire("Upload failed", e.response?.data?.message || "Could not attach the files.", "error");
    } finally { setBusy(false); }
  };

  const canRemove = (item) => isSuperAdmin || Number(item.uploaded_by) === Number(user?.id);

  if (!evidence.length && !canUpload) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
        📎 Evidence <span className="text-xs font-normal text-gray-400">({evidence.length})</span>
      </h3>
      <p className="text-[11px] text-gray-400 mb-4">Screenshots or files attached to show the work was completed.</p>

      {!evidence.length && <p className="text-xs text-gray-400 mb-3">No evidence attached yet.</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {images.map((item) => (
            <div key={item.id} className="relative group">
              <Thumb taskId={taskId} item={item} onOpen={open} />
              {canRemove(item) && (
                <button type="button" onClick={() => remove(item)} aria-label="Remove"
                  className="absolute top-1 right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] text-red-600 shadow">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {others.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-xs">
              <span>{iconFor(item.mime, item.original_name)}</span>
              <button type="button" onClick={() => open(item)} className="flex-1 truncate text-left text-teal-700 hover:underline" dir="auto">
                {item.original_name}
              </button>
              <span className="text-[10px] text-gray-400">{prettySize(item.size)}</span>
              <button type="button" onClick={() => download(item)} className="text-[11px] text-gray-500 hover:text-teal-700">⤓</button>
              {canRemove(item) && (
                <button type="button" onClick={() => remove(item)} className="text-[11px] text-gray-400 hover:text-red-600">✕</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {evidence.length > 0 && (
        <p className="text-[10px] text-gray-400 mb-3">
          Last attached by {evidence[0].uploader?.name || "—"} · {new Date(evidence[0].created_at).toLocaleString()}
        </p>
      )}

      {canUpload && (
        <div className="border-t border-gray-100 pt-3">
          <EvidencePicker files={pending} onChange={setPending} hint="Add a screenshot, photo or document (optional)." />
          {pending.length > 0 && (
            <button type="button" onClick={upload} disabled={busy}
              className="mt-2 px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {busy ? "Uploading…" : `Attach ${pending.length} file(s)`}
            </button>
          )}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
          onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }}>
          <img src={preview.url} alt={preview.name} className="max-h-[90vh] max-w-[95vw] rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}
