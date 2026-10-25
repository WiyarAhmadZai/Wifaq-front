import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { get, post, del } from "../../api/axios";
import { RATEABLE_LABEL, broadcastRatingChange, scoreWord } from "./ratingKit";

/**
 * Staff star ratings on the school's five standards.
 *
 *   <RateWorkButton type="staff_task" id={42} />   rate one piece of work
 *   <StaffEvaluation staffId={7} />                week / month / year averages
 *
 * Keys mirror App\Models\StaffRating::STANDARDS.
 */
const STANDARDS = [
  { key: "dutifulness", label: "Dutifulness", local: "حس مسولیت پذیری" },
  { key: "diligence", label: "Diligence", local: "پخته کاری" },
  { key: "initiative", label: "Initiative & Innovation", local: "ابتکار و خودکاری" },
  { key: "dedication", label: "Selfless Dedication", local: "فداکاری" },
  { key: "impact", label: "Impact", local: "تاثیر / نتیجه" },
];

const STAR = "M11.048 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.176 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.673z";

function Star({ fill = 0, className = "w-5 h-5", white = false }) {
  // fill: 0 empty, 1 full, anything between = partly (for averages)
  const id = `s${Math.round(fill * 100)}${white ? "w" : ""}`;
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor={white ? "#ffffff" : "#f59e0b"} />
          <stop offset={`${fill * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${id})`} stroke={white ? "#ffffff" : fill > 0 ? "#f59e0b" : "#d1d5db"} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/* ── the visual language of a score ───────────────────────────────────────
   A number alone is forgettable; a colour is not. Every score in the system
   is read the same way, on a list or on a profile: green is genuinely good,
   amber is acceptable, orange is a warning, red is a conversation.        */
const TONE = {
  emerald: { chip: "from-emerald-500 to-emerald-700", text: "text-emerald-700", bar: "bg-emerald-500", soft: "bg-emerald-50 border-emerald-200" },
  amber: { chip: "from-amber-400 to-amber-600", text: "text-amber-700", bar: "bg-amber-500", soft: "bg-amber-50 border-amber-200" },
  orange: { chip: "from-orange-400 to-orange-600", text: "text-orange-700", bar: "bg-orange-500", soft: "bg-orange-50 border-orange-200" },
  rose: { chip: "from-rose-500 to-red-700", text: "text-rose-700", bar: "bg-rose-600", soft: "bg-rose-50 border-rose-200" },
  gray: { chip: "from-gray-300 to-gray-400", text: "text-gray-500", bar: "bg-gray-300", soft: "bg-gray-50 border-gray-200" },
};
const toneOf = (v) =>
  v == null ? "gray" : v >= 4.5 ? "emerald" : v >= 3.5 ? "amber" : v >= 2.5 ? "orange" : "rose";

/** The score as a filled pill: number, star, and how many ratings it took. */
export function ScoreBadge({ value, count = 0, size = "md", title = "" }) {
  const tone = TONE[toneOf(value)];
  const dim = size === "sm"
    ? "px-1.5 py-[1px] text-[10px]"
    : size === "lg"
      ? "px-2.5 py-1 text-base"
      : "px-2 py-0.5 text-[11px]";
  const star = size === "sm" ? "w-2 h-2" : size === "lg" ? "w-3.5 h-3.5" : "w-2.5 h-2.5";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${tone.chip}
                     text-white font-black shadow-sm ${dim}`}
      title={title || undefined}>
      <span data-no-i18n>{value == null ? "—" : Number(value).toFixed(1)}</span>
      <Star className={star} fill={1} white />
      {count > 1 && <span className="font-semibold opacity-80" data-no-i18n>×{count}</span>}
    </span>
  );
}

/** Per-standard averages as bars — where the strength actually is. */
export function StandardBars({ standards, size = "sm" }) {
  if (!standards) return null;
  const tone = TONE;
  return (
    <div className="space-y-1">
      {STANDARDS.filter((s) => standards[s.key]).map((s) => (
        <div key={s.key} className="flex items-center gap-2">
          <span className={`${size === "sm" ? "text-[10px] w-24" : "text-[11px] w-32"} text-gray-500 truncate`}>{s.label}</span>
          <span className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <span className={`block h-full rounded-full ${tone[toneOf(standards[s.key])].bar}`}
              style={{ width: `${(standards[s.key] / 5) * 100}%` }} />
          </span>
          <b className={`${size === "sm" ? "text-[10px]" : "text-[11px]"} w-6 text-end text-gray-600`} data-no-i18n>
            {standards[s.key]}
          </b>
        </div>
      ))}
    </div>
  );
}


/** Read-only stars for an average, e.g. 3.6 → three and a bit. */
export function Stars({ value, size = "w-4 h-4" }) {
  return (
    <span className="inline-flex" title={value != null ? `${value} / 5` : undefined}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={size} fill={value == null ? 0 : Math.max(0, Math.min(1, value - n + 1))} />)}
    </span>
  );
}

/** Clickable 1–5 stars; clicking the current value clears it. */
function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => onChange(value === n ? null : n)}
          className="p-0.5" aria-label={`${n} / 5`}>
          <Star className="w-6 h-6" fill={(hover || value || 0) >= n ? 1 : 0} />
        </button>
      ))}
    </span>
  );
}

/** The five-standard form. `existing` pre-fills a re-rating. */
function RatingModal({ title, existing, onClose, onSave }) {
  const [form, setForm] = useState(() => Object.fromEntries(STANDARDS.map((s) => [s.key, existing?.[s.key] ?? null])));
  const [note, setNote] = useState(existing?.note || "");
  const [busy, setBusy] = useState(false);
  const given = STANDARDS.map((s) => form[s.key]).filter(Boolean);
  const avg = given.length ? (given.reduce((a, b) => a + b, 0) / given.length).toFixed(1) : null;

  const save = async () => {
    if (!given.length) return Swal.fire("", "Give at least one standard some stars.", "info");
    setBusy(true);
    try { await onSave({ ...form, note }); onClose(); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-xs text-gray-400">Rate this work</div>
          <div className="font-semibold text-gray-800 truncate" dir="auto">{title}</div>
        </div>
        <div className="p-5 space-y-3">
          {STANDARDS.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800">{s.label}</div>
                <div className="text-[11px] text-gray-400" dir="rtl" data-no-i18n>{s.local}</div>
              </div>
              <StarInput value={form[s.key]} onChange={(v) => setForm((f) => ({ ...f, [s.key]: v }))} />
            </div>
          ))}
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} dir="auto"
            placeholder="A short note (optional)" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-200" />
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">{avg ? <><span>Overall</span> <b className="text-amber-600" data-no-i18n>{avg}</b></> : null}</span>
          <span className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button onClick={save} disabled={busy} className="px-4 py-2 text-sm rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-50">
              {busy ? "Saving…" : "Save rating"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Rate one piece of work. Shows the ratings it already has, and — for a
 * superior of whoever did it — a button to rate (or re-rate) it.
 */
export function RateWorkButton({ type, id, title = "" }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => get("/staff-ratings", { cache: false, params: { rateable_type: type, rateable_id: id } })
    .then((r) => setData(r.data?.data))
    .catch(() => setData({ ratings: [], can_rate: false })), [type, id]);
  useEffect(() => { load(); }, [load]);

  if (!data || (!data.can_rate && !data.ratings.length)) return null;

  const save = async (fields) => {
    try {
      await post("/staff-ratings", { rateable_type: type, rateable_id: id, ...fields });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Rating saved", timer: 1600, showConfirmButton: false });
      load();
      broadcastRatingChange();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save the rating.", "error");
      throw e;
    }
  };

  // Re-rating starts from your own earlier rating, not someone else's.
  const mine = data.ratings.find((r) => r.rated_by === data.my_id);
  const avg = data.ratings.length
    ? (data.ratings.reduce((a, r) => a + (Number(r.overall) || 0), 0) / data.ratings.length).toFixed(1)
    : null;
  // Two opinions on the same work already make a pattern worth drawing.
  const stdAvg = data.ratings.length > 1 ? Object.fromEntries(STANDARDS.map((s) => {
    const given = data.ratings.map((r) => r[s.key]).filter(Boolean);
    return [s.key, given.length ? Math.round((given.reduce((a, b) => a + b, 0) / given.length) * 10) / 10 : null];
  })) : null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
          <span>Rating</span>
          {avg !== null && <ScoreBadge value={avg} count={data.ratings.length} />}
          {avg !== null && <span className="text-[10px] font-semibold text-gray-500 normal-case tracking-normal">{scoreWord(Number(avg))}</span>}
        </span>
        {data.can_rate && (
          <button onClick={() => setOpen(true)} className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
            {data.ratings.length ? "Update rating" : "★ Rate this work"}
          </button>
        )}
      </div>
      {stdAvg && (
        <div className="mt-2 rounded-lg border border-amber-100 bg-white/70 p-2">
          <StandardBars standards={stdAvg} />
        </div>
      )}
      {data.ratings.map((r) => (
        <div key={r.id} className="mt-2 text-xs">
          <div className="flex items-center gap-2">
            <Stars value={r.overall} />
            <b className="text-amber-700" data-no-i18n>{r.overall?.toFixed?.(1) ?? r.overall}</b>
            <span className="text-gray-400" data-no-i18n>{r.rater} · {r.rated_on}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
            {STANDARDS.filter((s) => r[s.key]).map((s) => <span key={s.key}><span>{s.label}</span> <b data-no-i18n>{r[s.key]}</b></span>)}
          </div>
          {r.note && <p className="mt-1 text-[11px] text-gray-600" dir="auto" data-no-i18n>“{r.note}”</p>}
        </div>
      ))}
      {open && <RatingModal title={title} existing={mine} onClose={() => setOpen(false)} onSave={save} />}
    </div>
  );
}

/**
 * One row's rating: the score it has already earned, and — for anyone entitled
 * to rate it — a star that opens the same five-standard form as the detail
 * pages. List rows are clickable, so this never lets the click through.
 */
export function RatePill({ type, id, title = "", entry, size = "sm" }) {
  const [open, setOpen] = useState(false);
  // Nothing to show and nothing to do — say nothing. A list of rows all
  // reading "not rated" teaches the reader that ratings do not exist here.
  if (!entry || (!entry.count && !entry.can_rate)) return null;

  const tip = entry.count
    ? `${entry.avg} / 5 · ${entry.count} ${entry.count === 1 ? "rating" : "ratings"}`
    : "Not rated yet";

  const save = async (fields) => {
    try {
      // type "staff": the row IS the person, so this is a general rating of them.
      await post("/staff-ratings", type === "staff" ? { staff_id: id, ...fields } : { rateable_type: type, rateable_id: id, ...fields });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Rating saved", timer: 1600, showConfirmButton: false });
      // The row's own bulk entry is stale now; refetch the page's scores.
      broadcastRatingChange();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save the rating.", "error");
      throw e;
    }
  };

  return (
    <>
      <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {entry.count
          ? <ScoreBadge value={entry.avg} count={entry.count} size={size} title={tip} />
          : <span className="text-[10px] text-gray-400 whitespace-nowrap">Not rated</span>}
        {entry.can_rate && (
          <button type="button" onClick={() => setOpen(true)} title={tip}
            className="w-6 h-6 grid place-items-center rounded-full text-amber-500 hover:bg-amber-100 border border-amber-300 text-xs font-bold">
            {entry.mine ? "✎" : "★"}
          </button>
        )}
      </span>
      {open && <RatingModal title={title} existing={entry.mine} onClose={() => setOpen(false)} onSave={save} />}
    </>
  );
}

/**
 * The staff profile's evaluation: averages per standard for this week
 * (Saturday–Thursday), this month and this year, plus a general rating.
 */
export function StaffEvaluation({ staffId, name = "" }) {
  const [sum, setSum] = useState(null);
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [denied, setDenied] = useState(false);

  const load = useCallback(() => Promise.all([
    get("/staff-ratings/summary", { cache: false, params: { staff_id: staffId } }),
    get("/staff-ratings", { cache: false, params: { staff_id: staffId } }),
  ]).then(([a, b]) => { setSum(a.data?.data); setList(b.data?.data?.ratings || []); })
    .catch((e) => { if (e.response?.status === 403) setDenied(true); }), [staffId]);
  useEffect(() => { load(); }, [load]);

  if (denied) return null;
  if (!sum) return <div className="py-6 text-center text-xs text-gray-400">Loading…</div>;

  const saveGeneral = async (fields) => {
    try {
      await post("/staff-ratings", { staff_id: staffId, ...fields });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Rating saved", timer: 1600, showConfirmButton: false });
      load();
      broadcastRatingChange();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save the rating.", "error");
      throw e;
    }
  };
  const remove = async (r) => {
    const ok = await Swal.fire({ icon: "warning", title: "Remove this rating?", showCancelButton: true, confirmButtonText: "Remove", cancelButtonText: "Cancel", confirmButtonColor: "#dc2626" });
    if (!ok.isConfirmed) return;
    try { await del(`/staff-ratings/${r.id}`); load(); } catch (e) { Swal.fire("Error", e.response?.data?.message || "Could not remove.", "error"); }
  };

  const PERIODS = [["week", "This week"], ["month", "This month"], ["year", "This year"]];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">Averages of every rating given, on the five standards.</p>
        {sum.can_rate && (
          <button onClick={() => setOpen(true)} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">★ Give a general rating</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PERIODS.map(([k, label]) => {
          const p = sum[k];
          const tone = TONE[toneOf(p.overall)];
          return (
            <div key={k} className={`rounded-xl border p-3 ${p.count ? tone.soft : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">{label}</span>
                <span className="text-[10px] text-gray-400"><span data-no-i18n>{p.count}</span> <span>ratings</span></span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <ScoreBadge value={p.overall} size="lg" />
                <span className={`text-[11px] font-semibold ${tone.text}`}>{scoreWord(p.overall)}</span>
              </div>
              <div className="mt-2.5">
                <StandardBars standards={p} />
              </div>
            </div>
          );
        })}
      </div>

      {list.length > 0 && (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          {list.slice(0, 15).map((r) => (
            <div key={r.id} className="px-3 py-2 flex items-center gap-3 text-xs">
              <ScoreBadge value={r.overall} size="sm" />
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">{RATEABLE_LABEL[r.rateable_type] || "General"}</span>
              <span className="flex-1 min-w-0 truncate text-gray-600" dir="auto" data-no-i18n>{r.note || ""}</span>
              <span className="text-gray-400 whitespace-nowrap" data-no-i18n>{r.rater} · {r.rated_on}</span>
              {sum.can_rate && <button onClick={() => remove(r)} className="text-gray-300 hover:text-red-600" title="Remove">✕</button>}
            </div>
          ))}
        </div>
      )}

      {open && <RatingModal title={name} onClose={() => setOpen(false)} onSave={saveGeneral} />}
    </div>
  );
}
