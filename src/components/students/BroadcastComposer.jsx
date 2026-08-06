import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { previewBroadcast } from "../../api/studentAttendance";

/**
 * Compose box for messaging parents about an absence or early departure.
 *
 * Two things it guarantees:
 *
 *  1. The child's record — name, class, date, what was recorded and why — is
 *     ALWAYS in the message. The note is added to it, never instead of it, so
 *     a parent can never receive "please call the school" with no idea which
 *     child it concerns.
 *  2. The preview is the real message. It comes from the same server method
 *     that sends, rather than the frontend re-creating the wording and
 *     drifting from it the first time someone edits the template.
 */
const STATUS_LABEL = {
  absent:   { text: "Absent", cls: "bg-red-50 text-red-700 border-red-200" },
  half_day: { text: "Left early", cls: "bg-amber-50 text-amber-800 border-amber-200" },
};

export default function BroadcastComposer({ channel, attendanceIds, onClose, onSend, sending }) {
  const isEmail = channel === "email";
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Which recipient's message is shown in full.
  const [openIdx, setOpenIdx] = useState(0);

  // Debounced: re-composing on every keystroke would be a request per letter.
  const [debouncedNote, setDebouncedNote] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedNote(note), 400);
    return () => clearTimeout(t);
  }, [note]);

  const load = useCallback(async () => {
    if (!attendanceIds?.length) return;
    setLoading(true);
    setError(null);
    try {
      const r = await previewBroadcast({ attendance_ids: attendanceIds, note: debouncedNote || null });
      setPreview(r.data?.data || null);
    } catch (e) {
      setError(e.response?.data?.message || "Could not build the preview.");
    } finally {
      setLoading(false);
    }
  }, [attendanceIds, debouncedNote]);

  useEffect(() => { load(); }, [load]);

  // Memoised so the `reachable` filter below isn't recomputed on every render
  // by a fresh [] literal.
  const rows = useMemo(() => preview?.rows || [], [preview]);

  // Who this channel can actually reach. Showing a "send to 8" button when
  // only 3 have an address is how a school thinks it told everybody.
  const reachable = useMemo(
    () => rows.filter((r) => (isEmail ? r.email : r.phone)),
    [rows, isEmail]
  );
  const unreachable = rows.length - reachable.length;

  const shown = rows[openIdx] || rows[0];

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className={`px-5 py-4 border-b border-gray-100 ${isEmail ? "bg-blue-50/60" : "bg-green-50/60"}`}>
          <h3 className={`text-sm font-bold ${isEmail ? "text-blue-900" : "text-green-900"}`}>
            {isEmail ? "Email parents" : "WhatsApp parents"}
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Each parent gets their own child's record. Add a message below — it is added to the
            record, not instead of it.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">{error}</div>
          )}

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase">
                Recipients — {reachable.length} of {rows.length}
              </label>
              {unreachable > 0 && (
                <span className="text-[10px] text-amber-700 font-semibold">
                  {unreachable} without {isEmail ? "an email address" : "a phone number"} — skipped
                </span>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
              {loading && rows.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-400">Loading…</p>
              ) : rows.map((r, i) => {
                const can = isEmail ? r.email : r.phone;
                const st = STATUS_LABEL[r.status] || STATUS_LABEL.absent;
                return (
                  <button key={r.attendance_id} type="button" onClick={() => setOpenIdx(i)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition ${
                      i === openIdx ? "bg-teal-50" : "hover:bg-gray-50"} ${can ? "" : "opacity-50"}`}>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {r.student}
                        {r.class && <span className="font-normal text-gray-400"> · {r.class}</span>}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {can || (isEmail ? "no email on file" : "no phone on file")}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border flex-shrink-0 ${st.cls}`}>
                      {st.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* The school's own words */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
              Your message <span className="normal-case font-normal text-gray-400">(optional)</span>
            </label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000}
              placeholder="e.g. Please send a written excuse with your child tomorrow, or call the office on 0700 000 000."
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
            <p className="text-[10px] text-gray-400 mt-1">
              {note.length}/1000 · Leave blank to use the standard closing line.
            </p>
          </div>

          {/* Exactly what goes out */}
          {shown && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                Preview — what {shown.student}&apos;s parent receives
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                <pre className="text-[11px] text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
{shown.message}
                </pre>
              </div>
              {rows.length > 1 && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Pick another recipient above to see theirs — each message names their own child.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-500">
            {isEmail
              ? "Sent from the school's email address."
              : "Opens a WhatsApp chat per parent with the message ready to send."}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={sending}
              className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={() => onSend(note.trim() || null)}
              disabled={sending || loading || reachable.length === 0}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                isEmail ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}>
              {sending ? "Working…" : isEmail ? `Send ${reachable.length} email(s)` : `Open ${reachable.length} chat(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
