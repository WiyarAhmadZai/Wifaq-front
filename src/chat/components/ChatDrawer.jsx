import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { useChat } from '../ChatContext';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import NewChatModal from './NewChatModal';

// Slide-in messaging panel. Keeps the user on the current page — it overlays as
// a right-hand drawer (WhatsApp-Web feel), split into conversation list + thread.
export default function ChatDrawer() {
  const { open, closeDrawer, activeId, closeConversation } = useChat();
  const [showNew, setShowNew] = useState(false);

  // Ask for OS notification permission the first time the drawer opens.
  useEffect(() => {
    if (open && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [open]);

  // Close on Escape (only when no conversation is open on mobile).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !activeId) closeDrawer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, activeId, closeDrawer]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-[61] h-full w-full sm:w-[420px] md:w-[760px] bg-white shadow-2xl flex transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Left: conversation list */}
        <div className={`w-full md:w-[320px] md:border-r border-gray-100 flex-col ${activeId ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center justify-end px-2 pt-2 md:hidden">
            <button onClick={closeDrawer} className="p-2 text-gray-400 hover:text-gray-600"><FiX /></button>
          </div>
          <ConversationList onNewChat={() => setShowNew(true)} />
        </div>

        {/* Right: active thread */}
        <div className={`flex-1 min-w-0 ${activeId ? 'flex' : 'hidden md:flex'} flex-col relative`}>
          {/* Desktop close button floats over the thread header */}
          <button
            onClick={closeDrawer}
            title="Close"
            className="hidden md:flex absolute top-3 right-3 z-20 w-8 h-8 items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 text-gray-500 shadow-sm"
          >
            <FiX className="w-4 h-4" />
          </button>
          {/* Keyed by conversation id so transient state (reply/edit drafts,
              scroll) resets cleanly when switching threads. */}
          <ChatWindow key={activeId || 'empty'} onBack={closeConversation} />
        </div>

        {showNew && <NewChatModal onClose={() => setShowNew(false)} onStarted={() => setShowNew(false)} />}
      </div>
    </>
  );
}
