import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMessageSquare, FiArrowLeft } from 'react-icons/fi';
import { useChat } from '../ChatContext';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import NewChatModal from './NewChatModal';

/**
 * The mailbox as a page of its own, at /mailbox.
 *
 * Same conversations, same threads, same composer as the drawer — only the
 * frame is different: the whole window instead of a panel over the page, and
 * no sidebar, so mail gets the screen a mailbox expects. It is what the
 * drawer's "open in a separate window" button opens, which is how you keep
 * mail beside the rest of the system, or on a second screen, without a second
 * site to host and maintain.
 *
 * Deliberately outside the app Layout: a window opened for mail should not
 * carry the navigation of the system it was opened from.
 */
export default function MailboxPage() {
  const { activeId, closeConversation, canUseChat, unreadTotal } = useChat();
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const before = document.title;
    document.title = unreadTotal > 0 ? `(${unreadTotal}) Messages · WEN` : 'Messages · WEN';
    return () => { document.title = before; };
  }, [unreadTotal]);

  if (!canUseChat) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-3">
        <FiMessageSquare className="w-10 h-10 text-gray-300" />
        <p className="text-sm">Messaging is not available for this account.</p>
        <Link to="/" className="text-sm font-medium text-teal-700 hover:underline">Back to the system</Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* A thin brand bar, so a window opened on its own still says where it
          belongs and offers a way back into the system. */}
      <header className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: '#E3EDED', background: '#0D5C63' }}>
        <FiMessageSquare className="w-4 h-4 text-white/90" />
        <span className="text-sm font-semibold text-white">Messages</span>
        {unreadTotal > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: '#C9A227', color: '#0A3A3E' }}>
            {unreadTotal}
          </span>
        )}
        <Link to="/" className="ms-auto flex items-center gap-1.5 text-xs text-white/80 hover:text-white">
          <FiArrowLeft className="w-3.5 h-3.5" />
          <span>Back to the system</span>
        </Link>
      </header>

      <div className="flex-1 min-h-0 flex">
        <div className={`w-full md:w-[340px] xl:w-[380px] md:border-r border-gray-100 flex-col ${activeId ? 'hidden md:flex' : 'flex'}`}>
          <ConversationList onNewChat={() => setShowNew(true)} />
        </div>
        <div className={`flex-1 min-w-0 ${activeId ? 'flex' : 'hidden md:flex'} flex-col relative`}>
          <ChatWindow key={activeId || 'empty'} onBack={closeConversation} controlsWidth={0} />
        </div>
      </div>

      {showNew && <NewChatModal onClose={() => setShowNew(false)} onStarted={() => setShowNew(false)} />}
    </div>
  );
}
