import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { get, post, del } from "../../api/axios";
import Swal from "sweetalert2";
import { PageHeader, EmptyState, Spinner, StatGrid } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none";

const POSITIVE_TARGET = 10; // 10 positive slips → suggest a Green Card
const CONCERN_TARGET  = 3;  // 3 concern slips → suggest coaching

/**
 * 10-second recognition slip page. Shows a live threshold meter so HR can see
 * who's about to hit a card consideration ("10 positive slips → Green Card").
 */
export default function VatsSlips() {
  const { canCreate, canDelete } = useResourcePermissions("vats-slips");
  const location = useLocation();
  const [slips, setSlips] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ kind: "" });
  const [form, setForm] = useState({ staff_id: "", kind: "positive", reason: "" });
  const [thresholds, setThresholds] = useState([]);

  useEffect(() => { fetchAll(); fetchStaff(); fetchThresholds(); }, [filter, location.key]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
      const r = await get(`/vats/slips?${params}`);
      setSlips(r.data?.data || []);
    } catch { setSlips([]); }
    finally { setLoading(false); }
  };

  const fetchStaff = async () => {
    try { const r = await get("/hr/staff/list?per_page=200"); setStaff(r.data?.data || []); } catch {}
  };

  const fetchThresholds = async () => {
    try { const r = await get("/vats/slips/thresholds"); setThresholds(r.data?.data || []); } catch {}
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.staff_id || !form.reason) return;
    try {
      await post("/vats/slips", form);
      setForm({ staff_id: "", kind: form.kind, reason: "" });
      Swal.fire({ icon: "success", title: "Slip recorded", timer: 800, showConfirmButton: false });
      fetchAll(); fetchThresholds();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    }
  };

  const remove = async (id) => {
    const r = await Swal.fire({ icon: "warning", title: "Delete this slip?", showCancelButton: true, confirmButtonColor: "#b91c1c" });
    if (!r.isConfirmed) return;
    await del(`/vats/slips/${id}`);
    fetchAll(); fetchThresholds();
  };

  const positive = slips.filter(s => s.kind === "positive").length;
  const concern  = slips.filter(s => s.kind === "concern").length;

  // Group thresholds by staff for the "almost there" panel
  const nearCard = thresholds
    .filter(t => t.kind === "positive" && t.total >= 5)
    .map(t => {
      const staffRow = staff.find(s => s.id === t.staff_id);
      return { ...t, name: staffRow?.application?.full_name || `Staff #${t.staff_id}` };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const nearCoaching = thresholds
    .filter(t => t.kind === "concern" && t.total >= 2)
    .map(t => {
      const staffRow = staff.find(s => s.id === t.staff_id);
      return { ...t, name: staffRow?.application?.full_name || `Staff #${t.staff_id}` };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">
        <PageHeader
          icon="M5 13l4 4L19 7"
          title="Recognition Slips"
          subtitle="Quick 10-second 'well done' or 'small concern'. They accumulate into formal cards."
        />

        <StatGrid stats={[
          { label: "Total slips", value: slips.length, tone: "teal", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" },
          { label: "🌟 Positive", value: positive, tone: "emerald", icon: "M5 13l4 4L19 7", hint: `Target: ${POSITIVE_TARGET} → Green Card` },
          { label: "⚠ Concern", value: concern, tone: "amber", icon: "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", hint: `${CONCERN_TARGET} concern → coaching` },
          { label: "Pos:Neg ratio", value: concern > 0 ? (positive / concern).toFixed(1) + ":1" : "∞", tone: "blue", icon: "M16 8v8m-4-5v5m-4-2v2", hint: "Healthy: 3:1+" },
        ]} />

        {/* Quick-record form — only for users who can create */}
        {canCreate && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-3">⚡ Quick Record (10 seconds)</p>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Staff</label>
              <Select2
                value={form.staff_id}
                onChange={(v) => setForm({ ...form, staff_id: v })}
                options={staff.map(s => ({ value: s.id, label: s.application?.full_name || s.employee_id }))}
                placeholder="Search staff…"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Kind</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => setForm({ ...form, kind: "positive" })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                    form.kind === "positive" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>🌟</button>
                <button type="button" onClick={() => setForm({ ...form, kind: "concern" })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                    form.kind === "concern" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>⚠</button>
              </div>
            </div>
            <div className="md:col-span-4">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Reason (one line)</label>
              <input type="text" className={inp} maxLength={200} value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Helped a colleague set up a science demo" required />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button type="submit" className="w-full px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700">
                Record →
              </button>
            </div>
          </div>
        </form>
        )}

        {/* Threshold panels */}
        {(nearCard.length > 0 || nearCoaching.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {nearCard.length > 0 && (
              <ThresholdPanel
                title="Close to a Green Card"
                emoji="🟢"
                color="emerald"
                rows={nearCard}
                target={POSITIVE_TARGET}
                hint={`${POSITIVE_TARGET} positive slips → consider a card`}
              />
            )}
            {nearCoaching.length > 0 && (
              <ThresholdPanel
                title="Close to coaching"
                emoji="💬"
                color="amber"
                rows={nearCoaching}
                target={CONCERN_TARGET}
                hint={`${CONCERN_TARGET} concern slips → consider a chat`}
              />
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-3 flex gap-2">
          {["", "positive", "concern"].map(k => (
            <button key={k || "all"} onClick={() => setFilter({ kind: k })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                filter.kind === k
                  ? k === "positive" ? "bg-emerald-600 text-white"
                  : k === "concern" ? "bg-amber-500 text-white"
                  : "bg-teal-600 text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}>
              {k ? (k === "positive" ? "🌟 Positive" : "⚠ Concern") : "All"}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="text-center py-10"><Spinner size={6} /></div>
          ) : slips.length === 0 ? (
            <EmptyState
              icon="M5 13l4 4L19 7"
              title="No slips yet"
              description="Use the form above. A 10-second 'well done' makes a real difference — and the system tracks every one."
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {slips.map(s => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/50">
                  <span className="text-lg flex-shrink-0">{s.kind === "positive" ? "🌟" : "⚠"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {s.staff?.application?.full_name || `Staff #${s.staff_id}`}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{s.reason}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 hidden sm:block">{s.issued_on?.split?.("T")[0]}</span>
                  {canDelete && (
                    <button onClick={() => remove(s.id)} className="text-[10px] text-red-500 hover:underline">Delete</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThresholdPanel({ title, emoji, color, rows, target, hint }) {
  const tones = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
  };
  const fill = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };
  return (
    <div className={`rounded-2xl border ${tones[color]} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <p className="text-sm font-bold">{title}</p>
      </div>
      <p className="text-[11px] mb-3 italic">{hint}</p>
      <div className="space-y-2">
        {rows.map(r => {
          const pct = Math.min(100, (r.total / target) * 100);
          return (
            <div key={r.staff_id}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium truncate">{r.name}</span>
                <span className="font-bold">{r.total}/{target}</span>
              </div>
              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div className={`${fill[color]} h-full transition-all duration-500`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
