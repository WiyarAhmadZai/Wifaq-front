import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { FiImage, FiX, FiGlobe, FiUsers } from "react-icons/fi";
import Avatar from "../../chat/components/Avatar";
import { useAuth } from "../../admin/context/AuthContext";
import { postsApi, POST_BACKGROUNDS, plainText } from "../../api/posts";
import RichTextField from "../RichTextField";

const MAX_FILES = 10;
const MAX_MB = 25;

/**
 * One composer for everything: a photo/video post, a text post on a colour,
 * a 24-hour story, or editing a post. Mounted once in the Layout; opened from
 * anywhere with openComposer(mode) (the header ＋ menu, the feed, the stories row).
 * When a post is published it announces `wen:post-created` so the feed reloads.
 */
export default function PostComposer() {
  const { user } = useAuth();
  const [mode, setMode] = useState(null);        // media | text | story | edit
  const [editing, setEditing] = useState(null);  // the post being edited
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]);        // [{ file, url, type }]
  const [background, setBackground] = useState("teal");
  const [visibility, setVisibility] = useState("staff");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    const onOpen = (e) => {
      const { mode: m, post } = e.detail || {};
      setMode(m);
      setEditing(post || null);
      setBody(post?.body || "");
      setFiles([]);
      setBackground(post?.background || "teal");
      setVisibility(post?.visibility || "staff");
      setProgress(0);
      // Photo/video: open the file picker straight away.
      if (m === "media") setTimeout(() => fileRef.current?.click(), 50);
    };
    window.addEventListener("wen:post-compose", onOpen);
    return () => window.removeEventListener("wen:post-compose", onOpen);
  }, []);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);

  if (!mode) return null;
  const isStory = mode === "story";
  const isEdit = mode === "edit";
  const close = () => { if (!busy) setMode(null); };

  const pick = (list) => {
    const picked = Array.from(list || []);
    const tooBig = picked.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig.length) Swal.fire("Too large", `Each file can be at most ${MAX_MB} MB.`, "warning");
    const ok = picked.filter((f) => f.size <= MAX_MB * 1024 * 1024 && /^(image|video)\//.test(f.type))
      .map((file) => ({ file, url: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "image" }));
    setFiles((cur) => (isStory ? ok.slice(0, 1) : [...cur, ...ok].slice(0, MAX_FILES)));
  };

  const submit = async () => {
    if (!plainText(body) && files.length === 0 && !isEdit) {
      Swal.fire("Empty", "Write something or add a photo or video.", "info");
      return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await postsApi.update(editing.id, { body, visibility, background: editing.media?.length ? undefined : background });
      } else {
        const fd = new FormData();
        fd.append("kind", isStory ? "story" : "post");
        if (plainText(body)) fd.append("body", body);
        if (!files.length) fd.append("background", background);
        if (!isStory) fd.append("visibility", visibility);
        files.forEach((f) => fd.append("media[]", f.file));
        await postsApi.create(fd, (e) => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0));
      }
      window.dispatchEvent(new CustomEvent("wen:post-created"));
      Swal.fire({ toast: true, position: "top-end", icon: "success", timer: 1800, showConfirmButton: false,
        title: isEdit ? "Post updated" : isStory ? "Story shared" : "Posted" });
      setMode(null);
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || Object.values(e.response?.data?.errors || {})[0]?.[0] || "Could not publish.", "error");
    } finally { setBusy(false); }
  };

  const showBackground = !files.length && !(isEdit && editing?.media?.length);
  const title = isEdit ? "Edit post" : isStory ? "Create story" : "Create post";

  return (
    <div className="fixed inset-0 z-[850] bg-black/40 flex items-center justify-center p-3" onClick={close}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">{title}</h3>
          <button type="button" onClick={close} className="w-8 h-8 rounded-full hover:bg-gray-100 grid place-items-center text-gray-500"><FiX /></button>
        </div>

        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center gap-3">
            <Avatar user={{ name: user?.name, avatar: user?.profile_photo }} size={40} linkable={false} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-800" data-no-i18n>{user?.name}</div>
              {isStory ? (
                <div className="text-[11px] text-gray-500">Visible to staff for 24 hours</div>
              ) : (
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)}
                  className="mt-0.5 text-[11px] rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5">
                  <option value="staff">👥 Staff only</option>
                  <option value="public">🌐 Public — anyone with the link</option>
                </select>
              )}
            </div>
          </div>

          {/* text — on a colour when there is no photo */}
          {showBackground ? (
            <div className={`rounded-2xl bg-gradient-to-br ${POST_BACKGROUNDS[background]} p-4 min-h-[180px] flex`}>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} dir="auto" autoFocus
                placeholder={isStory ? "Type your story…" : "What's on your mind?"}
                className="flex-1 bg-transparent text-white placeholder-white/70 text-xl font-semibold text-center resize-none outline-none" />
            </div>
          ) : (
            isStory ? (
              <textarea value={body} onChange={(e) => setBody(e.target.value)} dir="auto" rows={2}
                placeholder="Add a caption…"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
            ) : (
              // A post's caption is rich text — bold, lists, links — like the rest of WEN.
              <RichTextField value={body} onChange={setBody} rows={4} placeholder="Say something about this…" />
            )
          )}

          {showBackground && (
            <div className="flex gap-2 flex-wrap">
              {Object.entries(POST_BACKGROUNDS).map(([key, cls]) => (
                <button type="button" key={key} onClick={() => setBackground(key)} title={key}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${cls} ${background === key ? "ring-2 ring-offset-2 ring-gray-700" : ""}`} />
              ))}
            </div>
          )}

          {/* photos / videos */}
          {files.length > 0 && (
            <div className={`grid gap-2 ${files.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
              {files.map((f, idx) => (
                <div key={f.url} className="relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
                  {f.type === "video" ? <video src={f.url} muted className="w-full h-full object-cover" /> : <img src={f.url} alt="" className="w-full h-full object-cover" />}
                  <button type="button" onClick={() => setFiles((cur) => cur.filter((_, i) => i !== idx))}
                    className="absolute top-1.5 end-1.5 w-7 h-7 rounded-full bg-black/60 text-white grid place-items-center"><FiX className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {!isEdit && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-600 hover:bg-gray-50">
              <FiImage className="w-5 h-5 text-emerald-600" />
              <span>{isStory ? "Add a photo or video" : "Add photos / videos"}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple={!isStory} className="hidden"
            onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />

          {!isStory && !isEdit && (
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
              {visibility === "public" ? <FiGlobe /> : <FiUsers />}
              <span>{visibility === "public" ? "Anyone with the link can see this post, even without signing in." : "Only signed-in staff can see this post."}</span>
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100">
          {busy && progress > 0 && progress < 100 && (
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-2"><div className="h-full bg-teal-500" style={{ width: `${progress}%` }} /></div>
          )}
          <button type="button" onClick={submit} disabled={busy}
            className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2.5 text-sm font-bold disabled:opacity-50">
            {busy ? "Publishing…" : isEdit ? "Save" : isStory ? "Share story" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
