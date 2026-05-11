import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { get, post, put, del } from "../../api/axios";
import Swal from "sweetalert2";
import Select2 from "../../components/hr/Select2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none";

const TYPE_STYLE = {
  public:    { bg: "bg-blue-50",    text: "text-blue-700",    chip: "bg-blue-600" },
  religious: { bg: "bg-purple-50",  text: "text-purple-700",  chip: "bg-purple-600" },
  weekend:   { bg: "bg-gray-50",    text: "text-gray-700",    chip: "bg-gray-500" },
  other:     { bg: "bg-emerald-50", text: "text-emerald-700", chip: "bg-emerald-600" },
};

export default function Holidays() {
  const { canCreate, canUpdate, canDelete } = useResourcePermissions("holidays");
  const location = useLocation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(null); // null | "new" | holiday object

  useEffect(() => { fetchAll(); }, [year, location.key]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await get(`/holidays?year=${year}`);
      setItems(r.data?.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    const r = await Swal.fire({ icon: "warning", title: "Delete this holiday?", showCancelButton: true, confirmButtonColor: "#b91c1c" });
    if (!r.isConfirmed) return;
    await del(`/holidays/${id}`);
    fetchAll();
  };

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Holiday Calendar</h1>
            <p className="text-xs text-gray-400 mt-0.5">Days the system should NOT mark anyone absent.</p>
          </div>
          <div className="flex gap-2">
            <div className="w-[130px]">
              <Select2 size="sm" value={year}
                onChange={(v) => setYear(parseInt(v))}
                options={[year - 1, year, year + 1].map(y => ({ value: y, label: String(y) }))}
                isClearable={false} />
            </div>
            {canCreate && (
              <button onClick={() => setEdit("new")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add Holiday
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="inline-block w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-sm text-gray-400">No holidays added for {year}</p>
            {canCreate && (
              <button onClick={() => setEdit("new")} className="mt-3 px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700">
                Add the first one
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(h => {
              const style = TYPE_STYLE[h.type] || TYPE_STYLE.public;
              const d = new Date(h.date);
              return (
                <div key={h.id} className={`rounded-2xl border border-gray-100 ${style.bg} p-4 flex items-center gap-4`}>
                  <div className="text-center flex-shrink-0">
                    <p className="text-2xl font-black text-gray-800">{d.getDate()}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">{d.toLocaleString("en", { month: "short" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{h.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`px-1.5 py-0.5 ${style.chip} text-white text-[9px] font-bold rounded uppercase`}>{h.type}</span>
                      {h.recurring && <span className="px-1.5 py-0.5 bg-teal-600 text-white text-[9px] font-bold rounded uppercase">Recurring</span>}
                    </div>
                  </div>
                  {(canUpdate || canDelete) && (
                    <div className="flex flex-col gap-1">
                      {canUpdate && (
                        <button onClick={() => setEdit(h)} className="text-[10px] px-2 py-1 bg-white text-gray-600 rounded hover:bg-gray-100">Edit</button>
                      )}
                      {canDelete && (
                        <button onClick={() => remove(h.id)} className="text-[10px] px-2 py-1 bg-white text-red-600 rounded hover:bg-red-50">Delete</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {edit && (
          <HolidayModal
            holiday={edit === "new" ? null : edit}
            onClose={() => setEdit(null)}
            onSaved={() => { setEdit(null); fetchAll(); }}
          />
        )}
      </div>
    </div>
  );
}

function HolidayModal({ holiday, onClose, onSaved }) {
  const [form, setForm] = useState(holiday ? {
    date: holiday.date?.split?.("T")[0] || holiday.date,
    name: holiday.name,
    type: holiday.type,
    recurring: !!holiday.recurring,
    notes: holiday.notes || "",
  } : {
    date: new Date().toISOString().split("T")[0],
    name: "",
    type: "public",
    recurring: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (holiday) await put(`/holidays/${holiday.id}`, form);
      else await post("/holidays", form);
      Swal.fire({ icon: "success", title: "Saved", timer: 1000, showConfirmButton: false });
      onSaved();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-teal-50 rounded-t-2xl">
          <h3 className="text-sm font-bold text-teal-800">{holiday ? "Edit" : "Add"} Holiday</h3>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <Field label="Date">
            <input type="date" className={inp} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </Field>
          <Field label="Name">
            <input type="text" className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Eid al-Fitr" />
          </Field>
          <Field label="Type">
            <Select2
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v || "public" })}
              options={[
                { value: "public", label: "Public" },
                { value: "religious", label: "Religious" },
                { value: "weekend", label: "Weekend" },
                { value: "other", label: "Other" },
              ]}
              isClearable={false}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
            Repeats every year
          </label>
          <Field label="Notes (optional)">
            <textarea rows={2} className={inp} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
