import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import { get, post, put, del, API_BASE_URL } from "../../api/axios";
import RichTextField, { RichTextView } from "../../components/RichTextField";
import { richTextToPlain } from "../../utils/richText";

/**
 * The memory wall on a colleague's profile.
 *
 * Photos and short clips of somebody's time at WEN — the thing you actually
 * want on screen when they are leaving or it is their birthday, and the one
 * part of a staff record that is not a date.
 *
 * The files are Drive files. This screen never invents a second file store: it
 * posts to /staff-gallery, which writes an ordinary Drive row on the same disk
 * as every other upload, and reads the bytes back through an endpoint that
 * applies the gallery's own "may you look at this person's profile" rule.
 *
 * Who may do what comes from the server (`can_curate` / `can_delete`) rather
 * than being decided here, so the buttons cannot disagree with the API.
 */

const TEAL = "#0D5C63";

const prettySize = (b) => {
  if (!b) return "";
  const mb = b / 1048576;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
};

/** The raw endpoint is same-origin under /api, so a relative URL is enough. */
const srcOf = (item) => item.url || `${API_BASE_URL}/staff-gallery/item/${item.id}/raw`;

/** The description as one line, for a tile that has no caption of its own. */
const plain = (item) => (item.description ? (richTextToPlain(item.description) || "").slice(0, 80) : "");

/**
 * A gallery of remembered moments, for a colleague or for a student.
 *
 * One component for both because they are the same screen with a different
 * subject; the endpoint and the permission behind it are the only difference,
 * and those come in as props. Two near-identical copies would drift.
 *
 * @param subject  "staff" | "student" — which gallery, and so which endpoint
 * @param staffId  kept for the existing callers; `subjectId` is the new name
 */
