/**
 * Shared HR UI primitives. Keep them small, accessible, and styled with
 * the brand teal so every HR page looks like one product.
 */

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
