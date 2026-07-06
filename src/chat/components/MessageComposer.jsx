import { useEffect, useRef, useState } from 'react';
import {
  FiPaperclip, FiSend, FiX, FiImage, FiFile, FiCornerUpLeft, FiEdit2,
} from 'react-icons/fi';
import { formatSize } from '../utils';

const ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv';

export default function MessageComposer({
  onSend, sendTyping, replyTo, onCancelReply, editing, onSaveEdit, onCancelEdit, incomingFiles,
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const typingRef = useRef(false);
  const typingTimer = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus the input when a conversation opens (the composer remounts per
  // conversation via ChatWindow's key), so the user can type immediately.
  // Double rAF fires after the drawer/thread has laid out; the setTimeout is a
  // belt-and-suspenders fallback. (The textarea also sets autoFocus.)
  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    const raf = requestAnimationFrame(() => requestAnimationFrame(focus));
    const t = setTimeout(focus, 250);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, []);

  // Populate the editor when the user chooses "Edit" on a message.
  useEffect(() => {
    if (editing) {
      setText(editing.body || '');
      inputRef.current?.focus();
    }
  }, [editing]);

  // Accept files dropped on the parent window.
  useEffect(() => {
    if (incomingFiles?.length) setFiles((prev) => [...prev, ...incomingFiles]);
  }, [incomingFiles]);

  const emitTyping = (typing) => {
    if (typing === typingRef.current) return;
    typingRef.current = typing;
    sendTyping?.(typing);
  };

  const handleChange = (e) => {
    setText(e.target.value);
    emitTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 1500);
  };

  const addFiles = (list) => {
    const arr = Array.from(list || []);
    if (arr.length) setFiles((prev) => [...prev, ...arr].slice(0, 10));
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const reset = () => { setText(''); setFiles([]); emitTyping(false); clearTimeout(typingTimer.current); };

  const submit = async () => {
    const body = text.trim();
    if (editing) {
      if (body && body !== editing.body) await onSaveEdit(editing.id, body);
      else onCancelEdit();
      setText('');
      return;
    }
    if (!body && files.length === 0) return;
    setSending(true);
    try {
      await onSend({ body, attachments: files, replyTo });
      reset();
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      if (editing) onCancelEdit();
      if (replyTo) onCancelReply();
    }
  };

  return (
    <div className="border-t border-gray-100 bg-white">
      {/* Reply / edit context banner */}
      {(replyTo || editing) && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
          {editing ? <FiEdit2 className="text-teal-600 w-4 h-4" /> : <FiCornerUpLeft className="text-teal-600 w-4 h-4" />}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-teal-600">
              {editing ? 'Editing message' : 'Replying to'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {(editing || replyTo)?.body || 'Attachment'}
            </div>
          </div>
          <button
            onClick={editing ? onCancelEdit : onCancelReply}
            className="p-1 rounded-full hover:bg-gray-200 text-gray-500"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-gray-100">
          {files.map((f, i) => (
            <div key={i} className="relative flex-shrink-0 w-16">
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                {f.type?.startsWith('image/')
                  ? <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  : <FiFile className="w-6 h-6 text-gray-400" />}
              </div>
              <div className="text-[9px] text-gray-400 truncate mt-0.5">{formatSize(f.size)}</div>
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center"
              >
                <FiX className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-2.5">
        {!editing && (
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach"
            className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
          >
            <FiPaperclip className="w-5 h-5" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <textarea
          ref={inputRef}
          autoFocus
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          placeholder="Type a message"
          className="flex-1 resize-none max-h-28 px-4 py-2.5 bg-gray-50 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-200 transition-all"
        />
        <button
          onClick={submit}
          disabled={sending || (!text.trim() && files.length === 0 && !editing)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <FiSend className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
