import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiPhone, FiPhoneOff, FiVideo, FiVideoOff, FiMic, FiMicOff, FiMinimize2, FiMaximize2, FiRefreshCw,
  FiVolume1, FiVolume2,
} from 'react-icons/fi';
import { post } from '../api/axios';
import { getEcho, ensureEcho } from './echo';
import { useChat } from './ChatContext';
import chatApi from './chatApi';
import Avatar from './components/Avatar';

/**
 * Audio and video calls between two chat users — WhatsApp-style.
 *
 * WHY IT IS LIGHT ON THE SERVER
 *   • The sound and picture go browser-to-browser (WebRTC). They never pass
 *     through PHP or Reverb.
 *   • Ringing is ONE request: POST /chat/conversations/{id}/call, which pushes
 *     "X is calling" onto the callee's chat.user.{id} channel — the one every
 *     signed-in tab already listens on, so the call rings on any page.
 *   • Everything after that (answer, decline, the WebRTC offer/answer and the
 *     network candidates) is a Reverb client event ("whisper") on
 *     chat.call.{conversation}, browser to browser. PHP is not involved.
 *
 * Reverb drops any frame over 10 KB, and a video offer can come close, so
 * large signals are sent in chunks and put back together on arrival.
 *
 * Mounted once inside <ChatProvider>. The chat header starts a call with a
 * `wen:call-start` window event; ChatContext forwards the ring as
 * `wen:call-incoming`.
 */

const TAB_ID = Math.random().toString(36).slice(2);
const CHUNK = 6000;
const RING_SECONDS = 40;

// STUN finds a direct path for most networks. A TURN server (set in the
// frontend .env) relays the media for the few networks STUN cannot cross.
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
  return {
    // A soft three-note chime for an incoming call, every 2.5 s.
    ring() {
      this.stop();
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
      const play = () => beep([659, 784, 988], 320);
      play();
      timer = setInterval(play, 2500);
    },
    // The caller hears a gentle ringback tone while it rings.
    ringback() {
      this.stop();
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
      const play = () => beep([440], 900);
      play();
      timer = setInterval(play, 3000);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    },
  };
}

