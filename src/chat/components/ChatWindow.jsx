import { useLayoutEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiMessageSquare } from 'react-icons/fi';
import { useChat } from '../ChatContext';
import Avatar from './Avatar';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import ForwardModal from './ForwardModal';
import { formatDateDivider, lastSeenLabel, roleLabel } from '../utils';

export default function ChatWindow({ onBack }) {
  const {
    activeConversation, messages, loadingMessages, hasMore, loadOlder,
    isOnline, typingPeers, sendMessage, sendTyping, editMessage, deleteMessage, me,
  } = useChat();

  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [forwarding, setForwarding] = useState(null);
  const [dropActive, setDropActive] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState(null);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const prevHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);

  const other = activeConversation?.counterpart;
  const online = other ? isOnline(other.id) : false;
  const typingNames = Object.values(typingPeers || {});

  // Auto-scroll to newest on new messages (unless we just prepended older ones).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (loadingOlderRef.current) {
      // Preserve position after prepending history.
      el.scrollTop = el.scrollHeight - prevHeightRef.current;
      loadingOlderRef.current = false;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  const onScroll = async () => {
    const el = scrollRef.current;
    if (!el || !hasMore || loadingOlderRef.current) return;
    if (el.scrollTop < 60) {
      loadingOlderRef.current = true;
      prevHeightRef.current = el.scrollHeight;
      await loadOlder();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDropActive(false);
    if (e.dataTransfer?.files?.length) setDroppedFiles(Array.from(e.dataTransfer.files));
  };

  if (!activeConversation) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center h-full bg-gray-50 text-gray-400">
        <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mb-4">
          <FiMessageSquare className="w-9 h-9 text-teal-400" />
        </div>
        <p className="text-sm">Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-gray-50 relative"
      onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDropActive(false); }}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
        <button onClick={onBack} className="md:hidden p-1 text-gray-500 hover:text-gray-700">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <Avatar user={other} size={42} online={online} showDot />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800 truncate">{activeConversation.title}</div>
          <div className="text-xs text-gray-400 truncate">
            {typingNames.length > 0 ? (
              <span className="text-teal-600 font-medium">typing…</span>
            ) : online ? (
              <span className="text-emerald-500">online</span>
            ) : (
              <span>{other?.role ? `${roleLabel(other.role)} · ` : ''}{lastSeenLabel(other?.last_seen_at)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {loadingMessages ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-4 border-teal-100 border-t-teal-500" />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center text-[11px] text-gray-400 py-1">Scroll up for older messages…</div>
            )}
            {groupByDate(messages).map((group) => (
              <div key={group.label} className="space-y-1.5">
                <div className="flex justify-center my-2">
                  <span className="px-3 py-0.5 rounded-full bg-white text-[11px] text-gray-500 shadow-sm border border-gray-100">
                    {group.label}
                  </span>
                </div>
                {group.items.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    outgoing={m.sender_id === me?.id}
                    onReply={setReplyTo}
                    onForward={setForwarding}
                    onEdit={setEditing}
                    onDelete={(msg) => deleteMessage(msg.id)}
                  />
                ))}
              </div>
            ))}
            {typingNames.length > 0 && <TypingBubble />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <MessageComposer
        onSend={sendMessage}
        sendTyping={sendTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        onSaveEdit={(id, body) => { editMessage(id, body); setEditing(null); }}
        onCancelEdit={() => setEditing(null)}
        incomingFiles={droppedFiles}
      />

      {/* Drag overlay */}
      {dropActive && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-teal-600/10 border-4 border-dashed border-teal-400 rounded-lg pointer-events-none">
          <span className="px-4 py-2 bg-white rounded-xl shadow text-teal-600 font-medium text-sm">Drop files to send</span>
        </div>
      )}

      {forwarding && (
        <ForwardModal message={forwarding} onClose={() => setForwarding(null)} />
      )}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start px-1">
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// Split a flat message list into date-labelled groups.
function groupByDate(messages) {
  const groups = [];
  let current = null;
  for (const m of messages) {
    const label = formatDateDivider(m.created_at);
    if (!current || current.label !== label) {
      current = { label, items: [] };
      groups.push(current);
    }
    current.items.push(m);
  }
  return groups;
}
