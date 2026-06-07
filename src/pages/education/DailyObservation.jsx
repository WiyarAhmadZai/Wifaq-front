import { useState, useEffect, useCallback } from "react";
import { get, post } from "../../api/axios";
import Swal from "sweetalert2";

/* 4D framework — the spine. No value outside these four (guideline Principle 2). */
const DIMENSIONS = [
  { key: "intellectual", label: "Intellectual", hint: "learning, understanding, thinking", color: "#14919B" },
  { key: "character", label: "Character", hint: "ethics, honesty, self-control", color: "#C9A227" },
  { key: "social", label: "Social", hint: "relating, cooperation", color: "#C2607A" },
  { key: "practical", label: "Practical", hint: "skill, discipline, completion", color: "#2E7D5B" },
];

const CATEGORIES = [
  { key: "positive", label: "Positive & notable", emoji: "⭐", hint: "Very good — recognition candidate", color: "bg-emerald-50 border-emerald-300 text-emerald-700" },
  { key: "routine", label: "Routine", emoji: "📝", hint: "Seen — neither positive nor negative", color: "bg-gray-50 border-gray-300 text-gray-700" },
  { key: "concern", label: "Concerning", emoji: "⚠️", hint: "A sign that must be followed up", color: "bg-amber-50 border-amber-300 text-amber-700" },
  { key: "urgent", label: "Urgent", emoji: "🚨", hint: "Needs same-day action", color: "bg-red-50 border-red-300 text-red-700" },
];

const emptyDim = {
  category: "positive", description: "", is_usual: "", change_vs_before: "",
  alternative_interpretation: "", urgency_reason: "", monitoring_flag: false,
};
const blankForms = () => Object.fromEntries(DIMENSIONS.map((d) => [d.key, { ...emptyDim }]));

const needsChange = (cat) => ["positive", "concern", "urgent"].includes(cat);
const isNegative = (cat) => ["concern", "urgent"].includes(cat);

