import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { fmtDate } from "../../utils/formErrors";
import { TEAL, PAPER, Hero, Spinner, StatusPill, DimensionDots } from "./lessonPlanUi";
import TeacherMultiSelect from "../../components/education/TeacherMultiSelect";

export default function LessonPlanReview() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  /* Filters. `search` is what the reviewer types; `q` is the debounced copy the
   * request actually uses, so a five-letter name is one request rather than
   * five. */
  const [teacherIds, setTeacherIds] = useState([]);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (teacherIds.length) params.teacher_ids = teacherIds;
    // Only the unfiltered queue is worth reading from cache; a filtered view is
    // cheap and must never show somebody else's result.
    const filtered = Boolean(q) || teacherIds.length > 0;
    const __cached = filtered ? null : peekCache("/lesson-plans/review", params);
    if (__cached) {
      setRows(__cached?.data || []);
      setStats(__cached?.stats || null);
      setTeachers(__cached?.teachers || []);
      setLoading(false);
    }
    get("/lesson-plans/review", { params, cache: !filtered })
      .then((r) => {
        setRows(r.data?.data || []);
        setStats(r.data?.stats || null);
        setTeachers(r.data?.teachers || []);
      })
      .catch((e) => { if (e.response?.status === 403) setForbidden(true); setRows([]); })
      .finally(() => setLoading(false));
  }, [q, teacherIds]);
  useEffect(() => { load(); }, [load]);

  /**
   * Confirm what actually happened to the teacher.
   *
   * A 1-second toast saying "Returned" could not tell the reviewer whether the
   * teacher had been told — which is exactly what they asked for. The server
   * now reports whether a notification could be delivered, so a reachable
   * teacher gets a confirmation the reviewer has to dismiss, and an
   * unreachable one gets a warning instead of a green tick.
   */
  const reportDelivery = (res, fallbackTitle) => {
    const d = res?.data || {};
    if (d.notified === false) {
      return Swal.fire({
        icon: "warning",
        title: "Saved — but not delivered",
        text: d.message || "The teacher has no user account linked, so they were not notified.",
        confirmButtonText: "I'll tell them another way",
      });
    }
    return Swal.fire({
      icon: "success",
      title: fallbackTitle,
      text: d.message || "",
      timer: 2600,
      timerProgressBar: true,
      showConfirmButton: true,
      confirmButtonText: "Done",
    });
  };

  const approve = async (p) => {
    setBusy(p.id);
    try {
      const res = await post(`/lesson-plans/${p.id}/approve`);
      await reportDelivery(res, "Approved");
      load();
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setBusy(null); }
  };

  const returnForRevision = async (p) => {
    const { value: note } = await Swal.fire({
      title: "Return for revision",
      input: "textarea",
      inputPlaceholder: "Specific note — e.g. “The character dimension needs one sentence.”",
      showCancelButton: true, confirmButtonText: "Return to teacher",
      inputValidator: (v) => (!v || v.trim().length < 3) && "Please give the teacher a specific note.",
    });
    if (!note) return;
    setBusy(p.id);
    try {
      const res = await post(`/lesson-plans/${p.id}/return`, { note });
      await reportDelivery(res, "Sent back to the teacher");
      load();
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setBusy(null); }
  };

  if (forbidden) return (
    <div style={{ background: PAPER, minHeight: "100vh" }}>
      <Hero title="Review Queue" />
      <div className="max-w-3xl mx-auto px-4 py-10 text-center text-sm text-gray-500">You don't have reviewer access.</div>
    </div>
  );

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Department-Head Review Queue" subtitle="Quality of teaching before it happens — median review ≈ 3 minutes" />

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Awaiting review" value={stats.awaiting} accent="#C98A27" />
            <Kpi label="4D complete" value={stats.complete} accent="#2E7D5B" />
            <Kpi label="Incomplete" value={stats.incomplete} accent="#C0473F" />
          </div>
        )}

        {/* Filters. Search covers the plan title, subject, class and the
          * teacher's name, so one box answers most of what a reviewer types. */}
        <div className="rounded-2xl border bg-white p-3" style={{ borderColor: "#dbe8e8" }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[13rem]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by teacher, title, subject or class…"
                className="w-full ps-8 pe-3 py-2 rounded-xl text-[11px] border focus:outline-none"
                style={{ borderColor: "#dbe8e8" }}
              />
              <svg className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
            </div>

            <TeacherMultiSelect options={teachers} value={teacherIds} onChange={setTeacherIds} />

            {teachers.length > 0 && (
              <button onClick={() => setShowBreakdown((v) => !v)}
                className="px-3 py-2 rounded-xl text-[11px] font-bold border"
                style={showBreakdown ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: TEAL, borderColor: "#dbe8e8" }}>
                Per teacher
              </button>
            )}

            {(search || teacherIds.length > 0) && (
              <button onClick={() => { setSearch(""); setTeacherIds([]); }}
                className="px-3 py-2 rounded-xl text-[11px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>
                Clear
              </button>
            )}

            {stats && (
              <span className="text-[11px] text-gray-500 ms-auto">
                Showing <b className="text-gray-700">{rows.length}</b> of {stats.awaiting}
              </span>
            )}
          </div>

          {/* Who has how much, and in what state — the question the picker's
            * counts answer one name at a time, laid out for the whole team. */}
          {showBreakdown && teachers.length > 0 && (
            <div className="mt-3 pt-3 border-t overflow-x-auto" style={{ borderColor: "#eef4f4" }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-wide text-gray-400">
                    <th className="text-start py-1.5 font-bold">Teacher</th>
                    <th className="text-end py-1.5 font-bold px-2">In review</th>
                    <th className="text-end py-1.5 font-bold px-2">Approved</th>
                    <th className="text-end py-1.5 font-bold px-2">Returned</th>
                    <th className="text-end py-1.5 font-bold px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => {
                    const on = teacherIds.includes(t.id);
                    return (
                      <tr key={t.id}
                        onClick={() => setTeacherIds(on ? teacherIds.filter((x) => x !== t.id) : [...teacherIds, t.id])}
                        title="Click to filter the queue to this teacher"
                        className={`cursor-pointer border-t ${on ? "bg-teal-50" : "hover:bg-gray-50"}`}
                        style={{ borderColor: "#f2f7f7" }}>
                        <td className="py-1.5 font-bold text-gray-700">{t.name}</td>
                        <td className="py-1.5 px-2 text-end font-black" style={{ color: t.in_review ? "#9a6a12" : "#cbd5d5" }}>{t.in_review}</td>
                        <td className="py-1.5 px-2 text-end font-black" style={{ color: t.approved ? "#2E7D5B" : "#cbd5d5" }}>{t.approved}</td>
                        <td className="py-1.5 px-2 text-end font-black" style={{ color: t.returned ? "#C0473F" : "#cbd5d5" }}>{t.returned}</td>
                        <td className="py-1.5 px-2 text-end text-gray-500">{t.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {loading ? <Spinner /> : rows.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center" style={{ borderColor: "#dbe8e8" }}>
            <p className="text-sm text-gray-400">
              {search || teacherIds.length > 0
                ? "No plan matches these filters."
                : "Queue is clear — no plans waiting. 🎉"}
            </p>
          </div>
        ) : rows.map((p) => (
          <div key={p.id} className="rounded-2xl border bg-white p-4" style={{ borderColor: "#dbe8e8" }}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-black text-gray-800 truncate">{p.title}</p>
                  <StatusPill status={p.status} />
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{p.teacher} · {p.subject} · {p.class} · {fmtDate(p.lesson_date)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <DimensionDots filled={p.dimensions_filled} />
                  <span className="text-[10px] font-bold" style={{ color: p.dimensions_filled === 4 ? "#2E7D5B" : "#9a6a12" }}>{p.system_note}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: "#eef4f4" }}>
              <button onClick={() => navigate(`/education/lesson-plans/show/${p.id}`)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border" style={{ borderColor: "#dbe8e8", color: TEAL }}>Open</button>
              <button onClick={() => approve(p)} disabled={busy === p.id} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-50" style={{ background: "#2E7D5B" }}>✓ Approve</button>
              <button onClick={() => returnForRevision(p)} disabled={busy === p.id} className="px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50" style={{ background: "#f7e3e1", color: "#C0473F" }}>↩ Return for revision</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const Kpi = ({ label, value, accent }) => (
  <div className="rounded-2xl border bg-white p-4 relative overflow-hidden" style={{ borderColor: "#dbe8e8" }}>
    <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-2xl font-black text-gray-800 mt-1 leading-none">{value}</p>
  </div>
);
