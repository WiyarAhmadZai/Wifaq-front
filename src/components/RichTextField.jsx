import { useEffect, useRef, useState } from "react";
import { sanitizeHtml, isRichText, decodeEntities } from "../utils/richText";
import { translate } from "../i18n/I18nContext";

/**
 * A rich-text field — bold/italic/underline/strike, headings, quote, bullet
 * and numbered lists, alignment, per-paragraph writing direction (so a Pashto
 * line and an English line can sit in the same description), text and
 * highlight colours, font family and size, links — that drops in wherever a
 * description <textarea> used to be.
 *
 * Built on contentEditable with no library, so it adds nothing to the bundle
 * and needs no install. The value it hands back is HTML that has been through
 * `sanitizeHtml`, which is also what `RichTextView` renders, so nothing a
 * browser or a paste emits reaches the page unfiltered.
 *
 * `value` / `onChange(html)` mirror a controlled input so the swap in each
 * form is one line. Plain text saved before this existed (no tags) is shown
 * as-is with its line breaks kept.
 */

const TEAL = "#0D5C63";
const GOLD = "#C9A227";

/** Read-only renderer. Legacy plain text keeps its line breaks. */
export function RichTextView({ html, className = "", style, dir = "auto" }) {
  if (!html) return null;
  if (!isRichText(html)) {
    /* No markup, so it is printed as text — but it may still carry entities
       from before spaces were normalised, and printing those verbatim is how
       a message came to end in a visible "&nbsp;". */
    return <div dir={dir} className={`whitespace-pre-wrap ${className}`} style={style}>{decodeEntities(html)}</div>;
  }
  return (
    <div dir={dir} className={`rich-text ${className}`} style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
  );
}

/* ── Toolbar definition ────────────────────────────────────────────────── */

const FONTS = [
  { label: "Default font", value: "" },
  { label: "Vazirmatn (Pashto / Dari)", value: "Vazirmatn, 'Noto Naskh Arabic', Tahoma, sans-serif" },
  { label: "Noto Naskh Arabic", value: "'Noto Naskh Arabic', Tahoma, serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Segoe UI", value: "'Segoe UI', Arial, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Poppins", value: "Poppins, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

/* execCommand sizes are 1–7; the sanitizer turns them into em values. */
const SIZES = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "5" },
  { label: "Huge", value: "7" },
];

const TEXT_COLOURS = [
  "#0A3A3E", "#000000", "#6B7280", TEAL, GOLD, "#B91C1C",
  "#C2410C", "#15803D", "#1D4ED8", "#7E22CE", "#DB2777", "#FFFFFF",
];
const HIGHLIGHTS = [
  "transparent", "#FEF3C7", "#FDE68A", "#DCFCE7", "#DBEAFE", "#E0F2F1",
  "#F3E8FF", "#FCE7F3", "#FEE2E2", "#F3F4F6", "#E5E7EB", "#0D5C6322",
];

/* Blocks that carry a writing direction. Matches BLOCKS in utils/richText. */
const BLOCK_SEL = "p,div,h2,h3,blockquote,ul,ol,li";

const GROUPS = [
  [
    { cmd: "bold", label: "B", title: "Bold", cls: "font-black", key: "bold" },
    { cmd: "italic", label: "I", title: "Italic", cls: "italic", key: "italic" },
    { cmd: "underline", label: "U", title: "Underline", cls: "underline", key: "underline" },
    { cmd: "strikeThrough", label: "S", title: "Strikethrough", cls: "line-through", key: "strikeThrough" },
  ],
  [
    { cmd: "formatBlock", arg: "H2", label: "H1", title: "Heading", cls: "font-bold" },
    { cmd: "formatBlock", arg: "H3", label: "H2", title: "Sub-heading", cls: "font-semibold" },
    { cmd: "formatBlock", arg: "P", label: "¶", title: "Normal text" },
    { cmd: "formatBlock", arg: "BLOCKQUOTE", label: "❝", title: "Quote" },
  ],
  [
    { cmd: "insertUnorderedList", label: "•≡", title: "Bulleted list", key: "insertUnorderedList" },
    { cmd: "insertOrderedList", label: "1≡", title: "Numbered list", key: "insertOrderedList" },
  ],
  [
    { cmd: "justifyLeft", label: "⇤", title: "Align left", key: "justifyLeft" },
    { cmd: "justifyCenter", label: "☰", title: "Center", key: "justifyCenter" },
    { cmd: "justifyRight", label: "⇥", title: "Align right", key: "justifyRight" },
  ],
  [
    { cmd: "dir", arg: "ltr", label: "LTR", title: "Left to right", key: "dir:ltr" },
    { cmd: "dir", arg: "rtl", label: "RTL", title: "Right to left", key: "dir:rtl" },
  ],
  [
    { cmd: "link", label: "🔗", title: "Link" },
    { cmd: "removeFormat", label: "✕", title: "Clear formatting" },
  ],
  [
    { cmd: "undo", label: "↶", title: "Undo" },
    { cmd: "redo", label: "↷", title: "Redo" },
  ],
];

