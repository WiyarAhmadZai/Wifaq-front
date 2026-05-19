import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteRoutineItem, getRoutineItem } from "../../api/routineItems";
import Swal from "sweetalert2";

import { fmtDate } from "../../utils/formErrors";
const fmt = (n) => Number(n || 0).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);

export default function RoutineItemShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoutineItem(id)
      .then((r) => setRow(r.data?.data || null))
      .catch(() => {
        Swal.fire("Error", "Could not load this routine item.", "error");
        navigate("/purchase/routine-items");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    const r = await Swal.fire({
      title: "Delete this routine item?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await deleteRoutineItem(id);
      navigate("/purchase/routine-items");
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to delete.", "error");
    }
  };

  if (loading) return <p className="px-4 py-8 text-center text-xs text-gray-400">Loading…</p>;
  if (!row) return null;

  const isDue = !row.next_due_date || row.next_due_date <= today();

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-2 mb-4">
        <button onClick={() => navigate("/purchase/routine-items")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-gray-800">{row.item_name}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              row.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"
            }`}>{row.is_active ? "Active" : "Paused"}</span>
            {row.is_active && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isDue ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200"
              }`}>{isDue ? "Due now" : `Next: ${fmtDate(row.next_due_date)}`}</span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">Every {row.frequency_days} day(s) · {fmt(row.standard_quantity)} {row.unit} per cycle</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/purchase/routine-items/edit/${id}`)}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold">Edit</button>
          <button onClick={handleDelete}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-semibold">Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Panel label="Standard quantity">{fmt(row.standard_quantity)} {row.unit}</Panel>
        <Panel label="Frequency">Every {row.frequency_days} day(s)</Panel>
        <Panel label="Estimated unit price">
          {row.estimated_unit_price ? `${fmt(row.estimated_unit_price)} AFN` : "—"}
        </Panel>
        <Panel label="Estimated cycle cost">
          {row.estimated_unit_price
            ? `${fmt(Number(row.estimated_unit_price) * Number(row.standard_quantity))} AFN`
            : "—"}
        </Panel>
        <Panel label="Last purchase">{fmtDate(row.last_purchase_date)}</Panel>
        <Panel label="Next due">
          <span className={isDue ? "text-red-700 font-semibold" : ""}>
            {fmtDate(row.next_due_date)}
          </span>
        </Panel>
        <Panel label="Linked stock row">
          {row.stock?.item_name ? (
            <>
              {row.stock.item_name}
              <div className="text-[10px] text-gray-400">{row.stock.quantity} {row.stock.unit} on hand · min {row.stock.min_stock_level}</div>
            </>
          ) : "—"}
        </Panel>
        <Panel label="Expense category">
          {row.chart_account
            ? `${row.chart_account.code} · ${row.chart_account.name}`
            : "—"}
        </Panel>
      </div>

      {row.notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Notes</p>
          <p className="text-xs text-gray-700 whitespace-pre-line">{row.notes}</p>
        </div>
      )}
    </div>
  );
}

function Panel({ label, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5 font-semibold">{label}</p>
      <div className="text-xs text-gray-800">{children}</div>
    </div>
  );
}
