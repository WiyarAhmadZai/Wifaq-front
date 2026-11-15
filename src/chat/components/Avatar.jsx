import { Link } from 'react-router-dom';
import { avatarUrl, initials, avatarColor } from '../utils';

/**
 * Circular avatar with optional presence dot. Falls back to coloured initials.
 *
 * Links to the person's profile when we know which user it is. `linkable`
 * exists so the composer and the header of the conversation you are already
 * looking at can opt out — a link that reloads the page you are on is noise.
 */
export default function Avatar({ user, size = 44, online = false, showDot = false, linkable = true, group = false }) {
  const url = avatarUrl(user?.avatar_url || user?.avatar);
  const dot = Math.max(9, Math.round(size * 0.28));

  const userId = user?.id ?? user?.user_id;
  const Wrapper = linkable && userId ? Link : 'div';
  const wrapperProps = linkable && userId
    ? {
        to: `/profile/${userId}`,
        title: `View ${user?.name || 'profile'}`,
        // Avatars sit inside conversation rows that select the thread on
        // click; opening the profile must not also switch conversation.
        onClick: (e) => e.stopPropagation(),
        className: 'relative flex-shrink-0 block hover:opacity-90 transition-opacity',
      }
    : { className: 'relative flex-shrink-0' };

  return (
    <Wrapper {...wrapperProps} style={{ width: size, height: size }}>
      {url ? (
        <img
          src={url}
          alt={user?.name || ''}
          className="w-full h-full rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : group ? (
        // A group has no face: a people glyph on the colour its name would get.
        <div
          className={`w-full h-full rounded-full flex items-center justify-center text-white ${avatarColor(user?.name || '')}`}
          style={{ width: size, height: size }}
          aria-label={user?.name || ''}
        >
          <svg style={{ width: size * 0.5, height: size * 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
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
    </Wrapper>
  );
}
