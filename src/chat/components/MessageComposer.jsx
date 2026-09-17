import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiPaperclip, FiSend, FiX, FiImage, FiFile, FiCornerUpLeft, FiEdit2, FiMic, FiSquare, FiMail,
  FiFileText, FiMusic, FiVideo, FiCamera, FiMapPin,
} from 'react-icons/fi';
import { formatSize, filesFromClipboard, isImageFile } from '../utils';
import ImageEditorModal from './ImageEditorModal';
import CameraCapture from './CameraCapture';

/* What the paperclip offers — mirrors the server's mimes rule. Anything a
 * WhatsApp user would expect to send: pictures, documents, audio, video. */
const ACCEPT = {
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip',
  audio: 'audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.webm',
  video: 'video/*,.mp4,.mov,.m4v,.3gp,.mkv,.avi',
};

/* The paperclip menu — one icon per thing a WhatsApp user expects to send. */
const ATTACH_OPTIONS = [
  { key: 'document', label: 'Document', icon: <FiFileText className="w-5 h-5" />, color: 'bg-indigo-500' },
  { key: 'audio',    label: 'Audio',    icon: <FiMusic className="w-5 h-5" />,    color: 'bg-orange-500' },
  { key: 'video',    label: 'Video',    icon: <FiVideo className="w-5 h-5" />,    color: 'bg-pink-500' },
  { key: 'camera',   label: 'Camera',   icon: <FiCamera className="w-5 h-5" />,   color: 'bg-rose-600' },
  { key: 'location', label: 'Location', icon: <FiMapPin className="w-5 h-5" />,   color: 'bg-emerald-600' },
];

/** The MediaRecorder container this browser can produce for a voice note. */
const voiceMime = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(
    (m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m),
  ) || '';

