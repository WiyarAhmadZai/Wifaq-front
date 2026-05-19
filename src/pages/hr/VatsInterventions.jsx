import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { get, post, del } from "../../api/axios";
import Swal from "sweetalert2";
import { PageHeader, EmptyState, Spinner, Pill, Section, InfoNote, DateField } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

const LEVELS = [
  { n: 1, name: "Informal Coaching",  desc: "Private chat. Supervisor notes only — not yet in HR file.", tone: "blue",   timeline: "Within 48h, 2-week check-in" },
  { n: 2, name: "Verbal Warning",     desc: "Formal meeting. HR informed. Improvement plan drafted.",     tone: "teal",   timeline: "Meeting within 1 week, 30-day review" },
  { n: 3, name: "Written Warning",    desc: "Formal letter on file. Staff can respond in writing.",       tone: "amber",  timeline: "Within 3 days, 60-day probation" },
  { n: 4, name: "Final Warning",      desc: "Explicit: next issue → termination review.",                 tone: "red",    timeline: "Within 48h, 90-day final review" },
  { n: 5, name: "Suspension Review",  desc: "Formal hearing. Board representative. Appeal within 7 days.", tone: "purple", timeline: "48h notice, formal hearing" },
];

const DIGNITY_ITEMS = [
  { key: "dignity_private_setting",   text: "I spoke with the staff member privately, not in front of others." },
  { key: "dignity_focus_on_behavior", text: "I focused on the behaviour, not on the person's character." },
  { key: "dignity_heard_their_side",  text: "I gave them an opportunity to explain their perspective." },
  { key: "dignity_offered_support",   text: "I made clear what support is available to help them improve." },
  { key: "dignity_expressed_belief",  text: "I expressed genuine belief in their capacity to grow." },
  { key: "dignity_factual_language",  text: "The language in this record is factual and professional." },
];

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none";

