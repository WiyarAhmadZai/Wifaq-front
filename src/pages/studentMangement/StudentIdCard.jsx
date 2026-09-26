import { useEffect, useRef, useState } from "react";
import { FiDownload, FiPrinter, FiX } from "react-icons/fi";
import { get } from "../../api/axios";
import { drawCard, cardFileName, canvasToBlob, saveBlob, printCard, CARD_MM } from "./cardCanvas";

/**
 * One student's ID card: shown, downloaded, or printed.
 *
 * The card is drawn on a canvas rather than laid out in HTML. That is what
 * makes "download" mean a real PNG named after the student, and what makes
 * "print" put exactly one card on the paper — printing the page itself used to
 * send the whole list to the printer, eight sheets at a time.
 */

const TEAL = "#0D5C63";

export default function StudentIdCard({ studentId, onClose }) {
  const [card, setCard] = useState(null);
  const [png, setPng] = useState(null);       // data URL, for preview and print
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const blobRef = useRef(null);

  useEffect(() => {
    let alive = true;
    get(`/student-management/students/${studentId}/card`, { cache: false })
      .then(async (res) => {
        const d = res.data?.data;
        if (!alive) return;
        setCard(d);
        const canvas = await drawCard(d);
        if (!alive) return;
        blobRef.current = await canvasToBlob(canvas);
        setPng(canvas.toDataURL("image/png"));
      })
      .catch((e) => alive && setError(e.response?.data?.message || "This card could not be prepared."));
    return () => { alive = false; };
  }, [studentId]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = async () => {
    if (!blobRef.current || !card) return;
    setBusy(true);
    saveBlob(blobRef.current, cardFileName(card));
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-full">

        <div className="flex items-center justify-between gap-6 mb-3">
          <h3 className="text-sm font-bold" style={{ color: TEAL }}>
            Student ID card
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {error ? (
          <p className="text-sm text-gray-500 py-8 px-6">{error}</p>
        ) : !png ? (
          <div className="flex items-center justify-center" style={{ width: "120mm", height: "76mm" }}>
            <div className="animate-spin rounded-full h-7 w-7 border-4 border-teal-100 border-t-teal-500" />
          </div>
        ) : (
          <>
            {/* Shown at true size, so what is on screen is what comes out. */}
            <img src={png} alt="Student ID card"
              style={{ width: `${CARD_MM.w}mm`, height: `${CARD_MM.h}mm`, display: "block", borderRadius: "3mm" }}
              className="shadow-md" />

            <div className="flex items-center gap-2 mt-4">
              <button onClick={download} disabled={busy}
                className="flex-1 px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ background: TEAL }}>
                <FiDownload className="w-3.5 h-3.5" /> Download
              </button>
              <button onClick={() => printCard(png)}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border"
                style={{ color: TEAL, borderColor: "#9CCBCB" }}>
                <FiPrinter className="w-3.5 h-3.5" /> Print
              </button>
            </div>

            <p className="mt-3 text-[11px] text-gray-400" style={{ maxWidth: `${CARD_MM.w}mm` }}>
              The file is saved as “{card ? cardFileName(card) : ""}”. Scanning the
              code opens this student in WEN — what the scanner sees depends on
              their own account.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
