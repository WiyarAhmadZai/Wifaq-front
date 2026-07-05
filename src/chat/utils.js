// Small presentational helpers shared across chat components.
import { API_BASE_URL } from '../api/axios';

const ORIGIN = (API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');

// Resolve a stored avatar path (or already-absolute url) to a full URL.
export function avatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${ORIGIN}/storage/${path}`;
}

// Resolve an attachment to a full URL. Prefer the stored `path` and build the
// URL from OUR configured origin — the backend's own `url` may point at a
// different APP_URL host than the one actually serving storage.
export function fileUrl(att) {
  if (!att) return null;
  if (att.path) {
    if (att.path.startsWith('http')) return att.path;
    return `${ORIGIN}/storage/${att.path}`;
  }
  return att.url || null;
}

// Initials fallback for users without a photo.
export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

// Deterministic soft background color from a name, for initials avatars.
const AVATAR_COLORS = [
  'bg-teal-500', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500',
  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-600',
];
export function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Human role label (capitalised, hyphen → space).
export function roleLabel(role) {
  if (!role) return 'Member';
  return role.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// "9:04 PM" clock time for a message.
export function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// WhatsApp-style relative day label for the conversation list.
export function formatListTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return formatTime(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  const diffDays = (now - d) / 86400000;
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Date divider label inside the message thread.
export function formatDateDivider(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

// "last seen" phrasing from a timestamp.
export function lastSeenLabel(iso) {
  if (!iso) return 'offline';
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now - d) / 60000);
  if (mins < 1) return 'last seen just now';
  if (mins < 60) return `last seen ${mins} min ago`;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `last seen today at ${formatTime(iso)}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `last seen yesterday at ${formatTime(iso)}`;
  return `last seen ${d.toLocaleDateString()}`;
}

// Bytes → "1.2 MB".
export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

// Short preview string for a conversation's last message.
export function lastMessagePreview(msg) {
  if (!msg) return 'No messages yet';
  if (msg.is_deleted) return 'This message was deleted';
  if (msg.type === 'image') return '📷 Photo';
  if (msg.type === 'file') return '📎 Attachment';
  return msg.body || '';
}
