import { useEffect, useRef, useState } from 'react';
import {
  FiCheck, FiMoreHorizontal, FiCornerUpLeft, FiCornerUpRight,
  FiEdit2, FiTrash2, FiCopy, FiFile, FiDownload,
} from 'react-icons/fi';
import { formatTime, formatSize, fileUrl } from '../utils';
import ImageLightbox from './ImageLightbox';

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

function AttachmentView({ att, outgoing, onPreview }) {
  const url = fileUrl(att);
  const isImage = att.kind === 'image' || (att.mime_type || '').startsWith('image/');

  if (isImage) {
    // Thumbnail in the bubble; clicking opens the in-app lightbox modal
    // (never a new browser tab).
    return (
      <button type="button" onClick={() => onPreview(url, att.original_name)} className="block mt-1 group/img">
        <img
          src={url}
          alt={att.original_name}
          loading="lazy"
          className="rounded-lg max-h-60 max-w-full object-cover cursor-zoom-in transition-transform group-hover/img:brightness-95"
        />
      </button>
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

export default function MessageBubble({ message, outgoing, onReply, onForward, onEdit, onDelete }) {
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState(null); // { url, name } for the lightbox
  const ref = useRef(null);

  useEffect(() => {
    if (!menu) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu]);

  const deleted = message.is_deleted;

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
          {/* Reply preview */}
          {message.reply_to && !deleted && (
            <div className={`mb-1 pl-2 border-l-2 rounded ${outgoing ? 'border-teal-200 bg-teal-500/30' : 'border-teal-400 bg-gray-50'} px-2 py-1`}>
              <div className={`text-[10px] font-semibold ${outgoing ? 'text-teal-50' : 'text-teal-600'}`}>
                {message.reply_to.sender_id === message.sender_id ? 'You' : 'Reply'}
              </div>
              <div className={`text-[11px] truncate ${outgoing ? 'text-teal-50' : 'text-gray-500'}`}>
                {message.reply_to.body || 'Attachment'}
              </div>
            </div>
          )}

          {message.forwarded_from_id && !deleted && (
            <div className={`text-[10px] italic mb-0.5 ${outgoing ? 'text-teal-100' : 'text-gray-400'}`}>Forwarded</div>
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
                  onPreview={(url, name) => setPreview({ url, name })}
                />
              ))}
              {message.body && <div className={message.attachments?.length ? 'mt-1' : ''}>{message.body}</div>}
            </>
          )}

          {/* Meta row */}
          <div className={`flex items-center gap-1 justify-end mt-0.5 ${outgoing ? 'text-teal-100' : 'text-gray-400'}`}>
            {message.is_edited && !deleted && <span className="text-[9px]">edited</span>}
            <span className="text-[10px]">{formatTime(message.created_at)}</span>
            {outgoing && !deleted && <Ticks message={message} />}
          </div>
        </div>
      </div>

      {/* Hover actions */}
      {!deleted && !message._pending && (
        <div className={`self-center opacity-0 group-hover:opacity-100 transition-opacity ${outgoing ? 'order-1 mr-1' : 'ml-1'}`}>
          <div className="relative" ref={ref}>
            <button
              onClick={() => setMenu((v) => !v)}
              className="p-1 rounded-full hover:bg-gray-200 text-gray-400"
            >
              <FiMoreHorizontal className="w-4 h-4" />
            </button>
            {menu && (
              <div className={`absolute z-30 top-6 ${outgoing ? 'right-0' : 'left-0'} w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm`}>
                <MenuItem icon={<FiCornerUpLeft />} label="Reply" onClick={() => { onReply(message); setMenu(false); }} />
                <MenuItem icon={<FiCornerUpRight />} label="Forward" onClick={() => { onForward(message); setMenu(false); }} />
                {message.body && (
                  <MenuItem icon={<FiCopy />} label="Copy" onClick={() => { navigator.clipboard?.writeText(message.body); setMenu(false); }} />
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
