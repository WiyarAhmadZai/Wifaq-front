import { Link } from "react-router-dom";

/**
 * A person's avatar and/or name, linking to their public profile.
 *
 * The profile route (`/profile/:userId`) and its endpoint already allow any
 * authenticated user to open anyone's profile — the backend stamps `is_self` /
 * `is_admin_viewer` and the page renders the public subset for everyone else.
 * What was missing was a way to GET there, so this is the one component every
 * avatar and name should go through.
 *
 * Degrades to plain text when `userId` is absent: several lists carry a name
 * with no user account behind it (an applicant, a vendor contact), and a link
 * to `/profile/undefined` would be worse than no link.
 */
const SIZES = {
  xs: { box: "w-6 h-6 text-[9px]", text: "text-[11px]" },
  sm: { box: "w-8 h-8 text-[11px]", text: "text-xs" },
  md: { box: "w-10 h-10 text-sm", text: "text-sm" },
  lg: { box: "w-14 h-14 text-lg", text: "text-base" },
};

export default function UserLink({
  userId,
  name,
  photo,
  subtitle,
  size = "sm",
  showName = true,
  showAvatar = true,
  className = "",
}) {
  const s = SIZES[size] || SIZES.sm;
  const label = name || "Unknown";
  const initial = label.charAt(0).toUpperCase();

  const body = (
    <>
      {showAvatar && (
        <span className={`${s.box} rounded-full overflow-hidden bg-teal-100 text-teal-700 font-bold flex items-center justify-center flex-shrink-0`}>
          {photo
            ? <img src={photo} alt={label} className="w-full h-full object-cover" />
            : initial}
        </span>
      )}
      {showName && (
        <span className="min-w-0">
          <span className={`block ${s.text} font-medium truncate ${userId ? "group-hover:text-teal-700 group-hover:underline" : ""}`}>
            {label}
          </span>
          {subtitle && <span className="block text-[10px] text-gray-400 truncate">{subtitle}</span>}
        </span>
      )}
    </>
  );

  if (!userId) {
    return <span className={`inline-flex items-center gap-2 ${className}`}>{body}</span>;
  }

  return (
    <Link
      to={`/profile/${userId}`}
      title={`View ${label}'s profile`}
      // stopPropagation: these sit inside table rows and cards that navigate
      // elsewhere on click, and the profile link must win over the row.
      onClick={(e) => e.stopPropagation()}
      className={`group inline-flex items-center gap-2 text-gray-800 hover:text-teal-700 transition-colors ${className}`}
    >
      {body}
    </Link>
  );
}
