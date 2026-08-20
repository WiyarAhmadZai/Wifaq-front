import { draftAgeLabel } from "../../utils/formDraft";

/**
 * The two pieces of draft feedback an event / meeting form needs, kept
 * together so both forms say the same thing in the same place.
 *
 * `RestoreDraftBanner` — offered when the browser is holding work the server
 * has not seen (the user left mid-edit). It never restores silently: the user
 * decides, because quietly overwriting the fields they are looking at is worse
 * than losing a draft they had forgotten about.
 *
 * `DraftStatus` — a plain sentence about where this record stands: unsaved,
 * saved as a draft nobody else can see, or live.
 */

export function RestoreDraftBanner({ savedAt, onRestore, onDiscard }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
      <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-900">Unsaved work from {draftAgeLabel(savedAt)}</p>
        <p className="text-[11px] text-amber-700 mt-0.5">
          You left this form before saving. Everything you had typed is still here.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button type="button" onClick={onRestore}
          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors">
          Restore it
        </button>
        <button type="button" onClick={onDiscard}
          className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors">
          Start fresh
        </button>
      </div>
    </div>
  );
}

export function DraftStatus({ isDraft, savedAt, saving, noun = "event" }) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
        <span className="w-3 h-3 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" />
        Saving…
      </span>
    );
  }
  if (isDraft) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Draft{savedAt ? ` · saved ${draftAgeLabel(savedAt)}` : ""} — only you can see it
      </span>
    );
  }
  if (savedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Saved {draftAgeLabel(savedAt)}
      </span>
    );
  }
  return (
    <span className="text-[11px] text-gray-400">
      Not saved yet — use “Save draft” to keep this {noun} and finish it later
    </span>
  );
}
