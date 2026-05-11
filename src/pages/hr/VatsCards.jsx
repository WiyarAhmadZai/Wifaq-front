import { useState, useEffect } from "react";
import { get, post, del } from "../../api/axios";
import Swal from "sweetalert2";
import { PageHeader, EmptyState, Spinner, Pill } from "../../components/hr/HrUI";
import { CardBadge } from "./VatsDashboard";
import Select2 from "../../components/hr/Select2";

const CARDS = [
  { color: "gold",      label: "Gold",      meaning: "Extraordinary all-around excellence — the rarest card.",     positive: true },
  { color: "turquoise", label: "Turquoise", meaning: "Character & ethical excellence — moral leadership.",          positive: true },
  { color: "green",     label: "Green",     meaning: "Sustained high professional performance.",                    positive: true },
  { color: "yellow",    label: "Yellow",    meaning: "First documented concern — formal pattern recognised.",       positive: false },
  { color: "red",       label: "Red",       meaning: "Serious accountability measure — major breach or persistent.", positive: false },
];

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none";

export default function VatsCards() {
  const [cards, setCards] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchAll(); fetchStaff(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try { const r = await get("/vats/cards"); setCards(r.data?.data || []); }
    catch { setCards([]); }
    finally { setLoading(false); }
  };

  const fetchStaff = async () => {
    try { const r = await get("/hr/staff/list?per_page=200"); setStaff(r.data?.data || []); } catch {}
  };

  const remove = async (id) => {
    const r = await Swal.fire({ icon: "warning", title: "Remove this card?", showCancelButton: true, confirmButtonColor: "#b91c1c" });
    if (!r.isConfirmed) return;
    await del(`/vats/cards/${id}`);
    fetchAll();
  };

  const countOf = (c) => cards.filter(x => x.color === c).length;

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">
        <PageHeader
          icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          title="Cards Wallet"
          subtitle="Five-tier recognition & accountability cards. Top three are awards. Last two are formal concerns."
          actions={
            <button onClick={() => setShowForm(true)}
              className="px-3 py-1.5 bg-white text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-50">
              + Issue Card
            </button>
          }
        />

        {/* Card legend — gallery */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {CARDS.map(c => (
            <div key={c.color} className={`relative bg-white rounded-2xl border ${c.positive ? "border-emerald-100" : "border-red-100"} p-4 hover:shadow-md transition-shadow`}>
              <div className="flex items-center gap-2 mb-2">
                <CardBadge color={c.color} small />
                <div>
                  <p className="text-sm font-bold text-gray-800">{c.label}</p>
                  <p className="text-[10px] text-gray-400">{countOf(c.color)} issued</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-600 leading-snug">{c.meaning}</p>
              {!c.positive && (
                <span className="absolute top-2 right-2 text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                  Concern
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Issued cards list */}
        {loading ? (
          <div className="text-center py-12"><Spinner /></div>
        ) : cards.length === 0 ? (
          <EmptyState
            icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            title="No cards issued yet"
            description="Cards are issued by HR after a pattern is clear (e.g. 10 positive recognition slips → suggest a Green Card)."
            action={<button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700">Issue first card</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {cards.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
                <CardBadge color={c.color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-800 truncate">{c.staff?.application?.full_name || `Staff #${c.staff_id}`}</p>
                    <Pill tone={c.color === "gold" ? "yellow" : c.color === "turquoise" ? "teal" : c.color === "green" ? "emerald" : c.color}>
                      {c.color}
                    </Pill>
                  </div>
                  <p className="text-xs text-gray-700 mt-1 leading-snug">{c.reason}</p>
                  {c.citation && <p className="text-[11px] text-gray-500 mt-1.5 italic border-l-2 border-gray-200 pl-2">{c.citation}</p>}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                    <p className="text-[10px] text-gray-400">Issued {c.issued_on?.split?.("T")[0]} by {c.issuer?.name}</p>
                    <button onClick={() => remove(c.id)} className="text-[10px] text-red-500 hover:underline">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && <CardForm staff={staff} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchAll(); }} />}
      </div>
    </div>
  );
}

function CardForm({ staff, onClose, onSaved }) {
  const [form, setForm] = useState({
    staff_id: "", color: "green", reason: "", citation: "",
    issued_on: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await post("/vats/cards", form);
      Swal.fire({ icon: "success", title: "Card issued", timer: 1200, showConfirmButton: false });
      onSaved();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    } finally { setSaving(false); }
  };

  const meaning = CARDS.find(c => c.color === form.color)?.meaning;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-teal-50 rounded-t-2xl">
          <h3 className="text-sm font-bold text-teal-800">Issue a Card</h3>
          <p className="text-[11px] text-teal-600 mt-0.5">Cards are formal — they go on the staff member's permanent record.</p>
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
          <Field label="Card colour">
            <div className="grid grid-cols-5 gap-2">
              {CARDS.map(c => (
                <button key={c.color} type="button"
                  onClick={() => setForm({ ...form, color: c.color })}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    form.color === c.color ? "border-teal-600 bg-teal-50" : "border-gray-100 hover:border-gray-200"
                  }`}>
                  <CardBadge color={c.color} small />
                  <span className="text-[9px] font-bold uppercase">{c.label}</span>
                </button>
              ))}
            </div>
            {meaning && <p className="text-[11px] text-gray-500 italic mt-2">{meaning}</p>}
          </Field>
          <Field label="Reason (one line)">
            <input type="text" className={inp} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required maxLength={255} />
          </Field>
          <Field label="Citation (optional, longer narrative)">
            <textarea rows={3} className={inp} value={form.citation} onChange={(e) => setForm({ ...form, citation: e.target.value })} />
          </Field>
          <Field label="Date">
            <input type="date" className={inp} value={form.issued_on} onChange={(e) => setForm({ ...form, issued_on: e.target.value })} required />
          </Field>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50">
              {saving ? "Issuing…" : "Issue Card"}
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
