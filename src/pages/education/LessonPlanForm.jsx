import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";
import { DateField } from "../../components/hr/HrUI";
import useLocalDraft, { readDraft, clearDraft, draftAge } from "../../hooks/useLocalDraft";
import { TEAL, TEAL_LT, GOLD, PAPER, DIMENSIONS, MATERIALS, Hero, Spinner, Chip, DimensionDots, weekdayKey, DAY_LABEL } from "./lessonPlanUi";

const blankForm = () => ({
  schedule_entry_id: "",
  lesson_date: new Date().toISOString().split("T")[0],
  title: "",
  intellectual_types: [], intellectual_goal: "", intellectual_activity: "",
  character_values: [], character_goal: "", character_activity: "",
  social_types: [], social_goal: "", social_activity: "",
  practical_types: [], practical_goal: "", practical_activity: "",
  success_indicators: "",
  materials: [],
  homework: "",
  recording_requested: false, recording_time: "", recording_note: "",
});

// dimension key -> the form field names for its type-array
const typeField = { intellectual: "intellectual_types", character: "character_values", social: "social_types", practical: "practical_types" };

export default function LessonPlanForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const isEdit = Boolean(id);

  const [slots, setSlots] = useState([]);
  const [isTeacher, setIsTeacher] = useState(true);
  const [form, setForm] = useState(blankForm());
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Survives a dropped connection: the form is mirrored to this browser while
  // it is being written, and cleared as soon as the server has it.
  const draftKey = `lesson-plan:${id || "new"}`;
  useLocalDraft(draftKey, form, { enabled: !loading });

  useEffect(() => {
    (async () => {
      try {
        const fd = await get("/lesson-plans/form-data");
        setSlots(fd.data?.slots || []);
        setIsTeacher(fd.data?.is_teacher !== false);
        if (isEdit) {
          const r = await get(`/lesson-plans/${id}`);
          const d = r.data?.data;
          if (d) {
            setStatus(d.status);
            setForm({
              schedule_entry_id: d.schedule_entry_id || "",
              lesson_date: d.lesson_date?.split("T")[0] || "",
              title: d.title || "",
              intellectual_types: d.intellectual_types || [], intellectual_goal: d.intellectual_goal || "", intellectual_activity: d.intellectual_activity || "",
              character_values: d.character_values || [], character_goal: d.character_goal || "", character_activity: d.character_activity || "",
              social_types: d.social_types || [], social_goal: d.social_goal || "", social_activity: d.social_activity || "",
              practical_types: d.practical_types || [], practical_goal: d.practical_goal || "", practical_activity: d.practical_activity || "",
              success_indicators: d.success_indicators || "",
              materials: d.materials || [],
              homework: d.homework || "",
              recording_requested: d.recording_requested || false, recording_time: d.recording_time || "", recording_note: d.recording_note || "",
            });
          }
        } else if (state?.prefill) {
          // Coming from "copy template" — merge the 4D content, keep slot/date blank.
          setForm((f) => ({ ...f, ...state.prefill }));
        }
      } catch {
        Swal.fire("Error", "Failed to load the planning form.", "error");
      } finally {
        setLoading(false);
      }

      // Anything left behind by a dropped connection is offered back rather
      // than restored silently — the server copy may well be the newer one.
      const saved = readDraft(`lesson-plan:${id || "new"}`);
      if (saved) {
        const { isConfirmed } = await Swal.fire({
          icon: "info",
          title: "Unsaved work found",
          // One sentence per text node: an inline <b> splits the string in the
          // DOM, and half a sentence can never be matched by the dictionary.
          text: "This plan was never saved to the server. Restore what you had written?",
          footer: `Last edited ${draftAge(saved.savedAt)}`,
          showCancelButton: true,
          confirmButtonText: "Restore my work",
          cancelButtonText: "Discard it",
          reverseButtons: true,
        });
        if (isConfirmed) setForm((f) => ({ ...f, ...saved.data }));
        else clearDraft(`lesson-plan:${id || "new"}`);
      }
    })();
  }, [id]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleIn = (field, value) =>
    setForm((f) => {
      const arr = f[field] || [];
      return { ...f, [field]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });

  // Slots available for the chosen date's weekday.
  const dayKey = weekdayKey(form.lesson_date);
  const daySlots = useMemo(() => slots.filter((s) => s.day_of_week === dayKey), [slots, dayKey]);
  const slot = slots.find((s) => String(s.schedule_entry_id) === String(form.schedule_entry_id));

  // The distinct weekdays this teacher actually teaches (for quick-jump chips).
  const ORDER = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"];
  const teachingDays = useMemo(
    () => ORDER.filter((d) => slots.some((s) => s.day_of_week === d)),
    [slots],
  );

  /**
   * Moving a lesson to another date.
   *
   * The slot used to be cleared on EVERY date change, which made a plan
   * impossible to reschedule once approved: the slot picker is frozen at that
   * point, so the plan was left with no slot and could never be saved again.
   *
   * A slot belongs to a weekday, so moving a lesson from one Sunday to the
   * next keeps the very same timetable period — only a change of weekday
   * really invalidates it.
   */
  const moveDate = (next) =>
    weekdayKey(next) === weekdayKey(form.lesson_date)
      ? { lesson_date: next }
      : { lesson_date: next, schedule_entry_id: "" };

  // Set the date to the next upcoming occurrence of a given weekday.
  const jumpToDay = (day) => {
    const target = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(day);
    const d = new Date();
    for (let i = 0; i < 14; i++) {
      if (d.getDay() === target) break;
      d.setDate(d.getDate() + 1);
    }
    set({ lesson_date: d.toISOString().split("T")[0], schedule_entry_id: "" });
  };

  const filledCount = DIMENSIONS.filter((d) => form[`${d.key}_goal`]?.trim() && form[`${d.key}_activity`]?.trim()).length;

  const canSave = form.schedule_entry_id && form.lesson_date && form.title.trim();
  const frozenIdentity = ["approved", "delivered", "reflected"].includes(status);

  const save = async (submit) => {
    if (!canSave) {
      Swal.fire("Missing", "Pick a date, a timetable slot, and a title first.", "warning");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, submit };
      if (frozenIdentity) { delete payload.title; delete payload.homework; }
      if (isEdit) {
        await put(`/lesson-plans/${id}`, payload);
      } else {
        await post("/lesson-plans", payload);
      }
      clearDraft(draftKey);   // the server has it now — drop the safety copy
      Swal.fire({
        icon: "success",
        title: submit ? "Submitted for review" : "Draft saved",
        timer: 1400, showConfirmButton: false, toast: true, position: "top-end",
      });
      navigate("/education/lesson-plans/my");
    } catch (err) {
      // No response at all means the request never reached the server — the
      // classic dropped connection. The work is safe in this browser, and
      // saying so is the difference between retrying and rewriting.
      if (!err.response) {
        Swal.fire({
          icon: "warning",
          title: "No connection",
          text: "Your plan could not be sent, but everything you typed is kept safely on this device. Reconnect and press Save again — nothing is lost.",
          confirmButtonText: "Got it",
        });
      } else {
        Swal.fire("Error", err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || "Failed to save.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;

  // Creating a plan needs a teaching timetable. Leadership editing an existing
  // plan is still allowed (isEdit), so this only blocks brand-new plans.
  if (!isEdit && !isTeacher) {
    return (
      <div style={{ background: PAPER, minHeight: "100vh" }}>
        <Hero title="New 4D Lesson Plan"
          right={<button onClick={() => navigate("/education/lesson-plans")} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: "rgba(255,255,255,.18)" }}>← Back</button>} />
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="rounded-2xl border bg-white p-8 text-center" style={{ borderColor: "#dbe8e8" }}>
            <p className="text-sm font-black text-gray-800">No teaching timetable for your account</p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Lesson plans are written by the teacher assigned to a class period, so the slot options come from <b>your timetable</b>.
              Your account isn’t mapped to a teacher with scheduled periods. Sign in as a teacher (e.g. <b>teacher1@wifaq.test</b>),
              or ask the Class Manager to add you to the schedule under <b>Class Management → Schedule</b>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-28">
      <Hero title={isEdit ? "Edit 4D Lesson Plan" : "New 4D Lesson Plan"}
        subtitle="Every plan touches four dimensions, is reviewed, then flows to the class register."
        right={
          <button onClick={() => navigate("/education/lesson-plans/my")} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: "rgba(255,255,255,.18)" }}>
            ← My plans
          </button>
        } />

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Identity */}
        <Card title="Plan identity" badge={<DimensionDots filled={filledCount} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Lesson date *">
              <DateField name="lesson_date" value={form.lesson_date}
                onChange={(e) => set(moveDate(e.target.value))} className={inp} />
              {dayKey === "friday" && <p className="text-[10px] mt-1" style={{ color: "#C0473F" }}>Friday is not a school day — pick another date.</p>}
            </Field>
            <Field label="Timetable slot *">
              <select value={form.schedule_entry_id} onChange={(e) => set({ schedule_entry_id: e.target.value })} className={inp} disabled={frozenIdentity}>
                <option value="">{daySlots.length ? "Select class · subject · period…" : "No periods scheduled this day"}</option>
                {daySlots.map((s) => (
                  <option key={s.schedule_entry_id} value={s.schedule_entry_id}>
                    {s.class_name} · {s.subject_name} · Period {s.period_number}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {slot && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <Tag>{slot.class_name}</Tag><Tag>{slot.subject_name}</Tag>
              <Tag>{DAY_LABEL[slot.day_of_week]} · Period {slot.period_number}</Tag>
            </div>
          )}

          {/* Guidance: teacher has no timetable at all, or none on the chosen day. */}
          {slots.length === 0 ? (
            <p className="mt-2 text-[11px] rounded-lg px-3 py-2" style={{ background: "#fbf0db", color: "#9a6a12" }}>
              You have no scheduled periods yet. Ask the Class Manager to add you to the timetable (Class Management → Schedule).
            </p>
          ) : daySlots.length === 0 && (
            <div className="mt-2">
              <p className="text-[11px] text-gray-500 mb-1.5">No periods on the selected day. You teach on — tap to jump to the next one:</p>
              <div className="flex flex-wrap gap-1.5">
                {teachingDays.map((d) => (
                  <button key={d} type="button" onClick={() => jumpToDay(d)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border" style={{ borderColor: "#dbe8e8", color: TEAL }}>
                    {DAY_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Field label="Title / topic *" className="mt-3">
            <input value={form.title} onChange={(e) => set({ title: e.target.value })} disabled={frozenIdentity}
              placeholder="e.g. Recitation and idgham mithlayn rule" className={inp} />
          </Field>
        </Card>

        {/* Four dimensions */}
        {DIMENSIONS.map((d) => {
          const f = typeField[d.key];
          const filled = form[`${d.key}_goal`]?.trim() && form[`${d.key}_activity`]?.trim();
          return (
            <Card key={d.key}
              title={<span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.label} dimension</span>}
              badge={<span className="text-[10px] font-bold" style={{ color: filled ? d.color : "#9ca3af" }}>{filled ? "✓ filled" : "empty"}</span>}
              hint={d.hint}>
              <div className="flex flex-wrap gap-2 mb-3">
                {d.types.map((t) => (
                  <Chip key={t} on={(form[f] || []).includes(t)} onClick={() => toggleIn(f, t)} color={d.color}>{t}</Chip>
                ))}
              </div>
              <Field label={`${d.label} goal`}>
                <textarea rows={2} value={form[`${d.key}_goal`]} onChange={(e) => set({ [`${d.key}_goal`]: e.target.value })}
                  placeholder="What should the student achieve?" className={txt} />
              </Field>
              <Field label="Activity description" className="mt-2">
                <textarea rows={3} value={form[`${d.key}_activity`]} onChange={(e) => set({ [`${d.key}_activity`]: e.target.value })}
                  placeholder="What is taught and how — step by step." className={txt} />
              </Field>
            </Card>
          );
        })}

        {/* Indicators / materials / homework */}
        <Card title="Success indicators, materials & homework">
          <Field label="Success indicators — what tells you the lesson worked?">
            <textarea rows={2} value={form.success_indicators} onChange={(e) => set({ success_indicators: e.target.value })} className={txt} />
          </Field>
          <Field label="Materials needed" className="mt-3">
            <div className="flex flex-wrap gap-2">
              {MATERIALS.map((m) => <Chip key={m} on={form.materials.includes(m)} onClick={() => toggleIn("materials", m)}>{m}</Chip>)}
            </div>
          </Field>
          <Field label="Homework" className="mt-3">
            <textarea rows={2} value={form.homework} onChange={(e) => set({ homework: e.target.value })} disabled={frozenIdentity}
              placeholder="Auto-flows to the homework module as a draft on approval." className={txt} />
          </Field>
        </Card>

        {/* Recording request */}
        <Card title="Recording request (optional)">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.recording_requested} onChange={(e) => set({ recording_requested: e.target.checked })} />
            I would like this lesson recorded (for the templates library / media team)
          </label>
          {form.recording_requested && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Field label="Recording time">
                <input value={form.recording_time} onChange={(e) => set({ recording_time: e.target.value })} placeholder="e.g. 8:30–8:50" className={inp} />
              </Field>
              <Field label="Note for the videographer">
                <input value={form.recording_note} onChange={(e) => set({ recording_note: e.target.value })} className={inp} />
              </Field>
            </div>
          )}
        </Card>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 inset-x-0 border-t bg-white/95 backdrop-blur px-4 py-3" style={{ borderColor: "#dbe8e8" }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <DimensionDots filled={filledCount} /> <b>{filledCount}/4</b> dimensions
            {filledCount < 4 && <span className="text-gray-400">— incomplete is fine, the DH will see the gap</span>}
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => save(false)} disabled={saving || !canSave}
              className="px-4 py-2 rounded-xl text-xs font-bold border disabled:opacity-50" style={{ borderColor: "#dbe8e8", color: TEAL }}>
              Save draft
            </button>
            <button onClick={() => save(true)} disabled={saving || !canSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>
              {saving ? "Saving…" : "Submit for review →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── local atoms ── */
const inp = "w-full px-3 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300";
const txt = "w-full px-3 py-2.5 border rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-300";
const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{label}</label>
    {children}
  </div>
);
const Tag = ({ children }) => <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: "#E8F6F6", color: TEAL }}>{children}</span>;
const Card = ({ title, badge, hint, children }) => (
  <div className="rounded-2xl border bg-white" style={{ borderColor: "#dbe8e8" }}>
    <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "#eef4f4" }}>
      <div>
        <h3 className="text-sm font-black text-gray-800">{title}</h3>
        {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {badge}
    </div>
    <div className="p-4">{children}</div>
  </div>
);
