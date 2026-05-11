import { useState, useEffect } from "react";
import { get, post } from "../../api/axios";
import Swal from "sweetalert2";
import Select2 from "../../components/hr/Select2";

const DIMENSIONS = [
  { key: "spiritual",    label: "Spiritual",    icon: "✨", hint: "Inner peace, sense of meaning, faith" },
  { key: "emotional",    label: "Emotional",    icon: "💙", hint: "Mood, stress level, family situation" },
  { key: "physical",     label: "Physical",     icon: "💪", hint: "Health, energy, rest, food" },
  { key: "professional", label: "Professional", icon: "🎯", hint: "Work satisfaction, growth, fairness" },
];

const MATERIAL = [
  { key: "salary_adequacy", label: "Is your salary enough for your needs?", icon: "💰" },
  { key: "basic_needs_met", label: "Are your basic needs (food, housing) met?", icon: "🏠" },
  { key: "motivation",      label: "How motivated do you feel at work?", icon: "🚀" },
  { key: "purpose",         label: "Do you feel your work has purpose?", icon: "🌱" },
];

const SCALE_EMOJIS = ["😟", "😕", "😐", "🙂", "😊"];
const SCALE_LABELS = ["Very poor", "Poor", "OK", "Good", "Excellent"];

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none";

export default function WelfareCheckin() {
  const today = new Date();
  const [form, setForm] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    spiritual: 3, emotional: 3, physical: 3, professional: 3,
    salary_adequacy: 3, basic_needs_met: 3, motivation: 3, purpose: 3,
    burnout_indicator: false,
    needs_support: false,
    notes: "",
  });
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try { const r = await get("/welfare/checkins"); setHistory(r.data?.data || []); } catch { setHistory([]); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await post("/welfare/checkins", form);
      Swal.fire({
        icon: "success",
        title: "Thank you for sharing 💙",
        text: form.needs_support ? "The Welfare Officer will reach out to you soon." : "Your honesty helps us care for you better.",
        timer: 2200, showConfirmButton: false,
      });
      fetchHistory();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to submit", "error");
    } finally { setSaving(false); }
  };

  const avg = average([form.spiritual, form.emotional, form.physical, form.professional]);

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-3xl mx-auto">

        {/* Privacy banner */}
        <div className="bg-gradient-to-br from-teal-700 to-teal-600 text-white rounded-2xl p-5 mb-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <div>
              <p className="text-base font-bold">This is a safe, private space.</p>
              <p className="text-[12px] text-teal-100 mt-1 leading-relaxed">
                Only <strong>you</strong>, the <strong>Welfare Officer</strong>, and <strong>HR</strong> can see what you write here.
                Your direct supervisor cannot. This is never used for performance evaluation. Be honest — it helps us care for you better.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800">Monthly Welfare Check-in 💙</h1>
          <p className="text-sm text-gray-500 mt-1">Takes 2 minutes. Tap an emoji for each question.</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Period */}
          <Card title="Which month is this for?" icon="📅">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year">
                <input type="number" min="2024" max="2100" className={inp}
                  value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || form.year })} />
              </Field>
              <Field label="Month">
                <Select2
                  value={form.month}
                  onChange={(v) => setForm({ ...form, month: parseInt(v) })}
                  options={Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
                    value: m,
                    label: new Date(2000, m - 1, 1).toLocaleString("en", { month: "long" }),
                  }))}
                  isClearable={false}
                />
              </Field>
            </div>
          </Card>

          {/* 4D wellbeing */}
          <Card
            title="The 4 dimensions of wellbeing"
            icon="🌸"
            badge={`Average: ${avg.toFixed(1)} / 5 ${avg >= 4 ? "😊" : avg >= 3 ? "🙂" : avg >= 2 ? "😐" : "😟"}`}
          >
            <div className="space-y-5">
              {DIMENSIONS.map(d => (
                <ScaleRow key={d.key} {...d}
                  value={form[d.key]} onChange={(v) => setForm({ ...form, [d.key]: v })} />
              ))}
            </div>
          </Card>

          {/* Material life */}
          <Card title="Material life & motivation" icon="🌟">
            <div className="space-y-5">
              {MATERIAL.map(m => (
                <ScaleRow key={m.key} label={m.label} icon={m.icon}
                  value={form[m.key]} onChange={(v) => setForm({ ...form, [m.key]: v })} />
              ))}
            </div>
          </Card>

          {/* Flags */}
          <Card title="Anything else to share?" icon="🤝">
            <Toggle
              label="I am feeling burnt out this month"
              hint="Burnout means you're physically/emotionally drained and need rest."
              icon="😮‍💨"
              checked={form.burnout_indicator}
              onChange={(v) => setForm({ ...form, burnout_indicator: v })} />
            <Toggle
              label="I would like the Welfare Officer to reach out"
              hint="Tick this if you're going through anything and want a confidential conversation."
              icon="📞"
              checked={form.needs_support}
              onChange={(v) => setForm({ ...form, needs_support: v })} />
            <div className="mt-4">
              <Field label="Anything else? (optional, private)">
                <textarea rows={3} className={inp}
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Things you want HR or the Welfare Officer to know — financial pressure, family situation, ideas, anything…" />
              </Field>
            </div>
          </Card>

          <button type="submit" disabled={saving}
            className="w-full px-5 py-3.5 bg-teal-600 text-white text-sm font-bold rounded-2xl hover:bg-teal-700 disabled:opacity-50 shadow-sm">
            {saving ? "Submitting…" : "💙 Submit My Check-in"}
          </button>
        </form>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-bold text-gray-700 mb-2">My past check-ins</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {history.map(c => {
                const a = average([c.spiritual, c.emotional, c.physical, c.professional]);
                return (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-2xl">{a >= 4 ? "😊" : a >= 3 ? "🙂" : a >= 2 ? "😐" : "😟"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(c.year, c.month - 1, 1).toLocaleString("en", { month: "long", year: "numeric" })}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Average {a.toFixed(1)} / 5
                        {c.needs_support && <span className="ml-2 text-amber-600 font-semibold">· asked for support</span>}
                      </p>
                    </div>
                    {c.burnout_indicator && <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">Burnout</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, icon, badge, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-5 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h3 className="text-sm font-bold text-teal-800">{title}</h3>
        </div>
        {badge && <span className="text-[11px] font-bold text-teal-700">{badge}</span>}
      </div>
      <div className="p-5">{children}</div>
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

function ScaleRow({ label, hint, icon, value, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          {icon && <span>{icon}</span>} {label}
        </p>
        <span className="text-[11px] font-semibold text-teal-600">{SCALE_LABELS[value - 1]}</span>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mb-2">{hint}</p>}
      <div className="flex gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`flex-1 py-2.5 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              value === n ? "bg-teal-600 ring-2 ring-teal-300 scale-105" : "bg-gray-100 hover:bg-gray-200"
            }`}>
            <span className="text-2xl">{SCALE_EMOJIS[n - 1]}</span>
            <span className={`text-[9px] font-bold ${value === n ? "text-white" : "text-gray-500"}`}>{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, hint, icon, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 py-3 cursor-pointer">
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? "bg-teal-600" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow ${checked ? "left-5" : "left-0.5"}`} />
      </button>
      <div className="flex-1">
        <p className="text-sm text-gray-800 font-medium flex items-center gap-1.5">
          {icon && <span>{icon}</span>} {label}
        </p>
        {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

function average(arr) {
  const v = arr.filter(n => typeof n === "number" && !isNaN(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}
