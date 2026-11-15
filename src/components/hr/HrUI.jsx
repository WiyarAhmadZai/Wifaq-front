/**
 * Shared HR UI primitives. Keep them small, accessible, and styled with
 * the brand teal so every HR page looks like one product.
 */
import { useState, useRef, useEffect } from "react";

/* ============================================================
 * DateField — drop-in replacement for native
 *   <input type="date"> / <input type="datetime-local">
 *
 * The field DISPLAYS and ACCEPTS day/month/year (DD/MM/YYYY),
 * but stays a perfect drop-in: `value` is still ISO
 * (YYYY-MM-DD or YYYY-MM-DDTHH:mm) and `onChange` still fires a
 * native-shaped event { target: { name, value, type } } with the
 * ISO value — so every existing form handler keeps working.
 * The 📅 button opens the browser's real calendar picker.
 * ============================================================ */
function isoParts(v) {
  if (!v) return null;
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) { const d = new Date(s); if (isNaN(d.getTime())) return null;
    return { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes() }; }
  return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : 0, mi: m[5] ? +m[5] : 0 };
}
const p2 = (n) => String(n).padStart(2, "0");

function toDisplay(v, withTime) {
  const p = isoParts(v);
  if (!p) return "";
  const d = `${p2(p.d)}/${p2(p.mo)}/${p.y}`;
  return withTime ? `${d} ${p2(p.h)}:${p2(p.mi)}` : d;
}
/** "dd/mm/yyyy [hh:mm]" → ISO, "" if blank, null if not yet valid. */
function toIso(text, withTime) {
  const t = (text || "").trim();
  if (!t) return "";
  const m = t.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})(?:[ ,]+(\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  let [, d, mo, y, h, mi] = m;
  d = +d; mo = +mo; y = +y; if (y < 100) y += 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const base = `${y}-${p2(mo)}-${p2(d)}`;
  if (!withTime) return base;
  if (h == null) return `${base}T00:00`;
  if (+h > 23 || +mi > 59) return null;
  return `${base}T${p2(+h)}:${p2(+mi)}`;
}

export function DateField({
  value, onChange, name, min, max, required, disabled,
  className = "", placeholder, withTime = false, ...rest
}) {
  const hiddenRef = useRef(null);
  const [text, setText] = useState(toDisplay(value, withTime));
  const [focused, setFocused] = useState(false);

  // Keep the display in sync when the form sets the value externally.
  useEffect(() => { if (!focused) setText(toDisplay(value, withTime)); }, [value, withTime, focused]);

  const emit = (iso) =>
    onChange?.({ target: { name, value: iso, type: withTime ? "datetime-local" : "date" } });

  const onText = (e) => {
    const t = e.target.value;
    setText(t);
    const iso = toIso(t, withTime);
    if (iso !== null) emit(iso); // valid or cleared; ignore half-typed
  };

  const openPicker = () => {
    const el = hiddenRef.current;
    if (!el || disabled) return;
    if (typeof el.showPicker === "function") { try { el.showPicker(); return; } catch { /* fall through */ } }
    el.focus(); el.click();
  };

  return (
    <div className="relative">
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        name={name}
        value={text}
        disabled={disabled}
        required={required}
        placeholder={placeholder || (withTime ? "dd/mm/yyyy hh:mm" : "dd/mm/yyyy")}
        onChange={onText}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setText(toDisplay(value, withTime)); }}
        className={className}
        style={{ paddingRight: "2.2rem" }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        disabled={disabled}
        title="Open calendar"
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          background: "none", border: 0, cursor: disabled ? "default" : "pointer",
          fontSize: 15, lineHeight: 1, opacity: disabled ? 0.4 : 0.7 }}
      >📅</button>
      <input
        ref={hiddenRef}
        type={withTime ? "datetime-local" : "date"}
        value={value || ""}
        min={min}
        max={max}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => emit(e.target.value)}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, right: 8, bottom: 0, pointerEvents: "none" }}
      />
    </div>
  );
}

export function PageHeader({ title, subtitle, icon, actions, children }) {
  return (
    <div className="bg-gradient-to-br from-teal-700 to-teal-600 rounded-2xl px-5 py-5 mb-5 text-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate">{title}</h1>
            {subtitle && <p className="text-xs text-teal-100 mt-0.5 leading-snug">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/** Hero stat strip — colourful summary cards. */
export function StatGrid({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {stats.map((s, i) => (
        <StatCard key={i} {...s} />
      ))}
    </div>
  );
}

export function StatCard({ label, value, icon, tone = "teal", hint }) {
  const tones = {
    teal:    { bg: "bg-teal-50",    text: "text-teal-700",    accent: "bg-teal-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", accent: "bg-emerald-600" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700",   accent: "bg-amber-500" },
    red:     { bg: "bg-red-50",     text: "text-red-700",     accent: "bg-red-600" },
    blue:    { bg: "bg-blue-50",    text: "text-blue-700",    accent: "bg-blue-600" },
    purple:  { bg: "bg-purple-50",  text: "text-purple-700",  accent: "bg-purple-600" },
  }[tone] || { bg: "bg-gray-50", text: "text-gray-700", accent: "bg-gray-600" };

  return (
    <div className={`${tones.bg} rounded-2xl p-4 border border-white/40`}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${tones.text}`}>{label}</p>
        {icon && (
          <div className={`w-7 h-7 ${tones.accent} text-white rounded-lg flex items-center justify-center`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-800 mt-1.5">{value}</p>
      {hint && <p className="text-[10px] text-gray-500 mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon = "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", title, description, action }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center mb-3">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
        </svg>
      </div>
      <p className="text-sm font-bold text-gray-700">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">{description}</p>}
      {action}
    </div>
  );
}

export function Spinner({ size = 8 }) {
  const sz = `w-${size} h-${size}`;
  return <div className={`inline-block ${sz} border-2 border-teal-600 border-t-transparent rounded-full animate-spin`} />;
}

export function Section({ title, subtitle, icon, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      <div className="px-5 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-teal-800 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-teal-700/70 truncate">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/**
 * InfoNote — a compact concept/guidance callout. Used to surface the
 * VATS principles (4D lens, dignity, performance≠welfare, counting
 * rules) on the existing pages without changing their layout.
 */
export function InfoNote({ tone = "teal", title, children }) {
  const tones = {
    teal:  "bg-teal-50 border-teal-100 text-teal-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    red:   "bg-red-50 border-red-200 text-red-900",
    gray:  "bg-gray-50 border-gray-200 text-gray-700",
  }[tone] || "bg-teal-50 border-teal-100 text-teal-900";
  return (
    <div className={`rounded-2xl border ${tones} p-4 mb-5`}>
      {title && <p className="text-xs font-bold uppercase tracking-wider mb-1.5">{title}</p>}
      <div className="text-[12.5px] leading-relaxed">{children}</div>
    </div>
  );
}

export function Pill({ tone = "gray", children }) {
  const tones = {
    gray:    "bg-gray-100 text-gray-700",
    teal:    "bg-teal-100 text-teal-800",
    emerald: "bg-emerald-100 text-emerald-700",
    amber:   "bg-amber-100 text-amber-700",
    red:     "bg-red-100 text-red-700",
    blue:    "bg-blue-100 text-blue-700",
    purple:  "bg-purple-100 text-purple-700",
    yellow:  "bg-yellow-100 text-yellow-800",
  };
  return <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${tones[tone]}`}>{children}</span>;
}