const BTN = "min-w-[1.75rem] h-7 px-1.5 rounded-md text-xs text-gray-600 hover:bg-white hover:text-teal-700 hover:shadow-sm";
const SELECT = "h-7 rounded-md border bg-white text-xs text-gray-700 px-1 outline-none focus:border-teal-600";

/* ── Colour popover ────────────────────────────────────────────────────── */

function ColourPicker({ icon, title, colours, current, onPick, noneLabel, remember }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button type="button" title={title} tabIndex={-1}
        onMouseDown={(e) => { remember(); e.preventDefault(); }}
        onClick={() => setOpen((o) => !o)}
        className={`${BTN} flex flex-col items-center justify-center leading-none`}>
        <span className="text-[13px] font-bold">{icon}</span>
        <span className="block w-4 h-1 rounded-sm mt-0.5" style={{ background: current || "#9CA3AF" }} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 p-2 rounded-lg border bg-white shadow-lg w-40 start-0"
          style={{ borderColor: "#D0E0E0" }}>
          <div className="grid grid-cols-6 gap-1">
            {colours.map((c) => (
              <button key={c} type="button" tabIndex={-1}
                title={c === "transparent" ? noneLabel : c}
                onMouseDown={(e) => e.preventDefault()}   /* keep the selection alive */
                onClick={() => { onPick(c); setOpen(false); }}
                className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                style={{
                  background: c === "transparent" ? "repeating-linear-gradient(45deg,#fff 0 3px,#E5E7EB 3px 6px)" : c,
                  borderColor: c === "#FFFFFF" || c === "transparent" ? "#D0E0E0" : "transparent",
                }} />
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11px] text-gray-600 cursor-pointer">
            <input type="color" className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
              onMouseDown={remember}   /* the native dialog takes focus; keep the range */
              onChange={(e) => { onPick(e.target.value); setOpen(false); }} />
            <span>Custom colour…</span>
          </label>
        </div>
      )}
    </div>
  );
}

/* ── The field ─────────────────────────────────────────────────────────── */

