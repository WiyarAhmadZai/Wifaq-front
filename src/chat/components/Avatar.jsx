import { avatarUrl, initials, avatarColor } from '../utils';

// Circular avatar with optional presence dot. Falls back to coloured initials.
export default function Avatar({ user, size = 44, online = false, showDot = false }) {
  const url = avatarUrl(user?.avatar_url || user?.avatar);
  const dot = Math.max(9, Math.round(size * 0.28));

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {url ? (
        <img
          src={url}
          alt={user?.name || ''}
          className="w-full h-full rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center text-white font-semibold ${avatarColor(user?.name || '')}`}
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          {initials(user?.name || '?')}
        </div>
      )}
      {showDot && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white ${online ? 'bg-emerald-500' : 'bg-gray-300'}`}
          style={{ width: dot, height: dot }}
        />
      )}
    </div>
  );
}
