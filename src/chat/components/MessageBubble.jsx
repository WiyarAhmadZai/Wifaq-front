import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FiCheck, FiMoreHorizontal, FiCornerUpLeft, FiCornerUpRight,
  FiEdit2, FiTrash2, FiCopy, FiFile, FiDownload, FiSmile, FiPlus,
} from 'react-icons/fi';
import EmojiPicker from 'emoji-picker-react';
import { formatTime, formatSize, fileUrl } from '../utils';
import ImageLightbox from './ImageLightbox';
import { RichTextView } from '../../components/RichTextField';
import { isRichText, richTextToPlain, decodeEntities } from '../../utils/richText';
import { TagChip } from './TagPicker';

const QUICK_REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '👎', label: 'Dislike' },
  { emoji: '🤗', label: 'Care' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🙏', label: 'Pray' },
  { emoji: '😡', label: 'Angry' },
];

// Double-tick receipt: grey = delivered, teal = seen. Single = sent only.
function Ticks({ message }) {
  if (message._pending) return <span className="text-[10px] text-gray-300">🕓</span>;
  const seen = Boolean(message.seen_at);
  const delivered = Boolean(message.delivered_at);
  return (
    <span className={`inline-flex ${seen ? 'text-teal-100' : 'text-teal-200/70'}`}>
      <FiCheck className="w-3 h-3" />
      {(delivered || seen) && <FiCheck className="w-3 h-3 -ml-1.5" />}
    </span>
  );
}

/**
 * Turn any URL in a message into a link. Needed for shared locations, which
 * travel as a maps URL so the receiver can open them in their maps app.
 */
function linkify(text, outgoing) {
  const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (/^https?:\/\//.test(part) ? (
    <a
      key={i}
      href={part}
      target="_blank"
      rel="noopener noreferrer"
      className={`underline break-all ${outgoing ? 'text-teal-50' : 'text-teal-700'}`}
    >
      {part.startsWith('https://maps.google.com/') ? 'Open in Maps' : part}
    </a>
  ) : part));
}