export default function StaffGallery({ staffId, staffName, subject = "staff", subjectId, subjectName }) {
  const who = subjectId ?? staffId;
  const whoName = subjectName ?? staffName;
  const endpoint = subject === "student" ? "/student-gallery" : "/staff-gallery";
  /* A child's photo is worth a paragraph — what the occasion was, who was
   * there. A colleague's memory wall stays a one-line caption, so the rich-text
   * description belongs to the student gallery only. */
  const hasDescription = subject === "student";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [canCurate, setCanCurate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [maxMb, setMaxMb] = useState(50);

  const [uploading, setUploading] = useState(false);
  /* Pasting a link is the way this scales: the photo already lives in WEN's
   * Google Drive, so the school's own storage holds it and this system keeps
   * only the address. Uploading still works for when there is nowhere else to
   * put the file yet. */
  const [mode, setMode] = useState("link");
  const [linkUrl, setLinkUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [takenOn, setTakenOn] = useState("");
  const [lightbox, setLightbox] = useState(null);   // the item being viewed large
  // The edit form, in the page rather than in a Swal prompt: a prompt box
  // cannot hold a rich-text editor.
  const [editing, setEditing] = useState(null);     // { id, caption, taken_on, description }
  const [savingEdit, setSavingEdit] = useState(false);
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    if (!who) return;
    setLoading(true);
    try {
      const r = await get(`${endpoint}/${who}`);
      setItems(r.data?.data || []);
      setCanCurate(Boolean(r.data?.can_curate));
      setCanDelete(Boolean(r.data?.can_delete));
      setMaxMb(r.data?.max_upload_mb || 50);
      setAllowed(true);
    } catch (err) {
      // 403 is not an error to shout about — this person simply may not see
      // the gallery, and the section hides itself rather than showing a
      // red box on a colleague's profile.
      if (err.response?.status === 403) setAllowed(false);
      setItems([]);
    } finally { setLoading(false); }
  }, [who, endpoint]);

  useEffect(() => { load(); }, [load]);

  // Escape closes the lightbox — it covers the page, so it needs a way out
  // that does not involve hunting for the ✕.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === "Escape") setLightbox(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // Same courtesy for the edit form.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e) => { if (e.key === "Escape") setEditing(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing]);

  const upload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const tooBig = files.find((f) => f.size > maxMb * 1048576);
    if (tooBig) {
      Swal.fire("Too large", `“${tooBig.name}” is ${prettySize(tooBig.size)}. Each file must be ${maxMb} MB or smaller.`, "info");
      return;
    }

    const fd = new FormData();
    files.forEach((f) => fd.append("files[]", f));
    if (caption.trim()) fd.append("caption", caption.trim());
    if (hasDescription && description) fd.append("description", description);
    if (takenOn) fd.append("taken_on", takenOn);

    setUploading(true);
    try {
      await post(`${endpoint}/${who}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCaption(""); setDescription(""); setTakenOn("");
      if (fileInput.current) fileInput.current.value = "";
      await load();
      Swal.fire({ icon: "success", title: "Added to the gallery", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err) {
      const bag = err.response?.data?.errors;
      Swal.fire("Could not add", bag ? Object.values(bag)[0][0] : (err.response?.data?.message || "Upload failed."), "error");
    } finally { setUploading(false); }
  };

  const addLink = async () => {
    const url = linkUrl.trim();
    if (!url) {
      Swal.fire("Paste a link first", "Share the photo from Google Drive and paste the link here.", "info");
      return;
    }

    setUploading(true);
    try {
      const res = await post(`${endpoint}/${who}`, {
        link_url: url,
        caption: caption.trim() || null,
        description: hasDescription ? (description || null) : null,
        taken_on: takenOn || null,
      });
      setLinkUrl(""); setCaption(""); setDescription(""); setTakenOn("");
      await load();

      /* The link saved, but some kinds cannot be shown as a picture — a Drive
       * FOLDER, or anything from Google Photos. Saying which and why beats a
       * broken frame that reads as "the link field doesn't work". */
      const note = res.data?.note;
      if (note) Swal.fire("Saved, but no preview", note, "info");
      else Swal.fire({ icon: "success", title: "Added to the gallery", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err) {
      const bag = err.response?.data?.errors;
      Swal.fire("Could not add", bag ? Object.values(bag)[0][0] : (err.response?.data?.message || "Failed."), "error");
    } finally { setUploading(false); }
  };

  const openEdit = (item) => setEditing({
    id: item.id,
    caption: item.caption || "",
    taken_on: item.taken_on || "",
    description: item.description || "",
  });

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      await put(`${endpoint}/item/${editing.id}`, {
        caption: editing.caption || null,
        taken_on: editing.taken_on || null,
        ...(hasDescription ? { description: editing.description || null } : {}),
      });
      setEditing(null);
      await load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not save.", "error");
    } finally { setSavingEdit(false); }
  };

  const remove = async (item) => {
    const r = await Swal.fire({
      title: "Remove this from the gallery?",
      text: item.caption || item.name || "",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#B83230",
      confirmButtonText: "Remove",
    });
    if (!r.isConfirmed) return;
    try {
      await del(`${endpoint}/item/${item.id}`);
      setLightbox(null);
      await load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not remove.", "error");
    }
  };

  // Nothing to show and nothing they could add — say nothing at all rather
  // than put an empty box on the profile.
  if (!allowed) return null;
  if (loading) {
    return <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
    </div>;
  }
  if (!items.length && !canCurate) {
    return <p className="text-xs text-gray-400 text-center py-6">No photos yet.</p>;
  }

  return (
    <div className="space-y-4">
      {canCurate && (
        <div className="rounded-2xl border border-dashed p-4" style={{ borderColor: "#CFE6E6", background: "#F8FCFC" }}>
          <p className="text-[11px] font-semibold text-gray-700 mb-2">
            {hasDescription ? "Add a photo" : "Add a memory"}{whoName ? ` of ${whoName}` : ""}
          </p>
          <div className="grid sm:grid-cols-2 gap-2 mb-2">
            <input value={caption} onChange={(e) => setCaption(e.target.value)}
              placeholder="What was this? e.g. Eid lunch, first day, graduation"
              dir="auto"
              className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none"
              style={{ borderColor: "#D0E0E0" }} />
            <input type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)}
              title="When was it taken?"
              className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none"
              style={{ borderColor: "#D0E0E0" }} />
          </div>
          {/* The caption is a label; this is the story. The same editor the
              forms use, so a note about a child can be bold where it needs to
              be and can switch between Pashto and English mid-paragraph. */}
          {hasDescription && (
            <div className="mb-2">
              <RichTextField value={description} onChange={setDescription}
                placeholder="Description — what happened, who was there, why it matters (rich text)"
                rows={4} dir="auto" />
            </div>
          )}
          {/* Two ways in, with the link first on purpose. A gallery for every
              colleague and every student would fill this server within a term;
              the photos already sit in WEN's Google Drive, so pasting the link
              keeps them there and stores nothing here. Uploading stays for the
              times there is nowhere else to put the file yet. */}
          <div className="flex gap-1.5 mb-2">
            {[
              { key: "link", label: "Paste a link" },
              { key: "upload", label: "Upload a file" },
            ].map((t) => (
              <button key={t.key} type="button" onClick={() => setMode(t.key)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors ${
                  mode === t.key ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {mode === "link" ? (
            <>
              <div className="flex gap-2">
                <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addLink(); }}
                  placeholder="https://drive.google.com/file/d/..."
                  dir="ltr" disabled={uploading}
                  className="flex-1 px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none disabled:opacity-50"
                  style={{ borderColor: "#D0E0E0" }} />
                <button type="button" onClick={addLink} disabled={uploading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 disabled:opacity-50">
                  {uploading ? "Saving…" : "Add"}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                In Google Drive: right-click the photo, Share, "Anyone with the link", then Copy link and paste it here.
                Nothing is stored on the school server.
              </p>
            </>
          ) : (
            <>
              <input ref={fileInput} type="file" multiple accept="image/*,video/*"
                disabled={uploading}
                onChange={(e) => upload(e.target.files)}
                className="w-full text-xs file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0
                           file:text-xs file:font-semibold file:bg-teal-600 file:text-white file:cursor-pointer
                           cursor-pointer px-3 py-2 border rounded-xl bg-white disabled:opacity-50"
                style={{ borderColor: "#D0E0E0" }} />
              <p className="text-[10px] text-gray-400 mt-1.5">
                {uploading
                  ? "Uploading…"
                  : `Photos and short videos, up to ${maxMb} MB each. This uses the school server's own storage — prefer a Drive link where you can.`}
              </p>
            </>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          Nothing here yet — add the first photo above.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((it) => (
            <figure key={it.id} className="group relative rounded-xl overflow-hidden border bg-black/5"
              style={{ borderColor: "#D0E0E0" }}>
              <button type="button" onClick={() => setLightbox(it)}
                className="block w-full aspect-square overflow-hidden">
                {it.media_type === "video" ? (
                  <span className="w-full h-full flex flex-col items-center justify-center bg-[#0A3A3E] text-white">
                    <span className="text-2xl">▶</span>
                    <span className="text-[9px] mt-1 px-2 truncate max-w-full">{it.name}</span>
                  </span>
                ) : (
                  <img src={srcOf(it)} alt={it.caption || it.name || "Gallery photo"}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                )}
              </button>

              {(it.caption || it.taken_on || plain(it)) && (
                <figcaption className="px-2 py-1.5 bg-white">
                  <bdi dir="auto" className="block text-[11px] font-medium text-gray-800 truncate">
                    {it.caption || plain(it)}
                  </bdi>
                  {it.taken_on && <span className="block text-[9px] text-gray-400">{it.taken_on}</span>}
                </figcaption>
              )}

              {(canCurate || canDelete) && (
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {canCurate && (
                    <button type="button" onClick={() => openEdit(it)} title="Edit caption, description / date"
                      className="w-6 h-6 rounded-lg bg-white/90 text-gray-600 hover:text-teal-700 text-[11px] shadow">✎</button>
                  )}
                  {canDelete && (
                    <button type="button" onClick={() => remove(it)} title="Remove"
                      className="w-6 h-6 rounded-lg bg-white/90 text-gray-600 hover:text-red-600 text-[11px] shadow">✕</button>
                  )}
                </div>
              )}
            </figure>
          ))}
        </div>
      )}

      {/* Full size. Clicking the backdrop or pressing Escape closes it. */}
      {lightbox && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <div className="max-w-4xl w-full">
            {lightbox.media_type === "video" ? (
              <video src={srcOf(lightbox)} controls autoPlay className="w-full max-h-[80vh] rounded-xl bg-black" />
            ) : (
              <img src={srcOf(lightbox)} alt={lightbox.caption || lightbox.name || ""}
                className="w-full max-h-[80vh] object-contain rounded-xl" />
            )}
            <div className="flex items-start justify-between gap-3 mt-3 text-white">
              <div className="min-w-0">
                {lightbox.caption && <bdi dir="auto" className="block text-sm font-semibold">{lightbox.caption}</bdi>}
                {/* The full story, in the formatting it was written in. */}
                {lightbox.description && (
                  <RichTextView html={lightbox.description} dir="auto"
                    className="text-[13px] mt-1 max-h-48 overflow-y-auto text-white/90" />
                )}
                <p className="text-[11px] text-white/70">
                  {[lightbox.taken_on, lightbox.added_by && `added by ${lightbox.added_by}`, prettySize(lightbox.size)]
                    .filter(Boolean).join(" · ")}
                </p>
              </div>
              <button onClick={() => setLightbox(null)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* The edit form. A Swal prompt could carry a caption and a date; a
          description needs the real editor, so the box lives here. */}
      {editing && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-5 py-3 border-b" style={{ borderColor: "#EEF4F4" }}>
              <h3 className="text-sm font-bold text-gray-800">Edit this photo</h3>
            </div>
            <div className="p-4 space-y-2">
              <input value={editing.caption} onChange={(e) => setEditing((p) => ({ ...p, caption: e.target.value }))}
                placeholder="Caption"
                dir="auto"
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none"
                style={{ borderColor: "#D0E0E0" }} />
              <input type="date" value={editing.taken_on} onChange={(e) => setEditing((p) => ({ ...p, taken_on: e.target.value }))}
                title="When was it taken?"
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none"
                style={{ borderColor: "#D0E0E0" }} />
              {hasDescription && (
                <RichTextField value={editing.description}
                  onChange={(html) => setEditing((p) => ({ ...p, description: html }))}
                  placeholder="Description (rich text)" rows={5} dir="auto" />
              )}
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ borderColor: "#EEF4F4" }}>
              <button type="button" onClick={() => setEditing(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} disabled={savingEdit}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50">
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
