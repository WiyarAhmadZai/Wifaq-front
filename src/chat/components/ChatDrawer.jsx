import { useCallback, useEffect, useState } from 'react';
import { FiX, FiMaximize2, FiMinimize2, FiExternalLink } from 'react-icons/fi';
import { useChat } from '../ChatContext';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import NewChatModal from './NewChatModal';

/* Slide-in messaging panel. Keeps the user on the current page — it overlays as
 * a right-hand drawer (WhatsApp-Web feel), split into conversation list + thread.
 *
 * Three sizes, because a drawer that is right for a one-line reply is cramped
 * for a morning of mail:
 *   - the drawer itself, at a comfortable reading width;
 *   - WIDE, which takes nearly the whole screen — the mailbox feel;
 *   - a separate browser window on /mailbox, for a second monitor or for
 *     leaving mail open beside the rest of the system.
 * The choice is remembered, so whoever prefers the wide view gets it every
 * time without reaching for the button again. */

const WIDE_KEY = 'wen.chat.wide';

const readWide = () => {
  try { return localStorage.getItem(WIDE_KEY) === '1'; } catch { return false; }
};

export default function ChatDrawer() {
  const { open, closeDrawer, activeId, closeConversation, canUseChat } = useChat();
  const [showNew, setShowNew] = useState(false);
  const [wide, setWide] = useState(readWide);

  const toggleWide = useCallback(() => {
    setWide((v) => {
      const next = !v;
      try { localStorage.setItem(WIDE_KEY, next ? '1' : '0'); } catch { /* private mode */ }
      return next;
    });
  }, []);

  /* Its own browser window, on the standalone /mailbox page. Named, so a
   * second click focuses the window already open instead of stacking another
   * one on top of it. */
  const popOut = useCallback(() => {
    const w = Math.min(1440, Math.max(900, Math.round(window.screen.availWidth * 0.8)));
    const h = Math.min(950, Math.max(600, Math.round(window.screen.availHeight * 0.85)));
    const url = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/mailbox`;
    const win = window.open(url, 'wen-mailbox', `width=${w},height=${h},menubar=no,toolbar=no`);
    if (win) { win.focus(); closeDrawer(); }
    else window.open(url, '_blank', 'noopener');   // a blocked popup still opens as a tab
  }, [closeDrawer]);

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

  if (!canUseChat) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-[61] h-full bg-white shadow-2xl flex transition-all duration-300 ease-out w-full ${
          wide ? 'md:w-[94vw] xl:w-[88vw] 2xl:w-[1500px]' : 'sm:w-[420px] md:w-[760px] lg:w-[860px]'
        } ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Left: conversation list */}
        <div className={`w-full md:border-r border-gray-100 flex-col ${wide ? 'md:w-[340px] xl:w-[380px]' : 'md:w-[320px]'} ${activeId ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center justify-end px-2 pt-2 md:hidden">
            <button onClick={closeDrawer} className="p-2 text-gray-400 hover:text-gray-600"><FiX /></button>
          </div>
          <ConversationList onNewChat={() => setShowNew(true)} />
        </div>

        {/* Right: active thread */}
        <div className={`flex-1 min-w-0 ${activeId ? 'flex' : 'hidden md:flex'} flex-col relative`}>
          {/* Window controls float over the thread header, like a mail client's. */}
          <div className="hidden md:flex absolute top-3 right-3 z-20 items-center gap-1">
            <button onClick={popOut} title="Open in a separate window"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 text-gray-500 shadow-sm">
              <FiExternalLink className="w-4 h-4" />
            </button>
            <button onClick={toggleWide} title={wide ? 'Shrink the window' : 'Expand the window'}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 text-gray-500 shadow-sm">
              {wide ? <FiMinimize2 className="w-4 h-4" /> : <FiMaximize2 className="w-4 h-4" />}
            </button>
            <button onClick={closeDrawer} title="Close"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 text-gray-500 shadow-sm">
              <FiX className="w-4 h-4" />
            </button>
          </div>
          {/* Keyed by conversation id so transient state (reply/edit drafts,
              scroll) resets cleanly when switching threads. */}
          <ChatWindow key={activeId || 'empty'} onBack={closeConversation} />
        </div>

        {showNew && <NewChatModal onClose={() => setShowNew(false)} onStarted={() => setShowNew(false)} />}
      </div>
    </>
  );
}
