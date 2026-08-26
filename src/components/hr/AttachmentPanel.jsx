import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import { get, post, del } from "../../api/axios";

const TEAL = "#0D5C63";
const BORDER = "#D0E0E0";
const MUTED = "#5A7A7E";

const prettySize = (b) => {
  if (!b) return "";
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(b / 1024))} KB`;
};

/** A glyph per family, so a file row is scannable without reading extensions. */
const iconFor = (mime, name = "") => {
  const m = String(mime || "");
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (m.startsWith("image/")) return "🖼";
  if (m.includes("pdf") || ext === "pdf") return "📕";
  if (m.includes("sheet") || ["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (m.includes("presentation") || ["ppt", "pptx"].includes(ext)) return "📽";
  if (m.includes("word") || ["doc", "docx"].includes(ext)) return "📄";
  if (m.includes("zip") || ext === "zip") return "🗜";
  return "📎";
};

/**
 * The three moments a file can belong to. All optional — a meeting with only
 * an agenda is as valid as one with sixty photos from the day.
 */
const PHASES = [
  { key: "before", label: "Before",  hint: "Agenda, invitation, venue plan" },
  { key: "during", label: "During",  hint: "Photos and notes from the day" },
  { key: "after",  label: "After",   hint: "Minutes, group photo, receipts" },
];

/**
 * File attachments for a Meeting or an Event.
 *
 * Images render as a thumbnail grid and everything else as a file row — an
 * agenda PDF and a photo of the venue want different treatment, and a wall of
 * identical rows hides the one thing people came to look at.
 *
 * Drag-and-drop is offered alongside the picker because attaching four photos
 * is one gesture, not four dialogs. Every write returns the whole list, so the
 * panel never reconciles a local copy against what was saved.
 *
 * @param {"meetings"|"events"} parentType
 * @param {number|string}       parentId
 */
export default function AttachmentPanel({ parentType, parentId }) {
  const [files, setFiles] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [meta, setMeta] = useState({ max_mb: 25, allowed: [] });
  const inputRef = useRef(null);
  // Which section the picker/drop is filling right now.
  const [target, setTarget] = useState("before");

  const load = useCallback(async () => {
    try {
      const res = await get(`/${parentType}/${parentId}/attachments`, { cache: false });
      setFiles(res.data?.data || []);
      setCanManage(Boolean(res.data?.can_manage));
      setMeta({ max_mb: res.data?.max_mb || 25, allowed: res.data?.allowed || [] });
    } catch {
      /* Attachments are an add-on; never take the page down with them. */
    } finally { setLoading(false); }
  }, [parentType, parentId]);

  useEffect(() => { load(); }, [load]);

  const upload = async (list, phase = "before") => {
    const picked = Array.from(list || []);
    if (picked.length === 0) return;

    // Refuse oversize here as well as on the server — a 25 MB round trip that
    // ends in a 422 wastes the user's connection, not just their time.
    const tooBig = picked.filter((f) => f.size > meta.max_mb * 1048576);
    if (tooBig.length) {
      return Swal.fire("File too large",
        `${tooBig.map((f) => f.name).join(", ")} — the limit is ${meta.max_mb} MB per file.`, "info");
    }
    if (picked.length > 10) {
      return Swal.fire("Too many at once", "Attach up to 10 files at a time.", "info");
    }

    const fd = new FormData();
    picked.forEach((f) => fd.append("files[]", f));
    fd.append("phase", phase);

    setUploading(true);
    try {
      const res = await post(`/${parentType}/${parentId}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        // A big upload over a school connection outlasts the default timeout.
        timeout: 120000,
      });
      if (res?.data?.data) setFiles(res.data.data);
    } catch (err) {
      Swal.fire("Upload failed",
        err.response?.data?.message
        || Object.values(err.response?.data?.errors || {})[0]?.[0]
        || "Could not attach the file.", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";   // same file can be re-picked
    }
  };

  const remove = async (f) => {
    const r = await Swal.fire({
      title: "Remove this file?", text: f.original_name,
      icon: "warning", showCancelButton: true, confirmButtonColor: "#B83230", confirmButtonText: "Remove",
    });
    if (!r.isConfirmed) return;
    try {
      const res = await del(`/attachments/${f.id}`);
      if (res?.data?.data) setFiles(res.data.data);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not remove the file.", "error");
    }
  };

  if (loading) return null;
  if (!canManage && files.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border shadow-sm" style={{ borderColor: BORDER }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "#0A3A3E" }}>
            Attachments {files.length > 0 && <span style={{ color: MUTED }}>· {files.length}</span>}
          </h3>
          <p className="text-[11px]" style={{ color: MUTED }}>
            Agendas, photos, venue plans, spreadsheets.
          </p>
        </div>
        {canManage && (
          <button onClick={() => { setTarget("before"); inputRef.current?.click(); }} disabled={uploading}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
            style={{ background: TEAL }}>
            {uploading ? "Uploading…" : "+ Attach files"}
          </button>
        )}
      </div>

      {canManage && (
        <input ref={inputRef} type="file" multiple hidden
          accept={meta.allowed.map((e) => "." + e).join(",")}
          onChange={(e) => upload(e.target.files, target)} />
      )}

      <div className="px-4 pb-4 pt-3 space-y-4">
        {PHASES.map((ph) => (
          <PhaseSection
            key={ph.key} phase={ph} canManage={canManage} uploading={uploading}
            files={files.filter((f) => (f.phase || "before") === ph.key)}
            dragging={dragging === ph.key} maxMb={meta.max_mb}
            onDragState={(on) => setDragging(on ? ph.key : null)}
            onPick={() => { setTarget(ph.key); inputRef.current?.click(); }}
            onDrop={(fl) => upload(fl, ph.key)}
            onRemove={remove}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One phase. Empty sections still render their drop zone for someone who can
 * edit — that is how "during" and "after" stay discoverable before the day —
 * but collapse to nothing for a reader with no files to see.
 */
function PhaseSection({ phase, files, canManage, uploading, dragging, maxMb, onDragState, onPick, onDrop, onRemove }) {
  if (!canManage && files.length === 0) return null;

  const images = files.filter((f) => f.is_image);
  const docs = files.filter((f) => !f.is_image);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#0A3A3E" }}>
          {phase.label}
          {files.length > 0 && <span style={{ color: MUTED }}> · {files.length}</span>}
        </h4>
        <span className="text-[10px]" style={{ color: "#8AA4A7" }}>{phase.hint}</span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
          {images.map((f) => (
            <div key={f.id} className="relative group rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
              <a href={f.url} target="_blank" rel="noopener noreferrer" title={f.original_name}>
                <img src={f.url} alt={f.caption || f.original_name} loading="lazy"
                  className="w-full h-28 object-cover hover:opacity-90 transition-opacity" />
              </a>
              <div className="px-2 py-1" style={{ background: "#FAFCFC" }}>
                <bdi dir="auto" className="block text-[10px] truncate" style={{ color: "#0A3A3E" }}>
                  {f.caption || f.original_name}
                </bdi>
                <span className="block text-[9px]" style={{ color: "#8AA4A7" }}>{prettySize(f.size)}</span>
              </div>
              {canManage && (
                <button onClick={() => onRemove(f)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white text-[11px]
                             opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title="Remove">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-2" style={{ border: `1px solid ${BORDER}` }}>
          {docs.map((f, i) => (
            <div key={f.id} className="flex items-center gap-3 px-3 py-2"
              style={{ borderTop: i ? `1px solid ${BORDER}` : "none", background: i % 2 ? "#FAFCFC" : "#fff" }}>
              <span className="text-lg flex-shrink-0">{iconFor(f.mime_type, f.original_name)}</span>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 hover:underline">
                <bdi dir="auto" className="block text-sm font-semibold truncate" style={{ color: "#0A3A3E" }}>
                  {f.original_name}
                </bdi>
                <span className="block text-[10px]" style={{ color: "#8AA4A7" }}>
                  {prettySize(f.size)}{f.uploaded_by ? ` · ${f.uploaded_by}` : ""}
                  {f.uploaded_at ? ` · ${f.uploaded_at.slice(0, 10)}` : ""}
                </span>
              </a>
              {canManage && (
                <button onClick={() => onRemove(f)}
                  className="text-gray-300 hover:text-red-500 text-xs px-1 flex-shrink-0" title="Remove">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div
          onDragOver={(e) => { e.preventDefault(); onDragState(true); }}
          onDragLeave={() => onDragState(false)}
          onDrop={(e) => { e.preventDefault(); onDragState(false); onDrop(e.dataTransfer.files); }}
          onClick={onPick}
          className="rounded-xl border-2 border-dashed px-3 py-3 text-center cursor-pointer transition-colors"
          style={{ borderColor: dragging ? TEAL : BORDER, background: dragging ? "#E8F6F6" : "#FBFDFD" }}>
          <p className="text-[11px] font-semibold" style={{ color: dragging ? TEAL : MUTED }}>
            {uploading ? "Uploading…" : dragging ? "Drop to attach" : `+ Add ${phase.label.toLowerCase()} files`}
          </p>
          {files.length === 0 && !dragging && (
            <p className="text-[9px] mt-0.5" style={{ color: "#B6C4C4" }}>
              optional · up to 10 files · {maxMb} MB each
            </p>
          )}
        </div>
      )}
    </div>
  );
}
