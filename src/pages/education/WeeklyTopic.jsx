import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { get, post, del, peekCache } from "../../api/axios";
import Swal from "sweetalert2";

import { DIMS, DimPill, Spinner, describeError, TEAL, PosterLightbox, TopicPlan, GOAL_LABELS, DAY_LABELS, EvaluationsModal } from "./weeklyUi";

/** Monday-based start of the week containing `d`, as YYYY-MM-DD. */
/* A fixed-length list of {title, description} — 3 goals, 5 daily activities. */
const blankPlan = (n, saved = []) => Array.from({ length: n }, (_, i) => ({
  title: saved?.[i]?.title || "", description: saved?.[i]?.description || "",
}));
const trimPlan = (items) => items.map((x) => ({ title: x.title.trim(), description: x.description.trim() }));

function PlanEditor({ heading, labels, items, onChange }) {
  const set = (i, key, val) => onChange(items.map((x, j) => (j === i ? { ...x, [key]: val } : x)));
  return (
    <div className="mt-4">
      <div className="text-xs font-bold text-[#0B4D52] mb-2">{heading}</div>
      <div className="space-y-2">
        {items.map((x, i) => (
          <div key={i} className="rounded-xl border border-[#D0E0E0] p-2.5 bg-[#FAFCFC]">
            <div className="text-[10px] font-semibold text-[#5A7A7E] mb-1">{labels[i]}</div>
            <input value={x.title} onChange={(e) => set(i, "title", e.target.value)} placeholder="Title" dir="auto"
              className="w-full px-3 py-1.5 border border-[#D0E0E0] rounded-lg text-sm bg-white mb-1.5" />
            <textarea rows={2} value={x.description} onChange={(e) => set(i, "description", e.target.value)} placeholder="Description" dir="auto"
              className="w-full px-3 py-1.5 border border-[#D0E0E0] rounded-lg text-sm bg-white" />
          </div>
        ))}
      </div>
    </div>
  );
}

const weekBounds = (d = new Date()) => {
  const start = new Date(d);
  const day = (start.getDay() + 6) % 7; // Mon=0
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 4); // Mon→Fri school week
  const iso = (x) => x.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
};

