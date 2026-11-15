import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FiX, FiSearch, FiCheck } from "react-icons/fi";
import { useChat } from "../../chat/ChatContext";
import chatApi from "../../chat/chatApi";
import Avatar from "../../chat/components/Avatar";
import { postLink, plainText } from "../../api/posts";

/**
 * Send a post into one or more chats. The message carries who posted it, the
 * first words and the link — the link opens the post (for anyone, if it is public).
 */
export default function SendToChat({ post, onClose }) {
  const { conversations, refreshConversations } = useChat();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { refreshConversations?.(); }, [refreshConversations]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (conversations || []).filter((c) => !term || (c.title || "").toLowerCase().includes(term));
  }, [conversations, q]);

  const toggle = (id) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const send = async () => {
    if (!picked.length) return;
    setBusy(true);
    const words = plainText(post.body);
    const snippet = words.slice(0, 140);
    const body = [
      note.trim(),
      `📄 ${post.author?.name || ""}${snippet ? `: ${snippet}${words.length > 140 ? "…" : ""}` : ""}`,
      postLink(post.id),
    ].filter(Boolean).join("\n");
    const results = await Promise.allSettled(picked.map((id) => chatApi.sendMessage(id, { body })));
    setBusy(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    Swal.fire({
      toast: true, position: "top-end", timer: 2200, showConfirmButton: false,
      icon: failed ? "warning" : "success",
      title: failed ? "Some chats could not be sent to" : "Sent in chat",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[880] bg-black/40 flex items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">Send in chat</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 grid place-items-center text-gray-500"><FiX /></button>
        </div>
        <div className="px-4 pt-3">
          <div className="relative">
            <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 ps-9 pe-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {list.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No chats yet.</p>}
          {list.map((c) => {
            const on = picked.includes(c.id);
            return (
              <button type="button" key={c.id} onClick={() => toggle(c.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-start transition ${on ? "bg-teal-50" : "hover:bg-gray-50"}`}>
                <Avatar user={c.type === "group" ? { name: c.title } : c.counterpart} size={38} linkable={false} group={c.type === "group"} />
                <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate" data-no-i18n>{c.title}</span>
                <span className={`w-6 h-6 rounded-full grid place-items-center border ${on ? "bg-teal-600 border-teal-600 text-white" : "border-gray-300"}`}>
                  {on && <FiCheck className="w-4 h-4" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} dir="auto" placeholder="Add a message (optional)…"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-300" />
          <button type="button" onClick={send} disabled={busy || !picked.length}
            className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2.5 text-sm font-bold disabled:opacity-50">
            {busy ? "Sending…" : <><span>Send</span>{picked.length > 1 && <span data-no-i18n> ({picked.length})</span>}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