export default function MessageComposer({
  onSend, sendTyping, replyTo, onCancelReply, editing, onSaveEdit, onCancelEdit, incomingFiles,
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  // "Notify via email" — per message, off unless the sender switches it on.
  const [emailToo, setEmailToo] = useState(false);
  /* Images waiting in the WhatsApp-style preview. Every image — picked,
   * dropped or pasted — goes through it before it is sent, so the sender sees
   * it large, can crop or mark it up, and writes the caption there. */
  const [editorFiles, setEditorFiles] = useState(null);
  const fileRef = useRef(null);   // the one hidden input; `accept` is swapped per option
  const imageRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const menuRef = useRef(null);
  /* Voice notes. The recorder and its stream live in refs so stopping never
   * races a re-render; `recording` drives the UI (pulsing dot + timer). */
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [micError, setMicError] = useState('');
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

  // Accept files dropped on — or pasted anywhere in — the parent window.
  useEffect(() => {
    if (incomingFiles?.length) addFiles(incomingFiles);
  }, [incomingFiles]);

  // One object URL per queued file, released when the file leaves the strip.
  // Creating them inside render leaked a blob per keystroke.
  const previews = useMemo(() => files.map((f) => (isImageFile(f) ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

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

  /**
   * Route new files: images open the preview/editor, everything else lands in
   * the strip under the input. Cap matches the server (10 per message).
   */
  const addFiles = (list) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    const images = arr.filter(isImageFile);
    const docs = arr.filter((f) => !isImageFile(f));
    if (docs.length) setFiles((prev) => [...prev, ...docs].slice(0, 10));
    if (images.length) setEditorFiles((prev) => [...(prev || []), ...images].slice(0, 10));
  };

  /**
   * Ctrl+V. A screenshot on the clipboard, or an image copied from another
   * app, is attached here just as a picked file would be. Plain text is left
   * to the textarea's own paste.
   */
  const onPaste = (e) => {
    if (editing) return;
    const pasted = filesFromClipboard(e.clipboardData);
    if (!pasted.length) return;
    e.preventDefault();
    addFiles(pasted);
  };

  /** The editor's Send: images plus the caption written there. */
  const sendFromEditor = async (edited, caption) => {
    await onSend({ body: caption, attachments: edited, replyTo, notifyByEmail: emailToo });
    setEditorFiles(null);
    // The caption took the place of whatever was in the box.
    setText('');
    emitTyping(false);
    onCancelReply?.();
    inputRef.current?.focus();
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const reset = () => { setText(''); setFiles([]); emitTyping(false); clearTimeout(typingTimer.current); };

  useEffect(() => {
    if (!recording) return undefined;
    const t = setInterval(() => setRecSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  /** Tap the mic: start. Tap the square: stop — the note joins the strip. */
  const startRecording = async () => {
    setMicError('');
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicError('Voice notes are not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = voiceMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        const type = rec.mimeType || mime || 'audio/webm';
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size > 0) {
          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
          setFiles((prev) => [...prev, new File([blob], `Voice note ${stamp}.${ext}`, { type })].slice(0, 10));
        }
        setRecording(false);
        setRecSeconds(0);
        inputRef.current?.focus();
      };
      recorderRef.current = rec;
      streamRef.current = stream;
      rec.start(250);
      setRecording(true);
      setRecSeconds(0);
    } catch {
      setMicError('Microphone access was denied.');
    }
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    else setRecording(false);
  };

  // Leaving the conversation mid-recording must release the microphone.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, []);

  // Tap anywhere else (or Esc) closes the paperclip menu.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const away = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const esc = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [menuOpen]);

  /** Open the hidden picker with the right filter for the chosen option. */
  const pick = (kind) => {
    setMenuOpen(false);
    if (kind === 'camera') { setCameraOpen(true); return; }
    if (kind === 'location') { sendLocation(); return; }
    const input = fileRef.current;
    if (!input) return;
    input.accept = ACCEPT[kind] || '';
    input.click();
  };

  /** Current position as a map link — the receiver taps it to open maps. */
  const sendLocation = () => {
    if (!navigator.geolocation) { setMicError('Location is not supported in this browser.'); return; }
    setMicError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setLocating(false);
        const lat = coords.latitude.toFixed(6);
        const lng = coords.longitude.toFixed(6);
        await onSend({ body: `📍 https://maps.google.com/?q=${lat},${lng}`, attachments: [], replyTo });
        onCancelReply?.();
      },
      () => { setLocating(false); setMicError('Location access was denied.'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

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
      await onSend({ body, attachments: files, replyTo, notifyByEmail: emailToo });
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
                {previews[i]
                  ? <img src={previews[i]} alt="" className="w-full h-full object-cover" />
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
          <>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                title="Attach"
                aria-expanded={menuOpen}
                className={`p-2 transition-colors ${menuOpen ? 'text-teal-600' : 'text-gray-400 hover:text-teal-600'}`}
              >
                <FiPaperclip className="w-5 h-5" />
              </button>
              {menuOpen && (
                /* Pops up ABOVE the paperclip, icons in a row, like WhatsApp. */
                <div className="absolute bottom-full mb-2 start-0 flex gap-2 p-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-30">
                  {ATTACH_OPTIONS.map(({ key, label, icon, color }) => (
                    <button
                      key={key}
                      onClick={() => pick(key)}
                      disabled={key === 'location' && locating}
                      title={label}
                      className="flex flex-col items-center gap-1 w-14 group disabled:opacity-50"
                    >
                      <span className={`w-11 h-11 rounded-full ${color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                        {icon}
                      </span>
                      <span className="text-[10px] text-gray-600 whitespace-nowrap">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => imageRef.current?.click()}
              title="Send a photo"
              className="p-2 text-gray-400 hover:text-teal-600 transition-colors -ms-2"
            >
              <FiImage className="w-5 h-5" />
            </button>
            {/* Notify via email — a toggle, not a checkbox, so it sits in the
                icon row. Filled teal when armed so the sender can see at a
                glance that the next message will also go to the inbox. */}
            <button
              type="button"
              onClick={() => setEmailToo((v) => !v)}
              aria-pressed={emailToo}
              title={emailToo ? "Also emailing this message — click to stop" : "Notify via email"}
              className={`p-2 rounded-lg transition-colors -ms-2 ${
                emailToo ? "text-white bg-teal-600 hover:bg-teal-700" : "text-gray-400 hover:text-teal-600"
              }`}
            >
              <FiMail className="w-5 h-5" />
            </button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <input
          ref={imageRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
        {recording ? (
          /* While recording the input gives way to a timer, like WhatsApp. */
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-red-50 rounded-2xl text-sm text-red-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>Recording…</span>
            <span className="ms-auto tabular-nums font-medium">
              {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
            </span>
          </div>
        ) : (
        <textarea
          ref={inputRef}
          autoFocus
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Type a message"
          className="flex-1 resize-none max-h-28 px-4 py-2.5 bg-gray-50 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-200 transition-all"
        />
        )}
        {recording ? (
          <button
            onClick={stopRecording}
            title="Stop recording"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0"
          >
            <FiSquare className="w-4 h-4" />
          </button>
        ) : !editing && !text.trim() && files.length === 0 ? (
          /* Nothing to send yet → the button is a microphone, as in WhatsApp. */
          <button
            onClick={startRecording}
            title="Record a voice note"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-colors flex-shrink-0"
          >
            <FiMic className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={sending}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <FiSend className="w-4 h-4" />
          </button>
        )}
      </div>
      {micError && (
        <div className="px-4 pb-2 text-xs text-red-500">{micError}</div>
      )}

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => { setCameraOpen(false); addFiles([file]); }}
        />
      )}

      {editorFiles?.length > 0 && (
        <ImageEditorModal
          files={editorFiles}
          initialCaption={text}
          onCancel={() => { setEditorFiles(null); inputRef.current?.focus(); }}
          onSend={sendFromEditor}
        />
      )}
    </div>
  );
}
