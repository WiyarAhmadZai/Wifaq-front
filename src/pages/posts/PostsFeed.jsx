import { useCallback, useEffect, useRef, useState } from "react";
import { FiImage, FiType } from "react-icons/fi";
import { useAuth } from "../../admin/context/AuthContext";
import Avatar from "../../chat/components/Avatar";
import PostCard from "../../components/posts/PostCard";
import StoriesBar from "../../components/posts/Stories";
import { postsApi, openComposer } from "../../api/posts";

/**
 * /posts — stories across the top, then the feed: pinned posts first, then the
 * newest. More load as you scroll. Publishing anywhere (the header ＋) refreshes it.
 */
export default function PostsFeed() {
  const { user } = useAuth();
  const me = { id: user?.id, name: user?.name, avatar: user?.profile_photo };
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [can, setCan] = useState({ create: false, manage: false });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const sentinel = useRef(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await postsApi.feed(p);
      setPosts((cur) => (p === 1 ? r.data.data : [...cur, ...r.data.data.filter((x) => !cur.some((c) => c.id === x.id))]));
      setPage(r.data.meta.current_page);
      setLastPage(r.data.meta.last_page);
      setCan(r.data.can || {});
    } catch { /* keep what is shown */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => {
    const again = () => { load(1); setRefreshKey((k) => k + 1); };
    window.addEventListener("wen:post-created", again);
    return () => window.removeEventListener("wen:post-created", again);
  }, [load]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loading && page < lastPage) load(page + 1);
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loading, page, lastPage, load]);

  return (
    <div className="min-h-full bg-gray-50/70">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-5 space-y-4">
        <StoriesBar me={me} canCreate={can.create} refreshKey={refreshKey} />

        {can.create && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <div className="flex items-center gap-3">
              <Avatar user={me} size={40} linkable={false} />
              <button type="button" onClick={() => openComposer("text")}
                className="flex-1 text-start rounded-full bg-gray-100 hover:bg-gray-200 px-4 py-2.5 text-sm text-gray-500 transition">
                What's on your mind?
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => openComposer("media")}
                className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                <FiImage className="w-5 h-5 text-emerald-600" /> <span>Photo / Video</span>
              </button>
              <button type="button" onClick={() => openComposer("text")}
                className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                <FiType className="w-5 h-5 text-indigo-600" /> <span>Text post</span>
              </button>
            </div>
          </div>
        )}

        {posts.map((p) => (
          <PostCard key={p.id} post={p} canManage={can.manage}
            onChanged={() => load(1)}
            onRemoved={(id) => setPosts((cur) => cur.filter((x) => x.id !== id))} />
        ))}

        {!loading && posts.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-500">
            No posts yet. {can.create ? "Share the first one with the ＋ button." : ""}
          </div>
        )}
        <div ref={sentinel} />
        {loading && <div className="flex justify-center py-6"><div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>}
      </div>
    </div>
  );
}
