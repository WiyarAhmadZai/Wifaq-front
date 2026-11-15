import { useCallback, useEffect, useRef, useState } from "react";
import { get, post, put } from "../api/axios";
import Swal from "sweetalert2";

/**
 * Experience (exit) letter — view, complete, finalize, print, download.
 *
 * Two modes:
 *   • `letterId` — HR. A draft shows the contribution-paragraph editor and a
 *     Finalize button; a final letter is read-only and locked.
 *   • `selfMode` — the departing staff member's own copy, read-only, shown once
 *     on/after their contract end date.
 *
 * As with the welcome letter the document renders in an <iframe> so its RTL
 * direction and print layout stay isolated from the app's Tailwind styles.
 */

const LANGS = [
  { code: "en", label: "English" },
  { code: "fa", label: "دری" },
  { code: "ps", label: "پښتو" },
];

export default function ExperienceLetterModal({
  letterId = null,
  staffName = "",
  selfMode = false,
  defaultLang = "fa",
  initialLetters = null,
  canEdit = false,
  onClose,
  onSaved,
}) {
  const [lang, setLang] = useState(defaultLang);
  const [letters, setLetters] = useState(initialLetters || {});
  const [meta, setMeta] = useState(null); // status, contribution_note, dates…
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(!initialLetters);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // 'save' | 'finalize' | 'pdf'
  const frameRef = useRef(null);

  const html = letters[lang];
  const isDraft = meta ? meta.status === "draft" : false;
  const editable = !selfMode && canEdit && isDraft;

  // ── Load the letter's metadata once (HR mode only) ────────────────────────
  useEffect(() => {
    if (selfMode || !letterId) return;
    let alive = true;
    get(`/hr/staff-letters/${letterId}?format=json`, { cache: false })
      .then((res) => {
        if (!alive) return;
        const d = res.data?.data;
        setMeta(d);
        setNote(d?.contribution_note || "");
        if (d?.lang) setLang(d.lang);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [letterId, selfMode]);

  // ── Load the rendered letter for the active language ──────────────────────
  const loadHtml = useCallback(
    async (force = false) => {
      if (!force && letters[lang]) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (selfMode) {
          const res = await get("/profile/experience-letter", { cache: false });
          const d = res.data?.data;
          const map = {};
          Object.entries(d?.letters || {}).forEach(([code, v]) => {
            map[code] = v.html;
          });
          setLetters(map);
        } else {
          const res = await get(`/hr/staff-letters/${letterId}?lang=${lang}`, {
            cache: false,
            headers: { Accept: "text/html" },
            responseType: "text",
          });
          setLetters((prev) => ({ ...prev, [lang]: res.data }));
        }
      } catch (e) {
        setError(
          e?.response?.status === 403
            ? "You do not have permission to view this letter."
            : "Could not load the experience letter."
        );
      } finally {
        setLoading(false);
      }
    },
    // `letters` is read but intentionally not a dep — including it re-runs the
    // effect on every fetch and loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, letterId, selfMode]
  );

  useEffect(() => {
    loadHtml();
  }, [loadHtml]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setBusy("save");
    try {
      const res = await put(`/hr/staff-letters/${letterId}`, { contribution_note: note });
      setMeta(res.data?.data);
      // The paragraph is part of the document — re-render every cached copy.
      setLetters({});
      await loadHtml(true);
      onSaved?.();
    } catch (e) {
      setError(e?.response?.data?.message || "Could not save the paragraph.");
    } finally {
      setBusy(null);
    }
  }, [letterId, note, loadHtml, onSaved]);

  const handleFinalize = useCallback(async () => {
    const ok = await Swal.fire({
      title: "Finalize this letter?",
      text: "Once finalized it is locked — no further edits — and becomes visible to the staff member.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, finalize",
    });
    if (!ok.isConfirmed) return;

    setBusy("finalize");
    try {
      // Save any unsaved edit first, so Finalize never validates against stale
      // text the user can see in the textarea.
      if (note !== (meta?.contribution_note || "")) {
        await put(`/hr/staff-letters/${letterId}`, { contribution_note: note });
      }
      const res = await post(`/hr/staff-letters/${letterId}/finalize`);
      setMeta(res.data?.data);
      setLetters({});
      await loadHtml(true);
      onSaved?.();
      Swal.fire({ icon: "success", title: "Finalized", timer: 1400, showConfirmButton: false });
    } catch (e) {
      setError(e?.response?.data?.message || "Could not finalize the letter.");
    } finally {
      setBusy(null);
    }
  }, [letterId, note, meta, loadHtml, onSaved]);

  /**
   * Email the letter to the departing staff member. Backend refuses a draft,
   * so the button only appears once the letter is final.
   */
  const handleEmail = useCallback(async () => {
    const ok = await Swal.fire({
      title: "Email this letter?",
      html: `It will be sent in <b>${LANGS.find((l) => l.code === lang)?.label}</b> to the address on their staff record, with the PDF attached.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Send it",
    });
    if (!ok.isConfirmed) return;

    setBusy("email");
    try {
      const res = await post(`/hr/staff-letters/${letterId}/send`, { lang });
      Swal.fire({
        icon: "success",
        title: "Sent",
        text: res.data?.message || "The letter has been queued.",
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Could not send",
        text: e?.response?.data?.message || "Please try again.",
      });
    } finally {
      setBusy(null);
    }
  }, [letterId, lang]);

  const handlePrint = useCallback(() => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }, []);

  const handleDownload = useCallback(async () => {
    setBusy("pdf");
    try {
      const url = selfMode
        ? `/profile/experience-letter/pdf?lang=${lang}`
        : `/hr/staff-letters/${letterId}?lang=${lang}&format=pdf`;
      const res = await get(url, {
        cache: false,
        responseType: "blob",
        headers: { Accept: "application/pdf" },
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const slug = (staffName || meta?.staff_name || "staff").trim().toLowerCase().replace(/\s+/g, "-");
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `experience-letter-${slug}-${lang}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setBusy(null);
    }
  }, [lang, selfMode, letterId, staffName, meta]);

  const handleClose = useCallback(async () => {
    if (selfMode) {
      try {
        await post("/profile/experience-letter/ack");
      } catch {
        // Non-fatal: worst case they see it once more.
      }
    }
    onClose?.();
  }, [selfMode, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const displayName = staffName || meta?.staff_name || "";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-teal-800 text-white">
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate flex items-center gap-2">
              Experience Letter
              {meta && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                    isDraft ? "bg-amber-400 text-amber-900" : "bg-emerald-400 text-emerald-900"
                  }`}
                >
                  {meta.status}
                </span>
              )}
            </h2>
            {displayName && <p className="text-teal-200 text-[11px] truncate">{displayName}</p>}
          </div>

          <div className="flex items-center gap-1 bg-teal-900/50 rounded-lg p-0.5 shrink-0">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  lang === l.code ? "bg-white text-teal-800" : "text-teal-100 hover:text-white"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button onClick={handleClose} className="text-teal-200 hover:text-white shrink-0" title="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contribution paragraph — the one part HR must write per person */}
        {editable && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
            <label className="block text-[11px] font-bold text-amber-900 mb-1">
              Contribution paragraph <span className="font-normal">— specific to this person, not generic</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="What did they actually contribute? e.g. Led the Grade 7 maths team, mentored four new teachers, and rebuilt the science lab schedule."
              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-amber-700">{note.length}/5000</span>
              <button
                onClick={handleSave}
                disabled={busy !== null}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
              >
                {busy === "save" ? "Saving…" : "Save & preview"}
              </button>
            </div>
          </div>
        )}

        {/* Letter */}
        <div className="flex-1 min-h-0 bg-[#F0EEE9]">
          {loading && (
            <div className="h-full min-h-[45vh] flex items-center justify-center">
              <div className="animate-spin rounded-full h-9 w-9 border-4 border-teal-100 border-t-teal-600" />
            </div>
          )}
          {!loading && error && (
            <div className="h-full min-h-[45vh] flex items-center justify-center px-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {!loading && !error && html && (
            <iframe
              ref={frameRef}
              srcDoc={html}
              title="Experience letter"
              className={`w-full border-0 bg-white ${editable ? "h-[45vh]" : "h-[62vh]"}`}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-200 bg-white">
          <p className="text-[10px] text-gray-400 truncate">
            {meta?.finalized_by
              ? `Finalized by ${meta.finalized_by}`
              : isDraft && !selfMode
                ? "Draft — the staff member cannot see this yet."
                : ""}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            {editable && (
              <button
                onClick={handleFinalize}
                disabled={busy !== null}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                {busy === "finalize" ? "Finalizing…" : "Finalize"}
              </button>
            )}
            {/* Emailing a draft is refused server-side, so only offer it once
                the letter is final. */}
            {!selfMode && meta && !isDraft && (
              <button
                onClick={handleEmail}
                disabled={busy !== null}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
                title="Email the letter to the staff member"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {busy === "email" ? "Sending…" : "Email to staff"}
              </button>
            )}
            <button
              onClick={handlePrint}
              disabled={loading || !!error}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 disabled:opacity-40 transition-colors"
            >
              Print
            </button>
            <button
              onClick={handleDownload}
              disabled={loading || !!error || busy !== null}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors"
            >
              {busy === "pdf" ? "Preparing…" : "Download PDF"}
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {selfMode ? "Got it" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
