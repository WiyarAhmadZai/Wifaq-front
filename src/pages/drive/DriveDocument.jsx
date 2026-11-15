import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { FiArrowLeft, FiSave, FiPrinter, FiCheck, FiLock } from "react-icons/fi";
import RichTextField, { RichTextView } from "../../components/RichTextField";
import { getDocument, saveDocument } from "../../api/drive";

/**
 * A document written in Drive — the basic word processor the module was
 * missing.
 *
 * Everything the editor can do is what RichTextField already does: headings,
 * bullets and numbers, colours and highlights, fonts and sizes, alignment,
 * links, and per-paragraph direction so a Pashto page and an English page can
 * be the same page. Nothing new was invented here; the document simply gets
 * the whole width instead of a form field's four rows.
 *
 * Saving is manual AND automatic: manual because people expect a Save button,
 * automatic a few seconds after typing stops because people also expect not to
 * lose a page to a closed tab. A viewer without edit rights gets the document
 * read-only rather than a Save button that would be refused.
 */

const TEAL = "#0D5C63";
const AUTOSAVE_MS = 4000;

export default function DriveDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [doc, setDoc] = useState(null);
  const [name, setName] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  /* What is already on the server. Comparing against it is what stops the
     autosave firing on a document nobody has touched. */
  const clean = useRef({ name: "", html: "" });
  const timer = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getDocument(id)
      .then((res) => {
        if (!alive) return;
        const d = res.data?.data;
        setDoc(d);
        setName(d?.name || "");
        setHtml(d?.content || "");
        clean.current = { name: d?.name || "", html: d?.content || "" };
      })
      .catch((e) => alive && setError(e.response?.data?.message || "This document could not be opened."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  const dirty = name !== clean.current.name || html !== clean.current.html;

  const save = useCallback(async (quiet = false) => {
    if (!doc?.can_edit) return;
    const payload = { name: name.trim() || "Untitled document", content: html };
    setSaving(true);
    try {
      await saveDocument(id, payload);
      clean.current = { name: payload.name, html };
      setSavedAt(new Date());
      if (!quiet) {
        Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Saved", timer: 1200, showConfirmButton: false });
      }
    } catch (e) {
      Swal.fire("Not saved", e.response?.data?.message || "The document could not be saved.", "error");
    } finally {
      setSaving(false);
    }
  }, [doc, id, name, html]);

  // Autosave a few seconds after typing stops.
  useEffect(() => {
    if (!doc?.can_edit || !dirty) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(true), AUTOSAVE_MS);
    return () => clearTimeout(timer.current);
  }, [doc, dirty, save]);

  // Ctrl+S, and a warning before an unsaved document is closed.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    };
    const onLeave = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onLeave); };
  }, [dirty, save]);

  const back = () => {
    const folder = params.get("folder");
    navigate(folder ? `/drive?tab=files&folder=${folder}` : "/drive?tab=files");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-10 text-center">
        <p className="text-sm text-gray-500">{error}</p>
        <button onClick={back} className="mt-4 text-sm font-semibold text-teal-700 hover:underline">Back to Drive</button>
      </div>
    );
  }

  const readOnly = !doc?.can_edit;

  return (
    <div className="px-4 sm:px-6 py-4 max-w-5xl mx-auto">
      {/* Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={back} title="Back to Drive"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <FiArrowLeft className="w-4 h-4" />
        </button>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={readOnly}
          dir="auto"
          placeholder="Untitled document"
          className="flex-1 min-w-[12rem] px-3 py-2 text-base font-bold bg-transparent border border-transparent hover:border-gray-200 focus:border-teal-500 rounded-lg outline-none read-only:hover:border-transparent"
          style={{ color: "#0A3A3E" }}
        />

        <span className="text-[11px] text-gray-400 whitespace-nowrap">
          {readOnly ? (
            <span className="inline-flex items-center gap-1"><FiLock className="w-3 h-3" /> Read only</span>
          ) : saving ? "Saving…"
            : dirty ? "Unsaved changes"
            : savedAt ? <span className="inline-flex items-center gap-1"><FiCheck className="w-3 h-3 text-teal-600" /> Saved</span>
            : doc?.edited_by ? `Last saved by ${doc.edited_by}` : ""}
        </span>

        <button onClick={() => window.print()} title="Print"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <FiPrinter className="w-4 h-4" />
        </button>

        {!readOnly && (
          <button onClick={() => save()} disabled={saving || !dirty}
            className="px-4 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: TEAL }}>
            <FiSave className="w-3.5 h-3.5" /> Save
          </button>
        )}
      </div>

      {/* The page */}
      {readOnly ? (
        <div className="bg-white border rounded-xl px-6 py-6 min-h-[60vh]" style={{ borderColor: "#D0E0E0" }}>
          <RichTextView html={html} className="text-sm leading-relaxed" />
        </div>
      ) : (
        <RichTextField
          value={html}
          onChange={setHtml}
          rows={22}
          placeholder="Start writing. Use the toolbar for headings, colours, lists and right-to-left text."
        />
      )}

      <p className="mt-2 text-[11px] text-gray-400">
        {readOnly
          ? `Created by ${doc?.created_by || "—"}.`
          : "Saves automatically a few seconds after you stop typing. Ctrl+S saves now."}
      </p>
    </div>
  );
}
