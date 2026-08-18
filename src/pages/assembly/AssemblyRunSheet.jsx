import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post } from "../../api/axios";
import Swal from "sweetalert2";
import { TEAL } from "../education/weeklyUi";
import PrintSheet, { PrintHeader } from "../../components/PrintSheet";


const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
  </div>
);

/**
 * Run Sheet — the clean order-of-programme for the morning itself. Printable,
 * or put on a tablet at the podium. Nothing here is editable on purpose: this
 * is the thing the MC follows, not another place to plan.
 */
export default function AssemblyRunSheet() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [a, setA] = useState(null);
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await get(`/assemblies/${id}`);
      setA(res.data.data);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to load the run sheet", "error");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const markDone = async () => {
    const r = await Swal.fire({
      title: "Mark done & archive?",
      text: "The whole programme is saved back as a reusable record, so next time starts from a copy.",
      icon: "question", showCancelButton: true, confirmButtonColor: "#2E7D5B",
      confirmButtonText: "✓ Mark done & archive",
    });
    if (!r.isConfirmed) return;
    try {
      const res = await post(`/assemblies/${id}/archive`);
      setA(res.data.data);
      Swal.fire({ icon: "success", title: "Archived as a reusable programme", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    }
  };

  if (loading) return <Spinner />;
  if (!a) return <div className="px-4 py-16 text-center text-sm text-[#5A7A7E]">Assembly not found.</div>;

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4 print:hidden" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-[#CFE6E6]">Morning Assembly · {a.date}</div>
            <h1 className="text-sm font-bold text-white truncate">Run Sheet — {a.theme}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate(`/assembly/${id}/agenda`)}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
              ← Agenda
            </button>
            <button onClick={() => setPrinting(true)}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
              🖨 Print
            </button>
            {a.can_arrange && a.status !== "done" && (
              <button onClick={markDone}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: "#2E7D5B" }}>
                ✓ Mark done &amp; archive
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 max-w-3xl mx-auto space-y-4">
        {a.status === "planned" && a.pending_roles > 0 && (
          <div className="bg-[#FFF8E7] border border-[#E8D48B] rounded-2xl px-4 py-3 text-xs text-[#8A6F10] print:hidden">
            ⚠️ {a.pending_roles} role{a.pending_roles === 1 ? " is" : "s are"} still not confirmed. The supervising
            teacher should finish the prep check before the morning.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D0E0E0] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#0A3A3E]">{a.theme}</h3>
              <p className="text-[11px] text-[#5A7A7E]">{a.date} · {a.unit}</p>
            </div>
            <div className="text-[11px] text-[#5A7A7E]">
              {a.total_minutes} min{a.lead_teacher ? ` · Lead: ${a.lead_teacher}` : ""}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-white" style={{ background: "#052528" }}>
                  <th className="px-4 py-2.5 font-semibold w-10">#</th>
                  <th className="px-4 py-2.5 font-semibold">Activity</th>
                  <th className="px-4 py-2.5 font-semibold">Who</th>
                  <th className="px-4 py-2.5 font-semibold w-20">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0E0E0]">
                {(a.items || []).map((item, idx) => (
                  <tr key={item.id} style={item.type === "recognition" ? { background: "#FFF8E7" } : undefined}>
                    <td className="px-4 py-2.5 text-xs text-[#5A7A7E]">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-[13px] font-semibold text-[#0A3A3E]">{item.title}</div>
                      {item.notes && <div className="text-[11px] text-[#5A7A7E]">{item.notes}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#0A3A3E]">
                      {item.student || item.assigned_role || "—"}
                      {item.student && item.assigned_role && (
                        <div className="text-[10px] text-[#8AA4A7]">{item.assigned_role}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: TEAL }}>
                      {item.duration_minutes} min
                    </td>
                  </tr>
                ))}
                {(a.items || []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-[#8AA4A7]">No activities on the agenda yet.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#F4F8F8]">
                  <td></td>
                  <td className="px-4 py-2.5 text-xs font-bold text-[#5A7A7E]">Total</td>
                  <td></td>
                  <td className="px-4 py-2.5 text-xs font-bold" style={{ color: a.over_target ? "#B83230" : TEAL }}>
                    {a.total_minutes} min
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {a.status === "done" && (
          <div className="bg-[#E8F6F6] rounded-xl px-4 py-3 text-xs print:hidden" style={{ color: TEAL }}>
            📎 This programme is archived as a reusable record — open <b>Archive / Reuse</b> to duplicate it for a
            future morning instead of starting from a blank page.
          </div>
        )}
      </div>

      {/* The sheet the MC actually holds at the podium. */}
      <PrintSheet open={printing} onClose={() => setPrinting(false)} size="A4" title="Assembly Run Sheet">
        <RunSheetPaper a={a} />
      </PrintSheet>
    </div>
  );
}

/** A4 order-of-programme — sequence, who, how long. Nothing else. */
function RunSheetPaper({ a }) {
  return (
    <div style={{ color: "#0A3A3E" }}>
      <PrintHeader subtitle="Morning Assembly · Order of Programme" />

      <div className="flex justify-between items-start gap-4 mb-5">
        <div>
          <div className="text-xl font-bold" style={{ color: "#0D5C63" }}>{a.theme}</div>
          <div className="text-xs text-[#5A7A7E] mt-1">
            {a.unit_type === "class" ? "Class" : "Team"}: {a.unit}
          </div>
          {a.lead_teacher && (
            <div className="text-xs text-[#5A7A7E]">Lead teacher: {a.lead_teacher}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold">{a.date}</div>
          <div className="text-xs text-[#5A7A7E] mt-1">{a.total_minutes} minutes total</div>
          <div className="text-xs text-[#5A7A7E]">{a.items_total} items</div>
        </div>
      </div>

      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#052528", color: "#fff" }}>
            <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ width: 34 }}>#</th>
            <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider">Activity</th>
            <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider">Who</th>
            <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ width: 70 }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {(a.items || []).map((item, idx) => (
            <tr key={item.id}
              style={{
                borderBottom: "1px solid #D0E0E0",
                background: item.type === "recognition" ? "#FFF8E7" : (idx % 2 ? "#F4F8F8" : "#fff"),
              }}>
              <td className="px-3 py-2 text-xs text-[#5A7A7E] align-top">{idx + 1}</td>
              <td className="px-3 py-2 align-top">
                <div className="font-semibold text-[13px]">{item.title}</div>
                {item.notes && <div className="text-[11px] text-[#5A7A7E]">{item.notes}</div>}
              </td>
              <td className="px-3 py-2 align-top text-xs">
                <bdi dir="auto">{item.student || item.assigned_role || "—"}</bdi>
                {item.student && item.assigned_role && (
                  <div className="text-[10px] text-[#5A7A7E]">{item.assigned_role}</div>
                )}
              </td>
              <td className="px-3 py-2 align-top text-xs font-semibold" style={{ color: "#0D5C63" }}>
                {item.duration_minutes} min
              </td>
            </tr>
          ))}
          {(a.items || []).length === 0 && (
            <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-[#8AA4A7]">
              No activities on the agenda.
            </td></tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #0D5C63" }}>
            <td></td>
            <td className="px-3 py-2 text-xs font-bold">Total</td>
            <td></td>
            <td className="px-3 py-2 text-xs font-bold" style={{ color: "#0D5C63" }}>{a.total_minutes} min</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-8 text-[10px] text-[#8AA4A7] text-center">
        Wifaq Education Network · Morning Assembly Programme
      </div>
    </div>
  );
}
