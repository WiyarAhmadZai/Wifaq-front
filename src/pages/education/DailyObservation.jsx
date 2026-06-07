import { useState, useEffect, useCallback } from "react";
import { get, post } from "../../api/axios";
import Swal from "sweetalert2";

/* ── Brand tokens (from the Wifaq SMS design) ── */
const TEAL = "#0D5C63", TEAL_LT = "#14919B", GOLD = "#C9A227", PAPER = "#F4F8F8";

const DIMENSIONS = [
  { key: "intellectual", label: "Intellectual", hint: "learning · understanding · thinking", color: "#14919B" },
  { key: "character", label: "Character", hint: "ethics · honesty · self-control", color: "#C9A227" },
  { key: "social", label: "Social", hint: "relating · cooperation", color: "#C2607A" },
  { key: "practical", label: "Practical", hint: "skill · discipline · completion", color: "#2E7D5B" },
];
const DIMAP = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));

const CATEGORIES = [
  { key: "positive", label: "Positive & notable", emoji: "⭐", hint: "Very good — recognition candidate", bg: "#e6f3ec", fg: "#2E7D5B" },
  { key: "routine", label: "Routine", emoji: "📝", hint: "Seen — neither positive nor negative", bg: "#eef3f3", fg: "#5d7273" },
  { key: "concern", label: "Concerning", emoji: "⚠️", hint: "A sign to follow up", bg: "#fbf0db", fg: "#9a6a12" },
  { key: "urgent", label: "Urgent", emoji: "🚨", hint: "Needs same-day action", bg: "#f7e3e1", fg: "#C0473F" },
];
const CATMAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

