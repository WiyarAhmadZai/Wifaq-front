import { useState, useEffect, useCallback } from "react";
import { get, post, peekCache } from "../../api/axios";
import Swal from "sweetalert2";

/* ── Brand tokens ── */
const TEAL = "#0D5C63", TEAL_LT = "#14919B", GOLD = "#C9A227", PAPER = "#F4F8F8";

const DIMENSIONS = [
  { key: "intellectual", label: "Intellectual", hint: "learning · thinking", color: "#14919B" },
  { key: "character", label: "Character", hint: "ethics · self-control", color: "#C9A227" },
  { key: "social", label: "Social", hint: "relating · cooperation", color: "#C2607A" },
  { key: "practical", label: "Practical", hint: "skill · completion", color: "#2E7D5B" },
];
const DIMAP = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));
const CATEGORIES = [
  { key: "positive", label: "Positive", emoji: "⭐", hint: "recognition candidate", bg: "#e6f3ec", fg: "#2E7D5B" },
  { key: "routine", label: "Routine", emoji: "📝", hint: "neither good nor bad", bg: "#eef3f3", fg: "#5d7273" },
  { key: "concern", label: "Concerning", emoji: "⚠️", hint: "follow up", bg: "#fbf0db", fg: "#9a6a12" },
  { key: "urgent", label: "Urgent", emoji: "🚨", hint: "same-day action", bg: "#f7e3e1", fg: "#C0473F" },
];
const CATMAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