export default function CallManager() {
  const { me, canUseChat } = useChat();
  const myId = me?.id;

  // null, or { id, conversationId, media, peer, direction, status, reason }
  // status: calling → ringing → connecting → connected → ended   (outgoing)
  //         incoming → connecting → connected → ended              (incoming)
  const [call, setCall] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  // Speaker: loud (speakerphone) or quiet (held to the ear). A web page cannot
  // pick the phone's earpiece itself, so this sets how loud the other person
  // plays — and on computers with several outputs, which one.
  const [speakerOn, setSpeakerOn] = useState(false);

  const callRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const channelRef = useRef(null);
  const pendingIceRef = useRef([]);
  const chunksRef = useRef({});
  const timersRef = useRef({});
  const connectedAtRef = useRef(null);
  const toneRef = useRef(createTone());
  const notificationRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const patch = useCallback((changes) => {
    setCall((prev) => {
      const next = prev ? { ...prev, ...changes } : prev;
      callRef.current = next;
      return next;
    });
  }, []);

  /* ── signalling over the call channel ─────────────────────────────────── */
  const send = useCallback((type, data = {}) => {
    const ch = channelRef.current;
    const c = callRef.current;
    if (!ch || !c) return;
    const text = JSON.stringify({ t: type, call_id: c.id, from: myId, tab: TAB_ID, ...data });
    try {
      if (text.length <= CHUNK) {
        ch.whisper('call', { m: text });
      } else {
        const id = Math.random().toString(36).slice(2);
        const n = Math.ceil(text.length / CHUNK);
        for (let i = 0; i < n; i++) ch.whisper('call', { k: id, i, n, p: text.slice(i * CHUNK, (i + 1) * CHUNK) });
      }
    } catch { /* socket gone — the connection-state watcher ends the call */ }
  }, [myId]);

  const leaveChannel = useCallback(() => {
    const c = callRef.current;
    const echo = getEcho();
    if (c && echo) { try { echo.leave(`chat.call.${c.conversationId}`); } catch { /* ignore */ } }
    channelRef.current = null;
  }, []);

  const clearTimers = () => {
    Object.values(timersRef.current).forEach((t) => clearTimeout(t));
    timersRef.current = {};
  };

  /* Close everything. `reason` is shown for a moment; `signal` tells the other
   * side (end / cancel) unless it was they who ended it. */
  const finish = useCallback((reason, { signal = null, log = true, hold = 1800 } = {}) => {
    const c = callRef.current;
    if (!c || c.status === 'ended') return;
    if (signal) send(signal);

    toneRef.current.stop();
    clearTimers();
    try { notificationRef.current?.close(); } catch { /* ignore */ }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    try { pcRef.current?.close(); } catch { /* ignore */ }
    pcRef.current = null;
    pendingIceRef.current = [];
    chunksRef.current = {};
    leaveChannel();

    // A short note in the chat — written by the caller only, so it appears once.
    const talked = connectedAtRef.current ? Math.round((Date.now() - connectedAtRef.current) / 1000) : 0;
    connectedAtRef.current = null;
    if (log && c.direction === 'out') {
      const kind = c.media === 'video' ? 'video call' : 'voice call';
      const icon = c.media === 'video' ? '🎥' : '📞';
      const body = talked > 0 ? `${icon} ${kind === 'video call' ? 'Video call' : 'Voice call'} · ${fmtDuration(talked)}` : `${icon} Missed ${kind}`;
      chatApi.sendMessage(c.conversationId, { body }).catch(() => {});
    }

    patch({ status: 'ended', reason });
    timersRef.current.close = setTimeout(() => {
      setCall(null); callRef.current = null;
      setMuted(false); setCameraOff(false); setMinimized(false); setSeconds(0); setHasRemoteVideo(false); setSpeakerOn(false);
    }, hold);
  }, [send, leaveChannel, patch]);

  /* ── WebRTC ────────────────────────────────────────────────────────────── */
  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    remoteStreamRef.current = new MediaStream();

    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    pc.onicecandidate = (e) => { if (e.candidate) send('ice', { c: e.candidate.toJSON() }); };
    pc.ontrack = (e) => {
      const remote = remoteStreamRef.current;
      e.streams[0]?.getTracks().forEach((t) => { if (!remote.getTracks().includes(t)) remote.addTrack(t); });
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote;
      setHasRemoteVideo(remote.getVideoTracks().length > 0);
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        clearTimeout(timersRef.current.drop);
        if (!connectedAtRef.current) connectedAtRef.current = Date.now();
        toneRef.current.stop();
        patch({ status: 'connected' });
      } else if (state === 'failed') {
        finish('Connection lost', { signal: 'end' });
      } else if (state === 'disconnected') {
        // Networks blip; give it a few seconds before giving up.
        timersRef.current.drop = setTimeout(() => {
          if (pcRef.current?.connectionState !== 'connected') finish('Connection lost', { signal: 'end' });
        }, 8000);
      }
    };
    return pc;
  }, [send, patch, finish]);

  const flushIce = async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    for (const c of pendingIceRef.current.splice(0)) {
      try { await pc.addIceCandidate(c); } catch { /* stale candidate */ }
    }
  };

  const getMedia = async (media) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: media === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  /* ── incoming signals ──────────────────────────────────────────────────── */
  const handleSignal = useCallback(async (msg) => {
    const c = callRef.current;
    if (!c || msg.call_id !== c.id) return;

    // The same person answered or declined on another tab/device.
    if (msg.from === myId) {
      if (msg.tab !== TAB_ID && c.status === 'incoming' && (msg.t === 'accept' || msg.t === 'decline')) {
        finish(msg.t === 'accept' ? 'Answered on another device' : 'Declined', { log: false });
      }
      return;
    }

    const pc = pcRef.current;
    switch (msg.t) {
      case 'accept':
        if (c.direction !== 'out' || c.status === 'connecting' || c.status === 'connected') return;
        toneRef.current.stop();
        patch({ status: 'connecting' });
        clearTimeout(timersRef.current.noAnswer);
        {
          const peer = createPeer();
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          send('offer', { sdp: peer.localDescription.toJSON() });
        }
        break;
      case 'offer':
        if (!pc) return;
        await pc.setRemoteDescription(msg.sdp);
        await flushIce();
        {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send('answer', { sdp: pc.localDescription.toJSON() });
        }
        break;
      case 'answer':
        if (!pc) return;
        await pc.setRemoteDescription(msg.sdp);
        await flushIce();
        break;
      case 'ice':
        if (pc?.remoteDescription) { try { await pc.addIceCandidate(msg.c); } catch { /* ignore */ } }
        else pendingIceRef.current.push(msg.c);
        break;
      case 'decline': finish('Declined'); break;
      case 'busy': finish('Busy on another call'); break;
      case 'cancel': finish('Missed call', { log: false }); break;
      case 'end': finish('Call ended'); break;
      default: break;
    }
  }, [myId, patch, createPeer, send, finish]);

  // Whispers arrive whole or in chunks; put chunks back together.
  const onWhisper = useCallback((payload) => {
    let text = payload?.m;
    if (!text && payload?.k) {
      const bucket = (chunksRef.current[payload.k] ||= []);
      bucket[payload.i] = payload.p;
      if (bucket.filter(Boolean).length < payload.n) return;
      text = bucket.join('');
      delete chunksRef.current[payload.k];
    }
    if (!text) return;
    try { handleSignal(JSON.parse(text)); } catch { /* malformed — ignore */ }
  }, [handleSignal]);

  const joinChannel = useCallback(async (conversationId) => {
    const echo = getEcho() || await ensureEcho();
    if (!echo) throw new Error('Live connection is offline — calls need the live chat server.');
    // A socket that is still connecting (or retrying) would swallow every
    // signal; wait briefly for it, then say so instead of ringing into nothing.
    const conn = echo.connector?.pusher?.connection;
    if (conn && conn.state !== 'connected') {
      await new Promise((resolve) => {
        const t = setTimeout(resolve, 4000);
        conn.bind('connected', () => { clearTimeout(t); resolve(); });
      });
      if (conn.state !== 'connected') throw new Error('Live connection is offline — calls need the live chat server.');
    }
    const ch = echo.private(`chat.call.${conversationId}`);
    ch.listenForWhisper('call', (p) => onWhisper(p));
    channelRef.current = ch;
    // Wait until the subscription is confirmed, so nothing we send is lost.
    await new Promise((resolve) => {
      let done = false;
      const ok = () => { if (!done) { done = true; resolve(); } };
      try { ch.subscribed(ok); } catch { /* older Echo */ }
      setTimeout(ok, 3000);
    });
    return ch;
  }, [onWhisper]);

  /* ── start a call (from the chat header) ───────────────────────────────── */
  const startCall = useCallback(async ({ conversationId, media, peer }) => {
    if (callRef.current) return;
    const c = { id: newCallId(), conversationId, media, peer, direction: 'out', status: 'calling' };
    callRef.current = c;
    setCall(c);
    setCameraOff(false); setMuted(false); setSpeakerOn(media === 'video');
    try {
      await getMedia(media);
    } catch {
      finish(media === 'video' ? 'Camera or microphone blocked' : 'Microphone blocked', { log: false, hold: 4500 });
      return;
    }
    try {
      await joinChannel(conversationId);
      await post(`/chat/conversations/${conversationId}/call`, { call_id: c.id, media });
    } catch (e) {
      // Say WHY — "the call server is not running" is something an admin can fix.
      finish(e?.response?.data?.message || e?.message || 'Could not place the call', { log: false, hold: 6000 });
      return;
    }
    if (callRef.current?.id !== c.id) return;
    patch({ status: 'ringing' });
    toneRef.current.ringback();
    timersRef.current.noAnswer = setTimeout(() => finish('No answer', { signal: 'cancel' }), RING_SECONDS * 1000);
  }, [finish, joinChannel, patch]);

  /* ── a call comes in ───────────────────────────────────────────────────── */
  const onIncoming = useCallback(async (detail) => {
    if (!detail?.call_id || detail.from?.id === myId) return;
    if (detail.expires_at && new Date(detail.expires_at) < new Date()) return;

    // Already on a call: tell the caller we are busy, without disturbing ours.
    if (callRef.current) {
      try {
        const echo = getEcho();
        const ch = echo?.private(`chat.call.${detail.conversation_id}`);
        setTimeout(() => {
          try { ch?.whisper('call', { m: JSON.stringify({ t: 'busy', call_id: detail.call_id, from: myId, tab: TAB_ID }) }); } catch { /* ignore */ }
          if (callRef.current?.conversationId !== detail.conversation_id) {
            setTimeout(() => { try { echo?.leave(`chat.call.${detail.conversation_id}`); } catch { /* ignore */ } }, 1500);
          }
        }, 1200);
      } catch { /* ignore */ }
      return;
    }

    const c = {
      id: detail.call_id, conversationId: detail.conversation_id, media: detail.media,
      peer: detail.from, direction: 'in', status: 'incoming',
    };
    callRef.current = c;
    setCall(c);
    setMinimized(false);
    setSpeakerOn(detail.media === 'video');
    toneRef.current.ring();
    joinChannel(detail.conversation_id).catch(() => {});

    // On another tab or window: a system notification too.
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        const n = new Notification(detail.from?.name || 'Incoming call', {
          body: detail.media === 'video' ? 'Incoming video call' : 'Incoming voice call',
          tag: `call-${detail.call_id}`,
          requireInteraction: true,
        });
        n.onclick = () => { window.focus(); n.close(); };
        notificationRef.current = n;
      }
    } catch { /* ignore */ }

    const until = detail.expires_at ? new Date(detail.expires_at) - Date.now() : RING_SECONDS * 1000;
    timersRef.current.missed = setTimeout(() => finish('Missed call', { log: false }), Math.max(5000, until));
  }, [myId, joinChannel, finish]);

  const accept = async () => {
    const c = callRef.current;
    if (!c || c.status !== 'incoming') return;
    toneRef.current.stop();
    clearTimeout(timersRef.current.missed);
    try { notificationRef.current?.close(); } catch { /* ignore */ }
    patch({ status: 'connecting' });
    try {
      await getMedia(c.media);
    } catch {
      finish(c.media === 'video' ? 'Camera or microphone blocked' : 'Microphone blocked', { signal: 'decline', log: false });
      return;
    }
    createPeer();
    send('accept');
    // If the media never connects, do not leave a frozen screen.
    timersRef.current.drop = setTimeout(() => {
      if (pcRef.current?.connectionState !== 'connected') finish('Could not connect', { signal: 'end' });
    }, 30000);
  };

  const decline = () => finish('Declined', { signal: 'decline', log: false });

  const hangUp = () => {
    const c = callRef.current;
    if (!c) return;
    if (c.direction === 'out' && (c.status === 'calling' || c.status === 'ringing')) finish('Cancelled', { signal: 'cancel' });
    else finish('Call ended', { signal: 'end' });
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
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video');
      await sender?.replaceTrack(track);
      current?.stop();
      localStreamRef.current.removeTrack(current);
      localStreamRef.current.addTrack(track);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    } catch { /* single camera — nothing to switch to */ }
  };

  /* ── wiring ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onStart = (e) => startCall(e.detail || {});
    const onRing = (e) => onIncoming(e.detail || {});
    window.addEventListener('wen:call-start', onStart);
    window.addEventListener('wen:call-incoming', onRing);
    return () => {
      window.removeEventListener('wen:call-start', onStart);
      window.removeEventListener('wen:call-incoming', onRing);
    };
  }, [startCall, onIncoming]);

  // Closing the tab mid-call hangs up properly on the other side.
  useEffect(() => {
    const bye = () => { if (callRef.current && callRef.current.status !== 'ended') send(callRef.current.status === 'incoming' ? 'decline' : 'end'); };
    window.addEventListener('beforeunload', bye);
    return () => window.removeEventListener('beforeunload', bye);
  }, [send]);

  // Call timer.
  useEffect(() => {
    if (call?.status !== 'connected') return undefined;
    const t = setInterval(() => setSeconds(connectedAtRef.current ? Math.round((Date.now() - connectedAtRef.current) / 1000) : 0), 1000);
    return () => clearInterval(t);
  }, [call?.status]);

  // Speaker on: full volume, and the speaker output where the browser lets us
  // choose (setSinkId — desktop Chrome/Edge). Off: a quiet, in-ear level.
  useEffect(() => {
    const volume = speakerOn ? 1 : 0.35;
    [remoteAudioRef.current, remoteVideoRef.current].forEach((el) => { if (el) el.volume = volume; });
    if (!remoteAudioRef.current?.setSinkId || !navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const outs = devices.filter((d) => d.kind === 'audiooutput');
      const speaker = outs.find((d) => /speaker/i.test(d.label)) || outs.find((d) => d.deviceId === 'default');
      const quiet = outs.find((d) => /headset|headphone|earpiece|communications/i.test(d.label)) || speaker;
      const target = speakerOn ? speaker : quiet;
      if (target) [remoteAudioRef.current, remoteVideoRef.current].forEach((el) => el?.setSinkId?.(target.deviceId).catch(() => {}));
    }).catch(() => {});
  });

  // Re-attach streams when the layout changes (minimise / expand).
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    if (remoteVideoRef.current && remoteStreamRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    if (remoteAudioRef.current && remoteStreamRef.current) remoteAudioRef.current.srcObject = remoteStreamRef.current;
  });

  if (!canUseChat || !call) return null;

  const isVideo = call.media === 'video';
  const statusText = {
    calling: 'Calling…',
    ringing: 'Ringing…',
    incoming: isVideo ? 'Incoming video call' : 'Incoming voice call',
    connecting: 'Connecting…',
    connected: fmtDuration(seconds),
    ended: call.reason || 'Call ended',
  }[call.status];

  /* ── incoming: a calm card, top centre ─────────────────────────────────── */
  if (call.status === 'incoming') {
    return (
      <div className="fixed inset-x-0 top-4 z-[1000] flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm rounded-3xl bg-gradient-to-br from-slate-800 to-teal-900 text-white shadow-2xl ring-1 ring-white/10 p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-teal-300/30 animate-ping" aria-hidden />
              <Avatar user={call.peer} size={56} linkable={false} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-lg truncate" data-no-i18n>{call.peer?.name}</div>
              <div className="text-sm text-teal-100/80">{statusText}</div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-around">
            <div className="flex flex-col items-center gap-1">
              <button type="button" onClick={decline} title="Decline"
                className="w-14 h-14 rounded-full bg-rose-500/90 hover:bg-rose-500 grid place-items-center shadow-lg transition">
                <FiPhoneOff className="w-6 h-6" />
              </button>
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
        <audio ref={remoteAudioRef} autoPlay />
        <Avatar user={call.peer} size={36} linkable={false} />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate max-w-[9rem]" data-no-i18n>{call.peer?.name}</div>
          <div className="text-[11px] text-teal-200" data-no-i18n={call.status === 'connected' ? true : undefined}>{statusText}</div>
        </div>
        <button type="button" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
          className={`w-9 h-9 rounded-full grid place-items-center ${muted ? 'bg-white text-slate-800' : 'bg-white/10 hover:bg-white/20'}`}>
          {muted ? <FiMicOff /> : <FiMic />}
        </button>
        <button type="button" onClick={() => setSpeakerOn((v) => !v)} title={speakerOn ? 'Speaker on' : 'Speaker off'}
          className={`w-9 h-9 rounded-full grid place-items-center ${speakerOn ? 'bg-white text-slate-800' : 'bg-white/10 hover:bg-white/20'}`}>
          {speakerOn ? <FiVolume2 /> : <FiVolume1 />}
        </button>
        <button type="button" onClick={() => setMinimized(false)} title="Expand"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"><FiMaximize2 /></button>
        <button type="button" onClick={hangUp} title="End call"
          className="w-9 h-9 rounded-full bg-rose-500/90 hover:bg-rose-500 grid place-items-center"><FiPhoneOff /></button>
      </div>
    );
  }

  /* ── the call screen ───────────────────────────────────────────────────── */
  const showRemoteVideo = isVideo && hasRemoteVideo && call.status === 'connected';
  return (
    <div className="fixed inset-0 z-[1000] bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white flex flex-col">
      {/* Remote video fills the screen; for voice calls a calm avatar instead. */}
      <video ref={remoteVideoRef} autoPlay playsInline
        className={`absolute inset-0 w-full h-full object-cover ${showRemoteVideo ? '' : 'hidden'}`} />
      {!isVideo && <audio ref={remoteAudioRef} autoPlay />}

      <div className="relative z-10 flex items-center justify-between px-5 pt-5">
        <span className="text-xs text-white/60">{isVideo ? 'Video call' : 'Voice call'} · 🔒 <span>Direct, not stored</span></span>
        {call.status !== 'ended' && (
          <button type="button" onClick={() => setMinimized(true)} title="Minimise"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"><FiMinimize2 /></button>
        )}
      </div>

      {!showRemoteVideo && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            {(call.status === 'calling' || call.status === 'ringing') && (
              <span className="absolute -inset-3 rounded-full bg-teal-400/20 animate-pulse" aria-hidden />
            )}
            <Avatar user={call.peer} size={120} linkable={false} />
          </div>
          <div className="text-2xl font-semibold" data-no-i18n>{call.peer?.name}</div>
          <div className={`text-sm text-center max-w-sm px-6 ${call.status === 'ended' && call.reason?.length > 30 ? 'text-amber-200' : 'text-teal-100/80'}`}
            data-no-i18n={call.status === 'connected' ? true : undefined}>{statusText}</div>
        </div>
      )}
      {showRemoteVideo && (
        <div className="relative z-10 flex-1 flex items-start justify-center pt-3">
          <div className="rounded-full bg-black/40 px-4 py-1.5 text-sm">
            <span data-no-i18n>{call.peer?.name}</span> · <span data-no-i18n>{statusText}</span>
          </div>
        </div>
      )}

      {/* Own camera, picture-in-picture. */}
      {isVideo && (
        <video ref={localVideoRef} autoPlay playsInline muted
          className={`absolute z-20 bottom-28 end-4 w-28 sm:w-40 aspect-[3/4] object-cover rounded-2xl ring-2 ring-white/20 shadow-xl bg-slate-700 ${cameraOff ? 'opacity-30' : ''}`}
          style={{ transform: 'scaleX(-1)' }} />
      )}

      {/* Controls */}
      <div className="relative z-30 pb-8 pt-4 flex items-center justify-center gap-4">
        {call.status !== 'ended' && (
          <>
            <button type="button" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
              className={`w-14 h-14 rounded-full grid place-items-center transition ${muted ? 'bg-white text-slate-800' : 'bg-white/10 hover:bg-white/20'}`}>
              {muted ? <FiMicOff className="w-6 h-6" /> : <FiMic className="w-6 h-6" />}
            </button>
            <button type="button" onClick={() => setSpeakerOn((v) => !v)} title={speakerOn ? 'Speaker on' : 'Speaker off'}
              className={`w-14 h-14 rounded-full grid place-items-center transition ${speakerOn ? 'bg-white text-slate-800' : 'bg-white/10 hover:bg-white/20'}`}>
              {speakerOn ? <FiVolume2 className="w-6 h-6" /> : <FiVolume1 className="w-6 h-6" />}
            </button>
            {isVideo && (
              <button type="button" onClick={toggleCamera} title={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                className={`w-14 h-14 rounded-full grid place-items-center transition ${cameraOff ? 'bg-white text-slate-800' : 'bg-white/10 hover:bg-white/20'}`}>
                {cameraOff ? <FiVideoOff className="w-6 h-6" /> : <FiVideo className="w-6 h-6" />}
              </button>
            )}
            {isVideo && (
              <button type="button" onClick={switchCamera} title="Switch camera"
                className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center transition">
                <FiRefreshCw className="w-6 h-6" />
              </button>
            )}
            <button type="button" onClick={hangUp} title="End call"
              className="w-16 h-16 rounded-full bg-rose-500/90 hover:bg-rose-500 grid place-items-center shadow-lg transition">
              <FiPhoneOff className="w-7 h-7" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
