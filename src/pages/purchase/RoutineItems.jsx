import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listRoutineItems, deleteRoutineItem, generateRoutineItem } from "../../api/routineItems";
import { triggerAutoGenerate } from "../../api/repairRequests";
import Swal from "sweetalert2";

// Linked-stock state badge palette (matches the Stock page).
const STOCK_STATE = {
  ok:  { label: "OK",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  low: { label: "Low", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  out: { label: "Out", cls: "bg-red-50 text-red-700 border-red-200" },
};

const fmt = (n) => Number(n || 0).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);

// "Due now" includes things with no next_due_date (never purchased) — same
// rule the backend scope uses.
const isDue = (row) => !row.next_due_date || row.next_due_date <= today();

const daysUntilDue = (row) => {
  if (!row.next_due_date) return 0;
  const diff = (new Date(row.next_due_date) - new Date(today())) / 86400000;
  return Math.round(diff);
};

export default function RoutineItems() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");           // all | due | active | inactive
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchItems(); /* eslint-disable-next-line */ }, [filter]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = { per_page: 200 };
      if (filter === "active")   params.active_only = true;
      if (filter === "inactive") params.active_only = false;
      if (filter === "due")      params.due_only = true;
      if (search) params.search = search;
      const r = await listRoutineItems(params);
      // Backend returns Laravel paginator → response.data.data.data
      const rows = r.data?.data?.data || r.data?.data || [];
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const r = await Swal.fire({
      title: "Delete this routine item?",
      text: "Future auto-generation for this item will stop.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await deleteRoutineItem(id);
      setItems((p) => p.filter((i) => i.id !== id));
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to delete", "error");
    }
  };

  // Per-row reorder. Spawns the draft PR + advances this routine's cycle.
  // If an open PR already exists (409) we offer to force a duplicate.
  const handleGenerate = async (row, force = false) => {
    try {
      const res = await generateRoutineItem(row.id, force);
      const pr = res.data?.purchase_request;
      await fetchItems();
      const r = await Swal.fire({
        icon: "success",
        title: "Reorder created",
        text: `Draft ${pr?.request_number || "purchase request"} is ready for submission.`,
        showCancelButton: true,
        confirmButtonText: "Open the PR",
        cancelButtonText: "Stay here",
        confirmButtonColor: "#0d9488",
      });
      if (r.isConfirmed && pr?.id) navigate(`/purchase/purchase-requests/show/${pr.id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        const r = await Swal.fire({
          title: "Open PR already exists",
          text: err.response.data?.message || "There's already an open reorder for this item.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Force a new one",
          confirmButtonColor: "#ef4444",
        });
        if (r.isConfirmed) handleGenerate(row, true);
        return;
      }
      Swal.fire("Failed", err.response?.data?.message || "Could not generate.", "error");
    }
  };

  // Manual run of the daily auto-generator — handy for testing without waiting
  // for cron, and useful when you've just added a routine that's already due.
  const runAutoGenerator = async () => {
    const r = await Swal.fire({
      title: "Run auto-generator now?",
      text: "Scans routines / low stock / unrepairable items and creates draft PRs.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      confirmButtonText: "Run now",
    });
    if (!r.isConfirmed) return;
    setGenerating(true);
    try {
      const res = await triggerAutoGenerate();
      const report = res.data?.data || {};
      await fetchItems();
      Swal.fire({
        icon: "success",
        title: `Auto-generation complete`,
        html: `
          <p style="font-size:12px;color:#475569;text-align:left">
            Routine items: <strong>${report.routine_items_processed ?? 0}</strong><br/>
            Low stock: <strong>${report.stock_low_processed ?? 0}</strong><br/>
            Unrepairable: <strong>${report.repair_requests_processed ?? 0}</strong><br/>
            <strong>Total drafts created: ${report.total_generated ?? 0}</strong>
          </p>
        `,
      });
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Auto-generator failed.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const stats = useMemo(() => {
    const s = { total: items.length, due: 0, active: 0 };
    items.forEach((i) => {
      if (i.is_active) s.active++;
      if (isDue(i) && i.is_active) s.due++;
    });
    return s;
  }, [items]);

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Routine Items</h2>
          <p className="text-xs text-gray-500">Items reordered on a cycle — A4 paper, gas cylinders, cleaning supplies. The daily auto-generator turns due items into draft purchase requests.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAutoGenerator} disabled={generating}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {generating ? "Running…" : "Run auto-generator"}
          </button>
          <button onClick={() => navigate("/purchase/routine-items/create")}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New routine
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <SummaryCard label="Total" value={stats.total} accent="from-teal-600 to-teal-700" />
        <SummaryCard label="Active" value={stats.active} accent="from-emerald-500 to-emerald-600" />
        <SummaryCard label="Due now" value={stats.due} accent={stats.due > 0 ? "from-red-500 to-red-600" : "from-gray-500 to-gray-600"} />
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {["all", "due", "active", "inactive"].map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-colors ${
                filter === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{t}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={fetchItems}
          placeholder="Search by item name…"
          className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
            <tr>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-right px-3 py-2">Standard qty</th>
              <th className="text-left px-3 py-2">Unit</th>
              <th className="text-right px-3 py-2">Est. price</th>
              <th className="text-right px-3 py-2">Frequency</th>
              <th className="text-left px-3 py-2">Linked stock</th>
              <th className="text-left px-3 py-2">Next due</th>
              <th className="text-center px-3 py-2">Active</th>
              <th className="text-center px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-xs text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-xs text-gray-400 italic">No routine items yet.</td></tr>
            ) : items.map((row) => {
              const due = isDue(row) && row.is_active;
              const daysOff = daysUntilDue(row);
              return (
                <tr key={row.id} className={`hover:bg-gray-50 cursor-pointer ${due ? "bg-red-50/30" : ""}`}
                    onClick={() => navigate(`/purchase/routine-items/show/${row.id}`)}>
                  <td className="px-3 py-2 text-gray-800 font-medium">{row.item_name}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{fmt(row.standard_quantity)}</td>
                  <td className="px-3 py-2 text-gray-500">{row.unit}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{row.estimated_unit_price ? `${fmt(row.estimated_unit_price)}` : "—"}</td>
                  <td className="px-3 py-2 text-right text-gray-700">every {row.frequency_days}d</td>
                  <td className="px-3 py-2">
                    {row.stock ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-gray-700">{row.stock.item_name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{fmt(row.stock.quantity)} {row.stock.unit}</span>
                        {(() => {
                          const ss = STOCK_STATE[row.stock.stock_state] || STOCK_STATE.ok;
                          return <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${ss.cls}`}>{ss.label}</span>;
                        })()}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300">not linked</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.next_due_date ? (
                      <span className={due ? "text-red-700 font-semibold" : "text-gray-700"}>
                        {row.next_due_date}
                        <span className="text-[9px] text-gray-400 ml-1">
                          {due ? "(due)" : daysOff > 0 ? `(in ${daysOff}d)` : `(${Math.abs(daysOff)}d overdue)`}
                        </span>
                      </span>
                    ) : (
                      <span className="text-red-700 font-semibold">Due immediately</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      row.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>{row.is_active ? "Yes" : "No"}</span>
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleGenerate(row)} disabled={!row.is_active}
                      title={row.is_active ? "Create the reorder PR now" : "Inactive routine"}
                      className="px-2 py-1 text-[10px] font-semibold text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-40 mr-2">
                      Generate PR
                    </button>
                    <button onClick={() => navigate(`/purchase/routine-items/edit/${row.id}`)}
                      className="text-[10px] text-teal-600 hover:text-teal-800 mr-2">Edit</button>
                    <button onClick={() => handleDelete(row.id)}
                      className="text-[10px] text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className={`bg-gradient-to-r ${accent} rounded-xl p-3 text-white`}>
      <p className="text-[10px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