export default function VatsInterventions() {
  const { canCreate, canDelete } = useResourcePermissions("vats-interventions");
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: "", level: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchAll(); fetchStaff(); }, [filter, location.key]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
      const r = await get(`/vats/interventions?${params}`);
      const data = r.data?.data;
      setItems(data?.data || data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  const fetchStaff = async () => {
    try { const r = await get("/hr/staff/list?per_page=200"); setStaff(r.data?.data || []); } catch {}
  };

  const remove = async (id) => {
    const r = await Swal.fire({ icon: "warning", title: "Delete this intervention?", text: "This will be soft-deleted.", showCancelButton: true, confirmButtonColor: "#b91c1c" });
    if (!r.isConfirmed) return;
    await del(`/vats/interventions/${id}`);
    fetchAll();
  };

  const byLevel = (n) => items.filter(i => i.level === n);

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">

        <PageHeader
          icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          title="Interventions — Progressive Discipline"
          subtitle="Five levels of formal correction. Every intervention requires the 6-item Dignity Protocol — no exceptions."
          children={
            <div className="bg-white/15 rounded-xl px-4 py-2.5 text-[11px] text-teal-50 leading-relaxed">
              <strong>The concept.</strong> Discipline is not punishment — it is the institution saying "we believe in
              who you can be." Every record must state three things: <strong>what occurred · what is expected ·
              what support is offered</strong> (a problem without expectation and support will not save). Levels run
              1 Informal → 2 Verbal → 3 Written → 4 Final → 5 Suspension; severe cases (violence, theft, abuse,
              endangering students) jump straight to Level 5. Even in termination, the final conversation is private,
              respectful, and with gratitude for service given.
            </div>
          }
          actions={
            canCreate && (
              <button onClick={() => setShowForm(true)}
                className="px-3 py-1.5 bg-white text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-50">
                + New Intervention
              </button>
            )
          }
        />

        {/* Level legend */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-5">
          {LEVELS.map(l => (
            <div key={l.n} className="bg-white rounded-2xl border border-gray-100 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${
                  { blue: "bg-blue-600", teal: "bg-teal-600", amber: "bg-amber-500", red: "bg-red-600", purple: "bg-purple-600" }[l.tone]
                }`}>
                  {l.n}
                </span>
                <p className="text-xs font-bold text-gray-800 truncate">{l.name}</p>
              </div>
              <p className="text-[10px] text-gray-500 leading-snug">{l.desc}</p>
              <p className="text-[10px] text-gray-400 italic mt-1">{l.timeline}</p>
              <p className="text-[10px] font-semibold text-teal-700 mt-1.5">{byLevel(l.n).length} on record</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 flex flex-wrap gap-2">
          <div className="w-full sm:w-[200px]">
            <Select2 size="sm" value={filter.status}
              onChange={(v) => setFilter({ ...filter, status: v })}
              options={[
                { value: "open", label: "Open" },
                { value: "in_progress", label: "In progress" },
                { value: "resolved", label: "Resolved" },
                { value: "escalated", label: "Escalated" },
              ]}
              placeholder="All statuses" />
          </div>
          <div className="w-full sm:w-[240px]">
            <Select2 size="sm" value={filter.level}
              onChange={(v) => setFilter({ ...filter, level: v })}
              options={LEVELS.map(l => ({ value: l.n, label: `L${l.n} — ${l.name}` }))}
              placeholder="All levels" />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            title="Nothing on record"
            description="No active interventions — that's a healthy signal. Use observations and slips to address small things before they need formal action."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map(i => <InterventionCard key={i.id} item={i} onDelete={canDelete ? remove : null} />)}
          </div>
        )}

        {showForm && <InterventionForm staff={staff} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchAll(); }} />}
      </div>
    </div>
  );
}

function InterventionCard({ item, onDelete }) {
  const lvl = LEVELS.find(l => l.n === item.level) || LEVELS[0];
  const dignityCount = DIGNITY_ITEMS.filter(d => item[d.key]).length;
  const statusTone = { open: "amber", in_progress: "blue", resolved: "emerald", escalated: "red" }[item.status] || "gray";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0 ${
          { blue: "bg-blue-600", teal: "bg-teal-600", amber: "bg-amber-500", red: "bg-red-600", purple: "bg-purple-600" }[lvl.tone]
        }`}>
          L{item.level}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-800 truncate">{item.subject}</p>
            <Pill tone={statusTone}>{item.status?.replace("_", " ")}</Pill>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {item.staff?.application?.full_name || `Staff #${item.staff_id}`} · opened {item.opened_on?.split?.("T")[0]}
          </p>
          <p className="text-xs text-gray-700 mt-2 leading-snug line-clamp-3">{item.details}</p>

          {/* Dignity Protocol indicator */}
          <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg className={`w-3.5 h-3.5 ${dignityCount === 6 ? "text-emerald-600" : "text-amber-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dignityCount === 6 ? "M5 13l4 4L19 7" : "M12 9v2m0 4h.01"} />
              </svg>
              <span className="text-[10px] font-semibold text-gray-600">Dignity Protocol: {dignityCount}/6</span>
            </div>
            {item.follow_up_on && (
              <span className="text-[10px] text-gray-500">Follow-up: {item.follow_up_on?.split?.("T")[0]}</span>
            )}
          </div>
          {onDelete && (
            <div className="flex justify-end mt-2">
              <button onClick={() => onDelete(item.id)} className="text-[10px] text-red-500 hover:underline">Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InterventionForm({ staff, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    staff_id: "",
    level: 1,
    subject: "",
    details: "",
    improvement_plan: "",
    opened_on: new Date().toISOString().split("T")[0],
    follow_up_on: "",
    status: "open",
    dignity_private_setting: false,
    dignity_focus_on_behavior: false,
    dignity_heard_their_side: false,
    dignity_offered_support: false,
    dignity_expressed_belief: false,
    dignity_factual_language: false,
  });

  const allDignity = DIGNITY_ITEMS.every(d => form[d.key]);
  const canStep2 = form.staff_id && form.subject && form.details;

  const submit = async () => {
    setSaving(true);
    try {
      await post("/vats/interventions", form);
      Swal.fire({ icon: "success", title: "Intervention recorded", timer: 1500, showConfirmButton: false });
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.errors?.dignity_protocol?.[0] || err.response?.data?.message || "Failed to save";
      Swal.fire("Error", msg, "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-teal-600 text-white rounded-t-2xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">New Intervention — Step {step} of 2</h3>
            <p className="text-[11px] text-teal-100 mt-0.5">{step === 1 ? "Tell us what happened" : "Confirm Dignity Protocol"}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
        </div>

        <div className="px-5 py-2 border-b border-gray-100 flex gap-1">
          <div className={`flex-1 h-1 rounded-full ${step >= 1 ? "bg-teal-600" : "bg-gray-200"}`} />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? "bg-teal-600" : "bg-gray-200"}`} />
        </div>

        {step === 1 ? (
          <div className="p-5 space-y-3">
            <Field label="Staff member">
              <Select2
                value={form.staff_id}
                onChange={(v) => setForm({ ...form, staff_id: v })}
                options={staff.map(s => ({ value: s.id, label: s.application?.full_name || s.employee_id }))}
                placeholder="Search staff…"
                required
              />
            </Field>
            <Field label="Level">
              <div className="grid grid-cols-5 gap-2">
                {LEVELS.map(l => (
                  <button key={l.n} type="button"
                    onClick={() => setForm({ ...form, level: l.n })}
                    className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                      form.level === l.n ? "border-teal-600 bg-teal-50" : "border-gray-100 hover:border-gray-200"
                    }`}>
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black text-white ${
                      { blue: "bg-blue-600", teal: "bg-teal-600", amber: "bg-amber-500", red: "bg-red-600", purple: "bg-purple-600" }[l.tone]
                    }`}>{l.n}</span>
                    <span className="text-[9px] font-bold uppercase">{l.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 italic mt-2">{LEVELS[form.level - 1]?.desc}</p>
            </Field>
            <Field label="Subject">
              <input type="text" className={inp} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required maxLength={255} />
            </Field>
            <Field label="What happened? (factual, behaviour-focused)">
              <textarea rows={4} className={inp} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Opened on">
                <DateField className={inp} value={form.opened_on} onChange={(e) => setForm({ ...form, opened_on: e.target.value })} required />
              </Field>
              <Field label="Follow-up date (optional)">
                <DateField className={inp} value={form.follow_up_on} onChange={(e) => setForm({ ...form, follow_up_on: e.target.value })} />
              </Field>
            </div>
            <Field label="Improvement plan (optional)">
              <textarea rows={3} className={inp} value={form.improvement_plan} onChange={(e) => setForm({ ...form, improvement_plan: e.target.value })} />
            </Field>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={!canStep2} onClick={() => setStep(2)}
                className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed">
                Continue → Dignity Protocol
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-xs text-teal-800">
                <strong>Dignity Protocol.</strong> Every intervention — at every level — requires you to confirm these six points. We cannot save this record until all six are ticked. This isn't bureaucracy: it's a guarantee.
              </p>
            </div>

            {DIGNITY_ITEMS.map(d => (
              <label key={d.key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" checked={form[d.key]}
                  onChange={(e) => setForm({ ...form, [d.key]: e.target.checked })}
                  className="mt-0.5 w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 leading-snug">{d.text}</span>
              </label>
            ))}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setStep(1)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">← Back</button>
              <button type="button" disabled={!allDignity || saving} onClick={submit}
                className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? "Saving…" : allDignity ? "Save Intervention" : `Confirm all 6 items first (${DIGNITY_ITEMS.filter(d => form[d.key]).length}/6)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
