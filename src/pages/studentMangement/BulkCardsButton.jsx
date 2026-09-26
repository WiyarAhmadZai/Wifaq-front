import { useState } from "react";
import { FiDownloadCloud } from "react-icons/fi";
import Swal from "sweetalert2";
import { get } from "../../api/axios";
import { drawCard, cardFileName, canvasToBlob, saveBlob } from "./cardCanvas";
import wifaqLogo from "../../assets/wifaq-logo.png";

/**
 * Every student's ID card, in one ZIP, in one click.
 *
 * Each card is named after the student it belongs to — "احمد ولي - WEN-ST-26-0042.png"
 * — so the office never has to open a file to find out whose card it is, and
 * never has to rename anything.
 *
 * The cards are drawn in the browser, one at a time, with the progress shown:
 * four hundred of them takes a while and a frozen button would look broken.
 * Drawing them here rather than on the server also means no image library on
 * the host and no PDF pipeline to keep alive.
 */

const TEAL = "#0D5C63";

export default function BulkCardsButton() {
  const [progress, setProgress] = useState(null);   // { done, total }

  const run = async () => {
    const confirm = await Swal.fire({
      title: "Download all ID cards?",
      text: "Every enrolled student's card is prepared and saved as one ZIP file.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Download",
      confirmButtonColor: TEAL,
    });
    if (!confirm.isConfirmed) return;

    setProgress({ done: 0, total: 0 });
    try {
      const res = await get("/student-management/students/cards", { cache: false });
      const cards = res.data?.data || [];
      if (!cards.length) {
        setProgress(null);
        Swal.fire("Nothing to print", "No enrolled students were found.", "info");
        return;
      }

      setProgress({ done: 0, total: cards.length });

      // Loaded only when someone actually asks for a bulk export — it is a
      // sizeable library and no other screen needs it.
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const logo = await loadLogo();
      const used = new Map();

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        try {
          const canvas = await drawCard(card, { logo });
          const blob = await canvasToBlob(canvas);

          // Two students can share a name; the second must not overwrite the
          // first inside the archive.
          let name = cardFileName(card);
          const seen = used.get(name) || 0;
          used.set(name, seen + 1);
          if (seen) name = name.replace(/\.png$/, ` (${seen + 1}).png`);

          zip.file(name, blob);
        } catch {
          // One unreadable photo must not cost the other 399 cards.
          zip.file(`FAILED - ${cardFileName(card)}.txt`,
            `This card could not be drawn. Open the student and print it on its own.`);
        }
        setProgress({ done: i + 1, total: cards.length });
        // Let the browser paint the counter between cards.
        if (i % 5 === 4) await new Promise((r) => setTimeout(r, 0));
      }

      const out = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().slice(0, 10);
      saveBlob(out, `WEN student ID cards - ${stamp}.zip`);
      setProgress(null);
      Swal.fire({
        toast: true, position: "top-end", icon: "success",
        title: `${cards.length} card(s) downloaded`, timer: 2200, showConfirmButton: false,
      });
    } catch (e) {
      setProgress(null);
      Swal.fire("Could not download", e.response?.data?.message || "The cards could not be prepared.", "error");
    }
  };

  const running = progress !== null;

  return (
    <button
      type="button"
      onClick={run}
      disabled={running}
      title="Download an ID card for every enrolled student"
      className="px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-70"
      style={{ background: TEAL }}
    >
      <FiDownloadCloud className="w-3.5 h-3.5" />
      {running
        ? (progress.total
            ? `Preparing ${progress.done}/${progress.total}…`
            : "Fetching students…")
        : "Download all ID cards"}
    </button>
  );
}

/** Fetch the logo once for the whole batch. */
function loadLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = wifaqLogo;
  });
}