const emptyDim = { category: "positive", description: "", is_usual: "", change_vs_before: "", alternative_interpretation: "", urgency_reason: "", monitoring_flag: false };
const blankForms = () => Object.fromEntries(DIMENSIONS.map((d) => [d.key, { ...emptyDim }]));
const needsChange = (c) => ["positive", "concern", "urgent"].includes(c);
const isNegative = (c) => ["concern", "urgent"].includes(c);
const initials = (n) => (n || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function DailyObservation() {
  const [view, setView] = useState("record");
  const [classes, setClasses] = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [forms, setForms] = useState(blankForms());
  const [activeDim, setActiveDim] = useState("intellectual");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get("/student-observations/my-classes")
      .then((r) => { const l = r.data?.data || []; setClasses(l); if (l.length) setActiveClass(l[0].id); })
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));
  }, []);

  const loadRoster = useCallback(() => {
    if (!activeClass) return;
    setLoadingRoster(true);
    get(`/student-observations/roster?class_id=${activeClass}`)
      .then((r) => setRoster(r.data?.data || []))
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, [activeClass]);
  useEffect(() => { loadRoster(); }, [loadRoster]);

  const openSheet = (student) => { setForms(blankForms()); setActiveDim("intellectual"); setSheet({ student }); };
  const cur = forms[activeDim];
  const setCur = (patch) => setForms((f) => ({ ...f, [activeDim]: { ...f[activeDim], ...patch } }));
  const filledDims = DIMENSIONS.filter((d) => forms[d.key].description.trim());

  const submit = async () => {
    const entries = DIMENSIONS.map((d) => ({ dimension: d.key, ...forms[d.key] })).filter((e) => e.description.trim());
    if (!entries.length) { Swal.fire("Nothing to save", "Write at least one observation in any dimension.", "warning"); return; }
    for (const e of entries) {
      if (needsChange(e.category) && !e.change_vs_before) { setActiveDim(e.dimension); Swal.fire("Missing", `Pick the change vs. before for the ${e.dimension} note.`, "warning"); return; }
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
      const r = await post("/student-observations/batch", { student_id: sheet.student.id, observations });
      Swal.fire({ icon: "success", title: r.data?.message || "Recorded", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" });
      setSheet(null);
      setRoster((p) => p.map((x) => (x.id === sheet.student.id ? { ...x, seen_today: true, days_since: 0, total_count: x.total_count + observations.length } : x)));
      loadRoster();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  const equity = (s) => {
    if (s.seen_today) return { c: "#2E7D5B", bg: "#e6f3ec", label: "Seen today" };
    if (s.days_since === null) return { c: "#9a6a12", bg: "#fbf0db", label: "Never seen" };
    if (s.days_since >= 14) return { c: "#9a6a12", bg: "#fbf0db", label: `${s.days_since}d unseen` };
    return { c: "#5d7273", bg: "#eef3f3", label: `${s.days_since}d ago` };
  };
  const seenToday = roster.filter((s) => s.seen_today).length;
  const coverage = roster.length ? Math.round((seenToday / roster.length) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: PAPER }}>
      {/* Hero */}
      <div className="px-5 py-5" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Education & Formation</p>
        <h1 className="text-lg font-black text-white mt-0.5">Daily Observation</h1>
        <p className="text-xs mt-1" style={{ color: "#9ec3c3" }}>Two or three precise notes a day is enough — one good sentence beats ten general ones.</p>
        <div className="flex gap-1.5 mt-3">
          {[{ k: "record", l: "Record" }, { k: "recent", l: "My Recent" }].map((t) => (
            <button key={t.k} onClick={() => setView(t.k)}
              className="px-4 py-1.5 rounded-full text-[11px] font-bold transition-all"
              style={view === t.k ? { background: "#fff", color: TEAL } : { background: "rgba(255,255,255,.12)", color: "#cfe4e4" }}>{t.l}</button>
          ))}
        </div>
      </div>

      {view === "recent" ? <RecentObservations /> : (
        <div className="px-4 py-5 max-w-5xl mx-auto space-y-4">
          {loadingClasses ? (
            <Spinner />
          ) : classes.length === 0 ? (
            <Empty text="You don't have any classes assigned, so there are no students to observe." />
          ) : (
            <>
              {/* Class chips */}
              <div className="flex gap-2 flex-wrap">
                {classes.map((c) => (
                  <button key={c.id} onClick={() => setActiveClass(c.id)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border"
                    style={activeClass === c.id ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: "#4b5563", borderColor: "#e5e7eb" }}>
                    {c.class_name} <span className="opacity-60 font-semibold">· {c.student_count}</span>
                  </button>
                ))}
              </div>

              {/* Coverage card */}
              {roster.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-700">Today's coverage</p>
                    <p className="text-xs"><b style={{ color: TEAL }}>{seenToday}</b><span className="text-gray-400"> / {roster.length} · {coverage}%</span></p>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#E8F6F6" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${coverage}%`, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LT})` }} />
                  </div>
                </div>
              )}

              {/* Roster */}
              {loadingRoster ? <Spinner /> : roster.length === 0 ? <Empty text="No active students in this class." /> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {roster.map((s) => {
                    const eq = equity(s);
                    const flagged = !s.seen_today && (s.days_since === null || s.days_since >= 14);
                    return (
                      <button key={s.id} onClick={() => openSheet(s)}
                        className="group text-left bg-white rounded-2xl border shadow-sm p-3.5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                        style={{ borderColor: flagged ? "#ecd9a8" : "#eef4f4" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                            style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(s.full_name)}</div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-800 truncate leading-tight">{s.full_name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{s.total_count} observation{s.total_count === 1 ? "" : "s"}</p>
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: eq.bg, color: eq.c }}>{eq.label}</span>
                          <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: TEAL }}>＋ observe</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick observation sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,37,40,.45)", backdropFilter: "blur(3px)" }} onClick={() => setSheet(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ background: "rgba(255,255,255,.15)" }}>{initials(sheet.student.full_name)}</div>
                <div>
                  <h3 className="text-sm font-black text-white">{sheet.student.full_name}</h3>
                  <p className="text-[11px]" style={{ color: "#9ec3c3" }}>Fill any dimensions — each keeps its own note</p>
                </div>
              </div>
              <button onClick={() => setSheet(null)} className="text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Dimension tabs */}
            <div className="px-5 pt-4 flex flex-wrap gap-2">
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

            <div className="p-5 pt-4 space-y-4 overflow-y-auto">
              <SheetLabel>Type</SheetLabel>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => {
                  const on = cur.category === c.key;
                  return (
                    <button key={c.key} onClick={() => setCur({ category: c.key })}
                      className="text-left px-3 py-2 rounded-xl border text-xs transition-all"
                      style={on ? { background: c.bg, borderColor: c.fg, color: c.fg } : { background: "#fff", borderColor: "#e5e7eb", color: "#374151" }}>
                      <span className="font-bold">{c.emoji} {c.label}</span>
                      <span className="block text-[10px] opacity-70">{c.hint}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <SheetLabel>What you saw — {DIMAP[activeDim].label}</SheetLabel>
                <textarea value={cur.description} onChange={(e) => setCur({ description: e.target.value })} rows={3}
                  placeholder="Specific, not general. Leave blank to skip this dimension."
                  className="w-full px-3 py-2.5 border rounded-xl text-xs bg-white resize-none focus:outline-none"
                  style={{ borderColor: "#dbe8e8" }} onFocus={(e) => (e.target.style.borderColor = TEAL_LT)} onBlur={(e) => (e.target.style.borderColor = "#dbe8e8")} />
              </div>

              <div>
                <SheetLabel>Is this behaviour usual for this student?</SheetLabel>
                <Segmented value={cur.is_usual} onPick={(k) => setCur({ is_usual: cur.is_usual === k ? "" : k })}
                  options={[["yes", "Yes, usual"], ["no", "No, it's new"], ["unknown", "I don't know"]]} />
              </div>

              {needsChange(cur.category) && (
                <div>
                  <SheetLabel>Change vs. before *</SheetLabel>
                  <Segmented value={cur.change_vs_before} onPick={(k) => setCur({ change_vs_before: k })}
                    options={[["better", "↑ Better"], ["stable", "= Stable"], ["decline", "↓ Decline"]]} />
                </div>
              )}

              {isNegative(cur.category) && (
                <div className="rounded-xl border p-3 space-y-2" style={cur.description.trim() && !cur.alternative_interpretation.trim() ? { borderColor: "#e7bdb8", background: "#fdf2f0" } : { borderColor: "#ecd9a8", background: "#fbf7ec" }}>
                  <p className="text-[11px] font-bold" style={{ color: "#9a6a12" }}>Bias check — see first, judge second <span style={{ color: "#C0473F" }}>* required</span></p>
                  <p className="text-[10px] text-gray-500 -mt-1">A concerning/urgent note can't be saved without an alternative reading.</p>
                  <textarea value={cur.alternative_interpretation} onChange={(e) => setCur({ alternative_interpretation: e.target.value })} rows={2}
                    placeholder="Could there be another interpretation? e.g. tired, a family situation, or I misread."
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#ecd9a8" }} />
                  {cur.category === "urgent" && (
                    <textarea value={cur.urgency_reason} onChange={(e) => setCur({ urgency_reason: e.target.value })} rows={2}
                      placeholder="Why is this urgent (needs same-day action)?"
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#e7bdb8" }} />
                  )}
                  <label className="flex items-center gap-2 text-[11px] text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={cur.monitoring_flag} onChange={(e) => setCur({ monitoring_flag: e.target.checked })} />
                    Recommend placing this student under monitoring
                  </label>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t flex items-center justify-between gap-2" style={{ background: "#fafcfc", borderColor: "#eef4f4" }}>
              <span className="text-[11px] text-gray-500">{filledDims.length} dimension{filledDims.length === 1 ? "" : "s"} ready</span>
              <div className="flex gap-2">
                <button onClick={() => setSheet(null)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl">Cancel</button>
                <button onClick={submit} disabled={saving || !filledDims.length} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>
                  {saving ? "Saving…" : `Record ${filledDims.length || ""}`.trim()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SheetLabel = ({ children }) => <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{children}</label>;
const Spinner = () => <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} /></div>;
const Empty = ({ text }) => <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">{text}</div>;

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

/* ─────────────── My Recent — grouped by student, with detail ─────────────── */
function RecentObservations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openStudent, setOpenStudent] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await get("/student-observations"); setRows(r.data?.data || []); }
    catch { setRows([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Group by student.
  const groups = Object.values(rows.reduce((acc, o) => {
    (acc[o.student_id] = acc[o.student_id] || { student_id: o.student_id, student: o.student, items: [] }).items.push(o);
    return acc;
  }, {})).sort((a, b) => (b.items[0]?.observed_on || "").localeCompare(a.items[0]?.observed_on || ""));

  const detail = openStudent ? groups.find((g) => g.student_id === openStudent) : null;

  if (loading) return <Spinner />;
  if (groups.length === 0) return <div className="px-4 py-5 max-w-5xl mx-auto"><Empty text="No observations recorded yet." /></div>;

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups.map((g) => {
          const counts = g.items.reduce((m, o) => ({ ...m, [o.category]: (m[o.category] || 0) + 1 }), {});
          const last = g.items[0];
          return (
            <button key={g.student_id} onClick={() => setOpenStudent(g.student_id)}
              className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(g.student)}</div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-gray-800 truncate">{g.student}</p>
                  <p className="text-[10px] text-gray-400">{g.items.length} observation{g.items.length === 1 ? "" : "s"} · last {last.observed_on}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {CATEGORIES.filter((c) => counts[c.key]).map((c) => (
                  <span key={c.key} className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: c.bg, color: c.fg }}>{counts[c.key]} {c.label.split(" ")[0]}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Student detail */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,37,40,.45)", backdropFilter: "blur(3px)" }} onClick={() => setOpenStudent(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ background: "rgba(255,255,255,.15)" }}>{initials(detail.student)}</div>
                <div>
                  <h3 className="text-sm font-black text-white">{detail.student}</h3>
                  <p className="text-[11px]" style={{ color: "#9ec3c3" }}>{detail.items.length} observation{detail.items.length === 1 ? "" : "s"} · full history</p>
                </div>
              </div>
              <button onClick={() => setOpenStudent(null)} className="text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3" style={{ background: PAPER }}>
              {detail.items.map((o) => {
                const dim = DIMAP[o.dimension] || {}; const cat = CATMAP[o.category] || {};
                return (
                  <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="h-1" style={{ background: dim.color }} />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>{dim.label || o.dimension}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: cat.bg, color: cat.fg }}>{cat.emoji} {cat.label || o.category}</span>
                          {o.monitoring_flag ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#f7e3e1", color: "#C0473F" }}>🔎 monitoring</span> : null}
                        </div>
                        <span className="text-[10px] text-gray-400">{o.observed_on}</span>
                      </div>
                      <p className="text-xs text-gray-800 leading-relaxed">{o.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                        {o.is_usual && <span>Usual: <b className="text-gray-700">{o.is_usual}</b></span>}
                        {o.change_vs_before && <span>Change: <b className="text-gray-700">{o.change_vs_before}</b></span>}
                        {o.observer && <span>by <b className="text-gray-700">{o.observer}</b></span>}
                      </div>
                      {o.alternative_interpretation && (
                        <div className="mt-2 rounded-lg p-2 text-[11px]" style={{ background: "#fbf7ec", color: "#7a5410" }}><b>Alt. interpretation:</b> {o.alternative_interpretation}</div>
                      )}
                      {o.urgency_reason && (
                        <div className="mt-2 rounded-lg p-2 text-[11px]" style={{ background: "#fdf2f0", color: "#8a342d" }}><b>Urgency:</b> {o.urgency_reason}</div>
                      )}
                      {o.recommendation && (
                        <div className="mt-2 rounded-lg p-2 text-[11px]" style={{ background: "#E8F6F6", color: TEAL }}><b>Recommendation:</b> {o.recommendation}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
