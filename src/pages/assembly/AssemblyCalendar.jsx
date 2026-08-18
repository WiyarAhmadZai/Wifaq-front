import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, del, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { TEAL } from "../education/weeklyUi";


// Status colours drawn from the brand set: gold = in progress, green = ready,
// muted teal-grey = closed.
const STATUS = {
  planned: { label: "Preparing", bg: "#FBF3DB", fg: "#9A7B12" },
  ready:   { label: "All roles ready", bg: "#E6F3EC", fg: "#2E7D5B" },
  done:    { label: "Done · archived", bg: "#E8F0F0", fg: "#5A7A7E" },
};

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
  </div>
);

const dayOf = (iso) => (iso ? String(Number(iso.slice(8, 10))) : "—");
const monthOf = (iso) => {
  if (!iso) return "";
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return M[Number(iso.slice(5, 7)) - 1] || "";
};

/** One row in the calendar. Readiness is what this screen is really about. */
function AssemblyRow({ a, onOpen, onDelete }) {
  const st = STATUS[a.status] || STATUS.planned;
  return (
    <div onClick={() => onOpen(a)}
      className="flex items-center gap-4 bg-white border border-[#D0E0E0] rounded-2xl px-4 py-3 mb-2.5 shadow-sm cursor-pointer hover:shadow-md transition">
      <div className="text-center w-12 shrink-0">
        <div className="text-xl font-bold leading-none" style={{ color: TEAL }}>{dayOf(a.date)}</div>
        <div className="text-[10px] uppercase text-[#8AA4A7]">{monthOf(a.date)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[#0A3A3E] truncate">{a.theme}</div>
        <div className="text-[11px] text-[#5A7A7E] mt-0.5 truncate">
          {a.unit_type === "class" ? "🏫" : "👥"} {a.unit}
          {a.lead_teacher ? ` · Lead: ${a.lead_teacher}` : ""}
        </div>
        <div className="text-[10px] text-[#8AA4A7] mt-0.5">
          {a.items_ready}/{a.items_total} roles ready · {a.total_minutes}/{a.target_minutes} min
          {a.prep_open && a.status !== "ready" && (
            <span className="ml-1.5 font-semibold" style={{ color: "#9A7B12" }}>· prep window open</span>
          )}
        </div>
      </div>
      <span className="text-[10px] font-bold px-3 py-1 rounded-full shrink-0"
        style={{ background: st.bg, color: st.fg }}>
        {a.status === "planned" && a.pending_roles > 0 ? `${a.pending_roles} roles pending` : st.label}
      </span>
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(a); }}
          className="text-[11px] font-semibold text-red-400 hover:text-red-600 shrink-0">
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Assembly Calendar — upcoming and past assemblies at a glance, with the
 * readiness signal front and centre. Click a day to plan or arrange it.
 */
export default function AssemblyCalendar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const cached = peekCache("/assemblies");
    if (cached) { setData(cached); setLoading(false); }
    try {
      const res = await get("/assemblies");
      setData(res.data);
    } catch (err) {
      if (err.response?.status !== 403) Swal.fire("Error", "Failed to load the assembly calendar", "error");
      setData({ forbidden: err.response?.status === 403 });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (a) => navigate(`/assembly/${a.id}/agenda`);

  const remove = async (a) => {
    const r = await Swal.fire({
      title: "Delete this assembly?", text: a.theme,
      icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444",
    });
    if (!r.isConfirmed) return;
    try { await del(`/assemblies/${a.id}`); load(); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  if (loading) return <Spinner />;

  if (data?.forbidden) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-3xl">📅</div>
        <p className="text-sm font-semibold text-[#0A3A3E] mt-2">You do not have access to the assembly program</p>
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">Assembly Calendar</h1>
            <p className="text-xs text-[#CFE6E6] mt-0.5">
              ~20 minutes each morning. Planned a few days ahead; the supervising teacher arranges it the day before.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/assembly/templates")}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
              📚 Reuse a program
            </button>
            {data?.can_create && (
              <button onClick={() => navigate("/assembly/plan")}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg,#C9A227,#B08A1E)" }}>
                + Plan new assembly
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { n: stats.upcoming ?? 0, l: "Upcoming", c: TEAL },
            { n: stats.preparing ?? 0, l: "Still preparing", c: "#9A7B12" },
            { n: stats.ready ?? 0, l: "Ready to run", c: "#2E7D5B" },
            { n: stats.templates ?? 0, l: "Reusable programs", c: "#9A7B12" },
          ].map((s) => (
            <div key={s.l} className="bg-white rounded-2xl border border-[#D0E0E0] p-4 shadow-sm">
              <div className="text-2xl font-bold" style={{ color: s.c }}>{s.n}</div>
              <div className="text-[11px] text-[#5A7A7E] mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider mb-2">Upcoming</h3>
          {(data?.upcoming || []).length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#D0E0E0] p-8 text-center">
              <p className="text-sm font-semibold text-[#0A3A3E]">No assemblies scheduled</p>
              <p className="text-xs text-[#5A7A7E] mt-1">Plan one, or start from an archived program.</p>
            </div>
          ) : (
            data.upcoming.map((a) => (
              <AssemblyRow key={a.id} a={a} onOpen={open} onDelete={data?.can_manage ? remove : null} />
            ))
          )}
        </div>

        {(data?.past || []).length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider mb-2">Recent</h3>
            {data.past.map((a) => (
              <AssemblyRow key={a.id} a={a} onOpen={open} onDelete={data?.can_manage ? remove : null} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
