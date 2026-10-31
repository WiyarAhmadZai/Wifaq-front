import { useCallback, useEffect, useState } from "react";
import { FiX, FiHeart, FiMessageCircle, FiPlay } from "react-icons/fi";
import { useAuth } from "../../admin/context/AuthContext";
import PostCard from "../posts/PostCard";
import { postsApi, POST_BACKGROUNDS, plainText, openComposer } from "../../api/posts";

/**
 * A person's posts on their profile — an Instagram-style grid. A tile opens the
 * full post (likes, comments, share) over the page. Hidden for viewers who
 * cannot read posts at all.
 */
export default function ProfilePosts({ userId, isSelf }) {
  const { hasRole, hasPermission } = useAuth();
  const canView = hasRole?.("super-admin") || hasPermission?.("posts.view");
  const [posts, setPosts] = useState(null);
  const [can, setCan] = useState({});
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    postsApi.feedOf(userId)
      .then((r) => { setPosts(r.data.data || []); setCan(r.data.can || {}); })
      .catch(() => setPosts([]));
  }, [userId]);

  useEffect(() => { if (canView && userId) load(); }, [canView, userId, load]);
  useEffect(() => {
    window.addEventListener("wen:post-created", load);
    return () => window.removeEventListener("wen:post-created", load);
  }, [load]);

  if (!canView) return null;
  const likes = (posts || []).reduce((n, p) => n + p.likes_count, 0);
  const comments = (posts || []).reduce((n, p) => n + p.comments_count, 0);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Posts</h3>
          <div className="flex gap-4 mt-1 text-[11px] text-gray-500">
            <span><b className="text-gray-800" data-no-i18n>{posts?.length ?? "–"}</b> <span>posts</span></span>
            <span className="inline-flex items-center gap-1"><FiHeart className="w-3 h-3 text-rose-500" /> <b className="text-gray-800" data-no-i18n>{likes}</b></span>
            <span className="inline-flex items-center gap-1"><FiMessageCircle className="w-3 h-3 text-teal-600" /> <b className="text-gray-800" data-no-i18n>{comments}</b></span>
          </div>
        </div>
        {isSelf && can.create && (
          <button type="button" onClick={() => openComposer("media")}
            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">＋ <span>New post</span></button>
        )}
      </div>

      {posts === null ? (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">{[0, 1, 2].map((i) => <div key={i} className="aspect-square bg-gray-100 animate-pulse" />)}</div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No posts yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts.map((p) => {
            const m = p.media?.[0];
            return (
              <button type="button" key={p.id} onClick={() => setOpen(p)} className="group relative aspect-square overflow-hidden bg-gray-100">
                {m ? (
                  m.type === "video"
                    ? <video src={m.url} preload="metadata" muted playsInline className="w-full h-full object-cover" />
                    : <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${POST_BACKGROUNDS[p.background] || POST_BACKGROUNDS.slate} p-3 grid place-items-center`}>
                    <p className="text-white text-xs sm:text-sm font-semibold text-center line-clamp-5" dir="auto" data-no-i18n>{plainText(p.body)}</p>
                  </div>
                )}
                {m?.type === "video" && <FiPlay className="absolute top-2 end-2 w-4 h-4 text-white drop-shadow" />}
                {p.media?.length > 1 && <span className="absolute top-2 start-2 rounded bg-black/50 px-1.5 text-[10px] text-white" data-no-i18n>1/{p.media.length}</span>}
                {p.is_pinned && <span className="absolute bottom-2 start-2 text-sm">📌</span>}
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4 text-white text-sm font-bold">
                  <span className="inline-flex items-center gap-1"><FiHeart /> <span data-no-i18n>{p.likes_count}</span></span>
                  <span className="inline-flex items-center gap-1"><FiMessageCircle /> <span data-no-i18n>{p.comments_count}</span></span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[860] bg-black/60 flex items-start sm:items-center justify-center p-3 overflow-y-auto" onClick={() => setOpen(null)}>
          <div className="relative w-full max-w-xl my-6" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(null)} title="Close"
              className="absolute -top-3 -end-3 z-10 w-9 h-9 rounded-full bg-white shadow grid place-items-center text-gray-600"><FiX /></button>
            <PostCard post={open} canManage={can.manage} defaultComments
              onRemoved={(id) => { setOpen(null); setPosts((cur) => cur.filter((x) => x.id !== id)); }} />
          </div>
        </div>
      )}
    </section>
  );
}
