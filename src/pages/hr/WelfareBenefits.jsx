import { useState, useEffect } from "react";
import { get, post, del } from "../../api/axios";
import Swal from "sweetalert2";
import { PageHeader, EmptyState, Spinner, StatGrid } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";

const TYPES = [
  { value: "grant",          label: "Grant",            color: "emerald", icon: "🎁" },
  { value: "salary_advance", label: "Salary Advance",   color: "blue",    icon: "💵" },
  { value: "medical",        label: "Medical",          color: "red",     icon: "🏥" },
  { value: "children_fees",  label: "Children's Fees",  color: "purple",  icon: "🎓" },
  { value: "counseling",     label: "Counseling",       color: "teal",    icon: "🧠" },
  { value: "emergency",      label: "Emergency",        color: "amber",   icon: "🚨" },
  { value: "other",          label: "Other",            color: "gray",    icon: "💗" },
];

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none";

export default function WelfareBenefits() {
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({ type: "" });

  useEffect(() => { fetchAll(); fetchStaff(); }, [filter]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
      const r = await get(`/welfare/benefits?${params}`);
      setItems(r.data?.data?.data || r.data?.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  const fetchStaff = async () => {
    try { const r = await get("/hr/staff/list?per_page=200"); setStaff(r.data?.data || []); } catch {}
  };

  const remove = async (id) => {
    const r = await Swal.fire({ icon: "warning", title: "Remove this benefit record?", showCancelButton: true, confirmButtonColor: "#b91c1c" });
    if (!r.isConfirmed) return;
    await del(`/welfare/benefits/${id}`);
    fetchAll();
  };

  const totalAmount = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const uniqueStaff = new Set(items.map(i => i.staff_id)).size;
  const thisMonth = items.filter(i => new Date(i.granted_on).getMonth() === new Date().getMonth()).length;

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">
        <PageHeader
          icon="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
          title="Welfare Benefits Log"
          subtitle="A record of every act of care: grants, advances, medical help, children's fees, counseling. This is how we honour our obligation to staff."
          actions={
            <button onClick={() => setShowForm(true)}
              className="px-3 py-1.5 bg-white text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-50">
              + Record Help
            </button>
          }
        />

        <StatGrid stats={[
          { label: "Total support", value: totalAmount.toLocaleString() + " AFN", tone: "emerald", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" },
          { label: "Records", value: items.length, tone: "teal", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" },
          { label: "Staff helped", value: uniqueStaff, tone: "blue", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857" },
          { label: "This month", value: thisMonth, tone: "purple", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        ]} />

        {/* Type filter pills */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 flex gap-2 flex-wrap">
          <button onClick={() => setFilter({ type: "" })}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${!filter.type ? "bg-teal-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
            All
          </button>
          {TYPES.map(t => (
            <button key={t.value} onClick={() => setFilter({ type: t.value })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                filter.type === t.value ? "bg-teal-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}>
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            title="Nothing recorded yet"
            description="Use this log every time WEN provides any kind of support to a staff member — financial, medical, emotional. The total tells our story."
            action={<button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700">Record first benefit</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map(b => <BenefitCard key={b.id} benefit={b} onDelete={remove} />)}
          </div>
        )}

        {showForm && <BenefitForm staff={staff} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchAll(); }} />}
      </div>
    </div>
  );
}

function BenefitCard({ benefit, onDelete }) {
  const t = TYPES.find(x => x.value === benefit.type) || TYPES[0];
  const tones = {
    emerald: "bg-emerald-50 border-emerald-100",
    blue: "bg-blue-50 border-blue-100",
    red: "bg-red-50 border-red-100",
    purple: "bg-purple-50 border-purple-100",
    teal: "bg-teal-50 border-teal-100",
    amber: "bg-amber-50 border-amber-100",
    gray: "bg-gray-50 border-gray-100",
  };
  return (
    <div className={`rounded-2xl border ${tones[t.color]} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{t.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-800 truncate">{benefit.staff?.application?.full_name || `Staff #${benefit.staff_id}`}</p>
            {benefit.amount && (
              <span className="text-sm font-black text-gray-800">
                {Number(benefit.amount).toLocaleString()} <span className="text-[10px] font-semibold text-gray-500">{benefit.currency || "AFN"}</span>
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">{t.label}</p>
          <p className="text-xs text-gray-700 mt-2 leading-snug line-clamp-3">{benefit.reason}</p>
          {benefit.notes && <p className="text-[11px] text-gray-500 italic mt-1.5 line-clamp-2">{benefit.notes}</p>}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/60">
            <p className="text-[10px] text-gray-500">
              {benefit.granted_on?.split?.("T")[0]} · {benefit.approver?.name || "—"}
            </p>
            <button onClick={() => onDelete(benefit.id)} className="text-[10px] text-red-500 hover:underline">Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitForm({ staff, onClose, onSaved }) {
  const [form, setForm] = useState({
    staff_id: "", type: "grant", amount: "", currency: "AFN",
    granted_on: new Date().toISOString().split("T")[0], reason: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.amount) delete payload.amount;
      await post("/welfare/benefits", payload);
      Swal.fire({ icon: "success", title: "Recorded", timer: 1200, showConfirmButton: false });
      onSaved();
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-teal-50 rounded-t-2xl">
          <h3 className="text-sm font-bold text-teal-800">Record Welfare Benefit</h3>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <Field label="Staff member">
            <Select2
              value={form.staff_id}
              onChange={(v) => setForm({ ...form, staff_id: v })}
              options={staff.map(s => ({ value: s.id, label: s.application?.full_name || s.employee_id }))}
              placeholder="Search staff…"
              required
            />
          </Field>
          <Field label="Type of help">
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${
                    form.type === t.value ? "border-teal-600 bg-teal-50" : "border-gray-100 hover:border-gray-200"
                  }`}>
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-xs font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Amount (optional)">
                <input type="number" min="0" step="0.01" className={inp} value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
              </Field>
            </div>
            <Field label="Currency">
              <Select2
                value={form.currency}
                onChange={(v) => setForm({ ...form, currency: v || "AFN" })}
                options={["AFN", "USD", "EUR"]}
                isClearable={false}
              />
            </Field>
          </div>
          <Field label="Date">
            <input type="date" className={inp} value={form.granted_on} onChange={(e) => setForm({ ...form, granted_on: e.target.value })} required />
          </Field>
          <Field label="Reason">
            <textarea rows={3} className={inp} value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })} required
              placeholder="Why was this support given?" />
          </Field>
          <Field label="Notes (optional)">
            <textarea rows={2} className={inp} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50">
              {saving ? "Saving…" : "Record"}
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
