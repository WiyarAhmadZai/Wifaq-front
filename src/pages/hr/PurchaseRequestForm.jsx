import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

const BRANCHES = ["Wifaq School", "Wifaq Learning Studio", "WISAL Academy"];
const CATEGORIES = ["Office Supplies", "IT Equipment", "Furniture", "Cleaning", "Books", "Maintenance", "Kitchen", "Sports Equipment", "Lab Supplies", "Other"];
const URGENCY = [
  { value: "low", label: "Low — Can wait" },
  { value: "medium", label: "Medium — Needed soon" },
  { value: "high", label: "High — Urgent" },
];

const STEPS = [
  { num: 1, label: "Request Details", desc: "Item and quantity info", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { num: 2, label: "Cost & Priority", desc: "Budget and urgency", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { num: 3, label: "Notes & Review", desc: "Additional info and summary", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
];

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const StepCard = ({ step, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
      <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">{step.label}</p>
        <p className="text-xs text-teal-600">{step.desc}</p>
      </div>
    </div>
    <div className="p-5 space-y-5">{children}</div>
  </div>
);

// Searchable single select
function SearchSelect({ options, value, onChange, placeholder = "Search...", getLabel = o => o, getValue = o => o }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = options.filter(o => getLabel(o).toLowerCase().includes(query.toLowerCase()));
  const selected = options.find(o => getValue(o) === value);

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-xl bg-white transition-all ${open ? "border-teal-500 ring-2 ring-teal-500" : "border-gray-200"}`}>
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input value={open ? query : (selected ? getLabel(selected) : "")}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onKeyDown={e => e.key === "Enter" && e.preventDefault()}
          placeholder={selected ? getLabel(selected) : placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400" />
        {selected && !open && (
          <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="mr-2 w-4 h-4 text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
        <svg className={`w-4 h-4 text-gray-400 mr-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No results</p>
            : filtered.map(o => (
              <button key={getValue(o)} type="button"
                onClick={() => { onChange(getValue(o)); setOpen(false); setQuery(""); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${getValue(o) === value ? "bg-teal-600 text-white" : "hover:bg-teal-50 text-gray-700"}`}>
                {getLabel(o)}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default function PurchaseRequestForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    branch: "",
    category: "",
    item: "",
    quantity: "",
    urgency: "",
    estimated_cost: "",
    reason: "",
    notes: "",
    status: "pending",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handle = (e) => set(e.target.name, e.target.value);

  const canNext = () => {
    if (step === 1) return form.item && form.quantity && form.branch && form.category;
    if (step === 2) return form.urgency;
    return true;
  };

  const submit = () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    setTimeout(() => {
      Swal.fire({ icon: "success", title: isEdit ? "Request Updated!" : "Request Created!", text: `${form.item} has been saved.`, timer: 2000, showConfirmButton: false, confirmButtonColor: "#0d9488" });
      navigate("/hr/purchase-request");
    }, 600);
  };

  const cur = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/hr/purchase-request")}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? "Edit Purchase Request" : "New Purchase Request"}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Step {step} of {STEPS.length} — {cur.label}: {cur.desc}</p>
          </div>
        </div>
      </div>

      {/* Step pills */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const done = step > s.num;
            const active = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => done && setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${active ? "bg-teal-600 text-white shadow-sm" : done ? "bg-teal-50 text-teal-700 cursor-pointer" : "bg-gray-100 text-gray-400 cursor-default"}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                    ${active ? "bg-white/25 text-white" : done ? "bg-teal-600 text-white" : "bg-gray-300 text-white"}`}>
                    {done ? <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : s.num}
                  </span>
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`w-4 h-px ${done ? "bg-teal-400" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === "Enter" && e.target.tagName !== "BUTTON") e.preventDefault(); }}>
        <div className="max-w-full mx-auto px-4 py-6 space-y-4">

          {/* Step 1 */}
          {step === 1 && (
            <StepCard step={cur}>
              <div>
                <Label required>Date</Label>
                <input type="date" name="date" value={form.date} onChange={handle} className={inp} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Branch</Label>
                  <SearchSelect options={BRANCHES} value={form.branch} onChange={v => set("branch", v)} placeholder="Select branch..." />
                </div>
                <div>
                  <Label required>Category</Label>
                  <SearchSelect options={CATEGORIES} value={form.category} onChange={v => set("category", v)} placeholder="Select category..." />
                </div>
              </div>
              <div>
                <Label required>Item Name</Label>
                <input type="text" name="item" value={form.item} onChange={handle} className={inp} placeholder="e.g. Printer Cartridges (HP 26A)" />
              </div>
              <div>
                <Label required>Quantity</Label>
                <input type="number" name="quantity" value={form.quantity} onChange={handle} className={inp} placeholder="e.g. 10" min={1} />
              </div>
            </StepCard>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <StepCard step={cur}>
              <div>
                <Label required>Urgency Level</Label>
                <SearchSelect
                  options={URGENCY}
                  value={form.urgency}
                  onChange={v => set("urgency", v)}
                  placeholder="Select urgency..."
                  getLabel={o => o.label}
                  getValue={o => o.value}
                />
              </div>
              <div>
                <Label>Estimated Cost (AFN)</Label>
                <input type="number" name="estimated_cost" value={form.estimated_cost} onChange={handle} className={inp} placeholder="e.g. 25000" min={0} />
              </div>
              <div>
                <Label required>Reason / Justification</Label>
                <textarea name="reason" value={form.reason} onChange={handle} rows={3} className={inp} placeholder="Why is this purchase needed?" />
              </div>
            </StepCard>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <StepCard step={cur}>
              <div>
                <Label>Additional Notes</Label>
                <textarea name="notes" value={form.notes} onChange={handle} rows={3} className={inp} placeholder="Any additional details or specifications..." />
              </div>

              {/* Review */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <p className="text-xs font-bold text-gray-700">Review Summary</p>
                {[
                  { label: "Date", value: form.date },
                  { label: "Branch", value: form.branch || "—" },
                  { label: "Category", value: form.category || "—" },
                  { label: "Item", value: form.item || "—" },
                  { label: "Quantity", value: form.quantity || "—" },
                  { label: "Urgency", value: form.urgency ? form.urgency.charAt(0).toUpperCase() + form.urgency.slice(1) : "—" },
                  { label: "Est. Cost", value: form.estimated_cost ? `${Number(form.estimated_cost).toLocaleString()} AFN` : "—" },
                  { label: "Reason", value: form.reason || "—" },
                ].map(r => (
                  <div key={r.label} className="flex items-start justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-gray-500 flex-shrink-0">{r.label}</span>
                    <span className="text-xs font-semibold text-gray-800 text-right ml-4">{r.value}</span>
                  </div>
                ))}
              </div>
            </StepCard>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button type="button"
              onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/hr/purchase-request")}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              {step === 1 ? "Cancel" : "Back"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {STEPS.map(s => (
                  <div key={s.num} className={`h-1.5 rounded-full transition-all ${s.num === step ? "w-6 bg-teal-600" : s.num < step ? "w-3 bg-teal-300" : "w-3 bg-gray-200"}`} />
                ))}
              </div>
              {step < STEPS.length ? (
                <button type="button" disabled={!canNext()} onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {saving ? "Saving..." : isEdit ? "Update Request" : "Submit Request"}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
