import { useState } from 'react';
import { FiX, FiCornerUpRight } from 'react-icons/fi';
import { useChat } from '../ChatContext';
import { chatApi } from '../chatApi';
import Avatar from './Avatar';

// Pick one or more of the user's conversations to forward a message into.
export default function ForwardModal({ message, onClose }) {
  const { conversations } = useChat();
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const forward = async () => {
    if (selected.size === 0) return;
    setSending(true);
    try {
      await chatApi.forwardMessage(message.id, Array.from(selected));
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Forward to…</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><FiX /></button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {conversations.map((c) => (
            <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-teal-600" />
              <Avatar user={c.counterpart} size={36} />
              <span className="text-sm text-gray-700 truncate">{c.title}</span>
            </label>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={forward}
            disabled={selected.size === 0 || sending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
          >
            <FiCornerUpRight className="w-4 h-4" />
            Forward{selected.size ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
