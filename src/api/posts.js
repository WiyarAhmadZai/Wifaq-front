import Swal from "sweetalert2";
import { get, post, put, del } from "./axios";

/** Posts — feed, stories, likes, threaded comments. See PostController. */
export const postsApi = {
  feed: (page = 1) => get("/posts/feed", { cache: false, params: { page } }),
  /** One person's posts — their profile grid. */
  feedOf: (userId, page = 1) => get("/posts/feed", { cache: false, params: { user_id: userId, page, per_page: 30 } }),
  stories: () => get("/posts/stories", { cache: false }),
  show: (id) => get(`/posts/${id}`, { cache: false }),
  publicShow: (id) => get(`/public/posts/${id}`, { cache: false }),
  create: (formData, onUploadProgress) =>
    post("/posts", formData, { headers: { "Content-Type": "multipart/form-data" }, onUploadProgress }),
  update: (id, data) => put(`/posts/${id}`, data),
  remove: (id) => del(`/posts/${id}`),
  like: (id) => post(`/posts/${id}/like`),
  comments: (id) => get(`/posts/${id}/comments`, { cache: false }),
  comment: (id, body, parentId = null) => post(`/posts/${id}/comments`, { body, parent_id: parentId }),
  removeComment: (commentId) => del(`/posts/comments/${commentId}`),
  pin: (id) => post(`/posts/${id}/pin`),
  view: (id) => post(`/posts/${id}/view`),
  react: (commentId, emoji) => post(`/posts/comments/${commentId}/react`, { emoji }),
  replyToStory: (id, body) => post(`/posts/${id}/reply`, { body }),
};

/** Reactions a comment can get — mirrors PostController::COMMENT_REACTIONS. */
export const COMMENT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

/** Calm gradients for text-only posts and stories — mirrors Post::BACKGROUNDS. */
export const POST_BACKGROUNDS = {
  teal: "from-teal-500 to-emerald-600",
  indigo: "from-indigo-500 to-violet-600",
  rose: "from-rose-400 to-pink-600",
  amber: "from-amber-400 to-orange-500",
  slate: "from-slate-600 to-slate-800",
  emerald: "from-emerald-500 to-teal-700",
  violet: "from-violet-500 to-fuchsia-600",
  sky: "from-sky-400 to-blue-600",
};

/** The link anyone can open — public posts even without signing in. */
export const postLink = (id) => `${window.location.origin}/post/${id}`;

/** A post body as plain words — captions are rich text (HTML) now. */
export const plainText = (html) => {
  if (!html) return "";
  // DOMParser parses inertly — no images load, no handlers run.
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent || "";
  return text.replace(/\s+/g, " ").trim();
};

export const timeAgo = (iso) => {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 604800) return `${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString();
};

/** Ask the global composer (mounted in Layout) to open. mode: media | text | story | edit */
export const openComposer = (mode, post = null) =>
  window.dispatchEvent(new CustomEvent("wen:post-compose", { detail: { mode, post } }));

/* ════════════ sharing ════════════ */
/** Share a post: the system share sheet where there is one, else copy its link. */
export async function sharePost(p) {
  const url = postLink(p.id);
  try {
    if (navigator.share) {
      await navigator.share({ title: p.author?.name || "Post", text: plainText(p.body).slice(0, 120), url });
      return;
    }
  } catch { /* cancelled — fall through to copying */ }
  try {
    await navigator.clipboard.writeText(url);
    Swal.fire({
      toast: true, position: "top-end", icon: "success", timer: 2200, showConfirmButton: false,
      title: p.visibility === "public" ? "Link copied — anyone can open it" : "Link copied — only signed-in staff can open it",
    });
  } catch {
    Swal.fire({ title: "Post link", input: "text", inputValue: url });
  }
}
