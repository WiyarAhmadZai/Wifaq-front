import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FiHeart, FiMessageCircle, FiShare2, FiMoreHorizontal, FiGlobe, FiUsers, FiX, FiChevronLeft, FiChevronRight, FiSend,
} from "react-icons/fi";
import Avatar from "../../chat/components/Avatar";
import { postsApi, POST_BACKGROUNDS, timeAgo, openComposer, sharePost, COMMENT_REACTIONS } from "../../api/posts";
import { useChat } from "../../chat/ChatContext";
import SendToChat from "./SendToChat";

/* ════════════ full-screen photos / videos ════════════ */
export function MediaViewer({ media, start = 0, onClose }) {
  const [i, setI] = useState(start);
  const n = media.length;
  const go = useCallback((d) => setI((x) => (x + d + n) % n), [n]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go, onClose]);
  const m = media[i];
  return (
    <div className="fixed inset-0 z-[900] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button type="button" onClick={onClose} title="Close"
        className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center"><FiX className="w-5 h-5" /></button>
      {n > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute start-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center"><FiChevronLeft className="w-6 h-6" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute end-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center"><FiChevronRight className="w-6 h-6" /></button>
          <div className="absolute bottom-5 text-white/70 text-sm" data-no-i18n>{i + 1} / {n}</div>
        </>
      )}
      <div onClick={(e) => e.stopPropagation()} className="max-w-[95vw] max-h-[90vh]">
        {m.type === "video"
          ? <video key={m.url} src={m.url} controls autoPlay playsInline className="max-w-[95vw] max-h-[90vh] rounded-lg" />
          : <img src={m.url} alt="" className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg" />}
      </div>
    </div>
  );
}

