import { FiMessageSquare } from 'react-icons/fi';
import { useChat } from '../ChatContext';

// Navbar entry point. The badge/icon replays a short bounce whenever the unread
// count changes — achieved purely with a keyed CSS animation (the span remounts
// when `unreadTotal` changes and re-runs the one-shot `bounce` keyframe), so no
// effect/state is needed. Clicking opens the drawer; the user stays on the page.
export default function MessagesButton() {
  const { unreadTotal, openDrawer } = useChat();

  return (
    <button
      onClick={openDrawer}
      title="Messages"
      className="relative p-1.5 text-gray-600 hover:text-teal-600 transition-colors"
    >
      <span
        key={unreadTotal}
        className={unreadTotal > 0 ? 'inline-block animate-[bounce_0.6s_ease-in-out_2]' : 'inline-block'}
      >
        <FiMessageSquare className="w-5 h-5" />
      </span>
      {unreadTotal > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold ring-2 ring-white">
          {unreadTotal > 99 ? '99+' : unreadTotal}
        </span>
      )}
    </button>
  );
}
