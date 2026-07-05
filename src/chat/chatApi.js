// Thin API layer for the chat subsystem. Mirrors the style of src/api/*.js —
// one module of named functions over the shared axios instance.
import api from '../api/axios';
import { getSocketId } from './echo';

// Header carrying the current WebSocket connection id so the backend's
// broadcast()->toOthers() can skip echoing an event back to the originating tab.
function socketHeader(extra = {}) {
  const id = getSocketId();
  return id ? { 'X-Socket-Id': id, ...extra } : extra;
}

export const chatApi = {
  // ── Conversations ──────────────────────────────────────────────────────────
  listConversations: (params = {}) => api.get('/chat/conversations', { params }),
  startConversation: (userId) => api.post('/chat/conversations', { user_id: userId }),
  showConversation: (id) => api.get(`/chat/conversations/${id}`),
  getMessages: (id, params = {}) => api.get(`/chat/conversations/${id}/messages`, { params }),
  markRead: (id) => api.post(`/chat/conversations/${id}/read`, {}, { headers: socketHeader() }),
  markDelivered: (id) => api.post(`/chat/conversations/${id}/delivered`, {}, { headers: socketHeader() }),
  pin: (id, pinned) => api.post(`/chat/conversations/${id}/pin`, { pinned }),
  archive: (id, archived) => api.post(`/chat/conversations/${id}/archive`, { archived }),
  mute: (id, muted) => api.post(`/chat/conversations/${id}/mute`, { muted }),

  // ── Messages ────────────────────────────────────────────────────────────────
  // `payload` may be a plain object (text) or FormData (attachments). We let the
  // browser set the multipart boundary for FormData by clearing Content-Type.
  sendMessage: (conversationId, payload, onUploadProgress) => {
    const isForm = payload instanceof FormData;
    return api.post(`/chat/conversations/${conversationId}/messages`, payload, {
      headers: socketHeader(isForm ? { 'Content-Type': 'multipart/form-data' } : {}),
      onUploadProgress,
    });
  },
  editMessage: (messageId, body) => api.put(`/chat/messages/${messageId}`, { body }, { headers: socketHeader() }),
  deleteMessage: (messageId) => api.delete(`/chat/messages/${messageId}`, { headers: socketHeader() }),
  forwardMessage: (messageId, conversationIds) =>
    api.post(`/chat/messages/${messageId}/forward`, { conversation_ids: conversationIds }),
  searchMessages: (q, conversationId) =>
    api.get('/chat/messages/search', { params: { q, conversation_id: conversationId } }),

  // ── Contacts (new-chat picker) ──────────────────────────────────────────────
  contacts: (params = {}) => api.get('/chat/contacts', { params }),

  // ── Presence ────────────────────────────────────────────────────────────────
  presenceOnline: () => api.post('/chat/presence/online'),
  presenceOffline: () => api.post('/chat/presence/offline'),

  // ── Settings ────────────────────────────────────────────────────────────────
  getSettings: () => api.get('/chat/settings'),
  updateSettings: (data) => api.put('/chat/settings', data),
};

export default chatApi;
