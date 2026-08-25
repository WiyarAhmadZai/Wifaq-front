import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { fmtDate } from "../../utils/formErrors";
import { TEAL, PAPER, Hero, Spinner, StatusPill, DimensionDots } from "./lessonPlanUi";

export default function LessonPlanReview() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const __cached = peekCache("/lesson-plans/review");
    if (__cached) { setRows(__cached?.data || []); setStats(__cached?.stats || null); setLoading(false); }
    get("/lesson-plans/review")
      .then((r) => { setRows(r.data?.data || []); setStats(r.data?.stats || null); })
      .catch((e) => { if (e.response?.status === 403) setForbidden(true); setRows([]); })
      .finally(() => setLoading(false));
  }, []);
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

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;

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

        {rows.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center" style={{ borderColor: "#dbe8e8" }}>
            <p className="text-sm text-gray-400">Queue is clear — no plans waiting. 🎉</p>
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
