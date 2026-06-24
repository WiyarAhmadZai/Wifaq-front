import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, put, post } from "../../api/axios";
import { toastSuccess, toastError } from "../../utils/toast";
import Modal from "../../components/Modal";
import { fmtDate, fmtDateTime } from "../../utils/formErrors";

/* ── tokens ── */
const TEAL = "#0D5C63", TEAL_LT = "#14919B", GOLD = "#C9A227", PAPER = "#F5F2EC";
const DIMS = [
  { key: "intellectual", ar: "ذهنی", label: "Intellectual", color: "#14919B" },
  { key: "character", ar: "شخصیتی", label: "Character", color: "#C9A227" },
  { key: "social", ar: "اجتماعی", label: "Social", color: "#1A7A4C" },
  { key: "practical", ar: "عملی", label: "Practical", color: "#6B4FA0" },
];

const TABS = [
  { key: "dossier", label: "Dossier", group: "Identity" },
  { key: "story", label: "Life Story", group: "Identity" },
  { key: "aspirations", label: "Aspirations", group: "Identity" },
  { key: "fourd", label: "4D Ratings", group: "Self-Knowledge" },
  { key: "deepself", label: "Deep Self", group: "Self-Knowledge" },
  { key: "habits", label: "Daily Habits", group: "Self-Knowledge" },
  { key: "family", label: "Family", group: "Family" },
  { key: "familydeep", label: "Home (sensitive)", group: "Family", sensitive: true },
  { key: "observations", label: "Observations", group: "Record" },
  { key: "portrait", label: "Portrait · سیما", group: "Record" },
  { key: "interview", label: "Interviewer", group: "Interviewer", sensitive: true },
  { key: "caredesk", label: "Care Desk", group: "Action" },
];

