import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiPhone, FiPhoneOff, FiVideo, FiVideoOff, FiMic, FiMicOff, FiMinimize2, FiMaximize2, FiRefreshCw,
  FiVolume1, FiVolume2, FiUsers,
} from 'react-icons/fi';
import { isRealtimeLive } from './echo';
import { CALL_TAB, pollSignals, sendSignal } from './callSignals';
import { useChat } from './ChatContext';
import chatApi from './chatApi';
import Avatar from './components/Avatar';

/**
 * Audio and video calls — one-to-one and group — WhatsApp-style.
 *
 * NOTHING HEAVY ON THE SERVER, NOTHING RECORDED
 *   The sound and picture go browser to browser (WebRTC) and never touch the
 *   server. The server only passes the few setup messages between browsers
 *   (CallController / callSignals.js), keeps them for seconds, and works on
 *   plain shared hosting — no websocket server needed. Where one exists, the
 *   ring is also pushed through it and arrives instantly.
 *
 * ONE MODEL FOR 1:1 AND GROUP (a small mesh, ~6 people)
 *   • The caller rings everyone in the chat ("invite") and waits.
 *   • Whoever answers announces "join" to everyone.
 *   • Each person already in the call opens a connection to the newcomer and
 *     sends an offer; the newcomer answers each. So every pair is connected.
 *   • "leave" closes that person's connection; the last one out ends the call.
 *   Offers and answers carry their network candidates inside them (no
 *   trickle), so setting up a pair costs two small requests.
 *
 * Mounted once inside <ChatProvider>. The chat header starts a call with a
 * `wen:call-start` event; signals arrive as `wen:call-signal` events.
 */

const RING_SECONDS = 45;
const POLL_SETUP_MS = 1000;   // while ringing / connecting
const POLL_ACTIVE_MS = 2000;  // during the call (someone may join or leave)
const POLL_HIDDEN_MS = 15000; // an idle, hidden tab without a websocket

// STUN finds a direct path for most networks. An optional TURN server (frontend
// .env) relays media for the few networks STUN cannot cross.
const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ...(import.meta.env.VITE_TURN_URL ? [{
    urls: String(import.meta.env.VITE_TURN_URL).split(',').map((u) => u.trim()),
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  }] : []),
];

const newCallId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const fmtDuration = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const peerKey = (userId, tab) => `${userId}:${tab}`;

/* Wait until the browser has gathered its network candidates (or ~3 s), so
 * one offer/answer carries everything. */
function gathered(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { pc.removeEventListener('icegatheringstatechange', check); resolve(); };
    const check = () => { if (pc.iceGatheringState === 'complete') done(); };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(done, 3000);
  });
}

/* ── tones: generated, so there is no audio file to download ───────────────── */
function createTone() {
  let ctx = null;
  let timer = null;
  const beep = (freqs, ms) => {
    if (!ctx) return;
    const t = ctx.currentTime;
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, t + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.18 + 0.03);
      gain.gain.linearRampToValueAtTime(0, t + i * 0.18 + ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.18);
      osc.stop(t + i * 0.18 + ms / 1000 + 0.05);
    });
  };
  const start = (play, every) => {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    play();
    timer = setInterval(play, every);
  };
  return {
    ring() { this.stop(); start(() => beep([659, 784, 988], 320), 2500); },   // incoming: a soft chime
    ringback() { this.stop(); start(() => beep([440], 900), 3000); },          // caller: gentle ringback
    stop() {
      clearInterval(timer);
      timer = null;
      if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    },
  };
}