function AttachmentView({ att, outgoing, onPreview, progress }) {
  // A message still uploading shows the file from the sender's own disk.
  const url = att._local_url || fileUrl(att);
  const isImage = att.kind === 'image' || (att.mime_type || '').startsWith('image/');

  if (isImage) {
    // Thumbnail in the bubble; clicking opens the in-app lightbox modal
    // (never a new browser tab).
    return (
      <button type="button" onClick={() => onPreview(url, att.original_name)} className="relative block mt-1 group/img">
        <img
          src={url}
          alt={att.original_name}
          loading="lazy"
          className={`rounded-lg max-h-60 max-w-full object-cover cursor-zoom-in transition-transform group-hover/img:brightness-95 ${progress != null ? 'opacity-70' : ''}`}
        />
        {progress != null && (
          <span className="absolute inset-x-2 bottom-2 h-1.5 rounded-full bg-black/30 overflow-hidden">
            <span className="block h-full bg-white transition-all" style={{ width: `${progress}%` }} />
          </span>
        )}
      </button>
    );
  }
  const mime = att.mime_type || '';
  const isAudio = att.kind === 'audio' || mime.startsWith('audio/');
  const isVideo = att.kind === 'video' || mime.startsWith('video/');

  // Voice notes and audio files play in the bubble, WhatsApp-style.
  if (isAudio) {
    return (
      <div className={`mt-1 p-2 rounded-lg ${outgoing ? 'bg-teal-500/40' : 'bg-gray-100'}`}>
        <audio controls preload="metadata" src={url} className="w-64 max-w-full h-10" />
        <div className={`mt-1 text-[10px] truncate ${outgoing ? 'text-teal-50' : 'text-gray-400'}`}>
          {att.original_name} · {formatSize(att.size)}
        </div>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-1">
        <video controls preload="metadata" src={url} className="rounded-lg max-h-72 max-w-full bg-black" />
        <div className={`mt-1 text-[10px] truncate ${outgoing ? 'text-teal-50' : 'text-gray-400'}`}>
          {att.original_name} · {formatSize(att.size)}
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={att.original_name}
      className={`mt-1 flex items-center gap-2 p-2 rounded-lg ${outgoing ? 'bg-teal-500/40' : 'bg-gray-100'}`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${outgoing ? 'bg-white/25' : 'bg-white'}`}>
        <FiFile className={outgoing ? 'text-white' : 'text-teal-600'} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-xs font-medium truncate ${outgoing ? 'text-white' : 'text-gray-700'}`}>{att.original_name}</div>
        <div className={`text-[10px] ${outgoing ? 'text-teal-50' : 'text-gray-400'}`}>{formatSize(att.size)}</div>
      </div>
      <FiDownload className={`w-4 h-4 ${outgoing ? 'text-white' : 'text-gray-400'}`} />
    </a>
  );
}

export default function MessageBubble({ message, outgoing, showSender = false, onReply, onForward, onEdit, onDelete, onReact, meId }) {
  const [menu, setMenu] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [pickerPosition, setPickerPosition] = useState(null);
  const [preview, setPreview] = useState(null); // { url, name } for the lightbox
  const ref = useRef(null);
  const pickerRef = useRef(null);

  const positionPicker = (height, width) => {
    const anchor = ref.current?.getBoundingClientRect();
    if (!anchor) return null;

    const margin = 8;
    const placeBelow = anchor.top < window.innerHeight / 2;
    const preferredTop = placeBelow ? anchor.bottom + margin : anchor.top - height - margin;
    const left = outgoing ? anchor.right - width : anchor.left;

    return {
      top: Math.max(margin, Math.min(preferredTop, window.innerHeight - height - margin)),
      left: Math.max(margin, Math.min(left, window.innerWidth - width - margin)),
    };
  };

  useEffect(() => {
    if (!menu && !emojiOpen) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target) && !pickerRef.current?.contains(e.target)) {
        setMenu(false);
        setEmojiOpen(false);
        setShowAllEmojis(false);
        setPickerPosition(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu, emojiOpen]);

  const deleted = message.is_deleted;
  const myReaction = message.reactions?.find((reaction) => (
    reaction.reacted_by_me || reaction.user_ids?.includes(Number(meId))
  ))?.emoji;
  const quickReactions = myReaction && !QUICK_REACTIONS.some(({ emoji }) => emoji === myReaction)
    ? [{ emoji: myReaction, label: 'Your reaction' }, ...QUICK_REACTIONS]
    : QUICK_REACTIONS;

  return (
    <div className={`group flex ${outgoing ? 'justify-end' : 'justify-start'} px-1`}>
      <div className={`relative max-w-[78%] ${outgoing ? 'order-2' : ''}`}>
        <div
          className={`px-3 py-2 rounded-2xl shadow-sm text-sm leading-relaxed break-words ${
            outgoing
              ? 'bg-teal-600 text-white rounded-br-md'
              : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
          } ${message._failed ? 'opacity-60 ring-1 ring-rose-300' : ''}`}
        >
          {/* In a group, who said it — every incoming bubble is signed. */}
          {showSender && !outgoing && !deleted && message.sender?.name && (
            <div className="text-[11px] font-bold text-teal-700 mb-0.5 truncate">{message.sender.name}</div>
          )}

          {/* Reply preview */}
          {message.reply_to && !deleted && (
            <div className={`mb-1 pl-2 border-l-2 rounded ${outgoing ? 'border-teal-200 bg-teal-500/30' : 'border-teal-400 bg-gray-50'} px-2 py-1`}>
              <div className={`text-[10px] font-semibold ${outgoing ? 'text-teal-50' : 'text-teal-600'}`}>
                {message.reply_to.sender_id === message.sender_id ? 'You' : 'Reply'}
              </div>
              <div dir="auto" className={`text-[11px] truncate ${outgoing ? 'text-teal-50' : 'text-gray-500'}`}>
                {richTextToPlain(message.reply_to.body) || 'Attachment'}
              </div>
            </div>
          )}

          {message.forwarded_from_id && !deleted && (
            <div className={`text-[10px] italic mb-0.5 ${outgoing ? 'text-teal-100' : 'text-gray-400'}`}>Forwarded</div>
          )}

          {/* What the sender said this message is. Shown on the bubble as well
              as in the list, so the classification survives being opened. */}
          {message.tag && !deleted && (
            <div className="mb-1"><TagChip tag={message.tag} size="xs" /></div>
          )}

          {deleted ? (
            <span className="italic opacity-70">🚫 This message was deleted</span>
          ) : (
            <>
              {message.attachments?.map((att) => (
                <AttachmentView
                  key={att.id}
                  att={att}
                  outgoing={outgoing}
                  progress={message._pending ? message._progress : null}
                  onPreview={(url, name) => setPreview({ url, name })}
                />
              ))}
              {message.body && (
                /* Formatted messages render as markup; anything written before
                 * chat had formatting is still plain text, and linkify keeps
                 * turning its shared map links into links. dir="auto" is what
                 * lets a Pashto message and an English one both read correctly
                 * in the same thread. */
                <div dir="auto" className={message.attachments?.length ? 'mt-1' : ''}>
                  {isRichText(message.body)
                    ? <RichTextView html={message.body} dir="auto"
                        className={`rich-text-chat ${outgoing ? 'rich-text-inverted' : ''}`} />
                    : linkify(decodeEntities(message.body), outgoing)}
                </div>
              )}
            </>
          )}

          {/* Meta row */}
          <div className={`flex items-center gap-1 justify-end mt-0.5 ${outgoing ? 'text-teal-100' : 'text-gray-400'}`}>
            {message.is_edited && !deleted && <span className="text-[9px]">edited</span>}
            <span className="text-[10px]">{formatTime(message.created_at)}</span>
            {outgoing && !deleted && <Ticks message={message} />}
          </div>
        </div>
        {!deleted && message.reactions?.length > 0 && (
          <div className={`relative z-10 -mt-1 flex flex-wrap gap-1 ${outgoing ? 'justify-end' : 'justify-start'}`}>
            {message.reactions.map((reaction) => {
              const reactedByMe = reaction.reacted_by_me || reaction.user_ids?.includes(Number(meId));

              return (
              <button
                key={reaction.emoji}
                type="button"
                title={`${reaction.emoji} ${reaction.count}`}
                aria-label={`${reaction.emoji}, ${reaction.count} reactions`}
                aria-pressed={reactedByMe}
                onClick={() => onReact?.(message.id, reaction.emoji)}
                className={`min-w-8 h-7 px-1.5 rounded-full border shadow-sm text-xs flex items-center justify-center gap-1 ${
                  reactedByMe
                    ? 'bg-teal-100 border-teal-700 ring-2 ring-teal-300 text-teal-950 shadow-md'
                    : 'bg-white border-gray-200'
                }`}
              >
                <span>{reaction.emoji}</span>
                <span className={`text-[10px] ${reactedByMe ? 'font-bold text-teal-900' : 'text-gray-600'}`}>
                  {reaction.count}
                </span>
                {reactedByMe && <FiCheck className="w-3 h-3 text-teal-800" />}
              </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {!deleted && !message._pending && (
        <div className={`self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${outgoing ? 'order-1 mr-1' : 'ml-1'}`}>
          <div className="relative flex items-center" ref={ref}>
            <button
              type="button"
              onClick={() => {
                const opening = !emojiOpen;
                setEmojiOpen(opening);
                setPickerPosition(opening ? positionPicker(52, 292) : null);
                setShowAllEmojis(false);
                setMenu(false);
              }}
              title="Add reaction"
              aria-label="Add reaction"
              aria-expanded={emojiOpen}
              className="p-1 rounded-full hover:bg-gray-200 text-gray-400"
            >
              <FiSmile className="w-4 h-4" />
            </button>
            {emojiOpen && pickerPosition && createPortal(
              <div
                ref={pickerRef}
                className="fixed z-[100]"
                style={{ top: pickerPosition.top, left: pickerPosition.left }}
              >
                {showAllEmojis ? (
                  <EmojiPicker
                    onEmojiClick={(item) => { onReact?.(message.id, item.emoji); setEmojiOpen(false); }}
                    width={300}
                    height={360}
                    lazyLoadEmojis
                    previewConfig={{ showPreview: false }}
                    skinTonesDisabled
                  />
                ) : (
                  <div className="flex items-center gap-1 p-2 rounded-full bg-white shadow-xl border border-gray-200">
                    {quickReactions.map(({ emoji, label }) => {
                      const selected = emoji === myReaction;

                      return (
                      <button
                        key={emoji}
                        type="button"
                        title={selected ? `${label} (your reaction)` : label}
                        aria-label={label}
                        aria-pressed={selected}
                        onClick={() => { onReact?.(message.id, emoji); setEmojiOpen(false); }}
                        className={`w-8 h-8 flex-shrink-0 rounded-full text-xl transition-transform ${
                          selected
                            ? 'bg-teal-100 ring-2 ring-teal-600 scale-110 shadow-sm'
                            : 'hover:bg-gray-100 hover:scale-110'
                        }`}
                      >
                        {emoji}
                      </button>
                      );
                    })}
                    <button
                      type="button"
                      title="More emojis"
                      aria-label="More emojis"
                      onClick={() => {
                        setPickerPosition(positionPicker(360, 300));
                        setShowAllEmojis(true);
                      }}
                      className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-gray-500 bg-gray-100 hover:bg-gray-200"
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>,
              document.body,
            )}
            <button
              onClick={() => { setMenu((v) => !v); setEmojiOpen(false); }}
              aria-label="Message options"
              className="p-1 rounded-full hover:bg-gray-200 text-gray-400"
            >
              <FiMoreHorizontal className="w-4 h-4" />
            </button>
            {menu && (
              <div className={`absolute z-30 top-6 ${outgoing ? 'right-0' : 'left-0'} w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm`}>
                <MenuItem icon={<FiCornerUpLeft />} label="Reply" onClick={() => { onReply(message); setMenu(false); }} />
                <MenuItem icon={<FiCornerUpRight />} label="Forward" onClick={() => { onForward(message); setMenu(false); }} />
                {message.body && (
                  <MenuItem icon={<FiCopy />} label="Copy" onClick={() => { navigator.clipboard?.writeText(richTextToPlain(message.body)); setMenu(false); }} />
                )}
                {outgoing && message.body && (
                  <MenuItem icon={<FiEdit2 />} label="Edit" onClick={() => { onEdit(message); setMenu(false); }} />
                )}
                {outgoing && (
                  <MenuItem icon={<FiTrash2 />} label="Delete" danger onClick={() => { onDelete(message); setMenu(false); }} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {preview && (
        <ImageLightbox url={preview.url} name={preview.name} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 ${danger ? 'text-rose-600' : 'text-gray-700'}`}
    >
      <span className="w-3.5 h-3.5">{icon}</span>
      {label}
    </button>
  );
}
