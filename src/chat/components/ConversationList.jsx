import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiSearch, FiEdit, FiMoreVertical, FiCheck, FiCheckCircle,
} from 'react-icons/fi';
import { useChat } from '../ChatContext';
import Avatar from './Avatar';
import { formatListTime, lastMessagePreview, roleLabel } from '../utils';

export default function ConversationList({ onNewChat }) {
  const {
    conversations, activeId, openConversation, isOnline,
    setPinned, setArchived, setMuted, refreshConversations, me,
  } = useChat();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [menuFor, setMenuFor] = useState(null);

  useEffect(() => {
    refreshConversations({ archived: showArchived });
  }, [showArchived, refreshConversations]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) => (c.title || '').toLowerCase().includes(term));
  }, [conversations, search]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
          <button
            onClick={onNewChat}
            title="New chat"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
          >
            <FiEdit className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-transparent focus:border-teal-300 focus:bg-white rounded-xl text-sm outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2 mt-3 text-xs">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${!showArchived ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            Recent
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${showArchived ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {showArchived ? 'No archived chats.' : 'No conversations yet. Start a new chat.'}
          </div>
        ) : (
          filtered.map((c) => {
            const other = c.counterpart;
            const online = other ? isOnline(other.id) : false;
            const active = c.id === activeId;
            const mine = c.last_message && c.last_message.sender_id === me?.id;
            return (
              <div
                key={c.id}
                onClick={() => openConversation(c)}
                className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors ${active ? 'bg-teal-50/70' : 'hover:bg-gray-50'}`}
              >
                <Avatar user={other} size={48} online={online} showDot />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-800 truncate flex items-center gap-1.5">
                      {c.is_pinned && <span className="text-teal-500 text-xs">📌</span>}
                      {c.title}
                    </span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">
                      {formatListTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 truncate flex items-center gap-1">
                      {mine && c.last_message && !c.last_message.is_deleted && (
                        c.last_message.seen_at
                          ? <FiCheckCircle className="w-3 h-3 text-teal-500 flex-shrink-0" />
                          : <FiCheck className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="truncate">{lastMessagePreview(c.last_message)}</span>
                    </span>
                    {c.unread_count > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-teal-600 text-white text-[10px] font-bold">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  {other?.role && (
                    <span className="text-[10px] text-gray-400">{roleLabel(other.role)}</span>
                  )}
                </div>

                {/* Row menu */}
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === c.id ? null : c.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-opacity"
                >
                  <FiMoreVertical className="w-4 h-4" />
                </button>
                {menuFor === c.id && (
                  <RowMenu
                    conversation={c}
                    onClose={() => setMenuFor(null)}
                    onPin={() => { setPinned(c.id, !c.is_pinned); setMenuFor(null); }}
                    onArchive={() => { setArchived(c.id, !showArchived); setMenuFor(null); }}
                    onMute={() => { setMuted(c.id, !c.is_muted); setMenuFor(null); }}
                    archivedView={showArchived}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RowMenu({ conversation, onClose, onPin, onArchive, onMute, archivedView }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-3 top-12 z-20 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm"
    >
      <button onClick={onPin} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700">
        {conversation.is_pinned ? 'Unpin' : 'Pin'}
      </button>
      <button onClick={onMute} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700">
        {conversation.is_muted ? 'Unmute' : 'Mute'}
      </button>
      <button onClick={onArchive} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700">
        {archivedView ? 'Unarchive' : 'Archive'}
      </button>
    </div>
  );
}
