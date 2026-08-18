import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, put, peekCache } from "../../api/axios";
import Swal from "sweetalert2";

import { DIMS, DimPill, Spinner, TEAL } from "./weeklyUi";

/** Monday-based start of the week containing `d`, as YYYY-MM-DD. */
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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", week_start: "", week_end: "", primary_dimension: null,
  });

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
    });
  }, []);

  const load = useCallback(async () => {
    const cached = peekCache("/weekly-recognition");
    if (cached) { apply(cached); setLoading(false); }
    try {
      const res = await get("/weekly-recognition");
      apply(res.data);
    } catch {
      Swal.fire("Error", "Failed to load weekly recognition", "error");
    } finally { setLoading(false); }
  }, [apply]);

  useEffect(() => { load(); }, [load]);

  const topic = data?.topic;
  const canSelect = Boolean(data?.can_select);

  const save = async () => {
    if (!form.title.trim()) return Swal.fire("Topic needed", "Give this week a topic title.", "info");
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        week_start: form.week_start,
        week_end: form.week_end,
        primary_dimension: form.primary_dimension,
      };
      // Editing the live topic keeps its id; anything else opens a new week.
      if (topic && topic.status === "open") await put(`/weekly-recognition/topics/${topic.id}`, body);
      else await post("/weekly-recognition/topics", body);
      Swal.fire({ icon: "success", title: "Topic saved", timer: 1200, showConfirmButton: false });
      load();
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
                {statusChip && (
                  <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: statusChip.bg, color: statusChip.fg }}>
                    {statusChip.label}
                  </span>
                )}
              </div>
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
          <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
            <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider mb-3">
              {topic?.status === "open" ? "Edit this week's topic" : "Set a new week's topic"}
            </h3>

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
              <label className="block text-[10px] text-[#5A7A7E] mb-1">Short description (optional)</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What should teachers be noticing this week?"
                className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none" />
            </div>

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
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F0F0] text-[#5A7A7E]">{t.status.replace("_", " ")}</span>
                    {canSelect && (
                      <button onClick={() => navigate(`/education/weekly-recognition/review?topic_id=${t.id}`)}
                        className="text-[11px] font-semibold" style={{ color: TEAL }}>
                        Review →
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
