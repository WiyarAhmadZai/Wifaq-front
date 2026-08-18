import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { TEAL } from "../education/weeklyUi";


const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
  </div>
);

const tomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Archive / Reuse — the whole point of the module.
 *
 * The recurring pain is re-organising each morning from scratch. Every finished
 * assembly becomes a starting template: duplicate it, adjust the date and the
 * performing unit, and the agenda is already there.
 */
export default function AssemblyArchive() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const cached = peekCache("/assemblies/templates");
    if (cached) { setData(cached); setLoading(false); }
    try {
      const res = await get("/assemblies/templates");
      setData(res.data);
    } catch (err) {
      if (err.response?.status !== 403) Swal.fire("Error", "Failed to load the archive", "error");
      setData({ forbidden: err.response?.status === 403 });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const list = data?.templates || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => [t.theme, t.unit].some((v) => (v || "").toLowerCase().includes(q)));
  }, [data, search]);

  const duplicate = async (t) => {
    const { value, isConfirmed } = await Swal.fire({
      title: "Duplicate & adapt",
      html: `<div style="text-align:left;font-size:13px">
               Copies the <b>${t.item_count}</b>-activity agenda from <b>${t.theme}</b>.
               Roles are carried over; every readiness check starts fresh.
             </div>`,
      input: "date",
      inputValue: tomorrow(),
      inputLabel: "Which morning is it for?",
      showCancelButton: true,
      confirmButtonColor: TEAL,
      confirmButtonText: "⧉ Duplicate",
    });
    if (!isConfirmed || !value) return;

    try {
      const res = await post(`/assemblies/${t.id}/duplicate`, { date: value });
      navigate(`/assembly/plan/${res.data.data.id}`);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to duplicate", "error");
    }
  };

  if (loading) return <Spinner />;

  if (data?.forbidden) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-3xl">📚</div>
        <p className="text-sm font-semibold text-[#0A3A3E] mt-2">You do not have access to the assembly archive</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">Archive / Reuse</h1>
            <p className="text-xs text-[#CFE6E6] mt-0.5">
              Every finished assembly becomes a starting template — stop rebuilding each morning cold.
            </p>
          </div>
          <button onClick={() => navigate("/assembly/calendar")}
            className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
            📅 Calendar
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-3xl mx-auto">
        <div className="bg-[#E8F6F6] rounded-xl px-4 py-3 text-xs flex gap-2" style={{ color: TEAL }}>
          <span>📎</span>
          <span>
            Finished programmes save back into the <b>Assembly Program Kit</b> (Drive module), so next time you
            start from a copy, not a blank page.
          </span>
        </div>

        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by theme or performing unit…"
          className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none" />

        <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider">Reusable assembly programmes</h3>
            <span className="text-[11px] text-[#8AA4A7]">{rows.length} saved</span>
          </div>

          {rows.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-[#0A3A3E]">Nothing archived yet</p>
              <p className="text-xs text-[#5A7A7E] mt-1">
                Mark an assembly done on its run sheet and it lands here, ready to reuse.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((t) => (
                <div key={t.id}
                  className="flex items-center gap-3 border border-[#D0E0E0] rounded-2xl px-4 py-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#0A3A3E] truncate">{t.theme}</div>
                    <div className="text-[11px] text-[#5A7A7E] mt-0.5">
                      {t.item_count} activities · {t.total_minutes} min · {t.unit}
                      {t.date ? ` · used ${t.date}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => navigate(`/assembly/${t.id}/run-sheet`)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#5A7A7E] border border-[#D0E0E0] rounded-xl hover:bg-[#F4F8F8]">
                      View
                    </button>
                    {data?.can_create && (
                      <button onClick={() => duplicate(t)}
                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-xl" style={{ background: TEAL }}>
                        ⧉ Duplicate &amp; adapt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#FFF8E7] border-l-4 rounded-xl px-4 py-3 text-xs" style={{ borderColor: "#C9A227", color: "#6B5100" }}>
          Over a term the school builds a library of ready-to-adapt programmes — themed, seasonal, and by activity
          mix — instead of starting from scratch each morning.
        </div>
      </div>
    </div>
  );
}
