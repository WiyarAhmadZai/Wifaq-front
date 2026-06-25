import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, put, post } from "../../api/axios";
import { toastSuccess, toastError } from "../../utils/toast";
import Modal from "../../components/Modal";
import { fmtDate, fmtDateTime } from "../../utils/formErrors";

/* ── 4D dimension accents ── */
const DIMS = [
  { key: "intellectual", ar: "ذهنی", label: "Intellectual", color: "#14919B" },
  { key: "character", ar: "شخصیتی", label: "Character", color: "#C9A227" },
  { key: "social", ar: "اجتماعی", label: "Social", color: "#1A7A4C" },
  { key: "practical", ar: "عملی", label: "Practical", color: "#6B4FA0" },
];
const CLIM = [["", "—"], ["often", "Often"], ["sometimes", "Sometimes"], ["rarely", "Rarely"], ["never", "Never"]];

/* ── field definitions for the append-log sections ── */
const F = (name, label, opts = {}) => ({ name, label, ...opts });
const STORY_FIELDS = [
  F("life_story", "Life narrative · قصه زندگی", { area: true }),
  F("influential_person", "Most influential person"), F("influence_reason", "…why", { area: true }),
  F("perceived_talents", "Perceived talents"), F("career_aspiration", "Career aspiration"),
  F("favourite_activities", "Favourite activities"), F("favourite_subjects", "Favourite subjects"),
  F("hardest_subjects", "Hardest subjects"), F("self_description", "Self-description", { area: true }),
];
const ASPIR_FIELDS = [
  F("want_to_know_discover", "ذهنی — want to know / discover", { area: true }),
  F("want_to_be_do", "شخصیتی — want to be / do", { area: true }),
  F("want_to_help", "اجتماعی — want to help", { area: true }),
  F("want_to_build_create", "عملی — want to build / create", { area: true }),
  F("when_grow_up", "When I grow up"), F("when_grow_up_reason", "…because", { area: true }),
  F("literal_dreams", "Dreams (خواب‌ها)", { area: true }),
];
const DEEP_FIELDS = [
  F("intellectual_likes_thinking_about", "ذهنی — likes thinking about", { area: true }),
  F("intellectual_best_learning_time", "ذهنی — best learning time", { sel: [["", "—"], ["morning", "Morning"], ["noon", "Noon"], ["evening", "Evening"], ["night", "Night"]] }),
  F("intellectual_learning_style", "ذهنی — learning style", { sel: [["", "—"], ["visual", "Visual"], ["audio", "Audio"], ["practical", "Practical"], ["mixed", "Mixed"]] }),
  F("intellectual_unanswered_question", "ذهنی — an unanswered question"),
  F("character_most_important_value", "شخصیتی — most important value"),
  F("character_moral_hero", "شخصیتی — moral hero"), F("character_close_to_god_when", "شخصیتی — feels close to God when"),
  F("social_group_role", "اجتماعی — group role", { sel: [["", "—"], ["leader", "Leader"], ["collaborator", "Collaborator"], ["observer", "Observer"]] }),
  F("social_how_helps_others", "اجتماعی — how helps others"), F("social_what_people_say", "اجتماعی — what people say"),
  F("practical_likes_to_make", "عملی — likes to make"), F("practical_proud_skill", "عملی — proud skill"),
];
const FAMILY_FIELDS = [
  F("major_decisions_by", "Major decisions by", { sel: [["", "—"], ["father", "Father"], ["mother", "Mother"], ["both", "Both"], ["other", "Other"]] }),
  F("parents_discuss", "Parents discuss", { sel: [["", "—"], ["regularly", "Regularly"], ["sometimes", "Sometimes"], ["rarely", "Rarely"], ["never", "Never"]] }),
  F("household_voice_raising", "Household — voice raising", { sel: CLIM }),
  F("child_anger", "Child — anger", { sel: CLIM }),
  F("chronic_illness_present", "Chronic illness", { bool: true }), F("chronic_illness_details", "…details", { area: true }),
  F("mental_health_concern", "Mental-health concern", { bool: true }), F("mental_health_details", "…details", { area: true }),
  F("migration_plans", "Migration plans", { bool: true }), F("migration_destination", "…destination"),
  F("influence_effect_on_child", "Influence on the child", { area: true }),
  F("parents_dreams", "Parents' dreams for the child", { area: true }),
  F("additional_info", "Anything else the school should know", { area: true }),
];
const INTERVIEW_FIELDS = [
  F("eye_contact", "Eye contact", { sel: [["", "—"], ["good", "Good"], ["average", "Average"], ["weak", "Weak"], ["avoidant", "Avoidant"]] }),
  F("self_confidence", "Confidence", { sel: [["", "—"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]] }),
  F("comfort_speaking", "Comfort speaking", { sel: [["", "—"], ["comfortable", "Comfortable"], ["cautious", "Cautious"], ["very_cautious", "Very cautious"]] }),
  F("honesty_signal", "Honesty signal", { sel: [["", "—"], ["honest", "Honest"], ["cautious", "Cautious"], ["possibly_hiding", "Possibly hiding"]] }),
  F("behavioural_notes", "Conduct notes", { area: true }),
  F("what_stood_out_student", "What stood out — student", { area: true }),
  F("what_stood_out_family", "What stood out — family", { area: true }),
  F("identified_strengths", "Identified strengths", { area: true }),
  F("potential_concerns", "Potential concerns", { area: true }),
  F("areas_needing_attention", "Areas needing attention", { area: true }),
  F("mentor_teacher_suggestion", "Mentor-teacher suggestion", { area: true }),
  F("needs_followup", "Needs follow-up", { bool: true }), F("followup_details", "…details", { area: true }),
];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "story", label: "Life Story" },
  { key: "aspirations", label: "Aspirations" },
  { key: "fourd", label: "4D Ratings" },
  { key: "deepself", label: "Deep Self" },
  { key: "habits", label: "Daily Habits" },
  { key: "family", label: "Family" },
  { key: "familydeep", label: "Home", sensitive: true },
  { key: "observations", label: "Observations" },
  { key: "portrait", label: "Portrait" },
  { key: "interview", label: "Interviewer", sensitive: true },
  { key: "updates", label: "Updates" },
  { key: "caredesk", label: "Care Desk" },
];