/* One remote person: their video (or avatar) and their sound. */
function PeerTile({ peer, isVideo, speakerOn, big }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && peer.stream) videoRef.current.srcObject = peer.stream;
    if (audioRef.current && peer.stream) audioRef.current.srcObject = peer.stream;
  }, [peer.stream, peer.hasVideo]);
  useEffect(() => {
    [videoRef.current, audioRef.current].forEach((el) => { if (el) el.volume = speakerOn ? 1 : 0.35; });
  }, [speakerOn, peer.stream]);
  const showVideo = isVideo && peer.hasVideo;
  return (
    <div className={`relative overflow-hidden ${big ? 'absolute inset-0' : 'rounded-2xl bg-slate-700/60 aspect-video'}`}>
      {showVideo
        ? <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
        : <audio ref={audioRef} autoPlay />}
      {!showVideo && !big && (
        <div className="absolute inset-0 grid place-items-center"><Avatar user={peer} size={64} linkable={false} /></div>
      )}
      {!big && (
        <span className="absolute bottom-2 start-2 rounded-full bg-black/45 px-2.5 py-0.5 text-xs text-white" data-no-i18n>
          {peer.name}{peer.state !== 'connected' ? ' …' : ''}
        </span>
      )}
    </div>
  );
}

export default function CallManager() {
  const { me, canUseChat, conversations } = useChat();
  const myId = me?.id;

  // null, or { id, conversationId, media, group, title, caller, peer, direction, status, reason }
  // status: calling (out, waiting) | incoming | connecting | active | ended
  const [call, setCall] = useState(null);
  const [peers, setPeers] = useState({});           // key → { userId, tab, name, avatar, stream, hasVideo, state }
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const callRef = useRef(null);
  const pcs = useRef({});                           // key → RTCPeerConnection
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const timersRef = useRef({});
  const connectedAtRef = useRef(null);
  const toneRef = useRef(createTone());
  const notificationRef = useRef(null);
  // The chat list, for a ring's group name — read from handlers, so kept in a ref.
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const patchCall = useCallback((changes) => {
    setCall((prev) => {
      const next = prev ? { ...prev, ...changes } : prev;
      callRef.current = next;
      return next;
    });
  }, []);
  const patchPeer = useCallback((key, changes) => {
    setPeers((prev) => (prev[key] || changes.userId ? { ...prev, [key]: { ...prev[key], ...changes } } : prev));
  }, []);

  const signal = useCallback((type, extra = {}) => {
    const c = callRef.current;
    if (!c) return Promise.resolve();
    return sendSignal({ conversationId: c.conversationId, callId: c.id, type, ...extra }).catch(() => {});
  }, []);

  const clearTimers = () => {
    Object.values(timersRef.current).forEach((t) => clearTimeout(t));
    timersRef.current = {};
  };

  const closePeer = useCallback((key) => {
    try { pcs.current[key]?.close(); } catch { /* ignore */ }
    delete pcs.current[key];
    setPeers((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }, []);

  /* Close everything. `say` tells the others (leave / cancel / decline). */
  const finish = useCallback((reason, { say = null, log = true, hold = 1800 } = {}) => {
    const c = callRef.current;
    if (!c || c.status === 'ended') return;
    if (say) signal(say, say === 'decline' && c.caller ? { toUserId: c.caller.id } : {});

    toneRef.current.stop();
    clearTimers();
    try { notificationRef.current?.close(); } catch { /* ignore */ }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    Object.keys(pcs.current).forEach((k) => { try { pcs.current[k].close(); } catch { /* ignore */ } });
    pcs.current = {};

    // A short note in the chat, written by the caller only, so it appears once.
    const talked = connectedAtRef.current ? Math.round((Date.now() - connectedAtRef.current) / 1000) : 0;
    connectedAtRef.current = null;
    if (log && c.direction === 'out') {
      const icon = c.media === 'video' ? '🎥' : '📞';
      const kind = `${c.group ? 'group ' : ''}${c.media === 'video' ? 'video call' : 'voice call'}`;
      const body = talked > 0
        ? `${icon} ${kind.charAt(0).toUpperCase()}${kind.slice(1)} · ${fmtDuration(talked)}`
        : `${icon} Missed ${kind}`;
      chatApi.sendMessage(c.conversationId, { body }).catch(() => {});
    }

    patchCall({ status: 'ended', reason });
    timersRef.current.close = setTimeout(() => {
      setCall(null); callRef.current = null; setPeers({});
      setMuted(false); setCameraOff(false); setMinimized(false); setSeconds(0); setSpeakerOn(false);
    }, hold);
  }, [signal, patchCall]);

  /* ── one connection per other person ───────────────────────────────────── */
  const openPeer = useCallback((from) => {
    const key = peerKey(from.id, from.tab);
    if (pcs.current[key]) return pcs.current[key];
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcs.current[key] = pc;
    const stream = new MediaStream();
    patchPeer(key, { userId: from.id, tab: from.tab, name: from.name, avatar: from.avatar, stream, hasVideo: false, state: 'connecting' });

    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => { if (!stream.getTracks().includes(t)) stream.addTrack(t); });
      patchPeer(key, { stream, hasVideo: stream.getVideoTracks().length > 0 });
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      patchPeer(key, { state });
      if (state === 'connected') {
        clearTimeout(timersRef.current[`drop-${key}`]);
        if (!connectedAtRef.current) connectedAtRef.current = Date.now();
        toneRef.current.stop();
        clearTimeout(timersRef.current.noAnswer);
        clearTimeout(timersRef.current.setup);
        patchCall({ status: 'active' });
      } else if (state === 'failed' || state === 'disconnected') {
        // Networks blip; give it a few seconds before dropping this person.
        timersRef.current[`drop-${key}`] = setTimeout(() => {
          if (pcs.current[key]?.connectionState === 'connected') return;
          closePeer(key);
          if (!Object.keys(pcs.current).length && callRef.current?.status === 'active') finish('Connection lost', { say: 'leave' });
        }, 8000);
      }
    };
    return pc;
  }, [patchPeer, patchCall, closePeer, finish]);

  const getMedia = async (media) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: media === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  /* ── signals ───────────────────────────────────────────────────────────── */
  const ringFor = useCallback((s) => {
    const conv = (conversationsRef.current || []).find((x) => x.id === s.conversation_id);
    const group = Boolean(s.payload?.group ?? conv?.type === 'group');
    const c = {
      id: s.call_id, conversationId: s.conversation_id, media: s.payload?.media || 'audio',
      group, title: s.payload?.title || conv?.title || s.from.name, caller: s.from,
      direction: 'in', status: 'incoming',
    };
    callRef.current = c;
    setCall(c);
    setMinimized(false);
    setSpeakerOn(c.media === 'video');
    toneRef.current.ring();
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        const n = new Notification(group ? c.title : s.from.name, {
          body: `${group ? `${s.from.name} · ` : ''}${c.media === 'video' ? 'Incoming video call' : 'Incoming voice call'}`,
          tag: `call-${c.id}`, requireInteraction: true,
        });
        n.onclick = () => { window.focus(); n.close(); };
        notificationRef.current = n;
      }
    } catch { /* ignore */ }
    timersRef.current.missed = setTimeout(() => finish('Missed call', { log: false }), RING_SECONDS * 1000);
  }, [finish]);

  const onSignal = useCallback(async (s) => {
    const c = callRef.current;
    if (s.type === 'invite') {
      if (c && c.id === s.call_id) return;
      if (s.created_at && Date.now() - new Date(s.created_at).getTime() > RING_SECONDS * 1000) return;
      // Already on a call: a 1:1 caller is told "busy"; a group just rings on without us.
      if (c) {
        if (!s.payload?.group) sendSignal({ conversationId: s.conversation_id, callId: s.call_id, type: 'busy', toUserId: s.from.id }).catch(() => {});
        return;
      }
      ringFor(s);
      return;
    }
    if (!c || s.call_id !== c.id) return;

    // The same person answered or declined in another tab.
    if (s.from.id === myId) {
      if (s.from.tab !== CALL_TAB && c.status === 'incoming' && (s.type === 'join' || s.type === 'decline')) {
        finish(s.type === 'join' ? 'Answered on another device' : 'Declined', { log: false });
      }
      return;
    }

    const key = peerKey(s.from.id, s.from.tab);
    const joined = ['calling', 'connecting', 'active'].includes(c.status);
    try {
      switch (s.type) {
        case 'join': {
          if (!joined) return;
          // Someone answered: connect to them and send our offer.
          toneRef.current.stop();
          clearTimeout(timersRef.current.noAnswer);
          if (c.status === 'calling') patchCall({ status: 'connecting' });
          const pc = openPeer(s.from);
          await pc.setLocalDescription(await pc.createOffer());
          await gathered(pc);
          await signal('offer', { toUserId: s.from.id, toTab: s.from.tab, payload: { sdp: pc.localDescription.toJSON() } });
          break;
        }
        case 'offer': {
          if (!joined) return;
          const pc = openPeer(s.from);
          await pc.setRemoteDescription(s.payload.sdp);
          await pc.setLocalDescription(await pc.createAnswer());
          await gathered(pc);
          await signal('answer', { toUserId: s.from.id, toTab: s.from.tab, payload: { sdp: pc.localDescription.toJSON() } });
          break;
        }
        case 'answer':
          if (pcs.current[key] && !pcs.current[key].currentRemoteDescription) await pcs.current[key].setRemoteDescription(s.payload.sdp);
          break;
        case 'decline':
          if (!c.group && c.direction === 'out' && !Object.keys(pcs.current).length) finish('Declined');
          break;
        case 'busy':
          if (!c.group && c.direction === 'out') finish('Busy on another call');
          break;
        case 'cancel':
          if (c.status === 'incoming') finish('Missed call', { log: false });
          break;
        case 'leave':
          closePeer(key);
          if (c.status === 'incoming' && s.from.id === c.caller?.id && !c.group) finish('Missed call', { log: false });
          else if (joined && !Object.keys(pcs.current).length && c.status !== 'calling') finish('Call ended');
          break;
        default:
          break;
      }
    } catch { /* a stale or out-of-order signal — the next one recovers */ }
  }, [myId, ringFor, finish, openPeer, signal, patchCall, closePeer]);

  /* ── start / answer / decline / hang up ────────────────────────────────── */
  const startCall = useCallback(async ({ conversationId, media, peer, group = false, title }) => {
    if (callRef.current) return;
    const c = {
      id: newCallId(), conversationId, media, group, title: title || peer?.name,
      caller: { id: myId, name: me?.name }, peer, direction: 'out', status: 'calling',
    };
    callRef.current = c;
    setCall(c);
    setPeers({});
    setCameraOff(false); setMuted(false); setSpeakerOn(media === 'video');
    try {
      await getMedia(media);
    } catch {
      finish(media === 'video' ? 'Camera or microphone blocked' : 'Microphone blocked', { log: false, hold: 4500 });
      return;
    }
    try {
      await sendSignal({ conversationId, callId: c.id, type: 'invite', payload: { media, group, title: c.title } });
    } catch (e) {
      finish(e?.response?.data?.message || 'Could not place the call', { log: false, hold: 6000 });
      return;
    }
    if (callRef.current?.id !== c.id) return;
    toneRef.current.ringback();
    timersRef.current.noAnswer = setTimeout(() => {
      if (!Object.keys(pcs.current).length) finish('No answer', { say: 'cancel' });
    }, RING_SECONDS * 1000);
  }, [myId, me?.name, finish]);

  const accept = async () => {
    const c = callRef.current;
    if (!c || c.status !== 'incoming') return;
    toneRef.current.stop();
    clearTimeout(timersRef.current.missed);
    try { notificationRef.current?.close(); } catch { /* ignore */ }
    patchCall({ status: 'connecting' });
    try {
      await getMedia(c.media);
    } catch {
      finish(c.media === 'video' ? 'Camera or microphone blocked' : 'Microphone blocked', { say: 'decline', log: false });
      return;
    }
    await signal('join');
    // If nothing connects, do not leave a frozen screen.
    timersRef.current.setup = setTimeout(() => {
      if (!Object.values(pcs.current).some((pc) => pc.connectionState === 'connected')) finish('Could not connect', { say: 'leave' });
    }, 30000);
  };

  const decline = () => finish('Declined', { say: 'decline', log: false });

  const hangUp = () => {
    const c = callRef.current;
    if (!c) return;
    const alone = !Object.keys(pcs.current).length;
    if (c.direction === 'out' && alone && c.status === 'calling') finish('Cancelled', { say: 'cancel' });
    else finish('Call ended', { say: 'leave' });
  };

  /* ── in-call controls ──────────────────────────────────────────────────── */
  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  };
  const toggleCamera = () => {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setCameraOff(next);
  };
  const switchCamera = async () => {
    try {
      const current = localStreamRef.current?.getVideoTracks()[0];
      const facing = current?.getSettings?.().facingMode === 'environment' ? 'user' : 'environment';
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
      const track = fresh.getVideoTracks()[0];
      await Promise.all(Object.values(pcs.current).map((pc) => pc.getSenders().find((x) => x.track?.kind === 'video')?.replaceTrack(track)));
      current?.stop();
      localStreamRef.current.removeTrack(current);
      localStreamRef.current.addTrack(track);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    } catch { /* one camera only — nothing to switch to */ }
  };

  /* ── wiring ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onStart = (e) => startCall(e.detail || {});
    const onSig = (e) => onSignal(e.detail);
    // The websocket's instant ring (where Reverb runs) becomes an ordinary invite.
    const onRing = (e) => {
      const d = e.detail || {};
      onSignal({ type: 'invite', call_id: d.call_id, conversation_id: d.conversation_id,
        from: { ...d.from, tab: null }, payload: { media: d.media }, created_at: new Date().toISOString() });
    };
    window.addEventListener('wen:call-start', onStart);
    window.addEventListener('wen:call-signal', onSig);
    window.addEventListener('wen:call-incoming', onRing);
    return () => {
      window.removeEventListener('wen:call-start', onStart);
      window.removeEventListener('wen:call-signal', onSig);
      window.removeEventListener('wen:call-incoming', onRing);
    };
  }, [startCall, onSignal]);

  // Learn where "now" is once, so the first poll of a call never skips an
  // answer that is already waiting.
  useEffect(() => { if (canUseChat) pollSignals().catch(() => {}); }, [canUseChat]);

  /* Polling: quick during a call; slow for an idle hidden tab without a
   * websocket (a visible tab is covered by the chat's own poll). */
  const inCall = Boolean(call && call.status !== 'ended');
  const activeCall = call?.status === 'active';
  useEffect(() => {
    if (!canUseChat) return undefined;
    let stop = false;
    let t = null;
    const loop = async () => {
      if (stop) return;
      const busy = Boolean(callRef.current && callRef.current.status !== 'ended');
      const idleHidden = !busy && document.hidden && !isRealtimeLive();
      if (busy || idleHidden) { try { await pollSignals(); } catch { /* next round */ } }
      if (stop) return;
      t = setTimeout(loop, busy ? (activeCall ? POLL_ACTIVE_MS : POLL_SETUP_MS) : POLL_HIDDEN_MS);
    };
    t = setTimeout(loop, inCall ? POLL_SETUP_MS : POLL_HIDDEN_MS);
    return () => { stop = true; clearTimeout(t); };
  }, [canUseChat, inCall, activeCall]);

  // Closing the tab mid-call tells the others.
  useEffect(() => {
    const bye = () => {
      const c = callRef.current;
      if (c && c.status !== 'ended') signal(c.status === 'incoming' ? 'decline' : 'leave', c.status === 'incoming' && c.caller ? { toUserId: c.caller.id } : {});
    };
    window.addEventListener('beforeunload', bye);
    return () => window.removeEventListener('beforeunload', bye);
  }, [signal]);

  // Call timer.
  useEffect(() => {
    if (!activeCall) return undefined;
    const t = setInterval(() => setSeconds(connectedAtRef.current ? Math.round((Date.now() - connectedAtRef.current) / 1000) : 0), 1000);
    return () => clearInterval(t);
  }, [activeCall]);

  // Own camera back on its <video> after the layout changes.
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
  });

  if (!canUseChat || !call) return null;

  const isVideo = call.media === 'video';
  const peerList = Object.entries(peers).map(([key, p]) => ({ key, ...p, id: p.userId }));
  const statusText = {
    calling: call.group ? 'Ringing the group…' : 'Ringing…',
    incoming: isVideo ? 'Incoming video call' : 'Incoming voice call',
    connecting: 'Connecting…',
    active: fmtDuration(seconds),
    ended: call.reason || 'Call ended',
  }[call.status];
  const headline = call.group ? call.title : (call.direction === 'in' ? call.caller?.name : call.peer?.name || call.title);
  const face = call.group ? { name: call.title } : (call.direction === 'in' ? call.caller : call.peer);

  const roundBtn = (on) => `w-14 h-14 rounded-full grid place-items-center transition ${on ? 'bg-white text-slate-800' : 'bg-white/10 hover:bg-white/20'}`;

  /* ── incoming: a calm card, top centre ─────────────────────────────────── */
  if (call.status === 'incoming') {
    return (
      <div className="fixed inset-x-0 top-4 z-[1000] flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm rounded-3xl bg-gradient-to-br from-slate-800 to-teal-900 text-white shadow-2xl ring-1 ring-white/10 p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-teal-300/30 animate-ping" aria-hidden />
              <Avatar user={face} size={56} linkable={false} group={call.group} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-lg truncate" data-no-i18n>{headline}</div>
              {call.group && <div className="text-xs text-teal-100/90 truncate" data-no-i18n>{call.caller?.name}</div>}
              <div className="text-sm text-teal-100/80 flex items-center gap-1.5">{call.group && <FiUsers />}<span>{statusText}</span></div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-around">
            <div className="flex flex-col items-center gap-1">
              <button type="button" onClick={decline} title="Decline"
                className="w-14 h-14 rounded-full bg-rose-500/90 hover:bg-rose-500 grid place-items-center shadow-lg transition"><FiPhoneOff className="w-6 h-6" /></button>
              <span className="text-[11px] text-white/70">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button type="button" onClick={accept} title="Accept"
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 grid place-items-center shadow-lg transition">
                {isVideo ? <FiVideo className="w-6 h-6" /> : <FiPhone className="w-6 h-6" />}
              </button>
              <span className="text-[11px] text-white/70">Accept</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── minimised: a small pill, so the user can keep working ─────────────── */
  if (minimized && call.status !== 'ended') {
    return (
      <div className="fixed bottom-5 end-5 z-[1000] flex items-center gap-3 rounded-full bg-slate-800/95 text-white shadow-2xl ring-1 ring-white/10 ps-2 pe-3 py-2">
        {/* sound keeps playing while minimised */}
        <div className="hidden">{peerList.map((p) => <PeerTile key={p.key} peer={p} isVideo={false} speakerOn={speakerOn} />)}</div>
        <Avatar user={face} size={36} linkable={false} group={call.group} />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate max-w-[9rem]" data-no-i18n>{headline}</div>
          <div className="text-[11px] text-teal-200" data-no-i18n={call.status === 'active' ? true : undefined}>{statusText}</div>
        </div>
        <button type="button" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
          className={`w-9 h-9 rounded-full grid place-items-center ${muted ? 'bg-white text-slate-800' : 'bg-white/10 hover:bg-white/20'}`}>{muted ? <FiMicOff /> : <FiMic />}</button>
        <button type="button" onClick={() => setSpeakerOn((v) => !v)} title={speakerOn ? 'Speaker on' : 'Speaker off'}
          className={`w-9 h-9 rounded-full grid place-items-center ${speakerOn ? 'bg-white text-slate-800' : 'bg-white/10 hover:bg-white/20'}`}>{speakerOn ? <FiVolume2 /> : <FiVolume1 />}</button>
        <button type="button" onClick={() => setMinimized(false)} title="Expand"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"><FiMaximize2 /></button>
        <button type="button" onClick={hangUp} title="End call"
          className="w-9 h-9 rounded-full bg-rose-500/90 hover:bg-rose-500 grid place-items-center"><FiPhoneOff /></button>
      </div>
    );
  }

  /* ── the call screen ───────────────────────────────────────────────────── */
  const solo = !call.group && peerList.length === 1;             // 1:1: the other person fills the screen
  const soloVideo = solo && isVideo && peerList[0].hasVideo && call.status === 'active';
  return (
    <div className="fixed inset-0 z-[1000] bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white flex flex-col">
      {solo && <PeerTile peer={peerList[0]} isVideo={isVideo} speakerOn={speakerOn} big />}

      <div className="relative z-10 flex items-center justify-between px-5 pt-5">
        <span className="text-xs text-white/60 flex items-center gap-1.5">
          {call.group && <FiUsers />}
          <span>{isVideo ? 'Video call' : 'Voice call'}</span> · 🔒 <span>Direct, not stored</span>
        </span>
        {call.status !== 'ended' && (
          <button type="button" onClick={() => setMinimized(true)} title="Minimise"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"><FiMinimize2 /></button>
        )}
      </div>

      {/* Group: a tile per person. 1:1 without video (or still ringing): a calm avatar. */}
      {!solo && peerList.length > 0 ? (
        <div className="relative z-10 flex-1 overflow-y-auto px-4 pt-4">
          <div className="text-center mb-3">
            <div className="text-lg font-semibold" data-no-i18n>{headline}</div>
            <div className="text-sm text-teal-100/80" data-no-i18n={call.status === 'active' ? true : undefined}>{statusText}</div>
          </div>
          <div className={`grid gap-3 ${peerList.length <= 1 ? 'grid-cols-1 max-w-2xl mx-auto' : peerList.length <= 4 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {peerList.map((p) => <PeerTile key={p.key} peer={p} isVideo={isVideo} speakerOn={speakerOn} />)}
          </div>
        </div>
      ) : !soloVideo ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            {(call.status === 'calling' || call.status === 'connecting') && <span className="absolute -inset-3 rounded-full bg-teal-400/20 animate-pulse" aria-hidden />}
            <Avatar user={face} size={120} linkable={false} group={call.group} />
          </div>
          <div className="text-2xl font-semibold" data-no-i18n>{headline}</div>
          <div className={`text-sm text-center max-w-sm px-6 ${call.status === 'ended' && call.reason?.length > 30 ? 'text-amber-200' : 'text-teal-100/80'}`}
            data-no-i18n={call.status === 'active' ? true : undefined}>{statusText}</div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex items-start justify-center pt-3">
          <div className="rounded-full bg-black/40 px-4 py-1.5 text-sm"><span data-no-i18n>{headline}</span> · <span data-no-i18n>{statusText}</span></div>
        </div>
      )}

      {/* Own camera, picture-in-picture. */}
      {isVideo && (
        <video ref={localVideoRef} autoPlay playsInline muted
          className={`absolute z-20 bottom-28 end-4 w-28 sm:w-40 aspect-[3/4] object-cover rounded-2xl ring-2 ring-white/20 shadow-xl bg-slate-700 ${cameraOff ? 'opacity-30' : ''}`}
          style={{ transform: 'scaleX(-1)' }} />
      )}

      <div className="relative z-30 pb-8 pt-4 flex items-center justify-center gap-4">
        {call.status !== 'ended' && (
          <>
            <button type="button" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} className={roundBtn(muted)}>
              {muted ? <FiMicOff className="w-6 h-6" /> : <FiMic className="w-6 h-6" />}
            </button>
            <button type="button" onClick={() => setSpeakerOn((v) => !v)} title={speakerOn ? 'Speaker on' : 'Speaker off'} className={roundBtn(speakerOn)}>
              {speakerOn ? <FiVolume2 className="w-6 h-6" /> : <FiVolume1 className="w-6 h-6" />}
            </button>
            {isVideo && (
              <button type="button" onClick={toggleCamera} title={cameraOff ? 'Turn camera on' : 'Turn camera off'} className={roundBtn(cameraOff)}>
                {cameraOff ? <FiVideoOff className="w-6 h-6" /> : <FiVideo className="w-6 h-6" />}
              </button>
            )}
            {isVideo && (
              <button type="button" onClick={switchCamera} title="Switch camera" className={roundBtn(false)}>
                <FiRefreshCw className="w-6 h-6" />
              </button>
            )}
            <button type="button" onClick={hangUp} title="End call"
              className="w-16 h-16 rounded-full bg-rose-500/90 hover:bg-rose-500 grid place-items-center shadow-lg transition"><FiPhoneOff className="w-7 h-7" /></button>
          </>
        )}
      </div>
    </div>
  );
}
