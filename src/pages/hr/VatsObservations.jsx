import { useState, useEffect } from "react";
import { get, post, del } from "../../api/axios";
import Swal from "sweetalert2";
import { PageHeader, StatGrid, EmptyState, Spinner, Pill } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";

const TYPES = {
  positive: ["excellence", "initiative", "growth", "collaboration", "innovation", "dedication"],
  concern:  ["performance", "conduct", "attendance", "compliance", "communication", "quality"],
  urgent:   ["safety_violation", "ethical_breach", "misconduct", "abandonment", "insubordination", "student_endangerment"],
};

const CATEGORY_STYLE = {
  positive: { bg: "bg-emerald-50", border: "border-emerald-200", chip: "bg-emerald-600", text: "text-emerald-700", emoji: "🌟" },
  concern:  { bg: "bg-amber-50",   border: "border-amber-200",   chip: "bg-amber-500",   text: "text-amber-700",   emoji: "⚠️" },
  urgent:   { bg: "bg-red-50",     border: "border-red-200",     chip: "bg-red-600",     text: "text-red-700",     emoji: "🚨" },
};

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors";

export default function VatsObservations() {
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({ category: "", staff_id: "" });

  useEffect(() => { fetchAll(); fetchStaff(); }, [filter]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
      const res = await get(`/vats/observations?${params}`);
      setItems(res.data?.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  const fetchStaff = async () => {
    try { const r = await get("/hr/staff/list?per_page=200"); setStaff(r.data?.data || []); } catch {}
  };

  const remove = async (id) => {
    const r = await Swal.fire({ icon: "warning", title: "Delete this observation?", showCancelButton: true, confirmButtonColor: "#b91c1c" });
    if (!r.isConfirmed) return;
    await del(`/vats/observations/${id}`);
    fetchAll();
  };

  const positive = items.filter(o => o.category === "positive").length;
  const concern  = items.filter(o => o.category === "concern").length;
  const urgent   = items.filter(o => o.category === "urgent").length;

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">
        <PageHeader
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"
          title="Daily Observations"
          subtitle="Specific, factual notes about what staff are doing. These are the building blocks of the year-end appraisal."
          actions={
            <button onClick={() => setShowForm(true)}
              className="px-3 py-1.5 bg-white text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-50 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              New
            </button>
          }
        />

        <StatGrid stats={[
          { label: "Total observations", value: items.length, tone: "teal", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2", hint: "Across all categories" },
          { label: "🌟 Positive", value: positive, tone: "emerald", icon: "M5 13l4 4L19 7", hint: "Recognition / strength" },
          { label: "⚠ Concern", value: concern, tone: "amber", icon: "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", hint: "Pattern noticed" },
          { label: "🚨 Urgent", value: urgent, tone: "red", icon: "M4.318 6.318a4.5 4.5 0 016.364 0", hint: "Immediate attention" },
        ]} />

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap gap-2">
          {["", "positive", "concern", "urgent"].map(c => (
            <button key={c || "all"} onClick={() => setFilter({ ...filter, category: c })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filter.category === c
                  ? c === "positive" ? "bg-emerald-600 text-white"
                  : c === "concern" ? "bg-amber-500 text-white"
                  : c === "urgent" ? "bg-red-600 text-white"
                  : "bg-teal-600 text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}>
              {c ? CATEGORY_STYLE[c].emoji + " " + c : "All"}
            </button>
          ))}
          <div className="ml-auto w-full sm:w-[260px]">
            <Select2
              size="sm"
              value={filter.staff_id}
              onChange={(v) => setFilter({ ...filter, staff_id: v })}
              options={staff.map(s => ({ value: s.id, label: s.application?.full_name || s.employee_id }))}
              placeholder="All staff"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"
            title="No observations yet"
            description="Log what you saw today — good or concerning. The year-end appraisal is built from these notes. Try to log a few praise observations every week — recognition is what builds the culture."
            action={<button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700">Log first observation</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map(o => <ObservationCard key={o.id} item={o} onDelete={remove} />)}
          </div>
        )}

        {showForm && (
          <ObservationForm
            staff={staff}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); fetchAll(); }}
          />
        )}
      </div>
    </div>
  );
}

function ObservationCard({ item, onDelete }) {
  const c = CATEGORY_STYLE[item.category] || CATEGORY_STYLE.positive;
  const name = item.staff?.application?.full_name || item.staff?.employee_id || `Staff #${item.staff_id}`;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 flex flex-col gap-2 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="text-xl flex-shrink-0">{c.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-800 truncate">{name}</p>
            <p className="text-[11px] text-gray-500 truncate">by {item.observer?.name || "—"} · {item.observed_on?.split?.("T")[0]}</p>
          </div>
        </div>
        <Pill tone={item.category === "positive" ? "emerald" : item.category === "concern" ? "amber" : "red"}>
          {item.category}
        </Pill>
      </div>
      <p className={`text-[11px] font-semibold ${c.text} uppercase tracking-wider`}>{item.type?.replace(/_/g, " ")}</p>
      <p className="text-[13px] text-gray-700 leading-snug">{item.description}</p>
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/60">
        {item.is_acknowledged_by_staff
          ? <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Acknowledged
            </span>
          : <span className="text-[10px] text-gray-400">Pending acknowledgement</span>}
        <button onClick={() => onDelete(item.id)} className="text-[10px] text-red-500 hover:underline">Delete</button>
      </div>
    </div>
  );
}

function ObservationForm({ staff, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    staff_id: "",
    category: "positive",
    type: "excellence",
    description: "",
    observed_on: new Date().toISOString().split("T")[0],
  });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await post("/vats/observations", form);
      Swal.fire({ icon: "success", title: "Logged", timer: 1200, showConfirmButton: false });
      onSaved();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  const c = CATEGORY_STYLE[form.category];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-teal-600 text-white rounded-t-2xl">
          <h3 className="text-sm font-bold">Log a New Observation</h3>
          <p className="text-[11px] text-teal-100 mt-0.5">Be factual. Focus on behaviour, not the person.</p>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <Field label="Staff member">
            <Select2
              value={form.staff_id}
              onChange={(v) => setForm({ ...form, staff_id: v })}
              options={staff.map(s => ({ value: s.id, label: s.application?.full_name || s.employee_id }))}
              placeholder="Search staff…"
              required
            />
          </Field>

          <Field label="What kind of observation?">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CATEGORY_STYLE).map(([key, style]) => (
                <button key={key} type="button"
                  onClick={() => setForm({ ...form, category: key, type: TYPES[key][0] })}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    form.category === key ? "border-teal-600 bg-teal-50" : "border-gray-100 hover:border-gray-200"
                  }`}>
                  <span className="text-2xl">{style.emoji}</span>
                  <span className="text-xs font-bold capitalize">{key}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Type">
            <Select2
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v })}
              options={TYPES[form.category].map(t => ({ value: t, label: t.replace(/_/g, " ") }))}
              isClearable={false}
            />
          </Field>

          <Field label="Date">
            <input type="date" className={inp} value={form.observed_on}
              onChange={(e) => setForm({ ...form, observed_on: e.target.value })} required />
          </Field>

          <Field label="What did you observe?">
            <textarea rows={4} className={inp} placeholder="Specific, factual description…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            <p className="text-[10px] text-gray-400 mt-1">Tip: write what you actually saw or heard, not your opinion of it.</p>
          </Field>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
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