export default function StudentProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dossier");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    get(`/student-management/students/${id}/profile`)
      .then((r) => setData(r.data?.data || null))
      .catch((e) => {
        toastError(e.response?.data?.message || "Failed to load profile");
        navigate("/student-management/students");
      })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const save = async (method, path, body, msg = "Saved") => {
    setSaving(true);
    try {
      await (method === "put" ? put : post)(`/student-management/students/${id}/profile${path}`, body);
      toastSuccess(msg);
      load();
      return true;
    } catch (e) {
      toastError(e.response?.data?.message || Object.values(e.response?.data?.errors || {})[0]?.[0] || "Failed to save");
      return false;
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;
  if (!data) return null;

  const s = data.student, can = data.can || {};
  const visibleTabs = TABS.filter((t) => !t.sensitive || can.view_sensitive);

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      {/* Header */}
      <div className="px-5 py-4" style={{ background: "#052528" }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-white" style={{ background: "rgba(255,255,255,.12)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white" style={{ background: `linear-gradient(135deg, ${TEAL_LT}, ${TEAL})`, border: `2px solid ${GOLD}` }}>
              {(s.first_name?.[0] || "?").toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>شناسنامه · Student Profile</p>
              <h1 className="text-base font-black text-white">{s.full_name}</h1>
              <p className="text-[11px] text-white/60">{s.student_id} · {s.class || "—"} · {s.grade || ""} {s.age ? `· Age ${s.age}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AccessBadge level={data.profile?.access_level} />
            {can.update && (
              <button onClick={() => navigate(`/student-management/students/show/${id}`)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: "rgba(255,255,255,.12)" }}>
                Full record →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10" style={{ borderColor: "#e3ddd0" }}>
        <div className="px-3 py-2 flex gap-1 overflow-x-auto max-w-6xl mx-auto">
          {visibleTabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
              style={tab === t.key ? { background: TEAL, color: "#fff" } : { color: "#6b7c7e" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5">
        {tab === "dossier" && <Dossier data={data} save={save} saving={saving} reload={load} />}
        {tab === "story" && <Story data={data} save={save} saving={saving} />}
        {tab === "aspirations" && <Aspirations data={data} save={save} saving={saving} />}
        {tab === "fourd" && <FourD data={data} save={save} saving={saving} />}
        {tab === "deepself" && <DeepSelf data={data} save={save} saving={saving} />}
        {tab === "habits" && <Habits data={data} save={save} saving={saving} />}
        {tab === "family" && <FamilyTab data={data} />}
        {tab === "familydeep" && <FamilyDeep data={data} save={save} saving={saving} />}
        {tab === "observations" && <Observations data={data} />}
        {tab === "portrait" && <Portrait data={data} save={save} saving={saving} />}
        {tab === "interview" && <Interview data={data} save={save} saving={saving} />}
        {tab === "caredesk" && <CareDesk data={data} />}
      </div>
    </div>
  );
}

/* ════════════════════ TABS ════════════════════ */

function Dossier({ data, save, saving }) {
  const s = data.student, p = data.profile || {}, fam = data.family || {};
  const [lvlOpen, setLvlOpen] = useState(false);
  const [lvl, setLvl] = useState(p.access_level || "L1");
  const [reason, setReason] = useState("");
  const submitLevel = async () => {
    if (await save("put", "/access-level", { access_level: lvl, access_level_reason: reason }, "Access level set")) {
      setLvlOpen(false); setReason("");
    }
  };
  return (
    <div className="space-y-4">
      <Card title="Student Identity" titleAr="هویت متعلم">
        <Grid>
          <Field k="Full name" v={s.full_name} />
          <Field k="Student ID" v={s.student_id} />
          <Field k="Gender" v={s.gender} />
          <Field k="Date of birth" v={fmtDate(s.date_of_birth)} />
          <Field k="Age" v={s.age ? `${s.age}` : "—"} />
          <Field k="Class · Grade" v={`${s.class || "—"} · ${s.grade || ""}`} hl />
          <Field k="Status" v={s.status} />
          <Field k="Enrolled" v={fmtDate(s.enrollment_date)} />
        </Grid>
      </Card>

      <Card title="Admin Record" titleAr="معلومات اداری"
        action={data.can.manage_access && <button onClick={() => setLvlOpen(true)} className="text-[11px] font-bold" style={{ color: TEAL }}>Set access ▸</button>}>
        <Grid>
          <Field k="Family" v={fam.family_id ? `${fam.family_id} — ${fam.father_name}` : "—"} />
          <Field k="Mentor (رهنما)" v={p.mentor_teacher?.name} />
          <Field k="Interviewer" v={p.interviewer?.name} />
          <Field k="Interview date" v={p.interview_date ? fmtDate(p.interview_date) : "—"} />
          <Field k="Access level" v={p.access_level || "L1"} />
          <Field k="Set by" v={p.access_set_by?.name} />
          <Field k="Next update" v={p.next_update_due} />
        </Grid>
      </Card>

      {data.can.update && (
        <EditCard title="Edit profile head" fields={[
          { name: "interview_location", label: "Interview location" },
          { name: "interview_attendees", label: "Attendees" },
          { name: "intake_form_url", label: "Intake form URL" },
          { name: "next_update_due", label: "Next update due (e.g. 1404/07)" },
        ]} init={p} onSave={(body) => save("put", "/head", body, "Profile saved")} saving={saving} />
      )}

      <Modal open={lvlOpen} onClose={() => setLvlOpen(false)} title="Set access level" subtitle="Controls who can see this profile's depth"
        footer={<>
          <button onClick={() => setLvlOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold border" style={{ borderColor: "#dbe8e8", color: "#5d7273" }}>Cancel</button>
          <button onClick={submitLevel} disabled={saving} className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>Set level</button>
        </>}>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Access level</label>
        <div className="flex gap-2 mb-3">
          {[["L1", "L1 · basic"], ["L2", "L2 · extended"], ["L3", "L3 · full"]].map(([v, l]) => (
            <button key={v} onClick={() => setLvl(v)} className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border"
              style={lvl === v ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{l}</button>
          ))}
        </div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Reason (optional)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={txtCls} dir="auto" />
      </Modal>
    </div>
  );
}

function Story({ data, save, saving }) {
  const ip = data.intake_personal || {};
  const fields = [
    { name: "life_story", label: "Life narrative · قصه زندگی", area: true },
    { name: "influential_person", label: "Most influential person" },
    { name: "perceived_talents", label: "Perceived talents" },
    { name: "career_aspiration", label: "Career aspiration" },
    { name: "favourite_activities", label: "Favourite activities" },
    { name: "favourite_subjects", label: "Favourite subjects" },
    { name: "hardest_subjects", label: "Hardest subjects" },
    { name: "self_description", label: "Self-description", area: true },
  ];
  return data.can.update
    ? <EditCard title="Personal Story · قصه شخصی" fields={fields} init={ip} onSave={(b) => save("put", "/intake", b, "Saved")} saving={saving} alwaysEdit />
    : <ReadCard title="Personal Story · قصه شخصی" fields={fields} obj={ip} />;
}

function Aspirations({ data, save, saving }) {
  const a = data.aspirations || {};
  const fields = [
    { name: "want_to_know_discover", label: "ذهنی — want to know / discover", area: true },
    { name: "want_to_be_do", label: "شخصیتی — want to be / do", area: true },
    { name: "want_to_help", label: "اجتماعی — want to help", area: true },
    { name: "want_to_build_create", label: "عملی — want to build / create", area: true },
    { name: "when_grow_up", label: "When I grow up" },
    { name: "when_grow_up_reason", label: "…because", area: true },
    { name: "literal_dreams", label: "Dreams (خواب‌ها)", area: true },
  ];
  return data.can.update
    ? <EditCard title="Dreams & Aspirations · رویاها" fields={fields} init={a} onSave={(b) => save("put", "/aspirations", b, "Saved")} saving={saving} alwaysEdit />
    : <ReadCard title="Dreams & Aspirations · رویاها" fields={fields} obj={a} />;
}

function FourD({ data, save, saving }) {
  const ratings = data.four_d_self_ratings || [];
  const latest = (by) => ratings.find((r) => r.rated_by === by);
  const [open, setOpen] = useState(false);
  const blank = { rated_by: "student", context: "intake", intellectual_score: "", character_score: "", social_score: "", practical_score: "", intellectual_note: "", character_note: "", social_note: "", practical_note: "", evidence: "" };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <Card title="4D Self-Rating · ارزیابی چهاربعدی" titleAr=""
        action={data.can.update && <button onClick={() => setOpen((o) => !o)} className="text-[11px] font-bold" style={{ color: TEAL }}>{open ? "Close" : "＋ Add rating"}</button>}>
        {["student", "parent", "mentor"].map((by) => {
          const r = latest(by);
          if (!r) return <p key={by} className="text-[11px] text-gray-400 py-1">No {by} rating yet.</p>;
          return (
            <div key={by} className="mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">{by} · {r.context}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DIMS.map((d) => (
                  <div key={d.key} className="rounded-xl p-2.5 border" style={{ borderColor: d.color + "55", background: d.color + "0d" }}>
                    <p className="text-[11px] font-bold" dir="rtl" style={{ color: d.color }}>{d.ar}</p>
                    <p className="text-lg font-black text-gray-800">{r[`${d.key}_score`] ?? "—"}<span className="text-[10px] text-gray-400">/10</span></p>
                    {r[`${d.key}_note`] && <p className="text-[10px] text-gray-500 mt-0.5" dir="auto">{r[`${d.key}_note`]}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Card>

      {open && data.can.update && (
        <Card title="New 4D rating">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Sel label="Rated by" value={form.rated_by} onChange={(v) => set("rated_by", v)} options={[["student", "Student"], ["parent", "Parent"], ["mentor", "Mentor"]]} />
            <Sel label="Context" value={form.context} onChange={(v) => set("context", v)} options={[["intake", "Intake"], ["grade4", "Grade 4"], ["grade7", "Grade 7"], ["ad_hoc", "Ad-hoc"]]} />
          </div>
          {DIMS.map((d) => (
            <div key={d.key} className="mb-2">
              <p className="text-[11px] font-bold mb-1" style={{ color: d.color }}>{d.ar} · {d.label}</p>
              <div className="flex gap-2">
                <input type="number" min={0} max={10} step={0.1} value={form[`${d.key}_score`]} onChange={(e) => set(`${d.key}_score`, e.target.value)} placeholder="0-10" className={inpCls + " w-24"} />
                <input value={form[`${d.key}_note`]} onChange={(e) => set(`${d.key}_note`, e.target.value)} placeholder="note" className={inpCls + " flex-1"} dir="auto" />
              </div>
            </div>
          ))}
          <textarea value={form.evidence} onChange={(e) => set("evidence", e.target.value)} placeholder="Evidence (for parent/mentor)" className={txtCls} dir="auto" />
          <div className="flex justify-end mt-2">
            <button disabled={saving} onClick={async () => { if (await save("post", "/4d-rating", form, "Rating recorded")) { setForm(blank); setOpen(false); } }} className={btnPrimary} style={{ background: TEAL }}>Record</button>
          </div>
        </Card>
      )}
    </div>
  );
}

function DeepSelf({ data, save, saving }) {
  const d = data.deep_self_knowledge || {};
  const fields = [
    { name: "intellectual_likes_thinking_about", label: "ذهنی — likes thinking about", area: true },
    { name: "intellectual_unanswered_question", label: "ذهنی — an unanswered question" },
    { name: "character_most_important_value", label: "شخصیتی — most important value" },
    { name: "character_moral_hero", label: "شخصیتی — moral hero" },
    { name: "character_close_to_god_when", label: "شخصیتی — feels close to God when" },
    { name: "social_how_helps_others", label: "اجتماعی — how helps others" },
    { name: "social_what_people_say", label: "اجتماعی — what people say" },
    { name: "practical_likes_to_make", label: "عملی — likes to make" },
    { name: "practical_proud_skill", label: "عملی — proud skill" },
  ];
  return data.can.update
    ? <EditCard title="Deep 4D Self-Knowledge · خودشناسی عمیق" fields={fields} init={d} onSave={(b) => save("put", "/deep-self", b, "Saved")} saving={saving} alwaysEdit />
    : <ReadCard title="Deep 4D Self-Knowledge · خودشناسی عمیق" fields={fields} obj={d} />;
}

const HABITS = [
  ["habit_teeth", "برس دندان", "🦷"], ["habit_bed", "آماده کردن بستر", "🛏️"], ["habit_clothes", "منظم کردن لباس", "👕"],
  ["habit_quran", "تلاوت قرآن", "📖"], ["habit_prayers", "نمازهای روزانه", "🕌"], ["habit_mosque_father", "مسجد با پدر", "🕋"],
];
function Habits({ data, save, saving }) {
  const list = data.daily_habits || [];
  const blank = { sleep_time: "", wake_time: "", ...Object.fromEntries(HABITS.map((h) => [h[0], false])) };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      {list[0] && (
        <Card title="Latest habits" titleAr="عادت‌های روزانه">
          <Grid>
            <Field k="Sleep" v={list[0].sleep_time} /><Field k="Wake" v={list[0].wake_time} />
          </Grid>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {HABITS.map(([k, ar, ico]) => (
              <div key={k} className="rounded-xl p-2 text-center" style={{ background: "#E8F6F6" }}>
                <div className="text-lg">{ico}</div>
                <p className="text-[10px]" dir="rtl">{ar}</p>
                <p className="text-[10px] font-bold" style={{ color: list[0][k] ? "#1A7A4C" : "#C0392B" }}>{list[0][k] ? "✓ بلی" : "✗"}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
      {data.can.update && (
        <Card title="Record today's habits">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <LblInput label="Sleep time" value={form.sleep_time} onChange={(v) => set("sleep_time", v)} placeholder="e.g. 22:00" />
            <LblInput label="Wake time" value={form.wake_time} onChange={(v) => set("wake_time", v)} placeholder="e.g. 05:30" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {HABITS.map(([k, ar]) => (
              <label key={k} className="flex items-center gap-2 text-xs cursor-pointer rounded-lg border px-2 py-1.5" style={{ borderColor: "#dbe8e8" }}>
                <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
                <span dir="rtl">{ar}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <button disabled={saving} onClick={async () => { if (await save("post", "/habits", form, "Recorded")) setForm(blank); }} className={btnPrimary} style={{ background: TEAL }}>Record</button>
          </div>
        </Card>
      )}
    </div>
  );
}

function FamilyTab({ data }) {
  const f = data.family || {};
  return (
    <Card title="Family Information · معلومات فامیل">
      <Grid>
        <Field k="Father" v={f.father_name} /><Field k="Father occupation" v={f.father_occupation} />
        <Field k="Father phone" v={f.father_phone} /><Field k="Mother" v={f.mother_name} />
        <Field k="Mother phone" v={f.mother_phone} /><Field k="Members" v={f.number_of_family_members} />
        <Field k="Province" v={f.permanent_province} /><Field k="District" v={f.permanent_district} />
      </Grid>
    </Card>
  );
}

function FamilyDeep({ data, save, saving }) {
  const fs = data.sensitive?.family_situation || {};
  const enumOpt = (arr) => arr.map((x) => [x, x]);
  const fields = [
    { name: "additional_info", label: "Anything else the school should know", area: true },
    { name: "chronic_illness_details", label: "Chronic illness details", area: true },
    { name: "mental_health_details", label: "Mental-health concern details", area: true },
    { name: "influence_effect_on_child", label: "Influence on the child", area: true },
    { name: "parents_dreams", label: "Parents' dreams for the child", area: true },
  ];
  return (
    <div className="space-y-3">
      <SensitiveBanner />
      <Card title="Home Environment · وضعیت داخلی خانه" titleAr="">
        <Grid>
          <Field k="Major decisions" v={fs.major_decisions_by} />
          <Field k="Parents discuss" v={fs.parents_discuss} />
          <Field k="Household voice-raising" v={fs.household_voice_raising} />
          <Field k="Child anger" v={fs.child_anger} />
          <Field k="Chronic illness" v={fs.chronic_illness_present ? "Yes" : "No"} />
          <Field k="Migration plans" v={fs.migration_plans ? "Yes" : "No"} />
        </Grid>
      </Card>
      {data.can.update && (
        <EditCard title="Edit family situation (sensitive)" fields={fields} init={fs} onSave={(b) => save("put", "/family-situation", b, "Saved")} saving={saving} alwaysEdit />
      )}
    </div>
  );
}

const OBS_CAT = {
  positive: { bg: "#e6f3ec", fg: "#1A7A4C", label: "Positive" },
  routine: { bg: "#eef3f3", fg: "#5d7273", label: "Routine" },
  concern: { bg: "#fbf0db", fg: "#9a6a12", label: "Concern" },
  urgent: { bg: "#f7e3e1", fg: "#C0392B", label: "Urgent" },
};
function Observations({ data }) {
  const obs = data.development?.observations || [];
  const c = data.development?.counts || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Observations" value={c.observations ?? 0} />
        <Stat label="Syntheses" value={c.syntheses ?? 0} />
        <Stat label="Elicitations" value={c.elicitations ?? 0} />
      </div>
      <Card title="Observation Log · سوابق مشاهده">
        {obs.length === 0 ? <p className="text-xs text-gray-400 py-3 text-center">No observations recorded.</p> : (
          <div className="space-y-2.5">
            {obs.map((o) => {
              const cat = OBS_CAT[o.category] || OBS_CAT.routine;
              return (
                <div key={o.id} className="rounded-xl p-3 border-l-4" style={{ borderColor: cat.fg, background: "#fff", boxShadow: "0 1px 4px rgba(5,37,40,.05)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cat.bg, color: cat.fg }}>{cat.label}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{o.dimension}</span>
                    {o.monitoring_flag ? <span className="text-[10px] font-bold" style={{ color: "#C0392B" }}>⚑ monitoring</span> : null}
                    <span className="text-[10px] text-gray-400 ml-auto">{fmtDate(o.observed_on)}</span>
                  </div>
                  <p className="text-[12px] text-gray-800" dir="auto">{o.description}</p>
                  {o.recommendation && <p className="text-[11px] mt-1" style={{ color: TEAL }} dir="auto">↪ {o.recommendation}</p>}
                  {o.observer && <p className="text-[10px] text-gray-400 mt-1">by {o.observer}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Portrait({ data, save, saving }) {
  const portraits = data.character_portraits || [];
  const approved = portraits.find((p) => p.status === "approved");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState("");
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveText, setApproveText] = useState("");
  const doApprove = async () => {
    if (await save("put", `/portrait/${approveTarget.id}/approve`, { approved_portrait_dari: approveText }, "Portrait approved")) setApproveTarget(null);
  };
  return (
    <div className="space-y-4">
      {approved ? (
        <Card title="سیمای شخصیتی · Character Portrait" titleAr="">
          <p className="text-[14px] leading-loose text-gray-800 p-2" dir="auto" style={{ borderLeft: `4px solid ${GOLD}`, paddingLeft: 14 }}>{approved.approved_portrait_dari}</p>
          <p className="text-[10px] text-gray-400 mt-2">Approved {fmtDateTime(approved.approved_at)} · {approved.context}</p>
        </Card>
      ) : (
        <Card title="سیمای شخصیتی"><p className="text-xs text-gray-400 py-2">No approved portrait yet.</p></Card>
      )}
      {data.can.update && (
        <Card title="Draft a portrait">
          <p className="text-[11px] text-gray-500 mb-2">Write raw notes (later: AI drafts the سیما in WEN register). For now, paste/write the draft, then approve it.</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Raw teacher notes (LLM input)" className={txtCls} dir="auto" />
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Draft portrait (Dari)" className={txtCls + " mt-2"} dir="auto" />
          <div className="flex justify-end mt-2">
            <button disabled={saving || (!notes && !draft)} onClick={async () => { if (await save("post", "/portrait", { raw_teacher_notes: notes, draft_portrait_dari: draft, context: "term_end" }, "Draft saved")) { setNotes(""); setDraft(""); } }} className={btnPrimary} style={{ background: TEAL }}>Save draft</button>
          </div>
        </Card>
      )}
      {data.can.update && portraits.filter((p) => p.status === "draft").map((p) => (
        <Card key={p.id} title={`Draft · ${p.context}`}>
          <p className="text-[12px] text-gray-700 whitespace-pre-wrap" dir="auto">{p.draft_portrait_dari || p.raw_teacher_notes}</p>
          <div className="flex justify-end mt-2">
            <button onClick={() => { setApproveTarget(p); setApproveText(p.draft_portrait_dari || ""); }} className={btnPrimary} style={{ background: TEAL }}>Review & approve →</button>
          </div>
        </Card>
      ))}

      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="Approve portrait" subtitle="The final سیما will surface on the profile"
        footer={<>
          <button onClick={() => setApproveTarget(null)} className="px-4 py-2 rounded-xl text-xs font-bold border" style={{ borderColor: "#dbe8e8", color: "#5d7273" }}>Cancel</button>
          <button onClick={doApprove} disabled={saving || !approveText.trim()} className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>Approve</button>
        </>}>
        <textarea value={approveText} onChange={(e) => setApproveText(e.target.value)} rows={7} className={txtCls} dir="auto" placeholder="Final approved سیما (Dari)" />
      </Modal>
    </div>
  );
}

function Interview({ data, save, saving }) {
  const io = data.sensitive?.interview_observation || {};
  const fields = [
    { name: "behavioural_notes", label: "Conduct notes", area: true },
    { name: "what_stood_out_student", label: "What stood out — student", area: true },
    { name: "what_stood_out_family", label: "What stood out — family", area: true },
    { name: "identified_strengths", label: "Identified strengths", area: true },
    { name: "potential_concerns", label: "Potential concerns", area: true },
    { name: "areas_needing_attention", label: "Areas needing attention", area: true },
    { name: "mentor_teacher_suggestion", label: "Mentor-teacher suggestion", area: true },
    { name: "followup_details", label: "Follow-up details", area: true },
  ];
  return (
    <div className="space-y-3">
      <SensitiveBanner />
      <Card title="Interviewer Observations · مشاهدات مصاحبه">
        <Grid>
          <Field k="Eye contact" v={io.eye_contact} /><Field k="Confidence" v={io.self_confidence} />
          <Field k="Comfort speaking" v={io.comfort_speaking} /><Field k="Honesty signal" v={io.honesty_signal} />
          <Field k="Interest" v={io.interest_in_interview} /><Field k="Needs follow-up" v={io.needs_followup ? "Yes" : "No"} />
        </Grid>
      </Card>
      {data.can.update && (
        <EditCard title="Edit interviewer observations (confidential)" fields={fields} init={io} onSave={(b) => save("put", "/interview", b, "Saved")} saving={saving} alwaysEdit />
      )}
    </div>
  );
}

/* Care Desk — derived client-side from observations + sensitive flags. */
function CareDesk({ data }) {
  const obs = data.development?.observations || [];
  const urgent = obs.filter((o) => o.category === "urgent");
  const concern = obs.filter((o) => o.category === "concern");
  const talent = obs.filter((o) => o.category === "positive");
  const Cluster = ({ title, color, items, render }) => items.length === 0 ? null : (
    <div className="rounded-xl p-4 mb-3 bg-white border" style={{ borderColor: color + "55" }}>
      <p className="text-xs font-bold mb-2" style={{ color }}>{title}</p>
      {items.slice(0, 5).map(render)}
    </div>
  );
  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Derived from the last observations — what to act on. (AI-ranked Dari synthesis is a future Care Desk add-on.)</p>
      <Cluster title="🔴 فوری · Urgent" color="#C0392B" items={urgent} render={(o) => (
        <div key={o.id} className="py-1.5 border-b last:border-0 text-[12px]" style={{ borderColor: "#f0e6e4" }} dir="auto">{o.description} <span className="text-[10px] text-gray-400">· {fmtDate(o.observed_on)}</span></div>
      )} />
      <Cluster title="🟡 روان · Wellbeing" color="#D4850A" items={concern} render={(o) => (
        <div key={o.id} className="py-1.5 border-b last:border-0 text-[12px]" style={{ borderColor: "#f3ebd9" }} dir="auto">{o.description} <span className="text-[10px] text-gray-400">· {fmtDate(o.observed_on)}</span></div>
      )} />
      <Cluster title="🌟 استعداد · Talent to nurture" color="#1A7A4C" items={talent} render={(o) => (
        <div key={o.id} className="py-1.5 border-b last:border-0 text-[12px]" style={{ borderColor: "#e3f0e8" }} dir="auto">{o.description} <span className="text-[10px] text-gray-400">· {fmtDate(o.observed_on)}</span></div>
      )} />
      {urgent.length + concern.length + talent.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nothing flagged — Care Desk is clear.</p>}
    </div>
  );
}

/* ════════════════════ shared atoms ════════════════════ */
const inpCls = "px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300";
const txtCls = "w-full px-3 py-2.5 border rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-300";
const btnPrimary = "px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50";

const Spinner = () => <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} /></div>;
const Card = ({ title, titleAr, action, children }) => (
  <div className="bg-white rounded-2xl border shadow-sm" style={{ borderColor: "#e3ddd0" }}>
    <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "#f0ece2" }}>
      <h3 className="text-sm font-black text-gray-800">{title} {titleAr && <span className="text-xs font-normal text-gray-400" dir="rtl">{titleAr}</span>}</h3>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);
const Grid = ({ children }) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">{children}</div>;
const Field = ({ k, v, hl }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{k}</p>
    <p className={`text-sm mt-0.5 ${hl ? "font-bold" : "text-gray-800"}`} style={hl ? { color: TEAL } : {}} dir="auto">{v || "—"}</p>
  </div>
);
const Stat = ({ label, value }) => (
  <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "#e3ddd0" }}>
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-2xl font-black text-gray-800 mt-1">{value}</p>
  </div>
);
const AccessBadge = ({ level }) => (
  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: "rgba(201,162,39,.2)", color: GOLD }}>{level || "L1"}</span>
);
const SensitiveBanner = () => (
  <div className="rounded-xl px-3 py-2 text-[11px] flex items-center gap-2" style={{ background: "rgba(192,57,43,.06)", color: "#C0392B", border: "1px solid rgba(192,57,43,.2)" }}>
    🔒 Confidential — internal use only, never shared with family.
  </div>
);
const Sel = ({ label, value, onChange, options }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inpCls + " w-full"}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
);
const LblInput = ({ label, value, onChange, placeholder }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inpCls + " w-full"} />
  </div>
);

const ReadCard = ({ title, fields, obj }) => (
  <Card title={title}>
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.name}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{f.label}</p>
          <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap" dir="auto">{obj[f.name] || "—"}</p>
        </div>
      ))}
    </div>
  </Card>
);

function EditCard({ title, fields, init, onSave, saving, alwaysEdit }) {
  const [edit, setEdit] = useState(Boolean(alwaysEdit));
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.name, init?.[f.name] ?? ""])));
  useEffect(() => { setForm(Object.fromEntries(fields.map((f) => [f.name, init?.[f.name] ?? ""]))); /* eslint-disable-next-line */ }, [init]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Card title={title} action={!alwaysEdit && <button onClick={() => setEdit((e) => !e)} className="text-[11px] font-bold" style={{ color: TEAL }}>{edit ? "Cancel" : "Edit"}</button>}>
      {!edit ? (
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name}><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{f.label}</p>
              <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap" dir="auto">{init?.[f.name] || "—"}</p></div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{f.label}</p>
              {f.area
                ? <textarea value={form[f.name]} onChange={(e) => set(f.name, e.target.value)} className={txtCls} rows={2} dir="auto" />
                : <input value={form[f.name]} onChange={(e) => set(f.name, e.target.value)} className={inpCls + " w-full"} dir="auto" />}
            </div>
          ))}
          <div className="flex justify-end">
            <button disabled={saving} onClick={async () => { const ok = await onSave(form); if (ok && !alwaysEdit) setEdit(false); }} className={btnPrimary} style={{ background: TEAL }}>Save</button>
          </div>
        </div>
      )}
    </Card>
  );
}
