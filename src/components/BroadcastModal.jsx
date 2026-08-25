import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../api/axios";
import { useAuth } from "../admin/context/AuthContext";
import { textDirection, arabicTextStyle } from "../utils/textDirection";

/* Brand tokens — the same ones the rest of the system uses. */
const TEAL = "#0D5C63";
const TEAL_LT = "#14919B";
const GOLD = "#C9A227";
const BORDER = "#D0E0E0";

/** Accent per tone. The message is always shown in full — tone only tints. */
const TONES = {
  info:    { accent: TEAL,      wash: "#E8F6F6", chip: "Announcement" },
  success: { accent: "#2E7D5B", wash: "#E6F3EC", chip: "Good news" },
  warning: { accent: "#8A6F10", wash: "#FFF8E7", chip: "Please note" },
};

const initials = (n) =>
  (n || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/* Per-browser "already seen today", used only when nobody is logged in — there
   is no user to key a server-side record to. Wrapped because a private window
   or blocked site data makes localStorage throw on access, not just return
   null, and an announcement must never break the page it sits on. */
const dayKey = () => new Date().toISOString().slice(0, 10);
const seenLocally = (id) => {
  try { return localStorage.getItem(`wen_bcast_${id}`) === dayKey(); }
  catch { return false; }
};
const markSeenLocally = (id) => {
  try { localStorage.setItem(`wen_bcast_${id}`, dayKey()); } catch { /* ignore */ }
};

/** "3 hours ago" — a broadcast is news, and news needs a timestamp. */
const timeAgo = (iso) => {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/**
 * The once-a-day system broadcast.
 *
 * Mounted once inside the authenticated layout, so it can appear over whatever
 * page the user happens to land on. The server decides IF there is anything to
 * show — this component never reasons about dates, it just renders what
 * `/broadcasts/current` hands back (null on any day the user has already seen
 * the current message).
 *
 * Read is recorded the moment it appears, not on dismiss: someone who closes
 * the tab rather than clicking the ✕ has still been shown the message, and
 * re-interrupting them on the next page load would be the annoying behaviour.
 */
export default function BroadcastModal() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* Who we are asking on behalf of. A visitor on the sign-in page is "anon";
     once they log in this becomes their id, and the message is re-fetched
     against the server's own record of what they have seen. Keying on this
     instead of a one-shot flag is what makes the modal appear after login on
     the same mounted component. */
  const audience = user?.id ? `u${user.id}` : "anon";

  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(false);     // drives the enter/exit transition
  const [closing, setClosing] = useState(false);
  const closeBtn = useRef(null);
  // One fetch per audience, not per route change — otherwise every navigation
  // would re-ask and the card would flash back after being dismissed.
  const fetchedFor = useRef(null);

  useEffect(() => {
    if (fetchedFor.current === audience) return;
    fetchedFor.current = audience;

    let alive = true;

    /* Signed in → the server tracks who has seen what, across their devices.
       Not signed in (the sign-in page) → the public copy, tracked per browser.
       Both render the same card. */
    const signedIn = Boolean(user?.id);
    const url = signedIn ? "/broadcasts/current" : "/public/broadcast";

    get(url, { cache: false })
      .then((res) => {
        const data = res?.data?.data;
        if (!alive || !data) return;
        // An anonymous visitor's dismissal lives in this browser only.
        if (!signedIn && seenLocally(data.id)) return;
        setMsg(data);

        /* Wait for the screen to be free before appearing.
         *
         * On a first sign-in the welcome letter is already up; landing a second
         * modal on top of it is the exact "the system keeps shouting at me"
         * feeling this feature has to avoid. Poll for any other open dialog and
         * queue behind it — capped, so a stuck overlay can never suppress the
         * message forever. The delay also stops the modal arriving in the same
         * frame as the page, which reads as a glitch rather than a message. */
        let waited = 0;
        const reveal = () => {
          if (!alive) return;
          const otherDialogOpen = document.querySelector('[role="dialog"]');
          if (otherDialogOpen && waited < 20000) {
            waited += 500;
            setTimeout(reveal, 500);
            return;
          }
          setOpen(true);
        };
        setTimeout(reveal, 350);
      })
      .catch((err) => {
        // Never block the app on an announcement — but do not swallow the
        // reason either. A silent catch here hid a 403 that stopped every
        // non-admin user from ever seeing a broadcast, and nothing on screen
        // or in the console said so.
        const status = err?.response?.status;
        if (status === 403) {
          console.warn(
            "[broadcast] /broadcasts/current returned 403 — the route is being "
            + "permission-gated. Reading a broadcast must not require broadcasts.view.",
          );
        } else if (status && status !== 401) {
          console.warn(`[broadcast] could not load the daily message (HTTP ${status}).`);
        }
      });

    return () => { alive = false; };
  }, [audience, user?.id]);

  /* Marked seen when the user DISMISSES it, not when it is drawn.
   *
   * Recording it on display looked cheaper, but it consumed the message on any
   * load where the card never actually reached the screen — a fast navigation,
   * a re-mount, a tab closed mid-animation — and the person then had to wait
   * until tomorrow for an announcement they never read. Dismissal is the only
   * event that proves they saw it. Until then it comes back on every refresh,
   * which is also what makes "show it when I reload" work. */
  const close = useCallback(() => {
    if (msg) {
      if (user?.id) {
        post(`/broadcasts/${msg.id}/seen`).catch(() => { /* best-effort */ });
      } else {
        markSeenLocally(msg.id);
      }
    }
    setClosing(true);
    setOpen(false);
    // Let the exit transition finish before unmounting, or the card vanishes.
    setTimeout(() => { setMsg(null); setClosing(false); }, 220);
  }, [msg, user?.id]);

  // Escape closes it, and focus lands on the close button so a keyboard user
  // is not trapped behind the overlay.
  useEffect(() => {
    if (!msg) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => closeBtn.current?.focus(), 400);
    return () => { document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [msg, close]);

  if (!msg) return null;

  const tone = TONES[msg.tone] || TONES.info;
  const author = msg.author;

  // Only a signed-in user can open a colleague's profile; for a visitor on the
  // sign-in page the name is just a byline.
  const canOpenProfile = Boolean(author?.profile_url && user?.id);

  const openProfile = () => {
    if (!canOpenProfile) return;
    close();
    setTimeout(() => navigate(author.profile_url), 200);
  };

  /* Each block reads in the direction of its own text, and an empty one
   * borrows the other's — a title-only or body-only announcement should not
   * flip alignment halfway down the card. */
  const titleDir = textDirection(msg.title || msg.body);
  const bodyDir = textDirection(msg.body || msg.title);

  const followLink = () => {
    if (!msg.link_url) return;
    const url = msg.link_url;
    close();
    // An in-app path routes; anything else is somebody else's site.
    if (/^https?:\/\//i.test(url)) window.open(url, "_blank", "noopener");
    else setTimeout(() => navigate(url), 200);
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="broadcast-heading"
      style={{
        background: open ? "rgba(5,37,40,.55)" : "rgba(5,37,40,0)",
        backdropFilter: open ? "blur(3px)" : "blur(0px)",
        transition: "background 220ms ease, backdrop-filter 220ms ease",
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full sm:max-w-lg bg-white shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl"
        style={{
          border: `1px solid ${BORDER}`,
          // Slides up on a phone, scales in on a desktop — each matches how a
          // sheet and a dialog are expected to behave on that form factor.
          transform: open && !closing ? "translateY(0) scale(1)" : "translateY(24px) scale(.97)",
          opacity: open && !closing ? 1 : 0,
          transition: "transform 260ms cubic-bezier(.22,1,.36,1), opacity 200ms ease",
        }}
      >
        {/* Thin accent rule — a whole coloured banner would shout. */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${tone.accent}, ${GOLD})` }} />

        {/* ── Author header: the Facebook-post row ──
          * Pinned LTR on purpose. This row is a byline, not prose: the photo
          * leads, the ✕ closes from the far corner, and that stays put whatever
          * script the announcement itself is written in. The name is wrapped in
          * <bdi> below, so an Arabic-script name still renders correctly inside
          * this left-to-right row. */}
        <div dir="ltr" className="flex items-start gap-3 px-4 pt-4 pb-3">
          {author && canOpenProfile ? (
            <button type="button" onClick={openProfile}
              className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 transition-transform hover:scale-105"
              style={{ ringColor: tone.accent }} title={`View ${author.name}'s profile`}>
              {author.profile_photo ? (
                <img src={author.profile_photo} alt={author.name}
                  className="w-11 h-11 rounded-full object-cover"
                  style={{ border: `2px solid ${tone.accent}` }} />
              ) : (
                <span className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black text-white"
                  style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>
                  {initials(author.name)}
                </span>
              )}
            </button>
          ) : author ? (
            author.profile_photo ? (
              <img src={author.profile_photo} alt={author.name}
                className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                style={{ border: `2px solid ${tone.accent}` }} />
            ) : (
              <span className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>
                {initials(author.name)}
              </span>
            )
          ) : (
            <span className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: tone.wash }}>📣</span>
          )}

          <div className="min-w-0 flex-1">
            {author && canOpenProfile ? (
              <button type="button" onClick={openProfile}
                className="text-left hover:underline focus:outline-none focus:underline">
                <bdi dir="auto" className="block text-sm font-bold" style={{ color: "#0A3A3E" }}>
                  {author.name}
                </bdi>
              </button>
            ) : (
              <bdi dir="auto" className="block text-sm font-bold" style={{ color: "#0A3A3E" }}>
                {author?.name || "System"}
              </bdi>
            )}

            {author?.bio && (
              <bdi dir="auto" className="block text-[11px] leading-snug text-gray-500 line-clamp-2">
                {author.bio}
              </bdi>
            )}

            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
              <span className="px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: tone.wash, color: tone.accent }}>{tone.chip}</span>
              <span>·</span>
              <span>{timeAgo(msg.published_at)}</span>
            </div>
          </div>

          <button ref={closeBtn} type="button" onClick={close} aria-label="Close announcement"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex-shrink-0 transition-colors focus:outline-none focus:ring-2">
            ✕
          </button>
        </div>

        {/* ── The message ──
          * Each block reads in the direction of its OWN text, so a Dari
          * announcement is right-aligned in an otherwise English interface.
          * `dir` sits on the block, not on an inner <bdi>: bdi flows the
          * characters but leaves the block's alignment alone, which is what
          * left a Dari heading hugging the left edge above a right-aligned
          * Dari body. Title and body are judged separately, and each falls
          * back to the other when it is the one that is empty. */}
        <div className="px-4 pb-4">
          {msg.title && (
            <h2 id="broadcast-heading" dir={titleDir}
              className="text-base font-black mb-1.5"
              style={{ color: "#0A3A3E", ...arabicTextStyle(titleDir) }}>
              {msg.title}
            </h2>
          )}
          {/* Line breaks are the author's paragraphing — keep them. */}
          <div dir={bodyDir} className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "#334A4C", ...arabicTextStyle(bodyDir) }}>
            {msg.body}
          </div>
        </div>

        <div dir="ltr" className="px-4 py-3 flex items-center gap-2 flex-wrap"
          style={{ borderTop: `1px solid ${BORDER}`, background: "#FAFCFC" }}>
          {msg.link_url && (
            <button onClick={followLink}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-transform hover:scale-[1.02]"
              style={{ background: tone.accent }}>
              {/* The label is the author's words; the arrow is ours and always
                * points forward, so the two are kept from swapping places. */}
              <bdi dir="auto">{msg.link_label || "Open"}</bdi> →
            </button>
          )}
          <button onClick={close}
            className="px-4 py-2 rounded-xl text-xs font-bold border bg-white transition-colors hover:bg-gray-50"
            style={{ borderColor: BORDER, color: "#5A7A7E" }}>
            Got it
          </button>
          <span className="ml-auto text-[10px] text-gray-400">Shown once a day</span>
        </div>
      </div>
    </div>
  );
}
