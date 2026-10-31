import { get, post } from '../api/axios';

/**
 * The postbox for call signalling (see CallController on the server).
 *
 * Calls need a few short messages between browsers — ring, answer, the WebRTC
 * offer/answer, "I left". Without a websocket server they wait on the server
 * for a moment and are fetched by polling: the chat's own poll carries them
 * while idle (no extra request), and CallManager polls quickly during a call.
 * Every fetch moves one shared cursor, and each signal is handed on once, as a
 * `wen:call-signal` window event, however many pollers saw it.
 */

/** This browser tab — signals after "answer" are addressed to one tab. */
export const CALL_TAB = Math.random().toString(36).slice(2, 12);

let cursor = null;            // newest signal id seen; null until the first poll
const handled = new Set();     // ids already handed on

/** Query params the chat poll adds so the server returns pending signals too. */
export const pollParams = () => (cursor == null ? { call_tab: CALL_TAB } : { call_tab: CALL_TAB, call_after: cursor });

/** Take a batch from any poll ({ signals, last_id }) and hand each new signal on. */
export function receiveSignals(batch) {
  if (!batch) return;
  const first = cursor == null;
  if (typeof batch.last_id === 'number' && (cursor == null || batch.last_id > cursor)) cursor = batch.last_id;
  if (first) return;   // the first answer only says where "now" is
  for (const s of batch.signals || []) {
    if (handled.has(s.id)) continue;
    handled.add(s.id);
    window.dispatchEvent(new CustomEvent('wen:call-signal', { detail: s }));
  }
  if (handled.size > 500) handled.clear();
}

/** Fetch now — CallManager's quick poll during a call, or a hidden tab's slow one. */
export async function pollSignals() {
  const r = await get('/chat/calls/inbox', { cache: false, params: { tab: CALL_TAB, ...(cursor == null ? {} : { after: cursor }) } });
  receiveSignals(r.data);
}

/**
 * Send one signal. `toUserId`/`toTab` address one browser; leaving them out
 * sends to everyone else in the conversation (ring, join, leave).
 */
export function sendSignal({ conversationId, callId, type, toUserId = null, toTab = null, payload = null }) {
  return post('/chat/calls/signal', {
    conversation_id: conversationId,
    call_id: callId,
    type,
    from_tab: CALL_TAB,
    to_user_id: toUserId,
    to_tab: toTab,
    payload,
  });
}
