import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { useAuth } from "../../admin/context/AuthContext";
import { fmtDate, fmtDateTime } from "../../utils/formErrors";
import { TEAL, TEAL_LT, GOLD, PAPER, DIMENSIONS, DAY_LABEL, Hero, Spinner, StatusPill, DimensionDots } from "./lessonPlanUi";

const REVIEW_ACTION = {
  approved: { label: "Approved", bg: "#e6f3ec", fg: "#2E7D5B", icon: "✓" },
  returned_for_revision: { label: "Returned for revision", bg: "#f7e3e1", fg: "#C0473F", icon: "↩" },
  escalated: { label: "Escalated", bg: "#eee9f6", fg: "#6b54a8", icon: "↑" },
};

export default function LessonPlanShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const canReview = hasPermission("lesson-plans.review") || hasPermission("lesson-plans.manage");

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const __cached = peekCache(`/lesson-plans/${id}`);
    if (__cached) { setPlan(__cached?.data || null); setLoading(false); }
    get(`/lesson-plans/${id}`)
      .then((r) => setPlan(r.data?.data || null))
      .catch(() => { Swal.fire("Error", "Could not load this lesson plan.", "error"); navigate(-1); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const approve = async () => {
    setBusy(true);
    try {
      await post(`/lesson-plans/${id}/approve`);
      Swal.fire({ icon: "success", title: "Approved", timer: 1100, showConfirmButton: false, toast: true, position: "top-end" });
      navigate("/education/lesson-plans/review");
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); }
    finally { setBusy(false); }
  };

  const returnForRevision = async () => {
    const { value: note } = await Swal.fire({
      title: "Return for revision", input: "textarea",
      inputPlaceholder: "Specific note — e.g. “The character dimension needs one concrete activity.”",
      showCancelButton: true, confirmButtonText: "Return to teacher",
      inputValidator: (v) => (!v || v.trim().length < 3) && "Please give the teacher a specific note.",
    });
    if (!note) return;
    setBusy(true);
    try {
      await post(`/lesson-plans/${id}/return`, { note });
      Swal.fire({ icon: "success", title: "Returned", timer: 1100, showConfirmButton: false, toast: true, position: "top-end" });
      navigate("/education/lesson-plans/review");
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); }
    finally { setBusy(false); }
  };

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;
  if (!plan) return null;

  const teacherName = plan.teacher?.staff?.application?.full_name || "—";
  const reviewable = ["submitted", "in_review"].includes(plan.status);
  const editable = ["draft", "returned_for_revision"].includes(plan.status);
  const reviews = (plan.reviews || []).slice().sort((a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at));
  const ref = plan.reflection;

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className={canReview && reviewable ? "pb-24" : "pb-10"}>
      <Hero title="Lesson Plan" subtitle={`${plan.subject?.subject_name || ""} · ${plan.school_class?.class_name || ""}`}
        right={<button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: "rgba(255,255,255,.18)" }}>← Back</button>} />

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Title + meta */}
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "#dbe8e8" }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-gray-800">{plan.title}</h2>
                <StatusPill status={plan.status} />
              </div>
              <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                <Tag>{teacherName}</Tag>
                <Tag>{plan.subject?.subject_name}</Tag>
                <Tag>{plan.school_class?.class_name}</Tag>
                <Tag>{fmtDate(plan.lesson_date)}</Tag>
                {plan.period_number ? <Tag>{DAY_LABEL[plan.day_of_week] || ""} · Period {plan.period_number}</Tag> : null}
              </div>
            </div>
            <div className="text-right">
              <DimensionDots filled={plan.dimensions_filled} size={9} />
              <p className="text-[10px] text-gray-400 mt-1">{plan.dimensions_filled}/4 dimensions</p>
            </div>
          </div>
          {plan.approved_at && (
            <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t" style={{ borderColor: "#eef4f4" }}>
              Approved by <b className="text-gray-600">{plan.approver?.name || "—"}</b> on {fmtDateTime(plan.approved_at)}
            </p>
          )}
        </div>

        {/* Four dimensions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DIMENSIONS.map((d) => {
            const types = plan[`${d.key === "character" ? "character_values" : d.key + "_types"}`] || [];
            const goal = plan[`${d.key}_goal`];
            const activity = plan[`${d.key}_activity`];
            const filled = goal && activity;
            return (
              <div key={d.key} className="rounded-2xl border bg-white p-4" style={{ borderColor: "#dbe8e8", borderTop: `3px solid ${d.color}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm font-black text-gray-800">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.label}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: filled ? d.color : "#b6c2c2" }}>{filled ? "✓ filled" : "not filled"}</span>
                </div>
                {types.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {types.map((t) => <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: "#f1f6f6", color: "#5d7273" }}>{t}</span>)}
                  </div>
                )}
                {filled ? (
                  <>
                    <Block label="Goal">{goal}</Block>
                    <Block label="Activity">{activity}</Block>
                  </>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">This dimension is empty — a reviewer can request a sentence here.</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Indicators / materials / homework */}
        <div className="rounded-2xl border bg-white p-5 space-y-3" style={{ borderColor: "#dbe8e8" }}>
          <h3 className="text-sm font-black text-gray-800">Indicators, materials &amp; homework</h3>
          <Block label="Success indicators">{plan.success_indicators}</Block>
          {(plan.materials || []).length > 0 && (
            <div>
              <Lbl>Materials</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {plan.materials.map((m) => <span key={m} className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "#E8F6F6", color: TEAL }}>{m}</span>)}
              </div>
            </div>
          )}
          <Block label="Homework">{plan.homework}</Block>
          {plan.recording_requested && (
            <div className="rounded-xl p-3" style={{ background: "#fbf7ec" }}>
              <p className="text-[11px] font-bold" style={{ color: "#9a6a12" }}>🎥 Recording requested {plan.recording_time ? `· ${plan.recording_time}` : ""}</p>
              {plan.recording_note && <p className="text-[11px] text-gray-600 mt-1">{plan.recording_note}</p>}
            </div>
          )}
        </div>

        {/* Reflection */}
        {ref && (
          <div className="rounded-2xl border bg-white p-5 space-y-3" style={{ borderColor: "#dbe8e8" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-800">Post-teaching reflection</h3>
              {ref.rating != null && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#e6f3ec", color: "#2E7D5B" }}>★ {ref.rating}/5</span>}
            </div>
            <Block label="What worked">{ref.what_worked}</Block>
            <Block label="What to change">{ref.what_to_change}</Block>
            <Block label="Next time">{ref.next_time}</Block>
            <Block label="Support requested">{ref.support_request}</Block>
          </div>
        )}

        {/* Review history */}
        {reviews.length > 0 && (
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "#dbe8e8" }}>
            <h3 className="text-sm font-black text-gray-800 mb-3">Review history</h3>
            <div className="space-y-2.5">
              {reviews.map((rv) => {
                const a = REVIEW_ACTION[rv.action] || { label: rv.action, bg: "#eef3f3", fg: "#5d7273", icon: "•" };
                return (
                  <div key={rv.id} className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: a.bg, color: a.fg }}>{a.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] text-gray-800"><b style={{ color: a.fg }}>{a.label}</b> · {rv.reviewer?.name || "—"} <span className="text-gray-400">· {fmtDateTime(rv.reviewed_at)}</span></p>
                      {rv.note && <p className="text-[11px] text-gray-600 mt-0.5">{rv.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Teacher edit shortcut (backend enforces ownership) */}
        {editable && !canReview && (
          <button onClick={() => navigate(`/education/lesson-plans/edit/${id}`)}
            className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border" style={{ borderColor: "#dbe8e8", color: TEAL }}>
            Edit this plan
          </button>
        )}
      </div>

      {/* Reviewer action bar */}
      {canReview && reviewable && (
        <div className="fixed bottom-0 inset-x-0 border-t bg-white/95 backdrop-blur px-4 py-3" style={{ borderColor: "#dbe8e8" }}>
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <span className="text-[11px] text-gray-500 mr-auto">{plan.dimensions_filled === 4 ? "All 4 dimensions complete" : `${4 - plan.dimensions_filled} dimension(s) missing`}</span>
            <button onClick={returnForRevision} disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50" style={{ background: "#f7e3e1", color: "#C0473F" }}>↩ Return for revision</button>
            <button onClick={approve} disabled={busy} className="px-5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: "#2E7D5B" }}>✓ Approve</button>
          </div>
        </div>
      )}
    </div>
  );
}

const Tag = ({ children }) => children ? <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: "#E8F6F6", color: TEAL }}>{children}</span> : null;
const Lbl = ({ children }) => <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{children}</p>;
const Block = ({ label, children }) => children ? (
  <div>
    <Lbl>{label}</Lbl>
    <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{children}</p>
  </div>
) : null;