export default function DailyObservation() {
  const [view, setView] = useState("record"); // record | recent
  const [classes, setClasses] = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [sheet, setSheet] = useState(null);          // { student }
  const [forms, setForms] = useState(blankForms());  // per-dimension data
  const [activeDim, setActiveDim] = useState("intellectual");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get("/student-observations/my-classes")
      .then((r) => {
        const list = r.data?.data || [];
        setClasses(list);
        if (list.length) setActiveClass(list[0].id);
      })
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
    if (entries.length === 0) { Swal.fire("Nothing to save", "Write at least one observation in any dimension.", "warning"); return; }

    for (const e of entries) {
      if (needsChange(e.category) && !e.change_vs_before) { setActiveDim(e.dimension); Swal.fire("Missing", `Pick the change vs. before for the ${e.dimension} note.`, "warning"); return; }
      if (isNegative(e.category) && !e.alternative_interpretation.trim()) { setActiveDim(e.dimension); Swal.fire("Bias check", `Add another possible interpretation for the ${e.dimension} concern.`, "warning"); return; }
      if (e.category === "urgent" && !e.urgency_reason.trim()) { setActiveDim(e.dimension); Swal.fire("Missing", `Give the urgency reason for the ${e.dimension} note.`, "warning"); return; }
    }

    const observations = entries.map((e) => ({
      dimension: e.dimension, category: e.category, description: e.description.trim(),
      is_usual: e.is_usual || null, change_vs_before: e.change_vs_before || null,
      alternative_interpretation: e.alternative_interpretation || null,
      urgency_reason: e.urgency_reason || null, monitoring_flag: e.monitoring_flag,
    }));

    setSaving(true);
    try {
      const r = await post("/student-observations/batch", { student_id: sheet.student.id, observations });
      Swal.fire({ icon: "success", title: r.data?.message || "Recorded", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" });
      setSheet(null);
      setRoster((p) => p.map((s) => (s.id === sheet.student.id ? { ...s, seen_today: true, days_since: 0, total_count: s.total_count + observations.length } : s)));
      loadRoster();
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || "Failed to save";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const equity = (s) => {
    if (s.seen_today) return { tone: "emerald", label: "Today ✓" };
    if (s.days_since === null) return { tone: "amber", label: "Never seen" };
    if (s.days_since >= 14) return { tone: "amber", label: `${s.days_since}d — unseen` };
    return { tone: "gray", label: `${s.days_since}d ago` };
  };
  const toneClass = { emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700", gray: "bg-gray-100 text-gray-500" };
  const cardRing = (s) => (!s.seen_today && (s.days_since === null || s.days_since >= 14)) ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-100";
  const seenToday = roster.filter((s) => s.seen_today).length;

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <h1 className="text-sm font-bold text-white">Daily Observation</h1>
        <p className="text-xs text-teal-100 mt-0.5">Tap a student · record one note per dimension in a single form</p>
        <div className="flex gap-1 mt-3">
          {[{ k: "record", l: "Record" }, { k: "recent", l: "My Recent" }].map((t) => (
            <button key={t.k} onClick={() => setView(t.k)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${view === t.k ? "bg-white text-teal-700" : "bg-white/15 text-white hover:bg-white/25"}`}>{t.l}</button>
          ))}
        </div>
      </div>

      {view === "recent" && <RecentObservations />}

      {view === "record" && (
      <div className="px-4 py-5 space-y-4">
        {loadingClasses ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
            You don't have any classes assigned, so there are no students to observe.
          </div>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap">
              {classes.map((c) => (
                <button key={c.id} onClick={() => setActiveClass(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${activeClass === c.id ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-200 text-gray-600 hover:border-teal-300"}`}>
                  {c.class_name} <span className="opacity-70">· {c.student_count}</span>
                </button>
              ))}
            </div>

            {roster.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-gray-500">Observed today</span>
                <span className="text-sm font-bold text-teal-700">{seenToday} / {roster.length}</span>
              </div>
            )}

            {loadingRoster ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : roster.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No active students in this class.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {roster.map((s) => {
                  const eq = equity(s);
                  return (
                    <button key={s.id} onClick={() => openSheet(s)}
                      className={`text-left bg-white rounded-2xl border shadow-sm p-3 hover:shadow-md hover:-translate-y-0.5 transition-all ${cardRing(s)}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(s.full_name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{s.full_name}</p>
                          <p className="text-[10px] text-gray-400">{s.total_count} obs</p>
                        </div>
                      </div>
                      <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${toneClass[eq.tone]}`}>{eq.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      )}

      {/* Quick observation sheet — one note per dimension */}
      {sheet && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSheet(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-teal-600 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{sheet.student.full_name}</h3>
                <p className="text-[11px] text-teal-100">Fill any dimensions — each keeps its own note</p>
              </div>
              <button onClick={() => setSheet(null)} className="text-white/80 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Dimension tabs — a dot marks a dimension that already has a note */}
            <div className="px-5 pt-4">
              <div className="flex flex-wrap gap-2">
                {DIMENSIONS.map((d) => {
                  const fd = forms[d.key];
                  const has = fd.description.trim();
                  const incomplete = has && isNegative(fd.category) && !fd.alternative_interpretation.trim();
                  const on = activeDim === d.key;
                  return (
                    <button key={d.key} onClick={() => setActiveDim(d.key)} title={d.hint}
                      className={`relative px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${on ? "text-white" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
                      style={on ? { background: d.color, borderColor: d.color } : {}}>
                      {d.label}
                      {has && <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${incomplete ? "bg-red-500" : on ? "bg-white/90" : "bg-teal-500"}`} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 pt-4 space-y-4 overflow-y-auto">
              {/* Type (per dimension) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => (
                    <button key={c.key} onClick={() => setCur({ category: c.key })}
                      className={`text-left px-3 py-2 rounded-xl border text-xs transition-colors ${cur.category === c.key ? c.color : "bg-white border-gray-200 hover:border-gray-300"}`}>
                      <span className="font-bold">{c.emoji} {c.label}</span>
                      <span className="block text-[10px] opacity-70">{c.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description (per dimension) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  What you saw — {DIMENSIONS.find((d) => d.key === activeDim)?.label}
                </label>
                <textarea value={cur.description} onChange={(e) => setCur({ description: e.target.value })}
                  rows={3} placeholder='Specific, not general. Leave blank to skip this dimension.'
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
              </div>

              {/* Is this behaviour usual for this student? */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Is this behaviour usual for this student?</label>
                <div className="flex gap-2">
                  {[["yes", "Yes, it is usual"], ["no", "No, it is new"], ["unknown", "I don't know"]].map(([k, lbl]) => (
                    <button key={k} onClick={() => setCur({ is_usual: cur.is_usual === k ? "" : k })}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${cur.is_usual === k ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-200 text-gray-600"}`}>{lbl}</button>
                  ))}
                </div>
              </div>

              {needsChange(cur.category) && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Change vs. before *</label>
                  <div className="flex gap-2">
                    {[["better", "↑ Better"], ["stable", "= Stable"], ["decline", "↓ Decline"]].map(([k, lbl]) => (
                      <button key={k} onClick={() => setCur({ change_vs_before: k })}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${cur.change_vs_before === k ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-200 text-gray-600"}`}>{lbl}</button>
                    ))}
                  </div>
                </div>
              )}

              {isNegative(cur.category) && (
                <div className={`rounded-xl border p-3 space-y-2 ${cur.description.trim() && !cur.alternative_interpretation.trim() ? "border-red-300 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                  <p className="text-[11px] font-bold text-amber-800">Bias check — see first, judge second <span className="text-red-600">* required for {cur.category}</span></p>
                  <p className="text-[10px] text-gray-500 -mt-1">A concerning/urgent note can't be saved without an alternative reading.</p>
                  <textarea value={cur.alternative_interpretation} onChange={(e) => setCur({ alternative_interpretation: e.target.value })}
                    rows={2} placeholder="Could there be another interpretation? e.g. tired, a family situation, or I misread."
                    className={`w-full px-3 py-2 border rounded-lg text-xs bg-white resize-none focus:ring-2 ${cur.description.trim() && !cur.alternative_interpretation.trim() ? "border-red-300 focus:ring-red-300" : "border-amber-200 focus:ring-amber-300"}`} />
                  {cur.category === "urgent" && (
                    <textarea value={cur.urgency_reason} onChange={(e) => setCur({ urgency_reason: e.target.value })}
                      rows={2} placeholder="Why is this urgent (needs same-day action)?"
                      className="w-full px-3 py-2 border border-red-200 rounded-lg text-xs focus:ring-2 focus:ring-red-300 bg-white resize-none" />
                  )}
                  <label className="flex items-center gap-2 text-[11px] text-gray-700">
                    <input type="checkbox" checked={cur.monitoring_flag} onChange={(e) => setCur({ monitoring_flag: e.target.checked })} />
                    Recommend placing this student under monitoring
                  </label>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500">{filledDims.length} dimension{filledDims.length === 1 ? "" : "s"} ready</span>
              <div className="flex gap-2">
                <button onClick={() => setSheet(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={submit} disabled={saving || filledDims.length === 0} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">
                  {saving ? "Saving…" : `Record ${filledDims.length || ""} observation${filledDims.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── My recent saved observations ─────────────── */
const CAT_BADGE = {
  positive: "bg-emerald-100 text-emerald-700",
  routine: "bg-gray-100 text-gray-600",
  concern: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};
const DIM_LABEL = { intellectual: "Intellectual", character: "Character", social: "Social", practical: "Practical" };

function RecentObservations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get("/student-observations");
      setRows(r.data?.data || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = cat === "all" ? rows : rows.filter((r) => r.category === cat);

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex gap-1 flex-wrap">
        {["all", "positive", "routine", "concern", "urgent"].map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-colors ${cat === c ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}>{c}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No observations recorded yet.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {filtered.map((o) => (
            <div key={o.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-bold text-gray-800 truncate">{o.student}</p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{DIM_LABEL[o.dimension] || o.dimension}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${CAT_BADGE[o.category] || "bg-gray-100 text-gray-600"}`}>{o.category}</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-600">{o.description}</p>
              <p className="text-[10px] text-gray-400 mt-1">{o.observed_on}{o.monitoring_flag ? " · 🔎 flagged for monitoring" : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