const emptyDim = { category: "positive", description: "", is_usual: "", change_vs_before: "", alternative_interpretation: "", urgency_reason: "", monitoring_flag: false };
const blankForms = () => Object.fromEntries(DIMENSIONS.map((d) => [d.key, { ...emptyDim }]));
const needsChange = (c) => ["positive", "concern", "urgent"].includes(c);
const isNegative = (c) => ["concern", "urgent"].includes(c);
const initials = (n) => (n || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/**
 * How many observations this student already has.
 *
 * Zero is deliberately still shown, in muted grey rather than hidden — an
 * absent badge would be read as "no data loaded", while a visible 0 is the
 * answer the teacher is looking for: this child has not been observed yet.
 *
 * Module scope, not inside the page component: a component declared during
 * render is a new type on every render, so React unmounts and remounts it each
 * time instead of updating it.
 */
function ObsCount({ total, week }) {
  const n = Number(total) || 0;
  return (
    <span
      className="px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none flex-shrink-0 whitespace-nowrap"
      style={n > 0 ? { background: "#E8F6F6", color: TEAL } : { background: "#F1F4F4", color: "#9aa8a8" }}
      title={`${n} observation${n === 1 ? "" : "s"} recorded${week ? ` · ${week} in the last 7 days` : ""}`}
    >
      {n} obs
    </span>
  );
}

export default function DailyObservation() {
  const [classes, setClasses] = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState(null);     // student row
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fromDate, setFromDate] = useState("");       // history date filter — start
  const [toDate, setToDate] = useState("");           // history date filter — end

  const [adding, setAdding] = useState(false);
  const [forms, setForms] = useState(blankForms());
  const [activeDim, setActiveDim] = useState("intellectual");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const __cached = peekCache("/student-observations/my-classes");
    if (__cached) { const l = __cached?.data || []; setClasses(l); if (l.length) setActiveClass(l[0].id); setLoadingClasses(false); }
    get("/student-observations/my-classes")
      .then((r) => { const l = r.data?.data || []; setClasses(l); if (l.length) setActiveClass(l[0].id); })
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));
  }, []);

  const loadRoster = useCallback(() => {
    if (!activeClass) return;
    setLoadingRoster(true);
    const __cached = peekCache(`/student-observations/roster?class_id=${activeClass}`);
    if (__cached) { setRoster(__cached?.data || []); setLoadingRoster(false); }
    get(`/student-observations/roster?class_id=${activeClass}`)
      .then((r) => setRoster(r.data?.data || []))
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, [activeClass]);
  useEffect(() => { loadRoster(); }, [loadRoster]);

  const loadHistory = useCallback((sid, from = fromDate, to = toDate) => {
    setLoadingHistory(true);
    const p = new URLSearchParams({ student_id: sid });
    if (from) p.append("from", from);
    if (to) p.append("to", to);
    const __cached = peekCache(`/student-observations?${p.toString()}`);
    if (__cached) { setHistory(__cached?.data || []); setLoadingHistory(false); }
    get(`/student-observations?${p.toString()}`)
      .then((r) => setHistory(r.data?.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [fromDate, toDate]);

  // Selecting a student clears any active date filter and reloads a clean history.
  const pick = (s) => { setSelected(s); setForms(blankForms()); setActiveDim("intellectual"); setAdding(false); setFromDate(""); setToDate(""); loadHistory(s.id, "", ""); };
  const clearDates = () => { setFromDate(""); setToDate(""); if (selected) loadHistory(selected.id, "", ""); };

  const cur = forms[activeDim];
  const setCur = (patch) => setForms((f) => ({ ...f, [activeDim]: { ...f[activeDim], ...patch } }));
  const filledDims = DIMENSIONS.filter((d) => forms[d.key].description.trim());

  const submit = async () => {
    const entries = DIMENSIONS.map((d) => ({ dimension: d.key, ...forms[d.key] })).filter((e) => e.description.trim());
    if (!entries.length) { Swal.fire("Nothing to save", "Write at least one observation.", "warning"); return; }
    for (const e of entries) {
      if (needsChange(e.category) && !e.change_vs_before) { setActiveDim(e.dimension); Swal.fire("Missing", `Pick the change for the ${e.dimension} note.`, "warning"); return; }
      if (isNegative(e.category) && !e.alternative_interpretation.trim()) { setActiveDim(e.dimension); Swal.fire("Bias check", `Add another interpretation for the ${e.dimension} concern.`, "warning"); return; }
      if (e.category === "urgent" && !e.urgency_reason.trim()) { setActiveDim(e.dimension); Swal.fire("Missing", `Give the urgency reason for the ${e.dimension} note.`, "warning"); return; }
    }
    const observations = entries.map((e) => ({
      dimension: e.dimension, category: e.category, description: e.description.trim(), is_usual: e.is_usual || null,
      change_vs_before: e.change_vs_before || null, alternative_interpretation: e.alternative_interpretation || null,
      urgency_reason: e.urgency_reason || null, monitoring_flag: e.monitoring_flag,
    }));
    setSaving(true);
    try {
      const r = await post("/student-observations/batch", { student_id: selected.id, observations });
      Swal.fire({ icon: "success", title: r.data?.message || "Recorded", timer: 1300, showConfirmButton: false, toast: true, position: "top-end" });
      setForms(blankForms()); setActiveDim("intellectual"); setAdding(false);
      const bump = (x) => ({
        ...x,
        seen_today: true,
        days_since: 0,
        total_count: x.total_count + observations.length,
        // Saved today, so it is inside the 7-day window by definition.
        week_count: (x.week_count || 0) + observations.length,
      });
      setRoster((p) => p.map((x) => (x.id === selected.id ? bump(x) : x)));
      setSelected(bump);
      loadHistory(selected.id);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || "Failed", "error");
    } finally { setSaving(false); }
  };

  const badge = (s) => {
    if (s.seen_today) return { c: "#2E7D5B", bg: "#e6f3ec", label: "today" };
    if (s.days_since === null) return { c: "#9a6a12", bg: "#fbf0db", label: "never" };
    if (s.days_since >= 14) return { c: "#9a6a12", bg: "#fbf0db", label: `${s.days_since}d` };
    return { c: "#5d7273", bg: "#eef3f3", label: `${s.days_since}d` };
  };
  const seenToday = roster.filter((s) => s.seen_today).length;
  const filtered = query ? roster.filter((s) => `${s.full_name} ${s.father_name || ""}`.toLowerCase().includes(query.toLowerCase())) : roster;

  return (
    <div className="min-h-screen" style={{ background: PAPER }}>
      {/* Slim hero */}
      <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Education & Formation</p>
        <h1 className="text-base font-black text-white mt-0.5">Daily Observation</h1>
      </div>

      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[320px_1fr] lg:gap-0 lg:items-stretch">
        {/* ── LEFT: classes + roster list ── */}
        <aside className={`border-r ${selected ? "hidden lg:block" : ""}`} style={{ borderColor: "#dbe8e8", background: "#fff" }}>
          <div className="p-3 border-b" style={{ borderColor: "#eef4f4" }}>
            {loadingClasses ? null : (
              <select value={activeClass || ""} onChange={(e) => { setActiveClass(Number(e.target.value)); setSelected(null); }}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white border focus:outline-none mb-2" style={{ borderColor: "#dbe8e8", color: TEAL }}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name} ({c.student_count})</option>)}
              </select>
            )}
            <div className="relative">
              <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student…"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border focus:outline-none" style={{ borderColor: "#dbe8e8" }} />
            </div>
            {roster.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#E8F6F6" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round((seenToday / roster.length) * 100)}%`, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LT})` }} />
                </div>
                <span className="text-[10px] font-bold text-gray-500">{seenToday}/{roster.length} today</span>
              </div>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            {loadingRoster ? <Spinner /> : filtered.length === 0 ? <p className="p-6 text-center text-xs text-gray-400">No students.</p> : filtered.map((s) => {
              const b = badge(s); const on = selected?.id === s.id;
              return (
                <button key={s.id} onClick={() => pick(s)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-l-2"
                  style={on ? { background: "#E8F6F6", borderColor: TEAL } : { background: "transparent", borderColor: "transparent" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black text-white flex-shrink-0" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(s.full_name)}</div>
                  <div className="min-w-0 flex-1">
                    {/* The tally rides ALONGSIDE the name, not on a line of its
                        own below it — how many observations a student already
                        has is the thing being scanned for, and as grey text on
                        a third line it read as a footnote and got missed.
                        `bdi` isolates the RTL name so the LTR count pill cannot
                        be pulled to the wrong side of it. */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <bdi dir="auto" className="text-xs font-bold text-gray-800 truncate">{s.full_name}</bdi>
                      <ObsCount total={s.total_count} week={s.week_count} />
                    </div>
                    {s.father_name && <p className="text-[10px] text-gray-500 truncate">{s.gender === "female" ? "D/O" : "S/O"} {s.father_name}</p>}
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0" style={{ background: b.bg, color: b.c }}>{b.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── RIGHT: detail panel ── */}
        <main className={`${selected ? "" : "hidden lg:block"} min-h-[calc(100vh-120px)]`}>
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10" style={{ minHeight: "60vh" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#E8F6F6", color: TEAL }}>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.5 12C3.7 7.9 7.5 5 12 5s8.3 2.9 9.5 7c-1.2 4.1-5 7-9.5 7s-8.3-2.9-9.5-7z" /></svg>
              </div>
              <p className="text-sm font-bold text-gray-600">Select a student</p>
              <p className="text-xs text-gray-400 mt-1">Pick someone on the left to see their observations and add a new one.</p>
            </div>
          ) : (
            <div>
              {/* Student header */}
              <div className="px-5 py-4 flex items-center gap-3 border-b bg-white" style={{ borderColor: "#eef4f4" }}>
                <button onClick={() => setSelected(null)} className="lg:hidden p-2 rounded-lg" style={{ background: "#E8F6F6", color: TEAL }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(selected.full_name)}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-black text-gray-800 truncate">{selected.full_name}</h2>
                  {selected.father_name && <p className="text-[11px] text-gray-500 truncate">{selected.gender === "female" ? "D/O" : "S/O"} {selected.father_name}</p>}
                  <p className="text-[11px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                    <ObsCount total={selected.total_count} week={selected.week_count} />
                    <span>observation{selected.total_count === 1 ? "" : "s"} recorded · {selected.seen_today ? "seen today" : selected.days_since === null ? "never observed" : `last ${selected.days_since}d ago`}</span>
                  </p>
                </div>
                {!adding && <button onClick={() => setAdding(true)} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>＋ Observe</button>}
              </div>

              <div className="p-5 space-y-5">
                {/* Snapshot — inline stats + dimension distribution */}
                {!loadingHistory && history.length > 0 && (() => {
                  const total = history.length;
                  const week = history.filter((o) => o.observed_on >= new Date(Date.now() - 7 * 864e5).toLocaleDateString("en-CA")).length;
                  const pos = history.filter((o) => o.category === "positive").length;
                  const conc = history.filter((o) => ["concern", "urgent"].includes(o.category)).length;
                  const ratio = conc ? `${(pos / conc).toFixed(1)}:1` : (pos ? `${pos}:0` : "—");
                  const byDim = DIMENSIONS.map((d) => ({ ...d, n: history.filter((o) => o.dimension === d.key).length }));
                  const tot = byDim.reduce((s, d) => s + d.n, 0) || 1;
                  return (
                    <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg,#E8F6F6,#ffffff)" }}>
                      <div className="flex items-center gap-5">
                        {[["Total", total], ["This week", week], ["Recognition", ratio]].map(([l, v], i) => (
                          <div key={l} className={i ? "pl-5 border-l" : ""} style={{ borderColor: "#cfe4e4" }}>
                            <p className="text-xl font-black" style={{ color: TEAL, letterSpacing: "-.5px" }}>{v}</p>
                            <p className="text-[10px] font-semibold text-gray-500">{l}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3.5 h-2 rounded-full overflow-hidden flex" style={{ background: "#dbe8e8" }}>
                        {byDim.map((d) => d.n > 0 ? <div key={d.key} style={{ width: `${(d.n / tot) * 100}%`, background: d.color }} /> : null)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
                        {byDim.map((d) => (
                          <span key={d.key} className="text-[10px] flex items-center gap-1 font-semibold" style={{ color: d.n ? "#374151" : "#9ca3af" }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: d.n ? d.color : "#d1d5db" }} /> {d.label} <b>{d.n}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Inline add form */}
                {adding && (
                  <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#dbe8e8" }}>
                    <div className="px-4 py-2.5 flex items-center justify-between border-b" style={{ borderColor: "#eef4f4", background: "#fafcfc" }}>
                      <p className="text-xs font-black" style={{ color: TEAL }}>New observation</p>
                      <button onClick={() => setAdding(false)} className="text-[11px] font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* dimension tabs */}
                      <div className="flex flex-wrap gap-2">
                        {DIMENSIONS.map((d) => {
                          const fd = forms[d.key]; const has = fd.description.trim();
                          const incomplete = has && isNegative(fd.category) && !fd.alternative_interpretation.trim();
                          const on = activeDim === d.key;
                          return (
                            <button key={d.key} onClick={() => setActiveDim(d.key)} title={d.hint}
                              className="relative px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
                              style={on ? { background: d.color, color: "#fff", borderColor: d.color } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
                              {d.label}
                              {has && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: incomplete ? "#C0473F" : on ? "#fff" : "#2E7D5B" }} />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map((c) => {
                          const on = cur.category === c.key;
                          return (
                            <button key={c.key} onClick={() => setCur({ category: c.key })} className="text-left px-3 py-2 rounded-xl border text-xs"
                              style={on ? { background: c.bg, borderColor: c.fg, color: c.fg } : { background: "#fff", borderColor: "#e5e7eb", color: "#374151" }}>
                              <span className="font-bold">{c.emoji} {c.label}</span>
                              <span className="block text-[10px] opacity-70">{c.hint}</span>
                            </button>
                          );
                        })}
                      </div>

                      <textarea value={cur.description} onChange={(e) => setCur({ description: e.target.value })} rows={3}
                        placeholder={`What you saw — ${DIMAP[activeDim].label}. Specific, not general. Leave blank to skip.`}
                        className="w-full px-3 py-2.5 border rounded-xl text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#dbe8e8" }} />

                      <div>
                        <Lbl>Is this usual for this student?</Lbl>
                        <Segmented value={cur.is_usual} onPick={(k) => setCur({ is_usual: cur.is_usual === k ? "" : k })} options={[["yes", "Yes, usual"], ["no", "No, it's new"], ["unknown", "I don't know"]]} />
                      </div>
                      {needsChange(cur.category) && (
                        <div><Lbl>Change vs. before *</Lbl>
                          <Segmented value={cur.change_vs_before} onPick={(k) => setCur({ change_vs_before: k })} options={[["better", "↑ Better"], ["stable", "= Stable"], ["decline", "↓ Decline"]]} /></div>
                      )}
                      {isNegative(cur.category) && (
                        <div className="rounded-xl border p-3 space-y-2" style={cur.description.trim() && !cur.alternative_interpretation.trim() ? { borderColor: "#e7bdb8", background: "#fdf2f0" } : { borderColor: "#ecd9a8", background: "#fbf7ec" }}>
                          <p className="text-[11px] font-bold" style={{ color: "#9a6a12" }}>Bias check — see first, judge second <span style={{ color: "#C0473F" }}>* required</span></p>
                          <textarea value={cur.alternative_interpretation} onChange={(e) => setCur({ alternative_interpretation: e.target.value })} rows={2}
                            placeholder="Could there be another interpretation? e.g. tired, family situation, I misread." className="w-full px-3 py-2 border rounded-lg text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#ecd9a8" }} />
                          {cur.category === "urgent" && (
                            <textarea value={cur.urgency_reason} onChange={(e) => setCur({ urgency_reason: e.target.value })} rows={2} placeholder="Why is this urgent?" className="w-full px-3 py-2 border rounded-lg text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#e7bdb8" }} />
                          )}
                          <label className="flex items-center gap-2 text-[11px] text-gray-700 cursor-pointer"><input type="checkbox" checked={cur.monitoring_flag} onChange={(e) => setCur({ monitoring_flag: e.target.checked })} /> Recommend placing under monitoring</label>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-gray-500">{filledDims.length} dimension{filledDims.length === 1 ? "" : "s"} ready</span>
                        <button onClick={submit} disabled={saving || !filledDims.length} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>{saving ? "Saving…" : `Record ${filledDims.length || ""}`.trim()}</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* History timeline */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Observation history</p>
                    {/* Date-range filter */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input type="date" value={fromDate} max={toDate || undefined}
                        onChange={(e) => { setFromDate(e.target.value); loadHistory(selected.id, e.target.value, toDate); }}
                        className="px-2 py-1 rounded-lg text-[11px] bg-white border focus:outline-none" style={{ borderColor: "#dbe8e8", color: TEAL }} />
                      <span className="text-[10px] text-gray-400">→</span>
                      <input type="date" value={toDate} min={fromDate || undefined}
                        onChange={(e) => { setToDate(e.target.value); loadHistory(selected.id, fromDate, e.target.value); }}
                        className="px-2 py-1 rounded-lg text-[11px] bg-white border focus:outline-none" style={{ borderColor: "#dbe8e8", color: TEAL }} />
                      {(fromDate || toDate) && (
                        <button onClick={clearDates} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>Clear</button>
                      )}
                    </div>
                  </div>
                  {loadingHistory ? <Spinner /> : history.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">{fromDate || toDate ? "No observations in this date range." : "No observations yet for this student."}</p>
                  ) : (
                    <div className="relative pl-5" style={{ borderLeft: "2px solid #e7f1f1", marginLeft: "4px" }}>
                      {history.map((o) => {
                        const dim = DIMAP[o.dimension] || {}; const cat = CATMAP[o.category] || {};
                        return (
                          <div key={o.id} className="relative pb-5 last:pb-0">
                            <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: dim.color }} />
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>{dim.label || o.dimension}</span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: cat.bg, color: cat.fg }}>{cat.emoji} {cat.label || o.category}</span>
                                {o.monitoring_flag ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#f7e3e1", color: "#C0473F" }}>🔎 monitoring</span> : null}
                              </div>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{o.observed_on}</span>
                            </div>
                            <p className="text-xs text-gray-800 leading-relaxed">{o.description}</p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
                              {o.is_usual && <span>Usual: <b className="text-gray-700">{o.is_usual}</b></span>}
                              {o.change_vs_before && <span>Change: <b className="text-gray-700">{o.change_vs_before}</b></span>}
                              <span className="inline-flex items-center gap-1" style={{ color: TEAL }}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Observed by <b>{o.observer || "—"}</b>
                              </span>
                            </div>
                            {o.alternative_interpretation && <div className="mt-1.5 rounded-lg p-2 text-[11px]" style={{ background: "#fbf7ec", color: "#7a5410" }}><b>Alt:</b> {o.alternative_interpretation}</div>}
                            {o.recommendation && <div className="mt-1.5 rounded-lg p-2 text-[11px]" style={{ background: "#E8F6F6", color: TEAL }}><b>Recommendation:</b> {o.recommendation}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const Lbl = ({ children }) => <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{children}</label>;
const Spinner = () => <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} /></div>;
function Segmented({ value, onPick, options }) {
  return (
    <div className="flex gap-2">
      {options.map(([k, lbl]) => (
        <button key={k} onClick={() => onPick(k)} className="flex-1 px-2 py-2 rounded-lg text-[11px] font-bold border transition-all"
          style={value === k ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{lbl}</button>
      ))}
    </div>
  );
}
