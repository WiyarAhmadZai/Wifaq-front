import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PostCard from "../../components/posts/PostCard";
import PostComposer from "../../components/posts/PostComposer";
import { postsApi } from "../../api/posts";
import wifaqLogo from "../../assets/wifaq-logo.png";

/**
 * /post/:id — one post on its own page: the link that Share copies.
 *
 * Works signed in or not. With a session it reads the post normally (likes and
 * comments work); without one it asks for the public copy, which exists only
 * for posts their author marked public — anything else says it is not available.
 */
export default function PostPage() {
  const { id } = useParams();
  const signedIn = Boolean(localStorage.getItem("token"));
  const [state, setState] = useState({ loading: true, post: null, can: {}, readOnly: !signedIn, error: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (signedIn) {
          try {
            const r = await postsApi.show(id);
            if (!cancelled) setState({ loading: false, post: r.data.data, can: r.data.can || {}, readOnly: false, error: null });
            return;
          } catch (e) {
            // Signed in but without posts access: fall back to the public copy.
            if (![401, 403].includes(e.response?.status)) throw e;
          }
        }
        const r = await postsApi.publicShow(id);
        if (!cancelled) setState({ loading: false, post: r.data.data, can: {}, readOnly: true, error: null });
      } catch {
        if (!cancelled) setState({ loading: false, post: null, can: {}, readOnly: true, error: "This post is not available. It may have been removed, or it is visible to staff only." });
      }
    };
    load();
    const again = () => load();
    window.addEventListener("wen:post-created", again);
    return () => { cancelled = true; window.removeEventListener("wen:post-created", again); };
  }, [id, signedIn]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={signedIn ? "/posts" : "/login"} className="flex items-center gap-2">
            <img src={wifaqLogo} alt="" className="h-8 w-auto" />
            <span className="text-sm font-bold text-gray-800">Wifaq · Posts</span>
          </Link>
          <Link to={signedIn ? "/posts" : "/login"} className="text-sm font-semibold text-teal-700 hover:underline">
            {signedIn ? "All posts" : "Sign in"}
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-5">
        {state.loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : state.error ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-500">{state.error}</div>
        ) : (
          <>
            <PostCard post={state.post} canManage={state.can.manage} readOnly={state.readOnly} defaultComments
              onRemoved={() => { window.location.href = "/posts"; }} />
            {state.readOnly && (
              <p className="text-center text-xs text-gray-400 mt-4">Sign in to like, comment and see more posts.</p>
            )}
          </>
        )}
      </main>
      {/* Editing from this page needs the composer, which lives in the main layout. */}
      {!state.readOnly && <PostComposer />}
    </div>
  );
}
