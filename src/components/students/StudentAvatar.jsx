import { useState } from "react";

/**
 * A student's face, or their initials when there is no photo.
 *
 * This exists because every student screen had invented its own version and
 * each one got it wrong differently: the phase-1 list fell back to
 * `profile_image.path` (a PRIVATE-disk key, never loadable), the enrollments
 * table drew initials and never looked for a photo at all, and the detail page
 * had a third rule. One component, one rule, so the next list that needs an
 * avatar cannot reintroduce the bug.
 *
 * The rule: use `profile_image.url`. The server builds it
 * (DriveFile::getUrlAttribute) — a signed link for an uploaded file, the
 * thumbnail for a hosted one. Never `path`; a browser cannot reach it.
 */
const SIZES = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-9 h-9 text-xs",
  lg: "w-12 h-12 text-base",
  xl: "w-20 h-20 text-2xl",
};

export default function StudentAvatar({ student, size = "md", rounded = "rounded-full", className = "" }) {
  /* A signed link that has expired, or a file since removed from disk, must not
     leave an empty box where a face should be — fall back to the initials. */
  const [failed, setFailed] = useState(false);

  const dim = SIZES[size] || SIZES.md;
  const name = `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || student?.full_name || "Student";
  const initials = (
    `${student?.first_name?.[0] || ""}${student?.last_name?.[0] || ""}`
    || `${student?.full_name?.[0] || ""}`
  ).toUpperCase();

  // `photo_url` is the shape the شناسنامه endpoint uses; the rest send the
  // whole drive-file row. Accept either so no caller has to care which.
  const url = student?.profile_image?.url
    || student?.profile_image?.external_url
    || student?.photo_url
    || null;

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${dim} ${rounded} object-cover border-2 border-teal-100 flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${dim} ${rounded} bg-teal-100 text-teal-700 flex items-center justify-center font-bold border-2 border-teal-200 flex-shrink-0 ${className}`}>
      {initials || "?"}
    </div>
  );
}