export default function StudentProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    get(`/student-management/students/${id}/profile`)
      .then((r) => setData(r.data?.data || null))
      .catch((e) => { toastError(e.response?.data?.message || "Failed to load profile"); navigate("/student-management/students"); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const save = async (method, path, body, msg = "Recorded") => {
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

  // Open the printable HTML report in a new tab (Save-as-PDF from the browser).
  const openReport = async () => {
    try {
      const r = await get(`/student-management/students/${id}/profile/report`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "text/html" }));
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { toastError("Could not open the report."); }
  };
  // Download the full شناسنامه as a branded PDF (mpdf, server-side).
  const downloadPdf = async () => {
    try {
      const r = await get(`/student-management/students/${id}/profile/report?format=pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `profile-${(data?.student?.full_name || "student").replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch { toastError("Could not generate the PDF."); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50/60"><Spinner /></div>;
  if (!data) return null;

  const s = data.student, can = data.can || {};
  const tabs = TABS.filter((t) => !t.sensitive || can.view_sensitive);
  const initials = `${s.first_name?.[0] || ""}${s.last_name?.[0] || ""}`.toUpperCase();
  const ctx = { data, save, saving, can };

  return (
    <div className="min-h-screen bg-gray-50/60 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-5 pt-5 pb-16">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={openReport} title="Open the printable report" className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold">🖨 Print</button>
            <button onClick={downloadPdf} title="Download the full شناسنامه as PDF" className="px-3 py-2 bg-white text-teal-700 hover:bg-teal-50 rounded-xl text-sm font-semibold">⬇ PDF</button>
            <button onClick={() => navigate(`/student-management/students/show/${id}`)} className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold">Full record →</button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-12 mx-auto">
        {/* Identity card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-2xl font-black shrink-0">{initials || "?"}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-800">{s.full_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">{data.profile?.access_level || "L1"}</span>
              {s.class && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700">شناسنامه</span>}
            </div>
            <p className="text-sm text-gray-500 mt-1 font-mono">{s.student_id}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
              <span>{s.class || "No class"}</span>{s.grade && <span>· {s.grade}</span>}{s.age && <span>· Age {s.age}</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === t.key ? "bg-teal-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {tab === "overview" && <Overview {...ctx} />}
          {tab === "story" && <LogSection {...ctx} title="Life Story · قصه شخصی" items={data.intake_personal} path="/intake" dateKey="recorded_at" fields={STORY_FIELDS} context />}
          {tab === "aspirations" && <LogSection {...ctx} title="Dreams & Aspirations · رویاها" items={data.aspirations} path="/aspirations" dateKey="recorded_at" fields={ASPIR_FIELDS} />}
          {tab === "fourd" && <FourD {...ctx} />}
          {tab === "deepself" && <LogSection {...ctx} title="Deep 4D Self-Knowledge · خودشناسی عمیق" items={data.deep_self_knowledge} path="/deep-self" dateKey="recorded_at" fields={DEEP_FIELDS} context />}
          {tab === "habits" && <Habits {...ctx} />}
          {tab === "family" && <FamilyTab {...ctx} />}
          {tab === "familydeep" && <LogSection {...ctx} title="Home Environment · وضعیت خانه" subtitle="Confidential — never shared with family" sensitive items={data.sensitive?.family_situation} path="/family-situation" dateKey="recorded_at" fields={FAMILY_FIELDS} />}
          {tab === "observations" && <Observations {...ctx} />}
          {tab === "portrait" && <Portrait {...ctx} />}
          {tab === "interview" && <LogSection {...ctx} title="Interviewer Observations · مشاهدات مصاحبه" subtitle="Confidential — internal use only" sensitive items={data.sensitive?.interview_observation} path="/interview" dateKey="interviewed_at" fields={INTERVIEW_FIELDS} />}
          {tab === "updates" && <Updates {...ctx} />}
          {tab === "caredesk" && <CareDesk {...ctx} />}
        </div>
      </div>
    </div>
  );
}

/* ════════════════ generic append-log section ════════════════ */
function LogSection({ title, subtitle, items = [], path, dateKey, fields, context, sensitive, save, saving, can }) {
  const [adding, setAdding] = useState(false);
  const blank = () => Object.fromEntries(fields.map((f) => [f.name, f.bool ? false : ""]).concat(context ? [["context", "intake"]] : []));
  const [form, setForm] = useState(blank());
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const list = Array.isArray(items) ? items : items ? [items] : [];

  const submit = async () => {
    if (await save("post", path, form, "Recorded")) { setForm(blank()); setAdding(false); }
  };

  return (
    <div className="space-y-4">
      <Card title={title} subtitle={subtitle} sensitive={sensitive}
        action={can.update && <button onClick={() => setAdding((a) => !a)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white">{adding ? "Close" : "＋ Add record"}</button>}>
        {sensitive && <SensitiveBanner />}
        {adding && can.update && (
          <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 mb-4 space-y-3">
            {context && <Seg label="Context" value={form.context} onChange={(v) => set("context", v)} options={[["intake", "Intake"], ["grade4", "Grade 4"], ["grade7", "Grade 7"], ["ad_hoc", "Ad-hoc"]]} />}
            {fields.map((f) => <FieldInput key={f.name} f={f} value={form[f.name]} onChange={(v) => set(f.name, v)} />)}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setForm(blank()); setAdding(false); }} className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-500">Cancel</button>
              <button onClick={submit} disabled={saving} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 disabled:opacity-50">Save record</button>
            </div>
          </div>
        )}
        {list.length === 0 ? (
          <EmptyState title="No records yet" hint={can.update ? "Add the first record — it'll start the timeline below." : "Nothing has been recorded for this student."} />
        ) : (
          <Timeline list={list} fields={fields} dateKey={dateKey} />
        )}
      </Card>
    </div>
  );
}
const labelFor = (f, v) => f.sel ? (f.sel.find((o) => o[0] === v)?.[1] || v) : v;
const hasVal = (f, row) => f.bool ? !!row[f.name] : (row[f.name] !== null && row[f.name] !== "" && row[f.name] !== undefined);

/* A vertical thread of dated record cards — narrative featured, short values as chips. */
function Timeline({ list, fields, dateKey }) {
  return (
    <div className="relative">
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-teal-200 via-gray-200 to-transparent" aria-hidden />
      <div className="space-y-5">
        {list.map((row, i) => {
          const date = row[dateKey] || row.created_at;
          const chips = fields.filter((f) => (f.sel || f.bool || !f.area) && hasVal(f, row));
          const blocks = fields.filter((f) => f.area && hasVal(f, row));
          const lead = blocks[0]; const rest = blocks.slice(1);
          const latest = i === 0;
          return (
            <div key={row.id || i} className="relative pl-7">
              <span className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                style={{ background: latest ? "#0D5C63" : "#cbd5d5", boxShadow: "0 0 0 1px #e5e7eb" }} aria-hidden />
              <div className={`rounded-2xl border bg-white overflow-hidden ${latest ? "border-teal-200 shadow-sm" : "border-gray-100"}`}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/70 border-b border-gray-100 flex-wrap">
                  {latest && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-600 text-white uppercase tracking-wider">Latest</span>}
                  {row.context && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 capitalize">{row.context}</span>}
                  <span className="text-[11px] font-semibold text-gray-600">{relativeTime(date)}</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{fmtDateTime(date)}</span>
                </div>
                <div className="p-4 space-y-3">
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {chips.map((f) => (
                        <span key={f.name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                          <span className="text-teal-400 font-normal">{f.label.replace(/^[^—]*—\s*/, "")}:</span> {f.bool ? "Yes" : labelFor(f, row[f.name])}
                        </span>
                      ))}
                    </div>
                  )}
                  {lead && (
                    <div className="rounded-xl bg-gray-50/70 px-3.5 py-3 border-l-2 border-teal-300">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">{lead.label}</p>
                      <p className="text-[15px] leading-7 text-gray-800 whitespace-pre-wrap" dir="auto">{row[lead.name]}</p>
                    </div>
                  )}
                  {rest.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
                      {rest.map((f) => (
                        <div key={f.name}>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{f.label}</p>
                          <p className="text-[13px] leading-relaxed text-gray-700 mt-0.5 whitespace-pre-wrap" dir="auto">{row[f.name]}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function relativeTime(v) {
  if (!v) return "";
  const d = new Date(v); if (isNaN(d)) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

/* ════════════════ 4D ratings (history + add) ════════════════ */
function FourD({ data, save, saving, can }) {
  const ratings = data.four_d_self_ratings || [];
  const [adding, setAdding] = useState(false);
  const blank = { rated_by: "student", context: "intake", evidence: "", ...Object.fromEntries(DIMS.flatMap((d) => [[`${d.key}_score`, ""], [`${d.key}_note`, ""]])) };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => { if (await save("post", "/4d-rating", form, "Rating recorded")) { setForm(blank); setAdding(false); } };

  return (
    <Card title="4D Self-Rating · ارزیابی چهاربعدی"
      action={can.update && <button onClick={() => setAdding((a) => !a)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white">{adding ? "Close" : "＋ Add rating"}</button>}>
      {adding && can.update && (
        <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Seg label="Rated by" value={form.rated_by} onChange={(v) => set("rated_by", v)} options={[["student", "Student"], ["parent", "Parent"], ["mentor", "Mentor"]]} />
            <Seg label="Context" value={form.context} onChange={(v) => set("context", v)} options={[["intake", "Intake"], ["grade4", "Grade 4"], ["grade7", "Grade 7"], ["ad_hoc", "Ad-hoc"]]} />
          </div>
          {DIMS.map((d) => (
            <div key={d.key}>
              <p className="text-[11px] font-bold mb-1" style={{ color: d.color }}>{d.ar} · {d.label}</p>
              <div className="flex gap-2">
                <input type="number" min={0} max={10} step={0.1} value={form[`${d.key}_score`]} onChange={(e) => set(`${d.key}_score`, e.target.value)} placeholder="0–10" className={`${inp} w-24 text-center`} />
                <input value={form[`${d.key}_note`]} onChange={(e) => set(`${d.key}_note`, e.target.value)} placeholder="note" className={`${inp} flex-1`} dir="auto" />
              </div>
            </div>
          ))}
          <textarea value={form.evidence} onChange={(e) => set("evidence", e.target.value)} placeholder="Evidence (for parent/mentor)" className={txt} dir="auto" rows={2} />
          <div className="flex justify-end"><button onClick={submit} disabled={saving} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 disabled:opacity-50">Record rating</button></div>
        </div>
      )}
      {ratings.length === 0 ? (
        <EmptyState title="No 4D ratings yet" hint={can.update ? "Add a student, parent, or mentor rating to start the trajectory." : "No ratings recorded."} />
      ) : (
        <div className="relative">
          <span className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-teal-200 via-gray-200 to-transparent" aria-hidden />
          <div className="space-y-5">
            {ratings.map((r, i) => (
              <div key={r.id} className="relative pl-7">
                <span className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: i === 0 ? "#0D5C63" : "#cbd5d5", boxShadow: "0 0 0 1px #e5e7eb" }} aria-hidden />
                <div className={`rounded-2xl border bg-white overflow-hidden ${i === 0 ? "border-teal-200 shadow-sm" : "border-gray-100"}`}>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/70 border-b border-gray-100 flex-wrap">
                    {i === 0 && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-600 text-white uppercase tracking-wider">Latest</span>}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 capitalize">{r.rated_by}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 capitalize">{r.context}</span>
                    <span className="text-[11px] font-semibold text-gray-600">{relativeTime(r.rated_at || r.created_at)}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{fmtDateTime(r.rated_at || r.created_at)}</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {DIMS.map((d) => {
                      const sc = r[`${d.key}_score`];
                      const pct = sc != null ? Math.max(0, Math.min(100, Number(sc) * 10)) : 0;
                      return (
                        <div key={d.key}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[12px] font-bold w-20" dir="rtl" style={{ color: d.color }}>{d.ar}</span>
                            <span className="text-[10px] text-gray-400 flex-1">{d.label}</span>
                            <span className="text-sm font-black text-gray-800">{sc ?? "—"}<span className="text-[10px] text-gray-400 font-normal">/10</span></span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: d.color }} />
                          </div>
                          {r[`${d.key}_note`] && <p className="text-[11px] text-gray-500 mt-1" dir="auto">{r[`${d.key}_note`]}</p>}
                        </div>
                      );
                    })}
                    {r.evidence && <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-50" dir="auto"><b className="text-gray-600">Evidence:</b> {r.evidence}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ════════════════ habits (history + add) ════════════════ */
const HABITS = [
  ["habit_teeth", "برس دندان", "🦷"], ["habit_bed", "آماده کردن بستر", "🛏️"], ["habit_clothes", "منظم کردن لباس", "👕"],
  ["habit_quran", "تلاوت قرآن", "📖"], ["habit_prayers", "نمازهای روزانه", "🕌"], ["habit_mosque_father", "مسجد با پدر", "🕋"],
];
function Habits({ data, save, saving, can }) {
  const list = data.daily_habits || [];
  const [adding, setAdding] = useState(false);
  const blank = { sleep_time: "", wake_time: "", ...Object.fromEntries(HABITS.map((h) => [h[0], false])) };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => { if (await save("post", "/habits", form, "Recorded")) { setForm(blank); setAdding(false); } };
  return (
    <Card title="Daily Habits · عادت‌های روزانه"
      action={can.update && <button onClick={() => setAdding((a) => !a)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white">{adding ? "Close" : "＋ Add record"}</button>}>
      {adding && can.update && (
        <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <LblInput label="Sleep time" value={form.sleep_time} onChange={(v) => set("sleep_time", v)} placeholder="e.g. 22:00" />
            <LblInput label="Wake time" value={form.wake_time} onChange={(v) => set("wake_time", v)} placeholder="e.g. 05:30" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {HABITS.map(([k, ar]) => (
              <label key={k} className="flex items-center gap-2 text-xs cursor-pointer rounded-lg border border-gray-200 px-2 py-1.5">
                <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} /><span dir="rtl">{ar}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end"><button onClick={submit} disabled={saving} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 disabled:opacity-50">Record</button></div>
        </div>
      )}
      {list.length === 0 ? <Empty>No records yet.</Empty> : (
        <div className="space-y-3">
          {list.map((h) => (
            <div key={h.id} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] text-gray-500">Sleep {h.sleep_time || "—"} · Wake {h.wake_time || "—"}</span>
                <span className="text-[11px] text-gray-400 ml-auto">{fmtDateTime(h.recorded_at || h.created_at)}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {HABITS.map(([k, ar, ico]) => (
                  <div key={k} className="rounded-lg p-1.5 text-center bg-gray-50">
                    <div className="text-base">{ico}</div>
                    <p className="text-[9px] text-gray-500" dir="rtl">{ar}</p>
                    <p className="text-[10px] font-bold" style={{ color: h[k] ? "#1A7A4C" : "#C0392B" }}>{h[k] ? "✓" : "✗"}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ════════════════ overview (head + access + updates summary) ════════════════ */
function Overview({ data, save, saving, can }) {
  const s = data.student, p = data.profile || {}, fam = data.family || {}, c = data.development?.counts || {};
  const [lvlOpen, setLvlOpen] = useState(false);
  const [lvl, setLvl] = useState(p.access_level || "L1");
  const [reason, setReason] = useState("");
  const submitLevel = async () => { if (await save("put", "/access-level", { access_level: lvl, access_level_reason: reason }, "Access level set")) { setLvlOpen(false); setReason(""); } };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Observations" value={c.observations ?? 0} color="indigo" />
        <StatTile label="4D ratings" value={(data.four_d_self_ratings || []).length} color="teal" />
        <StatTile label="Records" value={(data.intake_personal || []).length + (data.deep_self_knowledge || []).length + (data.aspirations || []).length} color="emerald" />
        <StatTile label="Portraits" value={(data.character_portraits || []).length} color="amber" />
      </div>

      <Card title="Admin Record · معلومات اداری" action={can.manage_access && <button onClick={() => setLvlOpen(true)} className="text-xs font-bold text-teal-700">Set access ▸</button>}>
        <Grid>
          <Field k="Family" v={fam.family_id ? `${fam.family_id} — ${fam.father_name}` : "—"} />
          <Field k="Mentor (رهنما)" v={p.mentor_teacher?.name} />
          <Field k="Interviewer" v={p.interviewer?.name} />
          <Field k="Interview date" v={p.interview_date ? fmtDate(p.interview_date) : "—"} />
          <Field k="Access level" v={p.access_level || "L1"} hl />
          <Field k="Set by" v={p.access_set_by?.name} />
          <Field k="Next update" v={p.next_update_due} />
          <Field k="Class supervisor" v={can.update ? "you can record ✓" : "supervisor only"} />
        </Grid>
      </Card>

      {can.update && (
        <EditHead p={p} save={save} saving={saving} />
      )}

      <Modal open={lvlOpen} onClose={() => setLvlOpen(false)} title="Set access level" subtitle="Controls who can see this profile's depth"
        footer={<>
          <button onClick={() => setLvlOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-500">Cancel</button>
          <button onClick={submitLevel} disabled={saving} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 disabled:opacity-50">Set level</button>
        </>}>
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Access level</p>
        <div className="flex gap-2 mb-3">
          {[["L1", "L1 · basic"], ["L2", "L2 · extended"], ["L3", "L3 · full"]].map(([v, l]) => (
            <button key={v} onClick={() => setLvl(v)} className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border ${lvl === v ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-500 border-gray-200"}`}>{l}</button>
          ))}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Reason (optional)</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={txt} dir="auto" />
      </Modal>
    </div>
  );
}
function EditHead({ p, save, saving }) {
  const [form, setForm] = useState({ interview_location: p.interview_location || "", interview_attendees: p.interview_attendees || "", intake_form_url: p.intake_form_url || "", next_update_due: p.next_update_due || "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Card title="Edit profile head">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LblInput label="Interview location" value={form.interview_location} onChange={(v) => set("interview_location", v)} />
        <LblInput label="Attendees" value={form.interview_attendees} onChange={(v) => set("interview_attendees", v)} />
        <LblInput label="Intake form URL" value={form.intake_form_url} onChange={(v) => set("intake_form_url", v)} />
        <LblInput label="Next update due" value={form.next_update_due} onChange={(v) => set("next_update_due", v)} placeholder="e.g. 1404/07" />
      </div>
      <div className="flex justify-end mt-3"><button onClick={() => save("put", "/head", form, "Profile saved")} disabled={saving} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 disabled:opacity-50">Save</button></div>
    </Card>
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

const OBS_CAT = {
  positive: { bg: "bg-emerald-50", fg: "text-emerald-700", b: "#1A7A4C", label: "Positive" },
  routine: { bg: "bg-gray-50", fg: "text-gray-600", b: "#5d7273", label: "Routine" },
  concern: { bg: "bg-amber-50", fg: "text-amber-700", b: "#9a6a12", label: "Concern" },
  urgent: { bg: "bg-red-50", fg: "text-red-700", b: "#C0392B", label: "Urgent" },
};
function Observations({ data }) {
  const obs = data.development?.observations || [];
  return (
    <Card title="Observation Log · سوابق مشاهده" subtitle="Read-only — recorded via the observation module">
      {obs.length === 0 ? <Empty>No observations recorded.</Empty> : (
        <div className="space-y-2.5">
          {obs.map((o) => {
            const cat = OBS_CAT[o.category] || OBS_CAT.routine;
            return (
              <div key={o.id} className="rounded-xl border-l-4 p-3 border border-gray-100" style={{ borderLeftColor: cat.b }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cat.bg} ${cat.fg}`}>{cat.label}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{o.dimension}</span>
                  {o.monitoring_flag ? <span className="text-[10px] font-bold text-red-600">⚑ monitoring</span> : null}
                  <span className="text-[10px] text-gray-400 ml-auto">{fmtDate(o.observed_on)}</span>
                </div>
                <p className="text-[12px] text-gray-800" dir="auto">{o.description}</p>
                {o.recommendation && <p className="text-[11px] mt-1 text-teal-700" dir="auto">↪ {o.recommendation}</p>}
                {o.observer && <p className="text-[10px] text-gray-400 mt-1">by {o.observer}</p>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Portrait({ data, save, saving, can }) {
  const portraits = data.character_portraits || [];
  const approved = portraits.find((p) => p.status === "approved");
  const [notes, setNotes] = useState(""); const [draft, setDraft] = useState("");
  const [approveTarget, setApproveTarget] = useState(null); const [approveText, setApproveText] = useState("");
  const doApprove = async () => { if (await save("put", `/portrait/${approveTarget.id}/approve`, { approved_portrait_dari: approveText }, "Portrait approved")) setApproveTarget(null); };
  return (
    <div className="space-y-4">
      <Card title="سیمای شخصیتی · Character Portrait">
        {approved ? (<>
          <p className="text-[14px] leading-loose text-gray-800 pl-3.5 border-l-4 border-amber-400" dir="auto">{approved.approved_portrait_dari}</p>
          <p className="text-[10px] text-gray-400 mt-2">Approved {fmtDateTime(approved.approved_at)} · {approved.context}</p>
        </>) : <Empty>No approved portrait yet.</Empty>}
      </Card>
      {can.update && (
        <Card title="Draft a portrait">
          <p className="text-[11px] text-gray-500 mb-2">Raw notes (later: AI drafts the سیما). For now write the draft, then approve.</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Raw teacher notes" className={txt} dir="auto" rows={2} />
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Draft portrait (Dari)" className={`${txt} mt-2`} dir="auto" rows={3} />
          <div className="flex justify-end mt-2"><button disabled={saving || (!notes && !draft)} onClick={async () => { if (await save("post", "/portrait", { raw_teacher_notes: notes, draft_portrait_dari: draft, context: "term_end" }, "Draft saved")) { setNotes(""); setDraft(""); } }} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 disabled:opacity-50">Save draft</button></div>
        </Card>
      )}
      {can.update && portraits.filter((p) => p.status === "draft").map((p) => (
        <Card key={p.id} title={`Draft · ${p.context}`}>
          <p className="text-[12px] text-gray-700 whitespace-pre-wrap" dir="auto">{p.draft_portrait_dari || p.raw_teacher_notes}</p>
          <div className="flex justify-end mt-2"><button onClick={() => { setApproveTarget(p); setApproveText(p.draft_portrait_dari || ""); }} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600">Review & approve →</button></div>
        </Card>
      ))}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="Approve portrait" subtitle="The final سیما will surface on the profile"
        footer={<>
          <button onClick={() => setApproveTarget(null)} className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-500">Cancel</button>
          <button onClick={doApprove} disabled={saving || !approveText.trim()} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 disabled:opacity-50">Approve</button>
        </>}>
        <textarea value={approveText} onChange={(e) => setApproveText(e.target.value)} rows={7} className={txt} dir="auto" placeholder="Final approved سیما (Dari)" />
      </Modal>
    </div>
  );
}

const UPDATE_FIELDS = [
  F("update_type", "Update type", { sel: [["grade4", "Grade 4"], ["grade7", "Grade 7"], ["ad_hoc", "Ad-hoc"]] }),
  F("major_changes_summary", "Major changes", { area: true }), F("changes_to_4d", "Changes to 4D", { area: true }),
  F("changes_to_family", "Changes to family", { area: true }), F("changes_to_aspirations", "Changes to aspirations", { area: true }),
  F("flags_raised", "Flags raised", { area: true }),
];
function Updates(props) {
  return <LogSection {...props} title="Longitudinal Updates · آپدیت‌ها" items={props.data.profile_updates} path="/updates" dateKey="created_at" fields={UPDATE_FIELDS} />;
}

function CareDesk({ data }) {
  const obs = data.development?.observations || [];
  const urgent = obs.filter((o) => o.category === "urgent");
  const concern = obs.filter((o) => o.category === "concern");
  const talent = obs.filter((o) => o.category === "positive");
  const Cluster = ({ title, color, items }) => items.length === 0 ? null : (
    <Card title={title}>
      <div className="space-y-1.5">
        {items.slice(0, 6).map((o) => (
          <div key={o.id} className="text-[12px] text-gray-700 py-1 border-b border-gray-50 last:border-0" dir="auto">{o.description} <span className="text-[10px] text-gray-400">· {fmtDate(o.observed_on)}</span></div>
        ))}
      </div>
    </Card>
  );
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Derived from recent observations. (AI-ranked Dari synthesis is a future add-on.)</p>
      <Cluster title="🔴 Urgent · فوری" items={urgent} />
      <Cluster title="🟡 Wellbeing · روان" items={concern} />
      <Cluster title="🌟 Talent to nurture · استعداد" items={talent} />
      {urgent.length + concern.length + talent.length === 0 && <Card title="Care Desk"><Empty>Nothing flagged — clear.</Empty></Card>}
    </div>
  );
}

/* ════════════════ atoms ════════════════ */
const inp = "px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300 w-full";
const txt = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-300";

const Spinner = () => <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" /></div>;
const Card = ({ title, subtitle, action, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-100">
      <div><h3 className="text-sm font-bold text-gray-800">{title}</h3>{subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}</div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);
const Grid = ({ children }) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">{children}</div>;
const Field = ({ k, v, hl }) => (
  <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{k}</p>
    <p className={`text-sm mt-0.5 ${hl ? "font-bold text-teal-700" : "text-gray-800"}`} dir="auto">{v || "—"}</p></div>
);
const TILE = { teal: "border-teal-100 bg-teal-50/60 text-teal-700", emerald: "border-emerald-100 bg-emerald-50/60 text-emerald-700", indigo: "border-indigo-100 bg-indigo-50/60 text-indigo-700", amber: "border-amber-100 bg-amber-50/60 text-amber-700" };
const StatTile = ({ label, value, color = "teal" }) => (
  <div className={`rounded-2xl border p-4 ${TILE[color]}`}>
    <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
    <p className="text-2xl font-black text-gray-800 mt-1 leading-none">{value}</p>
  </div>
);
const Empty = ({ children }) => <p className="text-sm text-gray-400 text-center py-6">{children}</p>;
const EmptyState = ({ title, hint }) => (
  <div className="text-center py-10">
    <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    </div>
    <p className="text-sm font-bold text-gray-600">{title}</p>
    {hint && <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">{hint}</p>}
  </div>
);
const SensitiveBanner = () => (
  <div className="rounded-xl px-3 py-2 text-[11px] flex items-center gap-2 mb-3 bg-red-50 text-red-700 border border-red-100">🔒 Confidential — internal use only, never shared with family.</div>
);
const Seg = ({ label, value, onChange, options }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${value === v ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-500 border-gray-200"}`}>{l}</button>
      ))}
    </div>
  </div>
);
const LblInput = ({ label, value, onChange, placeholder }) => (
  <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">{label}</p>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inp} /></div>
);
function FieldInput({ f, value, onChange }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">{f.label}</p>
      {f.bool ? (
        <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> Yes</label>
      ) : f.sel ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inp}>{f.sel.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      ) : f.area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={txt} dir="auto" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inp} dir="auto" />
      )}
    </div>
  );
}
