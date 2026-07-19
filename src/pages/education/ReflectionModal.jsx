import { useState, useEffect } from "react";
import { get, post, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { TEAL, TEAL_LT, GOLD } from "./lessonPlanUi";

/**
 * Themed post-teaching reflection modal — replaces the raw SweetAlert form.
 * Prefills from the plan's existing reflection when editing.
 *
 *   <ReflectionModal plan={plan} onClose={fn} onSaved={fn} />
 */
export default function ReflectionModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState({ what_worked: "", what_to_change: "", next_time: "", support_request: "", rating: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    const __cached = peekCache(`/lesson-plans/${plan.id}`);
    if (__cached) {
      const ref = __cached?.data?.reflection;
      if (ref) setForm({
        what_worked: ref.what_worked || "", what_to_change: ref.what_to_change || "",
        next_time: ref.next_time || "", support_request: ref.support_request || "", rating: ref.rating || 0,
      });
      setLoading(false);
    }
    get(`/lesson-plans/${plan.id}`)
      .then((r) => {
        const ref = r.data?.data?.reflection;
        if (alive && ref) setForm({
          what_worked: ref.what_worked || "", what_to_change: ref.what_to_change || "",
          next_time: ref.next_time || "", support_request: ref.support_request || "", rating: ref.rating || 0,
        });
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [plan.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await post(`/lesson-plans/${plan.id}/reflect`, { ...form, rating: form.rating || null });
      Swal.fire({ icon: "success", title: "Reflection recorded", timer: 1300, showConfirmButton: false, toast: true, position: "top-end" });
      onSaved?.();
      onClose?.();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not save the reflection.", "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,37,40,.45)" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between sticky top-0" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>2-minute reflection</p>
            <h2 className="text-sm font-black text-white mt-0.5">Post-teaching reflection</h2>
            <p className="text-[11px] text-white/70 mt-0.5 truncate max-w-[20rem]">{plan.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: "rgba(255,255,255,.18)" }}>✕</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} /></div>
        ) : (
          <div className="p-5 space-y-4">
            <Field label="What worked well?" hint="The basis of better teaching next time.">
              <textarea rows={3} value={form.what_worked} onChange={(e) => set("what_worked", e.target.value)}
                placeholder="e.g. Group work on finding examples — students were active and produced about 15." className={txt} />
            </Field>
            <Field label="What needs to change?">
              <textarea rows={2} value={form.what_to_change} onChange={(e) => set("what_to_change", e.target.value)}
                placeholder="e.g. Time for group recitation was short — make groups of 3 instead of 5." className={txt} />
            </Field>
            <Field label="For next time on this topic">
              <textarea rows={2} value={form.next_time} onChange={(e) => set("next_time", e.target.value)} className={txt} />
            </Field>
            <Field label="Request to Department Head / support">
              <textarea rows={2} value={form.support_request} onChange={(e) => set("support_request", e.target.value)} className={txt} />
            </Field>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">How well did it go?</p>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => set("rating", form.rating === n ? 0 : n)}
                    className="text-2xl leading-none transition-transform hover:scale-110"
                    style={{ color: n <= form.rating ? GOLD : "#dcdcd0" }} aria-label={`${n} stars`}>★</button>
                ))}
                <span className="text-[11px] text-gray-400 ml-2">{form.rating ? `${form.rating}/5` : "optional"}</span>
              </div>
              {form.rating >= 4 && (
                <p className="text-[10px] mt-1.5" style={{ color: "#2E7D5B" }}>★ A 4+ rated, complete plan can be promoted to the templates library afterwards.</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t flex gap-2 justify-end sticky bottom-0 bg-white" style={{ borderColor: "#eef4f4" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold border" style={{ borderColor: "#dbe8e8", color: "#5d7273" }}>Cancel</button>
          <button onClick={save} disabled={saving || loading} className="px-5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>
            {saving ? "Recording…" : "Record reflection"}
          </button>
        </div>
      </div>
    </div>
  );
}

const txt = "w-full px-3 py-2.5 border rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-300";
const Field = ({ label, hint, children }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{label}</p>
    {children}
    {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
  </div>
);
