import { useCallback, useEffect, useRef, useState } from "react";
import { FiPlus, FiX, FiTrash2, FiSend } from "react-icons/fi";
import Swal from "sweetalert2";
import Avatar from "../../chat/components/Avatar";
import { postsApi, POST_BACKGROUNDS, timeAgo, openComposer } from "../../api/posts";
import { useChat } from "../../chat/ChatContext";

const PHOTO_MS = 5000;

/* ════════════ full-screen story viewer ════════════
   Progress bars across the top, five seconds a photo (a video plays to its end),
   tap the right half for next and the left half for back, hold to pause.
   Runs on from one person's stories to the next person's. */
function StoryViewer({ groups, startGroup, myId, onClose, onSeen, onDeleted }) {
  const [g, setG] = useState(startGroup);
  const [s, setS] = useState(() => Math.max(0, groups[startGroup].stories.findIndex((x) => !x.seen)));
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef(null);
  // Replying: the story pauses while you type; the answer goes to your chat with them.
  const { canUseChat } = useChat();
  const [reply, setReply] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const group = groups[g];
  const story = group?.stories[s];

  const next = useCallback(() => {
    setProgress(0);
    if (s + 1 < group.stories.length) setS(s + 1);
    else if (g + 1 < groups.length) { setG(g + 1); setS(0); }
    else onClose();
  }, [s, g, group, groups.length, onClose]);
  const prev = () => {
    setProgress(0);
    if (s > 0) setS(s - 1);
    else if (g > 0) { setG(g - 1); setS(0); }
  };

  // Mark seen.
  useEffect(() => {
    if (!story || story.seen) return;
    postsApi.view(story.id).catch(() => {});
    onSeen(story.id);
  }, [story, onSeen]);

  // Timer for photos and text; videos report their own progress.
  const isVideo = story?.media?.[0]?.type === "video";
  useEffect(() => {
    if (!story || isVideo || paused || typing) return undefined;
    const started = Date.now() - progress * PHOTO_MS;
    const t = setInterval(() => {
      const pct = (Date.now() - started) / PHOTO_MS;
      if (pct >= 1) { clearInterval(t); next(); } else setProgress(pct);
    }, 50);
    return () => clearInterval(t);
    // progress is read once at (re)start so pausing resumes where it stopped
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, isVideo, paused, typing, next]);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused || typing) v.pause(); else v.play().catch(() => {});
  }, [paused, typing]);
  useEffect(() => {
    const key = (e) => {
      if (typing) return;   // arrows move the cursor, not the story
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  if (!story) return null;
  const remove = async () => {
    setPaused(true);
    const ok = await Swal.fire({ icon: "warning", title: "Delete this story?", showCancelButton: true, confirmButtonText: "Delete", confirmButtonColor: "#e11d48" });
    if (!ok.isConfirmed) { setPaused(false); return; }
    await postsApi.remove(story.id);
    onDeleted(story.id);
    onClose();
  };

  const m = story.media?.[0];
  const canReply = canUseChat && group.user.id !== myId;
  const sendReply = async (text) => {
    const body = (text ?? reply).trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await postsApi.replyToStory(story.id, body);
      setReply("");
      Swal.fire({ toast: true, position: "top", icon: "success", timer: 1600, showConfirmButton: false, title: "Sent to chat" });
    } catch (e) {
      Swal.fire({ toast: true, position: "top", icon: "error", timer: 2500, showConfirmButton: false, title: e.response?.data?.message || "Could not send." });
    } finally { setSending(false); }
  };
  return (
    <div className="fixed inset-0 z-[900] bg-black flex items-center justify-center select-none">
      <div className="relative w-full h-full sm:w-[420px] sm:h-[92vh] sm:rounded-2xl overflow-hidden bg-slate-900">
        {/* content */}
        {m ? (
          m.type === "video" ? (
            <video ref={videoRef} key={m.url} src={m.url} autoPlay playsInline className="absolute inset-0 w-full h-full object-contain"
              onTimeUpdate={(e) => setProgress(e.target.duration ? e.target.currentTime / e.target.duration : 0)}
              onEnded={next} />
          ) : (
            <img src={m.url} alt="" className="absolute inset-0 w-full h-full object-contain" />
          )
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${POST_BACKGROUNDS[story.background] || POST_BACKGROUNDS.teal} grid place-items-center px-8`}>
            <p className="text-white text-3xl font-semibold text-center leading-relaxed whitespace-pre-wrap" dir="auto" data-no-i18n>{story.body}</p>
          </div>
        )}
        {m && story.body && (
          <div className={`absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent ${canReply ? "pb-24" : "pb-8"}`}>
            <p className="text-white text-base text-center whitespace-pre-wrap" dir="auto" data-no-i18n>{story.body}</p>
          </div>
        )}

        {/* tap zones: back / hold to pause / next */}
        <div className="absolute inset-0 flex z-10"
          onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
          <button type="button" className="w-1/3 h-full" onClick={prev} aria-label="Previous" />
          <div className="w-1/3 h-full" />
          <button type="button" className="w-1/3 h-full" onClick={next} aria-label="Next" />
        </div>

        {canReply && (
          <div className="absolute inset-x-0 bottom-0 z-30 p-3 flex items-center gap-2">
            <input value={reply} onChange={(e) => setReply(e.target.value)} dir="auto"
              onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}
              onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
              placeholder={`Reply to ${group.user.name}…`}
              className="flex-1 min-w-0 rounded-full bg-black/40 border border-white/30 text-white placeholder-white/60 px-4 py-2.5 text-sm outline-none focus:border-white/70" />
            {reply.trim() ? (
              <button type="button" onClick={() => sendReply()} disabled={sending} title="Send"
                className="w-10 h-10 rounded-full bg-teal-500 hover:bg-teal-400 text-white grid place-items-center disabled:opacity-50"><FiSend /></button>
            ) : (
              ["❤️", "😂", "👏"].map((e) => (
                <button type="button" key={e} onClick={() => sendReply(e)} disabled={sending}
                  className="text-2xl leading-none transition hover:scale-125 disabled:opacity-50">{e}</button>
              ))
            )}
          </div>
        )}

        {/* progress + header */}
        <div className="absolute inset-x-0 top-0 z-20 p-3 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex gap-1">
            {group.stories.map((x, idx) => (
              <div key={x.id} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${idx < s ? 100 : idx === s ? Math.min(100, progress * 100) : 0}%` }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Avatar user={group.user} size={36} linkable={false} />
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-semibold truncate" data-no-i18n>{group.user.name}</div>
              <div className="text-white/70 text-[11px]" data-no-i18n>{timeAgo(story.created_at)}</div>
            </div>
            {(group.user.id === myId || story.can_edit) && (
              <button type="button" onClick={remove} title="Delete story"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center"><FiTrash2 /></button>
            )}
            <button type="button" onClick={onClose} title="Close"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center"><FiX className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════ the row of stories at the top of the feed ════════════ */
export default function StoriesBar({ me, canCreate, refreshKey }) {
  const [groups, setGroups] = useState([]);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    postsApi.stories().then((r) => setGroups(r.data.data || [])).catch(() => setGroups([]));
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const markSeen = useCallback((storyId) => {
    setGroups((gs) => gs.map((grp) => {
      const stories = grp.stories.map((x) => (x.id === storyId ? { ...x, seen: true } : x));
      return { ...grp, stories, all_seen: stories.every((x) => x.seen) };
    }));
  }, []);

  if (!canCreate && groups.length === 0) return null;
  const mine = groups.find((x) => x.user.id === me?.id);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {canCreate && (
          <button type="button" onClick={() => openComposer("story")} className="shrink-0 w-20 flex flex-col items-center gap-1.5">
            <span className="relative">
              <Avatar user={me} size={64} linkable={false} />
              <span className="absolute -bottom-0.5 -end-0.5 w-6 h-6 rounded-full bg-teal-600 text-white grid place-items-center ring-2 ring-white"><FiPlus className="w-4 h-4" /></span>
            </span>
            <span className="text-[11px] text-gray-600 truncate w-full text-center">{mine ? "Add story" : "Your story"}</span>
          </button>
        )}
        {groups.map((grp, idx) => (
          <button type="button" key={grp.user.id} onClick={() => setOpen(idx)} className="shrink-0 w-20 flex flex-col items-center gap-1.5">
            {/* A teal ring: something unseen. A grey ring: all seen. */}
            <span className={`rounded-full p-[3px] ${grp.all_seen ? "bg-gray-200" : "bg-gradient-to-tr from-teal-400 to-emerald-500"}`}>
              <span className="block rounded-full ring-2 ring-white"><Avatar user={grp.user} size={58} linkable={false} /></span>
            </span>
            <span className="text-[11px] text-gray-600 truncate w-full text-center" data-no-i18n>{grp.user.id === me?.id ? "You" : grp.user.name}</span>
          </button>
        ))}
      </div>
      {open !== null && groups[open] && (
        <StoryViewer groups={groups} startGroup={open} myId={me?.id} onClose={() => setOpen(null)}
          onSeen={markSeen} onDeleted={() => load()} />
      )}
    </div>
  );
}
