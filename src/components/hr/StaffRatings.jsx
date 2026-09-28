import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { get, post, del } from "../../api/axios";

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

function Star({ fill = 0, className = "w-5 h-5" }) {
  // fill: 0 empty, 1 full, anything between = partly (for averages)
  const id = `s${Math.round(fill * 100)}`;
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
          <stop offset={`${fill * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${id})`} stroke={fill > 0 ? "#f59e0b" : "#d1d5db"} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
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
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save the rating.", "error");
      throw e;
    }
  };

  // Re-rating starts from your own earlier rating, not someone else's.
  const mine = data.ratings.find((r) => r.rated_by === data.my_id);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Rating</span>
        {data.can_rate && (
          <button onClick={() => setOpen(true)} className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
            {data.ratings.length ? "Update rating" : "★ Rate this work"}
          </button>
        )}
      </div>
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
  const TYPE = { staff_task: "Task", lesson_plan: "Lesson plan", daily_work: "Daily work", vats_observation: "Observation" };

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
          return (
            <div key={k} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">{label}</span>
                <span className="text-[10px] text-gray-400"><span data-no-i18n>{p.count}</span> <span>ratings</span></span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Stars value={p.overall} />
                <b className="text-lg text-amber-600" data-no-i18n>{p.overall ?? "—"}</b>
              </div>
              <div className="mt-2 space-y-1">
                {STANDARDS.map((s) => (
                  <div key={s.key} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-gray-500 truncate">{s.label}</span>
                    <span className="flex items-center gap-1"><Stars value={p[s.key]} size="w-3 h-3" /><span className="w-7 text-end text-gray-600" data-no-i18n>{p[s.key] ?? "—"}</span></span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {list.length > 0 && (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          {list.slice(0, 15).map((r) => (
            <div key={r.id} className="px-3 py-2 flex items-center gap-3 text-xs">
              <Stars value={r.overall} size="w-3.5 h-3.5" />
              <b className="text-amber-700 w-8" data-no-i18n>{r.overall}</b>
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">{TYPE[r.rateable_type] || "General"}</span>
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
