/* eslint-disable react-refresh/only-export-components */
// This module intentionally co-locates the provider component, the useChat hook
// and a few pure helpers — a standard React context file shape.
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useAuth } from '../admin/context/AuthContext';
import { chatApi } from './chatApi';
import { getEcho, disconnectEcho, isRealtimeLive } from './echo';
import { API_BASE_URL } from '../api/axios';

const ChatContext = createContext(null);
const ORIGIN = (API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');

// A short two-note WhatsApp-style chime, synthesised (no audio asset shipped).
let _audioCtx = null;
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    _audioCtx = _audioCtx || new Ctx();
    const ctx = _audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const tone = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    tone(880, 0, 0.14);
    tone(1175, 0.16, 0.2);
  } catch { /* ignore */ }
}

export function ChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const myId = user?.id;

  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [onlineIds, setOnlineIds] = useState(() => new Set());
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingPeers, setTypingPeers] = useState({}); // { conversationId: { userId: name } }
  const [soundEnabled, setSoundEnabled] = useState(true);

  const activeChannelRef = useRef(null);   // Echo channel for the open conversation
  const activeIdRef = useRef(null);        // latest activeId (for event handlers)
  const openRef = useRef(false);
  const typingTimersRef = useRef({});

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { openRef.current = open; }, [open]);

  // ── Bootstrapping: settings + conversation list ────────────────────────────
  const refreshConversations = useCallback(async (params = {}) => {
    try {
      const res = await chatApi.listConversations(params);
      setConversations(res.data?.data || []);
      if (typeof res.data?.unread_total === 'number') setUnreadTotal(res.data.unread_total);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshConversations();
    chatApi.getSettings()
      .then((r) => setSoundEnabled(r.data?.data?.sound_enabled ?? true))
      .catch(() => {});
  }, [isAuthenticated, refreshConversations]);

  // ── Presence: keep last_seen fresh + join the presence roster ──────────────
  useEffect(() => {
    if (!isAuthenticated || !myId) return;

    chatApi.presenceOnline().catch(() => {});

    const echo = getEcho();
    if (echo) {
      echo.join('chat')
        .here((members) => setOnlineIds(new Set(members.map((m) => m.id))))
        .joining((m) => setOnlineIds((prev) => new Set(prev).add(m.id)))
        .leaving((m) => setOnlineIds((prev) => {
          const next = new Set(prev); next.delete(m.id); return next;
        }))
        .error(() => {});
    }

    const onVisible = () => {
      if (document.hidden) {
        chatApi.presenceOffline().catch(() => {});
      } else {
        chatApi.presenceOnline().catch(() => {});
      }
    };
    // Fire even as the page tears down (keepalive so the request survives unload).
    const onLeave = () => {
      try {
        fetch(`${ORIGIN}/api/chat/presence/offline`, {
          method: 'POST',
          keepalive: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            Accept: 'application/json',
          },
        });
      } catch { /* ignore */ }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onLeave);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onLeave);
      try { echo?.leave('chat'); } catch { /* ignore */ }
    };
  }, [isAuthenticated, myId]);

  // ── Personal channel: new-message notifications across all conversations ────
  useEffect(() => {
    if (!isAuthenticated || !myId) return;
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(`chat.user.${myId}`);
    channel.listen('.message.new', (payload) => {
      const { message, conversation_id, unread_total } = payload;
      setUnreadTotal(unread_total ?? 0);

      const isActiveOpen = openRef.current && activeIdRef.current === conversation_id;

      // Acknowledge delivery immediately (drives the sender's double tick).
      chatApi.markDelivered(conversation_id).catch(() => {});

      // Bump the conversation in the sidebar list (and its unread count). If
      // the conversation isn't loaded yet (someone messaged us for the first
      // time), pull a fresh list so it appears instantly.
      setConversations((prev) => {
        if (!prev.some((c) => c.id === conversation_id)) {
          refreshConversations();
          return prev;
        }
        return bumpConversation(prev, conversation_id, message, isActiveOpen ? 0 : payload.conversation_unread);
      });

      if (isActiveOpen) {
        // The open thread renders it via the conversation channel; just keep it read.
        chatApi.markRead(conversation_id).catch(() => {});
      } else {
        const muted = conversations.find((c) => c.id === conversation_id)?.is_muted;
        if (!muted) {
          if (soundEnabled) playChime();
          maybeNotify(message);
        }
      }
    });

    return () => {
      try { echo.leave(`chat.user.${myId}`); } catch { /* ignore */ }
    };
    // `conversations`/`soundEnabled` are read via closures that are cheap to
    // rebind; re-subscribing on myId change only is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, myId, soundEnabled]);

  // ── Active conversation channel: live thread + receipts + typing ───────────
  useEffect(() => {
    const echo = getEcho();
    if (!echo || !activeId) return;

    const channel = echo.private(`chat.conversation.${activeId}`);
    activeChannelRef.current = channel;

    channel.listen('.message.sent', ({ message }) => {
      if (message.conversation_id !== activeIdRef.current) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      // We're looking at it — mark read right away.
      chatApi.markRead(message.conversation_id).catch(() => {});
    });

    channel.listen('.message.updated', ({ message }) => {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    });

    channel.listen('.messages.read', ({ reader_id, read_at }) => {
      if (reader_id === myId) return;
      setMessages((prev) => prev.map((m) => (
        m.sender_id === myId && !m.seen_at ? { ...m, seen_at: read_at, delivered_at: m.delivered_at || read_at } : m
      )));
    });

    channel.listen('.messages.delivered', ({ recipient_id, delivered_at }) => {
      if (recipient_id === myId) return;
      setMessages((prev) => prev.map((m) => (
        m.sender_id === myId && !m.delivered_at ? { ...m, delivered_at } : m
      )));
    });

    channel.listenForWhisper('typing', ({ user_id, name, typing }) => {
      if (user_id === myId) return;
      setTypingPeers((prev) => {
        const forConv = { ...(prev[activeId] || {}) };
        if (typing) forConv[user_id] = name; else delete forConv[user_id];
        return { ...prev, [activeId]: forConv };
      });
      // Auto-clear a stuck "typing…" after 4s of silence.
      clearTimeout(typingTimersRef.current[user_id]);
      if (typing) {
        typingTimersRef.current[user_id] = setTimeout(() => {
          setTypingPeers((prev) => {
            const forConv = { ...(prev[activeId] || {}) };
            delete forConv[user_id];
            return { ...prev, [activeId]: forConv };
          });
        }, 4000);
      }
    });

    return () => {
      try { echo.leave(`chat.conversation.${activeId}`); } catch { /* ignore */ }
      activeChannelRef.current = null;
    };
  }, [activeId, myId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openConversation = useCallback(async (conversation) => {
    const id = typeof conversation === 'object' ? conversation.id : conversation;
    setActiveId(id);
    setMessages([]);
    setHasMore(false);
    setLoadingMessages(true);
    try {
      const res = await chatApi.getMessages(id, { limit: 30 });
      const list = (res.data?.data || []).slice().reverse(); // oldest → newest
      setMessages(list);
      setHasMore(Boolean(res.data?.has_more));
      chatApi.markRead(id).then((res) => {
        if (typeof res?.data?.unread_total === 'number') setUnreadTotal(res.data.unread_total);
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
      }).catch(() => {});
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadOlder = useCallback(async () => {
    if (!activeId || !messages.length || !hasMore) return;
    const oldest = messages[0];
    const res = await chatApi.getMessages(activeId, { before_id: oldest.id, limit: 30 });
    const older = (res.data?.data || []).slice().reverse();
    setMessages((prev) => [...older, ...prev]);
    setHasMore(Boolean(res.data?.has_more));
  }, [activeId, messages, hasMore]);

  const startChatWith = useCallback(async (userObj) => {
    const res = await chatApi.startConversation(userObj.id);
    const conv = res.data?.data;
    if (!conv) return;
    setConversations((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
    await openConversation(conv);
    return conv;
  }, [openConversation]);

  const sendMessage = useCallback(async ({ body, attachments = [], replyTo }) => {
    if (!activeId) return;
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId, conversation_id: activeId, sender_id: myId, body,
      type: attachments.length ? (attachments[0].type?.startsWith('image/') ? 'image' : 'file') : 'text',
      created_at: new Date().toISOString(), _pending: true,
      reply_to_id: replyTo?.id || null,
      reply_to: replyTo ? { id: replyTo.id, sender_id: replyTo.sender_id, body: replyTo.body, type: replyTo.type } : null,
      attachments: [],
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      let payload;
      if (attachments.length) {
        payload = new FormData();
        if (body) payload.append('body', body);
        if (replyTo?.id) payload.append('reply_to_id', replyTo.id);
        attachments.forEach((f) => payload.append('attachments[]', f));
      } else {
        payload = { body };
        if (replyTo?.id) payload.reply_to_id = replyTo.id;
      }
      const res = await chatApi.sendMessage(activeId, payload);
      const saved = res.data?.data;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      setConversations((prev) => bumpConversation(prev, activeId, saved, 0));
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, _failed: true, _pending: false } : m)));
      throw e;
    }
  }, [activeId, myId]);

  const sendTyping = useCallback((typing) => {
    const ch = activeChannelRef.current;
    if (!ch) return;
    try { ch.whisper('typing', { user_id: myId, name: user?.name, typing }); } catch { /* ignore */ }
  }, [myId, user?.name]);

  const editMessage = useCallback(async (messageId, body) => {
    const res = await chatApi.editMessage(messageId, body);
    const saved = res.data?.data;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? saved : m)));
  }, []);

  const deleteMessage = useCallback(async (messageId) => {
    await chatApi.deleteMessage(messageId);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_deleted: true, body: null } : m)));
  }, []);

  const setPinned = useCallback(async (id, pinned) => {
    await chatApi.pin(id, pinned);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, is_pinned: pinned } : c)));
  }, []);

  const setArchived = useCallback(async (id, archived) => {
    await chatApi.archive(id, archived);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const setMuted = useCallback(async (id, muted) => {
    await chatApi.mute(id, muted);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, is_muted: muted } : c)));
  }, []);

  /**
   * Polling fallback — the guarantee behind the WebSocket.
   *
   * Reverb is the fast path, but it is not always there: the deployed build
   * may carry a Reverb host the visitor's browser cannot reach, the daemon
   * may be down, or a proxy may block the upgrade. In every one of those
   * cases the socket fails quietly and messages appear only on refresh —
   * which is exactly the bug this exists to remove.
   *
   * So: while the socket is NOT live, poll. Conversations every 5s keeps the
   * sidebar and unread badge moving; the open thread every 3s so a reply
   * lands quickly. Both stop the moment the socket connects, and while the
   * tab is hidden, so a backgrounded tab costs nothing.
   */
  useEffect(() => {
    if (!isAuthenticated || !myId) return;

    let stopped = false;

    const tick = async () => {
      // Re-checked every tick: if Reverb comes up mid-session the polling
      // goes quiet on its own, and if it drops we resume without a reload.
      if (stopped || isRealtimeLive() || document.hidden) return;

      try {
        const res = await chatApi.listConversations();
        if (stopped) return;
        setConversations(res.data?.data || []);
        if (typeof res.data?.unread_total === 'number') setUnreadTotal(res.data.unread_total);
      } catch { /* offline or 401 — the next tick retries */ }

      const id = activeIdRef.current;
      if (!id || !openRef.current) return;

      try {
        const res = await chatApi.getMessages(id, { limit: 30 });
        if (stopped || activeIdRef.current !== id) return;
        const fresh = (res.data?.data || []).slice().reverse();

        setMessages((prev) => {
          // Merge rather than replace: replacing would drop an optimistic
          // bubble the user just sent and make the thread flicker on every
          // tick. Only genuinely new ids are appended.
          const seen = new Set(prev.map((m) => m.id));
          const added = fresh.filter((m) => !seen.has(m.id));
          if (added.length === 0) {
            // No new messages, but receipts may have moved (delivered/seen).
            const byId = new Map(fresh.map((m) => [m.id, m]));
            let changed = false;
            const merged = prev.map((m) => {
              const s = byId.get(m.id);
              if (s && (s.seen_at !== m.seen_at || s.delivered_at !== m.delivered_at)) {
                changed = true;
                return { ...m, seen_at: s.seen_at, delivered_at: s.delivered_at };
              }
              return m;
            });
            return changed ? merged : prev;
          }
          return [...prev, ...added];
        });

        // We are looking at the thread, so anything new is read.
        chatApi.markRead(id).catch(() => {});
      } catch { /* ignore */ }
    };

    const conversationsTimer = setInterval(tick, 5000);
    // Catch up immediately when the tab comes back rather than waiting a tick.
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    tick();

    return () => {
      stopped = true;
      clearInterval(conversationsTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, myId]);
  // Tear the socket down on logout / when auth is lost.
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectEcho();
      setConversations([]); setMessages([]); setActiveId(null);
      setUnreadTotal(0); setOnlineIds(new Set()); setOpen(false);
    }
  }, [isAuthenticated]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  const value = useMemo(() => ({
    open, setOpen,
    openDrawer: () => setOpen(true),
    closeDrawer: () => setOpen(false),
    conversations, refreshConversations,
    unreadTotal,
    onlineIds,
    isOnline: (id) => onlineIds.has(id),
    activeId, activeConversation, openConversation, closeConversation: () => setActiveId(null),
    messages, hasMore, loadOlder, loadingMessages,
    typingPeers: typingPeers[activeId] || {},
    startChatWith, sendMessage, sendTyping, editMessage, deleteMessage,
    setPinned, setArchived, setMuted,
    soundEnabled, setSoundEnabled,
    me: user,
  }), [
    open, conversations, unreadTotal, onlineIds, activeId, activeConversation, messages,
    hasMore, loadOlder, loadingMessages, typingPeers, openConversation, startChatWith,
    sendMessage, sendTyping, editMessage, deleteMessage, setPinned, setArchived, setMuted,
    soundEnabled, refreshConversations, user,
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a <ChatProvider>');
  return ctx;
}

// ── helpers ───────────────────────────────────────────────────────────────────

// Move a conversation to the top of the list, refresh its last message and set
// its unread count. Inserts a stub if the conversation isn't loaded yet.
function bumpConversation(list, conversationId, message, unreadCount) {
  const idx = list.findIndex((c) => c.id === conversationId);
  if (idx === -1) return list; // not in list yet — refreshConversations will pull it in
  const conv = {
    ...list[idx],
    last_message: message,
    last_message_at: message.created_at,
    unread_count: unreadCount != null ? unreadCount : list[idx].unread_count,
  };
  const rest = list.filter((_, i) => i !== idx);
  // keep pinned items ahead
  const pinned = rest.filter((c) => c.is_pinned);
  const unpinned = rest.filter((c) => !c.is_pinned);
  return conv.is_pinned ? [conv, ...pinned, ...unpinned] : [...pinned, conv, ...unpinned];
}

// Fire a browser notification when the tab is hidden and permission is granted.
function maybeNotify(message) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (!document.hidden) return;
    const body = message.type === 'image' ? '📷 Photo'
      : message.type === 'file' ? '📎 Attachment'
      : (message.body || 'New message');
    const n = new Notification(message.sender?.name || 'New message', { body, tag: `chat-${message.conversation_id}` });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* ignore */ }
}
