/**
 * Small, dependency-free charts for the profile's "More info" panel.
 * Each takes plain arrays from GET /profile/{id}/insights and draws with
 * CSS/SVG, so they print, scale and work right-to-left without a library.
 */

const monthLabel = (ym) => {
  const [y, m] = String(ym).split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString(undefined, { month: "short" });
};

/** Bars of stacked parts per month — e.g. present / late / absent / leave. */
export function StackedBars({ data, parts, height = 140 }) {
  const totals = data.map((d) => parts.reduce((sum, p) => sum + (d[p.key] || 0), 0));
  const max = Math.max(1, ...totals);
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height }}>
        {data.map((d, i) => (
          <div key={d.month} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <span className="text-[10px] font-bold text-gray-600" data-no-i18n>{totals[i] || ""}</span>
            <div className="w-full max-w-[36px] flex flex-col-reverse rounded-md overflow-hidden bg-gray-100"
              style={{ height: `${(totals[i] / max) * 100}%`, minHeight: 4 }}>
              {parts.map((p) => (d[p.key] > 0 ? (
                <div key={p.key} className={p.color} style={{ height: `${(d[p.key] / totals[i]) * 100}%` }} title={`${p.label}: ${d[p.key]}`} />
              ) : null))}
            </div>
            <span className="text-[10px] text-gray-500" data-no-i18n>{monthLabel(d.month)}</span>
          </div>
        ))}
      </div>
      <Legend items={parts} />
    </div>
  );
}

/** Single bars per month — e.g. tasks completed. */
export function Bars({ data, valueKey, color = "bg-teal-500", height = 140 }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey] || 0));
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
          <span className="text-[10px] font-bold text-gray-600" data-no-i18n>{d[valueKey] || ""}</span>
          <div className={`w-full max-w-[36px] rounded-md ${d[valueKey] ? color : "bg-gray-100"}`}
            style={{ height: `${((d[valueKey] || 0) / max) * 100}%`, minHeight: 4 }} />
          <span className="text-[10px] text-gray-500" data-no-i18n>{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  );
}

/** A ring of parts — e.g. leave days by type. */
export function Donut({ items, size = 120, centerLabel }) {
  const total = items.reduce((s, x) => s + x.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
          {total > 0 && items.map((x) => {
            const len = (x.value / total) * c;
            const seg = <circle key={x.label} cx="50" cy="50" r={r} fill="none" stroke={x.hex} strokeWidth="14"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-xl font-black text-gray-800" data-no-i18n>{total}</div>
            {centerLabel && <div className="text-[10px] text-gray-500">{centerLabel}</div>}
          </div>
        </div>
      </div>
      <ul className="space-y-1.5 text-xs">
        {items.map((x) => (
          <li key={x.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: x.hex }} />
            <span className="text-gray-600 capitalize">{x.label}</span>
            <b className="text-gray-800" data-no-i18n>{x.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A line over months — e.g. the rating average (gaps where nothing was rated). */
export function TrendLine({ data, valueKey, max = 5, color = "#0d9488", height = 120 }) {
  const w = 300;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const y = (v) => height - 12 - ((v || 0) / max) * (height - 24);
  const points = data.map((d, i) => (d[valueKey] == null ? null : [i * step, y(d[valueKey])]));
  const path = points.reduce((acc, p, i) => {
    if (!p) return acc;
    const prev = points[i - 1];
    return acc + `${prev ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)} `;
  }, "");
  return (
    <div>
      <svg viewBox={`-8 0 ${w + 16} ${height}`} className="w-full" style={{ height }}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={12 + f * (height - 24)} y2={12 + f * (height - 24)} stroke="#f1f5f9" />
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="white" stroke={color} strokeWidth="2.5" />)}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-500 px-1" data-no-i18n>
        {data.map((d) => <span key={d.month}>{monthLabel(d.month)}</span>)}
      </div>
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-gray-500">
      {items.map((p) => (
        <span key={p.key} className="inline-flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${p.color}`} /><span>{p.label}</span></span>
      ))}
    </div>
  );
}
