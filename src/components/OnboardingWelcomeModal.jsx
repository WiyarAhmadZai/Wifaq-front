import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  applicationBase,
  getComposeDefaults,
  getStaffOnboarding,
  previewMessage,
  sendMessage,
  staffBase,
} from "../api/onboarding";

/**
 * The prompt HR gets the moment a candidate is hired.
 *
 * HR confirms the employee's name, ticks one or more languages (Pashto, Dari,
 * English, Arabic), reads the message back, and sends. The message carries
 * both links — the orientation material *and* the onboarding quiz.
 *
 * Two entry points, one component:
 *   • `applicationId` — the hire moment, from /recruitment/applications/:id.
 *   • `staffId`       — a re-send from /hr/staff/:id.
 */
export default function OnboardingWelcomeModal({
  applicationId = null,
  staffId = null,
  // Name we already know, so the field is never blank while the fetch runs.
  initialName = "",
  onClose,
  onSent,
}) {
  const base = applicationId ? applicationBase(applicationId) : staffBase(staffId);

  const [loading, setLoading] = useState(true);
  const [defaults, setDefaults] = useState(null);
  const [name, setName] = useState(initialName);
  const [langs, setLangs] = useState([]);
  const [customBody, setCustomBody] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const [preview, setPreview] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Guards a stale preview response from overwriting a newer one.
  const previewSeq = useRef(0);

  // ── Load the defaults ─────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = applicationId
          ? await getComposeDefaults(applicationId)
          : await getStaffOnboarding(staffId);
        if (!alive) return;

        const payload = applicationId ? res.data?.data : res.data?.data?.defaults;
        setDefaults(payload || null);
        setName((prev) => payload?.name || prev || "");
        setLangs(payload?.default_languages?.length ? payload.default_languages : ["fa"]);
      } catch (e) {
        if (alive) {
          setError(
            e?.response?.status === 403
              ? "You do not have permission to send the welcome message."
              : e?.response?.data?.message || "Could not load the welcome message."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [applicationId, staffId]);

  // ── Live preview whenever name / languages / body change ──────────────────
  const trimmedName = name.trim();
  const bodyToSend = useCustom && customBody.trim() ? customBody.trim() : null;

  useEffect(() => {
    if (!trimmedName || langs.length === 0) {
      setPreview([]);
      return;
    }

    const seq = ++previewSeq.current;
    // Debounced: HR types the name a character at a time.
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await previewMessage(base, {
          name: trimmedName,
          languages: langs,
          custom_body: bodyToSend,
        });
        if (seq === previewSeq.current) setPreview(res.data?.data?.blocks || []);
      } catch {
        if (seq === previewSeq.current) setPreview([]);
      } finally {
        if (seq === previewSeq.current) setPreviewing(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [base, trimmedName, langs, bodyToSend]);

  const toggleLang = useCallback((code) => {
    setLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }, []);

  const ctx = defaults?.context;
  const canSend = !!trimmedName && langs.length > 0 && !sending && !loading;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await sendMessage(base, {
        name: trimmedName,
        languages: langs,
        custom_body: bodyToSend,
        email: defaults?.email || undefined,
        phone: defaults?.phone || undefined,
      });

      if (res.data?.success) {
        onSent?.(res.data.data);
        onClose?.();
        Swal.fire({
          title: "Welcome message sent",
          text: res.data.message,
          icon: "success",
          timer: 2600,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      Swal.fire(
        "Not sent",
        e?.response?.data?.message || "Could not send the welcome message.",
        "error"
      );
    } finally {
      setSending(false);
    }
  };

  const copyAll = async () => {
    const text = preview.map((b) => b.text).join("\n\n———\n\n");
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire({ title: "Copied", icon: "success", timer: 1400, showConfirmButton: false });
    } catch {
      Swal.fire("Could not copy", "Select the text and copy it manually.", "info");
    }
  };

  // Esc closes, matching every other modal in the app.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const langList = useMemo(() => defaults?.languages || [], [defaults]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-3.5 bg-teal-800 text-white">
          <div className="min-w-0">
            <h2 className="text-sm font-bold">Send the welcome message</h2>
            <p className="text-teal-200 text-[11px]">
              Orientation link and onboarding quiz, in the languages you choose.
            </p>
          </div>
          <button onClick={onClose} className="text-teal-200 hover:text-white shrink-0" title="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-9 w-9 border-4 border-teal-100 border-t-teal-600" />
            </div>
          )}

          {!loading && error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && (
            <>
              {/* Employee name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Employee name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name as it should appear in the message"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
                {defaults?.email ? (
                  <p className="mt-1 text-[11px] text-gray-500">Sending to {defaults.email}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-amber-600">
                    No email on file — add one to the record before sending.
                  </p>
                )}
              </div>

              {/* Languages */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Language(s) <span className="text-red-500">*</span>
                  <span className="ml-1.5 font-normal text-gray-500">
                    pick one or more — the message repeats in each
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {langList.map((l) => {
                    const on = langs.includes(l.code);
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => toggleLang(l.code)}
                        aria-pressed={on}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                          on
                            ? "bg-teal-600 border-teal-600 text-white"
                            : "bg-white border-gray-300 text-gray-700 hover:border-teal-400"
                        }`}
                      >
                        <span className="text-sm">{l.label}</span>
                        <span className={`ml-1.5 ${on ? "text-teal-100" : "text-gray-400"}`}>
                          {l.english}
                        </span>
                        {on && (
                          <span className="ml-1.5 text-[10px] opacity-80">
                            #{langs.indexOf(l.code) + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {langs.length === 0 && (
                  <p className="mt-1 text-[11px] text-red-600">Choose at least one language.</p>
                )}
              </div>

              {/* What goes in the message */}
              {ctx && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[11px] font-bold text-gray-700 mb-1">1 · Orientation material</p>
                    <p className="text-[11px] text-gray-600 break-all">{ctx.orientation_url}</p>
                    <p className="text-[11px] text-gray-600 mt-1">
                      Password <span className="font-mono font-bold">{ctx.orientation_password}</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-teal-300 bg-teal-50 p-3">
                    <p className="text-[11px] font-bold text-teal-800 mb-1">2 · Onboarding quiz</p>
                    <p className="text-[11px] text-teal-700 break-all">{ctx.quiz_url}</p>
                    <p className="text-[11px] text-teal-700 mt-1">
                      Pass {ctx.quiz_pass_mark}% · {ctx.quiz_max_attempts} attempts · due {ctx.quiz_deadline}
                    </p>
                  </div>
                </div>
              )}

              {/* Optional own words */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={useCustom}
                    onChange={(e) => setUseCustom(e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  Replace the standard wording with my own
                </label>
                {useCustom && (
                  <>
                    <textarea
                      rows={3}
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      maxLength={2000}
                      placeholder="Your own note. The links, password and deadline are still added underneath."
                      className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                    <p className="mt-1 text-[11px] text-amber-600">
                      The same text is used for every language you ticked — it is not translated.
                    </p>
                  </>
                )}
              </div>

              {/* Read it back */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    What the employee will receive
                  </label>
                  {preview.length > 0 && (
                    <button
                      type="button"
                      onClick={copyAll}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900"
                    >
                      Copy text
                    </button>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 divide-y divide-gray-200 bg-white max-h-64 overflow-y-auto">
                  {previewing && preview.length === 0 && (
                    <p className="p-3 text-xs text-gray-500">Building preview…</p>
                  )}
                  {!previewing && preview.length === 0 && (
                    <p className="p-3 text-xs text-gray-500">
                      Enter a name and pick a language to see the message.
                    </p>
                  )}
                  {preview.map((b) => (
                    <div key={b.lang} className="p-3">
                      <span className="inline-block mb-1.5 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold">
                        {b.label}
                      </span>
                      <pre
                        dir={b.dir}
                        className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-gray-700"
                        style={{ textAlign: b.dir === "rtl" ? "right" : "left" }}
                      >
                        {b.text}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {sending ? "Sending…" : "Send welcome message"}
          </button>
        </div>
      </div>
    </div>
  );
}
