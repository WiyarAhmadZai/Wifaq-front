import { useEffect, useRef, useState } from "react";
import { sanitizeHtml, isRichText } from "../utils/richText";

/**
 * A basic rich-text field — bold, italic, underline, headings, lists, links —
 * that drops in wherever a description <textarea> used to be.
 *
 * Built on contentEditable with no library, so it adds nothing to the bundle
 * and needs no install. The value it hands back is HTML; `richTextToPlain`
 * below turns that into text for list rows and email subjects, and
 * `RichTextView` renders it safely wherever the description is shown.
 *
 * `value` / `onChange(html)` mirror a controlled input so the swap in each
 * form is one line. Plain text saved before this existed (no tags) is shown
 * as-is with its line breaks kept.
 */

const TEAL = "#0D5C63";

/** Read-only renderer. Legacy plain text keeps its line breaks. */
export function RichTextView({ html, className = "", style, dir = "auto" }) {
  if (!html) return null;
  if (!isRichText(html)) {
    return <div dir={dir} className={`whitespace-pre-wrap ${className}`} style={style}>{html}</div>;
  }
  return (
    <div dir={dir} className={`rich-text ${className}`} style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
  );
}

const TOOLS = [
  { cmd: "bold", label: "B", title: "Bold", cls: "font-black" },
  { cmd: "italic", label: "I", title: "Italic", cls: "italic" },
  { cmd: "underline", label: "U", title: "Underline", cls: "underline" },
  { sep: true },
  { cmd: "formatBlock", arg: "H2", label: "H1", title: "Heading" },
  { cmd: "formatBlock", arg: "H3", label: "H2", title: "Sub-heading" },
  { cmd: "formatBlock", arg: "P", label: "¶", title: "Normal text" },
  { sep: true },
  { cmd: "insertUnorderedList", label: "•", title: "Bulleted list" },
  { cmd: "insertOrderedList", label: "1.", title: "Numbered list" },
  { sep: true },
  { cmd: "link", label: "🔗", title: "Link" },
  { cmd: "removeFormat", label: "✕", title: "Clear formatting" },
];

export default function RichTextField({
  value, onChange, placeholder = "", rows = 4, dir = "auto", required = false, className = "", id, name,
}) {
  const box = useRef(null);
  const [focused, setFocused] = useState(false);
  const minH = `${Math.max(3, rows) * 1.6}rem`;

  /* Push the prop into the editor only when it actually differs from what is
     on screen — writing innerHTML on every keystroke would throw the caret
     back to the start. */
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const incoming = value == null ? "" : String(value);
    const asHtml = isRichText(incoming) ? sanitizeHtml(incoming) : incoming.replace(/\n/g, "<br>");
    if (el.innerHTML !== asHtml && document.activeElement !== el) el.innerHTML = asHtml;
  }, [value]);

  const emit = () => {
    const el = box.current;
    if (!el) return;
    const html = sanitizeHtml(el.innerHTML);
    // An editor that only contains an empty paragraph or a <br> is empty.
    const bare = html.replace(/<br\s*\/?>|<\/?(p|div)>|&nbsp;|\s/gi, "");
    onChange(bare ? html : "");
  };

  const run = (t) => {
    box.current?.focus();
    if (t.cmd === "link") {
      const url = window.prompt("Link address (https://…)");
      if (url && /^https?:\/\//i.test(url)) document.execCommand("createLink", false, url);
      else if (url) window.alert("Please enter a full address starting with http:// or https://");
    } else {
      document.execCommand(t.cmd, false, t.arg);
    }
    emit();
  };

  const empty = !value;

  return (
    <div className={`rounded-xl border bg-white overflow-hidden transition-shadow ${className}`}
      style={{ borderColor: focused ? TEAL : "#D0E0E0", boxShadow: focused ? "0 0 0 2px #9CCBCB" : "none" }}>
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1 border-b" style={{ borderColor: "#EEF4F4", background: "#FAFCFC" }}>
        {TOOLS.map((t, i) => t.sep
          ? <span key={i} className="w-px h-4 mx-1" style={{ background: "#D0E0E0" }} />
          : (
            <button key={t.title} type="button" title={t.title} tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}   /* keep the selection alive */
              onClick={() => run(t)}
              className={`min-w-[1.75rem] h-7 px-1.5 rounded-md text-xs text-gray-600 hover:bg-white hover:text-teal-700 hover:shadow-sm ${t.cls || ""}`}>
              {t.label}
            </button>
          ))}
      </div>

      {/* Editor */}
      <div className="relative">
        {empty && !focused && (
          <div className="absolute inset-0 px-3 py-2 text-sm text-gray-400 pointer-events-none" dir={dir}>{placeholder}</div>
        )}
        <div ref={box} id={id} data-name={name} contentEditable suppressContentEditableWarning
          dir={dir} role="textbox" aria-multiline="true" aria-required={required || undefined}
          onInput={emit} onBlur={() => { setFocused(false); emit(); }} onFocus={() => setFocused(true)}
          onPaste={(e) => {
            // Paste as sanitised HTML or plain text — never Word's <o:p> soup.
            e.preventDefault();
            const html = e.clipboardData.getData("text/html");
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertHTML", false, html ? sanitizeHtml(html) : text.replace(/\n/g, "<br>"));
            emit();
          }}
          className="rich-text px-3 py-2 text-sm outline-none overflow-y-auto"
          style={{ minHeight: minH, maxHeight: "60vh", color: "#0A3A3E" }} />
      </div>

    </div>
  );
}