/* ════════════ the photo / video grid on a card ════════════ */
function MediaGrid({ media, onOpen }) {
  if (!media?.length) return null;
  const shown = media.slice(0, 4);
  const cols = shown.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={`grid ${cols} gap-0.5 bg-gray-100`}>
      {shown.map((m, idx) => (
        <button type="button" key={m.id} onClick={() => onOpen(idx)}
          className={`relative block overflow-hidden ${shown.length === 3 && idx === 0 ? "row-span-2" : ""} ${shown.length === 1 ? "max-h-[520px]" : "aspect-square"}`}>
          {m.type === "video" ? (
            <>
              <video src={m.url} preload="metadata" muted playsInline className="w-full h-full object-cover" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="w-14 h-14 rounded-full bg-black/50 text-white grid place-items-center text-xl">▶</span>
              </span>
            </>
          ) : (
            <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover" />
          )}
          {idx === 3 && media.length > 4 && (
            <span className="absolute inset-0 bg-black/50 text-white text-2xl font-bold grid place-items-center" data-no-i18n>+{media.length - 4}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ════════════ comments: replies, and replies to replies ════════════ */
function CommentNode({ node, depth, postId, readOnly, onTree }) {
  const [replying, setReplying] = useState(false);
  // Reactions live on the comment itself, so reacting never reloads the thread.
  const [rx, setRx] = useState({ reactions: node.reactions || {}, mine: node.my_reaction || null });
  const [picker, setPicker] = useState(false);
  const react = async (emoji) => {
    setPicker(false);
    try {
      const r = await postsApi.react(node.id, emoji);
      setRx({ reactions: r.data.reactions || {}, mine: r.data.my_reaction || null });
    } catch { /* ignore */ }
  };
  const rxTotal = Object.values(rx.reactions).reduce((a, b) => a + b, 0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const reply = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await postsApi.comment(postId, text.trim(), node.id);
      onTree(r.data.data, r.data.comments_count);
      setText(""); setReplying(false);
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not send.", "error");
    } finally { setBusy(false); }
  };
  const remove = async () => {
    const ok = await Swal.fire({ icon: "warning", title: "Delete this comment?", text: "Its replies are removed too.", showCancelButton: true, confirmButtonText: "Delete", confirmButtonColor: "#e11d48" });
    if (!ok.isConfirmed) return;
    const r = await postsApi.removeComment(node.id);
    onTree(r.data.data, r.data.comments_count);
  };

  return (
    <div className={depth > 0 ? "mt-2" : "mt-3"}>
      <div className="flex gap-2">
        <Avatar user={node.author} size={depth > 0 ? 28 : 34} linkable={!readOnly} />
        <div className="min-w-0 flex-1">
          <div className="relative inline-block max-w-full rounded-2xl bg-gray-100 px-3 py-2">
            <div className="text-[12px] font-semibold text-gray-800" data-no-i18n>{node.author?.name}</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap break-words" dir="auto" data-no-i18n>{node.body}</div>
            {rxTotal > 0 && (
              <span className="absolute -bottom-3 end-1 flex items-center gap-0.5 rounded-full bg-white shadow ring-1 ring-gray-100 px-1.5 py-0.5 text-[11px]" data-no-i18n>
                {Object.keys(rx.reactions).slice(0, 3).join("")} <span className="text-gray-500">{rxTotal}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 ps-2 text-[11px] text-gray-500">
            <span data-no-i18n>{timeAgo(node.created_at)}</span>
            {!readOnly && (
              <span className="relative">
                <button type="button" onClick={() => setPicker((v) => !v)}
                  className={`font-semibold ${rx.mine ? "text-teal-700" : "hover:text-teal-700"}`}>
                  {rx.mine ? <span data-no-i18n>{rx.mine}</span> : <span>React</span>}
                </button>
                {picker && (
                  <span className="absolute bottom-6 start-0 z-20 flex gap-1 rounded-full bg-white shadow-lg ring-1 ring-gray-100 px-2 py-1" onMouseLeave={() => setPicker(false)}>
                    {COMMENT_REACTIONS.map((e) => (
                      <button type="button" key={e} onClick={() => react(e)}
                        className={`text-lg leading-none rounded-full p-1 transition hover:scale-125 ${rx.mine === e ? "bg-teal-50" : ""}`}>{e}</button>
                    ))}
                  </span>
                )}
              </span>
            )}
            {!readOnly && <button type="button" onClick={() => setReplying((v) => !v)} className="font-semibold hover:text-teal-700">Reply</button>}
            {node.can_delete && <button type="button" onClick={remove} className="hover:text-rose-600">Delete</button>}
          </div>
          {replying && (
            <div className="flex items-center gap-2 mt-1.5">
              <input value={text} onChange={(e) => setText(e.target.value)} autoFocus dir="auto"
                onKeyDown={(e) => { if (e.key === "Enter") reply(); }}
                placeholder={`Reply to ${node.author?.name || ""}…`}
                className="flex-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              <button type="button" onClick={reply} disabled={busy || !text.trim()}
                className="w-8 h-8 rounded-full bg-teal-600 text-white grid place-items-center disabled:opacity-40"><FiSend className="w-4 h-4" /></button>
            </div>
          )}
          {node.replies?.length > 0 && (
            // Deep threads keep indenting a little, then stop, so they stay readable.
            <div className={depth < 3 ? "ps-3 border-s-2 border-gray-100" : ""}>
              {node.replies.map((r) => (
                <CommentNode key={r.id} node={r} depth={depth + 1} postId={postId} readOnly={readOnly} onTree={onTree} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentSection({ postId, initial = null, readOnly = false, onCount }) {
  const [tree, setTree] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) return;
    postsApi.comments(postId).then((r) => setTree(r.data.data || [])).catch(() => setTree([]));
  }, [postId, initial]);

  const onTree = (t, count) => { setTree(t); onCount?.(count); };
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await postsApi.comment(postId, text.trim());
      onTree(r.data.data, r.data.comments_count);
      setText("");
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not send.", "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="px-4 pb-4 pt-1 border-t border-gray-100">
      {!readOnly && (
        <div className="flex items-center gap-2 mt-3">
          <input value={text} onChange={(e) => setText(e.target.value)} dir="auto"
            onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Write a comment…"
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
          <button type="button" onClick={send} disabled={busy || !text.trim()}
            className="w-9 h-9 rounded-full bg-teal-600 text-white grid place-items-center disabled:opacity-40"><FiSend className="w-4 h-4" /></button>
        </div>
      )}
      {tree === null ? <p className="text-xs text-gray-400 mt-3">Loading…</p>
        : tree.length === 0 ? <p className="text-xs text-gray-400 mt-3">No comments yet.</p>
        : tree.map((n) => <CommentNode key={n.id} node={n} depth={0} postId={postId} readOnly={readOnly} onTree={onTree} />)}
    </div>
  );
}

/* ════════════ the card ════════════ */
export default function PostCard({ post, canManage = false, readOnly = false, defaultComments = false, onChanged, onRemoved }) {
  const [p, setP] = useState(post);
  const [viewer, setViewer] = useState(null);
  const [showComments, setShowComments] = useState(defaultComments);
  const [menu, setMenu] = useState(false);
  const [shareMenu, setShareMenu] = useState(false);
  const [sendToChat, setSendToChat] = useState(false);
  const { canUseChat } = useChat();
  const [expanded, setExpanded] = useState(false);
  // A new post object from the feed (after an edit or a pin) replaces the local copy.
  const [prevPost, setPrevPost] = useState(post);
  if (post !== prevPost) { setPrevPost(post); setP(post); }

  const like = async () => {
    if (readOnly) return;
    // Optimistic: the heart changes at once; the server count follows.
    setP((x) => ({ ...x, liked_by_me: !x.liked_by_me, likes_count: x.likes_count + (x.liked_by_me ? -1 : 1) }));
    try {
      const r = await postsApi.like(p.id);
      setP((x) => ({ ...x, liked_by_me: r.data.liked, likes_count: r.data.likes_count }));
    } catch {
      setP((x) => ({ ...x, liked_by_me: !x.liked_by_me, likes_count: x.likes_count + (x.liked_by_me ? -1 : 1) }));
    }
  };
  const pin = async () => {
    setMenu(false);
    const r = await postsApi.pin(p.id);
    setP((x) => ({ ...x, is_pinned: r.data.is_pinned }));
    onChanged?.();
  };
  const remove = async () => {
    setMenu(false);
    const ok = await Swal.fire({ icon: "warning", title: "Delete this post?", showCancelButton: true, confirmButtonText: "Delete", confirmButtonColor: "#e11d48" });
    if (!ok.isConfirmed) return;
    await postsApi.remove(p.id);
    onRemoved?.(p.id);
  };

  const textOnly = !p.media?.length;
  const bigText = textOnly && p.background && (p.body || "").length <= 220;
  const long = (p.body || "").length > 400 && !expanded;

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar user={p.author} size={42} linkable={!readOnly} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-800 truncate" data-no-i18n>{p.author?.name}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Link to={`/post/${p.id}`} className="hover:underline" data-no-i18n>{timeAgo(p.created_at)}</Link>
            <span>·</span>
            {p.visibility === "public"
              ? <span className="inline-flex items-center gap-1" title="Anyone with the link"><FiGlobe className="w-3 h-3" /> <span>Public</span></span>
              : <span className="inline-flex items-center gap-1" title="Signed-in staff"><FiUsers className="w-3 h-3" /> <span>Staff</span></span>}
          </div>
        </div>
        {p.is_pinned && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">📌 <span>Pinned</span></span>}
        {!readOnly && (p.can_edit || canManage) && (
          <div className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 grid place-items-center"><FiMoreHorizontal /></button>
            {menu && (
              <div className="absolute end-0 top-9 z-20 w-44 rounded-xl border border-gray-100 bg-white shadow-lg py-1 text-sm" onMouseLeave={() => setMenu(false)}>
                {canManage && <button type="button" onClick={pin} className="w-full text-start px-3 py-2 hover:bg-gray-50">{p.is_pinned ? "Unpin from top" : "📌 Pin to top"}</button>}
                {p.can_edit && <button type="button" onClick={() => { setMenu(false); openComposer("edit", p); }} className="w-full text-start px-3 py-2 hover:bg-gray-50">Edit post</button>}
                <button type="button" onClick={() => { setMenu(false); sharePost(p); }} className="w-full text-start px-3 py-2 hover:bg-gray-50">Copy link</button>
                {p.can_edit && <button type="button" onClick={remove} className="w-full text-start px-3 py-2 hover:bg-rose-50 text-rose-600">Delete post</button>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* body */}
      {bigText ? (
        <div className={`mx-0 min-h-[220px] bg-gradient-to-br ${POST_BACKGROUNDS[p.background] || POST_BACKGROUNDS.teal} text-white grid place-items-center px-8 py-10`}>
          <p className="text-2xl font-semibold text-center leading-relaxed whitespace-pre-wrap" dir="auto" data-no-i18n>{p.body}</p>
        </div>
      ) : p.body ? (
        <div className="px-4 pb-3">
          <p className={`text-[15px] text-gray-800 whitespace-pre-wrap break-words leading-relaxed ${long ? "line-clamp-6" : ""}`} dir="auto" data-no-i18n>{p.body}</p>
          {long && <button type="button" onClick={() => setExpanded(true)} className="text-sm font-semibold text-teal-700 mt-1">See more</button>}
        </div>
      ) : null}

      <MediaGrid media={p.media} onOpen={(idx) => setViewer(idx)} />

      {/* counts */}
      {(p.likes_count > 0 || p.comments_count > 0) && (
        <div className="flex items-center justify-between px-4 pt-3 text-[12px] text-gray-500">
          <span>{p.likes_count > 0 && <><span className="text-rose-500">♥</span> <span data-no-i18n>{p.likes_count}</span></>}</span>
          {p.comments_count > 0 && (
            <button type="button" onClick={() => setShowComments((v) => !v)} className="hover:underline">
              <span data-no-i18n>{p.comments_count}</span> <span>comments</span>
            </button>
          )}
        </div>
      )}

      {/* actions */}
      <div className="grid grid-cols-3 gap-1 px-2 py-1.5 mt-2 border-t border-gray-100">
        <button type="button" onClick={like} disabled={readOnly}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${p.liked_by_me ? "text-rose-600" : "text-gray-600 hover:bg-gray-50"} disabled:opacity-60`}>
          <FiHeart className={`w-5 h-5 ${p.liked_by_me ? "fill-rose-500" : ""}`} /> <span>Like</span>
        </button>
        <button type="button" onClick={() => setShowComments((v) => !v)}
          className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          <FiMessageCircle className="w-5 h-5" /> <span>Comment</span>
        </button>
        <div className="relative">
          <button type="button" onClick={() => (canUseChat && !readOnly ? setShareMenu((v) => !v) : sharePost(p))}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            <FiShare2 className="w-5 h-5" /> <span>Share</span>
          </button>
          {shareMenu && (
            <div className="absolute end-0 bottom-11 z-20 w-48 rounded-xl border border-gray-100 bg-white shadow-lg py-1 text-sm" onMouseLeave={() => setShareMenu(false)}>
              <button type="button" onClick={() => { setShareMenu(false); setSendToChat(true); }} className="w-full text-start px-3 py-2 hover:bg-gray-50">💬 <span>Send in chat</span></button>
              <button type="button" onClick={() => { setShareMenu(false); sharePost(p); }} className="w-full text-start px-3 py-2 hover:bg-gray-50">🔗 <span>Share / copy link</span></button>
            </div>
          )}
        </div>
      </div>

      {showComments && (
        <CommentSection postId={p.id} initial={p.comments || null} readOnly={readOnly}
          onCount={(count) => setP((x) => ({ ...x, comments_count: count }))} />
      )}

      {viewer !== null && <MediaViewer media={p.media} start={viewer} onClose={() => setViewer(null)} />}
      {sendToChat && <SendToChat post={p} onClose={() => setSendToChat(false)} />}
    </article>
  );
}