export default function RichTextField({
  value, onChange, placeholder = "", rows = 4, dir = "auto", required = false, className = "", id, name,
  /* Chat's variant: the box has to sit in a row of icons and stay one line
     tall until someone writes more, and its toolbar opens on demand from the
     composer's own "Aa" button rather than standing permanently above a
     one-line message. Forms pass none of this and are unaffected. */
  compact = false, showToolbar, onKeyDown, onPasteFiles, autoFocus = false,
}) {
  const box = useRef(null);
  const saved = useRef(null);                 // selection kept across native pickers
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState({});    // which toolbar states apply at the caret
  const minH = compact ? "1.5rem" : `${Math.max(3, rows) * 1.6}rem`;
  // Undefined means "always on", which is every form in the system.
  const toolbarOpen = showToolbar === undefined ? true : showToolbar;

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

  /* Light the buttons that apply where the caret is, so people can see
     whether they are inside bold text or an RTL paragraph. */
  useEffect(() => {
    if (!focused) return undefined;
    const read = () => {
      const el = box.current;
      const sel = window.getSelection();
      if (!el || !sel?.rangeCount || !el.contains(sel.anchorNode)) return;
      const next = {};
      ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList",
        "justifyLeft", "justifyCenter", "justifyRight"].forEach((c) => {
        try { next[c] = document.queryCommandState(c); } catch { /* unsupported */ }
      });
      let n = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode;
      while (n && n !== el && !n.getAttribute?.("dir")) n = n.parentNode;
      const d = n && n !== el ? n.getAttribute("dir") : null;
      if (d) next[`dir:${d}`] = true;
      try {
        next.fore = document.queryCommandValue("foreColor");
        next.back = document.queryCommandValue("hiliteColor") || document.queryCommandValue("backColor");
      } catch { /* unsupported */ }
      setActive(next);
    };
    read();
    document.addEventListener("selectionchange", read);
    return () => document.removeEventListener("selectionchange", read);
  }, [focused]);

  const emit = () => {
    const el = box.current;
    if (!el) return;
    const html = sanitizeHtml(el.innerHTML);
    // An editor that only contains an empty paragraph or a <br> is empty.
    const bare = html.replace(/<br\s*\/?>|<\/?(p|div)>|&nbsp;|\s/gi, "");
    onChange(bare ? html : "");
  };

  /* The selection dies when a native <input type=color> or <select> opens;
     remember it on the way out and put it back before applying. */
  const rememberSelection = () => {
    const sel = window.getSelection();
    if (sel?.rangeCount && box.current?.contains(sel.anchorNode)) saved.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const el = box.current;
    const sel = window.getSelection();
    const r = saved.current;
    saved.current = null;                       // one use only — never a stale range later
    const stillThere = sel?.rangeCount && el?.contains(sel.anchorNode);
    el?.focus();
    if (stillThere || !r) return;               // the caret never left; leave it alone
    sel.removeAllRanges();
    sel.addRange(r);
  };

  const exec = (cmd, arg) => {
    // Emit <span style> rather than <font>/align= where the browser lets us;
    // the sanitizer copes with both, but CSS is what we render with.
    try { document.execCommand("styleWithCSS", false, true); } catch { /* ignore */ }
    document.execCommand(cmd, false, arg);
  };

  /* Direction is per block, so one description can hold a Pashto paragraph
     followed by an English one. Every block the selection touches gets it —
     including a list, so its bullets swap sides too. */
  const setDirection = (d) => {
    const root = box.current;
    const sel = window.getSelection();
    if (!root || !sel?.rangeCount) return;
    const pick = () => {
      const range = sel.getRangeAt(0);
      return [...root.querySelectorAll(BLOCK_SEL)].filter((el) => range.intersectsNode(el));
    };
    let blocks = pick();
    if (!blocks.length) { exec("formatBlock", "P"); blocks = pick(); }
    blocks.forEach((el) => {
      el.setAttribute("dir", d);
      // A block that was explicitly aligned keeps that; otherwise let the
      // direction decide where the text starts.
      if (el.style?.textAlign === "left" || el.style?.textAlign === "right") el.style.textAlign = "";
    });
  };

  const run = (t) => {
    box.current?.focus();
    if (t.cmd === "link") {
      const url = window.prompt(translate("Link address (https://…)"));
      if (url && /^https?:\/\//i.test(url)) exec("createLink", url);
      else if (url) window.alert(translate("Please enter a full address starting with http:// or https://"));
    } else if (t.cmd === "dir") {
      setDirection(t.arg);
    } else {
      exec(t.cmd, t.arg);
    }
    emit();
  };

  const applyFont = (family) => {
    restoreSelection();
    exec("fontName", family || "inherit");
    emit();
  };
  const applySize = (n) => {
    restoreSelection();
    exec("fontSize", n);
    emit();
  };
  const applyColour = (c) => { restoreSelection(); exec("foreColor", c); emit(); };
  const applyHighlight = (c) => { restoreSelection(); exec("hiliteColor", c); emit(); };

  const empty = !value;

  return (
    <div className={`overflow-visible transition-shadow ${compact ? "rounded-2xl" : "rounded-xl border bg-white"} ${className}`}
      style={compact
        ? { background: focused ? "#FFFFFF" : "#F7F9F9", boxShadow: focused ? "0 0 0 2px #9CCBCB" : "none" }
        : { borderColor: focused ? TEAL : "#D0E0E0", boxShadow: focused ? "0 0 0 2px #9CCBCB" : "none" }}>
      {/* Toolbar */}
      {toolbarOpen && (
      <div className={`flex items-center flex-wrap gap-1 px-2 py-1 border-b ${compact ? "rounded-t-2xl" : "rounded-t-xl"}`}
        style={{ borderColor: "#EEF4F4", background: "#FAFCFC" }}>
        <select className={SELECT} style={{ borderColor: "#D0E0E0", maxWidth: "9.5rem" }} title="Font"
          defaultValue="" onMouseDown={rememberSelection} onFocus={rememberSelection}
          onChange={(e) => { applyFont(e.target.value); e.target.value = ""; }}>
          {FONTS.map((f) => <option key={f.label} value={f.value} style={f.value ? { fontFamily: f.value } : undefined}>{f.label}</option>)}
        </select>
        <select className={SELECT} style={{ borderColor: "#D0E0E0" }} title="Size"
          defaultValue="3" onMouseDown={rememberSelection} onFocus={rememberSelection}
          onChange={(e) => { applySize(e.target.value); e.target.value = "3"; }}>
          {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <span className="w-px h-4 mx-0.5" style={{ background: "#D0E0E0" }} />
        <ColourPicker icon="A" title="Text color" colours={TEXT_COLOURS} current={active.fore} onPick={applyColour} noneLabel="" remember={rememberSelection} />
        <ColourPicker icon="▮" title="Highlight" colours={HIGHLIGHTS} current={active.back} onPick={applyHighlight} noneLabel="No highlight" remember={rememberSelection} />

        {GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center">
            <span className="w-px h-4 mx-0.5" style={{ background: "#D0E0E0" }} />
            {group.map((t) => {
              const on = t.key ? !!active[t.key] : false;
              return (
                <button key={t.title} type="button" title={t.title} tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}   /* keep the selection alive */
                  onClick={() => run(t)}
                  className={`${BTN} ${t.cls || ""}`}
                  style={on ? { background: "#E0F2F1", color: TEAL, boxShadow: "inset 0 0 0 1px #9CCBCB" } : undefined}>
                  {t.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      )}

      {/* Editor */}
      <div className="relative">
        {empty && !focused && (
          <div className="absolute inset-0 px-3 py-2 text-sm text-gray-400 pointer-events-none" dir={dir}>{placeholder}</div>
        )}
        <div ref={box} id={id} data-name={name} contentEditable suppressContentEditableWarning
          autoFocus={autoFocus}
          dir={dir} role="textbox" aria-multiline="true" aria-required={required || undefined}
          onInput={emit} onBlur={() => { setFocused(false); emit(); }} onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            // Ctrl+Shift+L / R: writing direction, the shortcut Word and Windows use.
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "L" || e.key === "R" || e.key === "l" || e.key === "r")) {
              e.preventDefault(); setDirection(e.key.toLowerCase() === "l" ? "ltr" : "rtl"); emit();
              return;
            }
            onKeyDown?.(e);           // chat sends on Enter
          }}
          onPaste={(e) => {
            /* A screenshot or a copied file goes to the host first — in chat
               that means it is sent as an attachment rather than dropped on
               the floor, which is what pasting into a plain box used to do. */
            if (onPasteFiles?.(e)) { emit(); return; }
            // Paste as sanitised HTML or plain text — never Word's <o:p> soup.
            e.preventDefault();
            const html = e.clipboardData.getData("text/html");
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertHTML", false, html ? sanitizeHtml(html) : text.replace(/\n/g, "<br>"));
            emit();
          }}
          className={`rich-text outline-none overflow-y-auto text-sm ${compact ? "px-4 py-2.5" : "px-3 py-2 rounded-b-xl"}`}
          style={{ minHeight: minH, maxHeight: compact ? "9rem" : "60vh", color: "#0A3A3E" }} />
      </div>
    </div>
  );
}