export default function WeeklyTopic() {
  const navigate = useNavigate();
  // ?topic_id= opens that week (a past one too); without it, the current week.
  const [params, setParams] = useSearchParams();
  const url = params.get("topic_id") ? `/weekly-recognition?topic_id=${params.get("topic_id")}` : "/weekly-recognition";
  // The topic the form saves into — null means "add a new topic". It used to
  // be "whatever topic is on screen, if open", so typing an older topic with
  // past dates overwrote the current week instead of adding one.
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", week_start: "", week_end: "", primary_dimension: null,
    goals: blankPlan(3), daily_activities: blankPlan(5),
  });
  // The topic's designed poster: a new file, a past topic's poster reused, or removed.
  const [poster, setPoster] = useState({ file: null, preview: null, from: null, remove: false });
  const [library, setLibrary] = useState([]);
  const [zoom, setZoom] = useState(null);

  const apply = useCallback((d) => {
    setData(d);
    const t = d?.topic;
    const wb = weekBounds();
    setForm({
      title: t?.title || "",
      description: t?.description || "",
      week_start: t?.week_start || wb.start,
      week_end: t?.week_end || wb.end,
      primary_dimension: t?.primary_dimension || null,
      goals: blankPlan(3, t?.goals), daily_activities: blankPlan(5, t?.daily_activities),
    });
    setPoster({ file: null, preview: null, from: null, remove: false });
    setEditingId(t && t.status === "open" ? t.id : null);
    // Past topics, to bring one (and its poster) back for a new week.
    if (d?.can_select) get("/weekly-recognition/topics/library").then((r) => setLibrary(r.data?.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const cached = peekCache(url);
    if (cached) { apply(cached); setLoading(false); }
    try {
      const res = await get(url);
      apply(res.data);
    } catch (err) {
      Swal.fire("Error", describeError(err, "Failed to load weekly recognition."), "error");
    } finally { setLoading(false); }
  }, [apply, url]);

  useEffect(() => { load(); }, [load]);

  const topic = data?.topic;
  const canSelect = Boolean(data?.can_select);
  const [evalTopic, setEvalTopic] = useState(null);

  // An empty form for another week — past weeks included, for recording the
  // topics already run (certificates and result sheets need them).
  const startNew = () => {
    const wb = weekBounds();
    setEditingId(null);
    setForm({ title: "", description: "", week_start: wb.start, week_end: wb.end, primary_dimension: null,
      goals: blankPlan(3), daily_activities: blankPlan(5) });
    setPoster({ file: null, preview: null, from: null, remove: false });
    document.getElementById("weekly-topic-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const removeTopic = async (t) => {
    const ok = await Swal.fire({
      title: "Delete this topic?", text: t.title, icon: "warning",
      showCancelButton: true, confirmButtonColor: "#B83230", confirmButtonText: "Delete",
    });
    if (!ok.isConfirmed) return;
    try {
      await del(`/weekly-recognition/topics/${t.id}`);
      Swal.fire({ icon: "success", title: "Topic deleted", timer: 1400, showConfirmButton: false });
      load();
    } catch (err) {
      Swal.fire("Error", describeError(err, "Failed to delete the topic."), "error");
    }
  };

  const save = async () => {
    if (!form.title.trim()) return Swal.fire("Topic needed", "Give this week a topic title.", "info");
    setSaving(true);
    try {
      const body = new FormData();
      body.append("title", form.title.trim());
      if (form.description?.trim()) body.append("description", form.description.trim());
      body.append("week_start", form.week_start);
      body.append("week_end", form.week_end);
      if (form.primary_dimension) body.append("primary_dimension", form.primary_dimension);
      body.append("goals", JSON.stringify(trimPlan(form.goals)));
      body.append("daily_activities", JSON.stringify(trimPlan(form.daily_activities)));
      if (poster.file) body.append("poster", poster.file);
      else if (poster.from) body.append("poster_from", poster.from);
      else if (poster.remove) body.append("remove_poster", "1");
      // Editing keeps the topic's id; "New topic" adds another week.
      // (A file can't ride a real PUT, so the update is sent as POST + _method.)
      let res;
      if (editingId) {
        body.append("_method", "PUT");
        res = await post(`/weekly-recognition/topics/${editingId}`, body);
      } else res = await post("/weekly-recognition/topics", body);
      Swal.fire({ icon: "success", title: res?.data?.message || "Topic saved", timer: 1600, showConfirmButton: false });
      // Show the week just saved, so its candidates can be added next.
      const savedId = res?.data?.data?.id;
      if (savedId && String(savedId) !== params.get("topic_id")) setParams({ topic_id: String(savedId) });
      else load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save the topic", "error");
    } finally { setSaving(false); }
  };

  const closeNoAward = async () => {
    const r = await Swal.fire({
      title: "Close the week with no award?",
      text: "Not every week has to force a winner. The week is recorded as closed with no award.",
      icon: "question", showCancelButton: true, confirmButtonColor: TEAL,
    });
    if (!r.isConfirmed) return;
    try { await post(`/weekly-recognition/topics/${topic.id}/no-award`); load(); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  const reopen = async () => {
    try { await post(`/weekly-recognition/topics/${topic.id}/reopen`); load(); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  if (loading) return <Spinner />;

  const statusChip = {
    open:     { label: "Open for nominations", bg: "#E8F8EE", fg: "#2E7D5B" },
    closed:   { label: "Winner selected", bg: "#FFF8E7", fg: "#8A6F10" },
    no_award: { label: "Closed · no award", bg: "#E8F0F0", fg: "#5A7A7E" },
  }[topic?.status] || null;

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">Weekly Recognition · Topic</h1>
            <p className="text-xs text-[#CFE6E6] mt-0.5">
              One topic per week. Teachers nominate through the week; the tarbiyati lead selects at week's end.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/education/weekly-recognition/nominate")}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
              ✍️ Nominate
            </button>
            {canSelect && topic && (
              <button onClick={() => navigate(`/education/weekly-recognition/review?topic_id=${topic.id}`)}
                className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
                ⚖️ Review &amp; Select
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-4xl mx-auto">
        {/* Live topic banner */}
        {topic ? (
          <div className="rounded-2xl p-5 text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #14919B)` }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-[11px] opacity-80">
                  {topic.is_current ? "This week" : "Latest topic"} · {topic.week_start} → {topic.week_end}
                </div>
                <h2 className="text-lg font-bold mt-0.5 break-words">{topic.title}</h2>
                {topic.primary_dimension && (
                  <div className="mt-2"><DimPill d={topic.primary_dimension} /></div>
                )}
                <TopicPlan topic={topic} light />
                {statusChip && (
                  <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: statusChip.bg, color: statusChip.fg }}>
                    {statusChip.label}
                  </span>
                )}
              </div>
              {topic.poster_url && (
                <button onClick={() => setZoom(topic.poster_url)} className="shrink-0">
                  <img src={topic.poster_url} alt="" className="h-28 rounded-xl border-2 border-white/40 shadow" />
                </button>
              )}
              <div className="text-center">
                <div className="text-3xl font-bold">{topic.nomination_count}</div>
                <div className="text-[11px] opacity-85">nominations · {topic.student_count} students</div>
              </div>
            </div>

            {topic.awards?.length > 0 && (
              <div className="mt-4 bg-white/12 rounded-xl px-4 py-3">
                <div className="text-[11px] opacity-85 mb-1">🏆 Selected this week</div>
                {topic.awards.map((a) => (
                  <div key={a.id} className="text-sm font-semibold">
                    {a.student} <span className="opacity-80 font-normal">· {a.class}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#D0E0E0] p-6 text-center">
            <div className="text-3xl">🎯</div>
            <p className="text-sm font-semibold text-[#0A3A3E] mt-2">No weekly topic yet</p>
            <p className="text-xs text-[#5A7A7E] mt-1">Set one below so teachers can start nominating.</p>
          </div>
        )}

        {/* Topic form (tarbiyati lead / admin) */}
        {canSelect ? (
          <div id="weekly-topic-form" className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider">
                {editingId ? "Edit this week's topic" : "Set a new week's topic"}
              </h3>
              {editingId && (
                <button type="button" onClick={startNew}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-[#D0E0E0] hover:bg-[#F4F8F8]" style={{ color: TEAL }}>
                  + New topic (past weeks too)
                </button>
              )}
            </div>

            {library.length > 0 && (
              <div className="mb-3">
                <label className="block text-[10px] text-[#5A7A7E] mb-1">Reuse a past topic (with its poster)</label>
                <select value="" onChange={(e) => {
                  const t = library.find((x) => String(x.id) === e.target.value);
                  if (!t) return;
                  setForm((f) => ({ ...f, title: t.title, description: t.description || "", primary_dimension: t.primary_dimension || null,
                    goals: blankPlan(3, t.goals), daily_activities: blankPlan(5, t.daily_activities) }));
                  setPoster({ file: null, preview: t.poster_url, from: t.poster_url ? t.id : null, remove: false });
                }} className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm bg-white">
                  <option value="">— choose a topic used before —</option>
                  {library.map((t) => <option key={t.id} value={t.id}>{t.title} · {t.last_week}{t.times_used > 1 ? ` · ×${t.times_used}` : ""}</option>)}
                </select>
              </div>
            )}

            <div className="grid md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] text-[#5A7A7E] mb-1">Topic title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Honesty & Trustworthiness"
                  className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-[#5A7A7E] mb-1">Week start</label>
                <input type="date" value={form.week_start} onChange={(e) => setForm({ ...form, week_start: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-[#5A7A7E] mb-1">Week end</label>
                <input type="date" value={form.week_end} onChange={(e) => setForm({ ...form, week_end: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none" />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-[10px] text-[#5A7A7E] mb-1.5">
                Which development area does it lean toward?
                <span className="text-[#8AA4A7]"> — optional, teachers can still nominate across all four</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(DIMS).map((d) => (
                  <DimPill key={d} d={d} selected={form.primary_dimension === d}
                    onClick={() => setForm({ ...form, primary_dimension: form.primary_dimension === d ? null : d })} />
                ))}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-[10px] text-[#5A7A7E] mb-1">Topic poster (the design shown to students and parents)</label>
              {(() => {
                const shown = poster.preview || (!poster.remove && topic?.status === "open" ? topic?.poster_url : null);
                return (
                  <div className="flex items-center gap-3 flex-wrap">
                    {shown && <img src={shown} alt="" className="h-24 rounded-lg border border-[#D0E0E0] cursor-zoom-in" onClick={() => setZoom(shown)} />}
                    <label className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#D0E0E0] cursor-pointer hover:bg-[#F4F8F8]" style={{ color: TEAL }}>
                      {shown ? "Change poster" : "Upload poster"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPoster({ file, preview: URL.createObjectURL(file), from: null, remove: false });
                        e.target.value = "";
                      }} />
                    </label>
                    {shown && (
                      <button onClick={() => setPoster({ file: null, preview: null, from: null, remove: true })}
                        className="text-xs font-semibold text-red-500">Remove</button>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="mt-3">
              <label className="block text-[10px] text-[#5A7A7E] mb-1">Short description (optional)</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What should teachers be noticing this week?"
                className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none" />
            </div>

            <PlanEditor heading="Weekly goals" labels={GOAL_LABELS} items={form.goals}
              onChange={(goals) => setForm((f) => ({ ...f, goals }))} />
            <PlanEditor heading="Daily activities" labels={DAY_LABELS} items={form.daily_activities}
              onChange={(daily_activities) => setForm((f) => ({ ...f, daily_activities }))} />

            <div className="flex items-center gap-2 flex-wrap mt-4">
              <button onClick={save} disabled={saving}
                className="px-5 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50"
                style={{ background: TEAL }}>
                {saving ? "Saving…" : "Save topic"}
              </button>
              {topic?.status === "open" && (
                <button onClick={closeNoAward}
                  className="px-4 py-2 text-xs font-semibold text-[#5A7A7E] border border-[#D0E0E0] rounded-xl hover:bg-[#F4F8F8]">
                  No award this week
                </button>
              )}
              {topic?.status === "no_award" && (
                <button onClick={reopen}
                  className="px-4 py-2 text-xs font-semibold text-[#5A7A7E] border border-[#D0E0E0] rounded-xl hover:bg-[#F4F8F8]">
                  Reopen for nominations
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#FFF8E7] border border-[#E8D48B] rounded-2xl px-4 py-3 text-xs text-[#8A6F10]">
            Only the tarbiyati lead sets the weekly topic. You can still nominate students all week.
          </div>
        )}

        {zoom && <PosterLightbox src={zoom} onClose={() => setZoom(null)} />}
        {evalTopic && <EvaluationsModal topic={evalTopic} onClose={() => setEvalTopic(null)} />}

        {/* Recent weeks */}
        {data?.recent_topics?.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
            <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider mb-2">Recent weeks</h3>
            <div className="divide-y divide-[#D0E0E0]">
              {data.recent_topics.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0A3A3E] truncate">{t.title}</div>
                    <div className="text-[11px] text-[#5A7A7E]">{t.week_start} → {t.week_end}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F0F0] text-[#5A7A7E]">{t.status.replace("_", " ")}</span>
                    {topic?.id !== t.id && (
                      <button onClick={() => { setParams({ topic_id: String(t.id) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="text-[11px] font-semibold" style={{ color: TEAL }}>
                        Open
                      </button>
                    )}
                    {t.status === "open" && (
                      <button onClick={() => navigate(`/education/weekly-recognition/nominate?topic_id=${t.id}`)}
                        className="text-[11px] font-semibold" style={{ color: TEAL }}>
                        ✍️ Nominate
                      </button>
                    )}
                    {canSelect && (
                      <button onClick={() => navigate(`/education/weekly-recognition/review?topic_id=${t.id}`)}
                        className="text-[11px] font-semibold" style={{ color: TEAL }}>
                        Review →
                      </button>
                    )}
                    {canSelect && (
                      <button onClick={() => setEvalTopic(t)}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-lg border border-[#D0E0E0] text-[#0A3A3E] hover:bg-[#F4F8F8]">
                        📋 Evaluations
                      </button>
                    )}
                    {canSelect && (
                      <button onClick={() => removeTopic(t)} title="Delete"
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50">
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
