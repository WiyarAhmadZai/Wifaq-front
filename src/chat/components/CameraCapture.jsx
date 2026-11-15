import { useEffect, useRef, useState } from 'react';
import { FiX, FiRefreshCw, FiCamera } from 'react-icons/fi';

/**
 * Live photo from the device camera, WhatsApp-style.
 *
 * Opens the camera in a modal, lets the user flip between the front and back
 * lens, and hands the shot back as a File — which then goes through the same
 * preview/editor as any picked image. The stream is always released on close.
 */
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState('environment'); // 'user' = front lens
  const [error, setError] = useState('');
  const [canFlip, setCanFlip] = useState(false);

  useEffect(() => {
    let alive = true;
    const stop = () => streamRef.current?.getTracks().forEach((t) => t.stop());

    (async () => {
      stop();
      setError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        // Only offer the flip button when there is a second camera.
        const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
        setCanFlip(cams.length > 1);
      } catch {
        setError('Camera access was denied.');
      }
    })();

    return () => { alive = false; stop(); };
  }, [facing]);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); } // un-mirror selfies
    ctx.drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      onCapture(new File([blob], `Photo ${stamp}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-3 text-white" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-medium">Take a photo</span>
        <button onClick={onClose} title="Close" className="p-2 rounded-full hover:bg-white/10"><FiX className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0" onClick={(e) => e.stopPropagation()}>
        {error ? (
          <div className="text-white/80 text-sm px-6 text-center">{error}</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`max-h-full max-w-full rounded-lg ${facing === 'user' ? '-scale-x-100' : ''}`}
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-8 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="w-12" />
        <button
          onClick={snap}
          disabled={!!error}
          title="Take a photo"
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg disabled:opacity-40"
        >
          <FiCamera className="w-7 h-7 text-teal-700" />
        </button>
        {canFlip ? (
          <button
            onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
            title="Switch camera"
            className="w-12 h-12 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        ) : <div className="w-12" />}
      </div>
    </div>
  );
}
