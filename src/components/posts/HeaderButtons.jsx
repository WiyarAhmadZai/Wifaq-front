import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiFileText, FiPlus, FiImage, FiType, FiCircle } from "react-icons/fi";
import { useAuth } from "../../admin/context/AuthContext";
import { openComposer } from "../../api/posts";

const can = (hasRole, hasPermission, p) => hasRole?.("super-admin") || hasPermission?.(p);

/** Header: the Posts feed, beside the chat button. */
export function PostsButton() {
  const { hasRole, hasPermission } = useAuth();
  const { pathname } = useLocation();
  if (!can(hasRole, hasPermission, "posts.view")) return null;
  const active = pathname.startsWith("/posts");
  return (
    <Link to="/posts" title="Posts"
      className={`relative p-1.5 transition-colors ${active ? "text-teal-600" : "text-gray-600 hover:text-teal-600"}`}>
      <FiFileText className="w-5 h-5" />
    </Link>
  );
}

/** Header: ＋ beside the profile — photo/video, text, or a story. */
export function CreatePostButton() {
  const { hasRole, hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  if (!can(hasRole, hasPermission, "posts.create")) return null;

  const items = [
    { mode: "media", label: "Photo / Video", icon: <FiImage className="w-4 h-4" />, tone: "text-emerald-600 bg-emerald-50" },
    { mode: "text", label: "Text post", icon: <FiType className="w-4 h-4" />, tone: "text-indigo-600 bg-indigo-50" },
    { mode: "story", label: "Story", icon: <FiCircle className="w-4 h-4" />, tone: "text-rose-500 bg-rose-50" },
  ];
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} title="Create"
        className="w-8 h-8 rounded-full bg-teal-600 hover:bg-teal-700 text-white grid place-items-center shadow-sm transition">
        <FiPlus className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute end-0 top-10 z-50 w-52 rounded-2xl border border-gray-100 bg-white shadow-xl p-1.5">
          {items.map(({ mode, label, icon, tone }) => (
            <button type="button" key={mode} onClick={() => { setOpen(false); openComposer(mode); }}
              className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <span className={`w-8 h-8 rounded-full grid place-items-center ${tone}`}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
