import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  cancelRepairRequest,
  getRepairRequest,
  markCannotRepair,
  markRepaired,
  startRepair,
  triggerAutoGenerate,
} from "../../api/repairRequests";
import Swal from "sweetalert2";

const STATUS = {
  pending:       { label: "Pending",        cls: "bg-amber-100 text-amber-700 border-amber-300" },
  repairing:     { label: "Repairing",      cls: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  cannot_repair: { label: "Cannot repair",  cls: "bg-red-100 text-red-700 border-red-300" },
  completed:     { label: "Completed",      cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  cancelled:     { label: "Cancelled",      cls: "bg-gray-200 text-gray-600 border-gray-300" },
};

const TIMELINE = ["pending", "repairing", "completed"];

const fmt = (n) => Number(n || 0).toLocaleString();

export default function RepairRequestShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getRepairRequest(id);
      setRow(r.data?.data || null);
    } catch (e) {
      Swal.fire("Error", "Could not load this repair request.", "error");
      navigate("/purchase/repair-requests");
    } finally {
      setLoading(false);
    }
  };

  // Same boilerplate for every action: optional confirm, call API, refresh,
  // toast on success / dialog on failure.
  const runAction = async (label, fn, opts = {}) => {
    if (opts.confirm) {
      const r = await Swal.fire({
        title: opts.confirmTitle || `${label}?`,
        text: opts.confirmText,
        icon: opts.icon || "question",
        showCancelButton: true,
        confirmButtonText: label,
        confirmButtonColor: opts.color || "#0d9488",
      });
      if (!r.isConfirmed) return;
    }
    setBusy(true);
    try {
      await fn();
      await load();
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: `${label} done`, timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || `${label} failed.`, "error");
    } finally {
      setBusy(false);
    }
  };

  const onStart = () => runAction("Start repair", () => startRepair(id), { confirm: true, confirmText: "Mark this as in repair?" });

  const onMarkRepaired = async () => {
    const r = await Swal.fire({
      title: "Repair completed?",
      input: "textarea",
      inputLabel: "Resolution notes (optional)",
      inputPlaceholder: "What was done to fix it?",
      showCancelButton: true,
      confirmButtonText: "Mark as repaired",
      confirmButtonColor: "#10b981",
    });
    if (!r.isConfirmed) return;
    await runAction("Mark repaired", () => markRepaired(id, r.value || null));
  };

  const onMarkCannotRepair = async () => {
    const willAutoGen = row?.create_purchase_request;
    const r = await Swal.fire({
      title: "Cannot be repaired?",
      html: `
        <p style="font-size:12px;color:#475569;text-align:left;margin-bottom:8px">
          The repair team determined this item is beyond fixing.
          ${willAutoGen
            ? "<br/><strong>A replacement Purchase Request will be created on the next auto-generation run.</strong>"
            : "<br/><em>No replacement PR will be auto-generated (this option wasn't selected when reported).</em>"}
        </p>
      `,
      input: "textarea",
      inputLabel: "Why is it beyond repair? (optional)",
      showCancelButton: true,
      confirmButtonText: "Confirm — cannot repair",
      confirmButtonColor: "#ef4444",
    });
    if (!r.isConfirmed) return;
    await runAction("Mark cannot repair", () => markCannotRepair(id, r.value || null));
  };

  const onCancel = async () => {
    const r = await Swal.fire({
      title: "Cancel this repair request?",
      input: "textarea",
      inputLabel: "Reason (optional)",
      showCancelButton: true,
      confirmButtonText: "Cancel request",
      confirmButtonColor: "#ef4444",
    });
    if (!r.isConfirmed) return;
    await runAction("Cancel", () => cancelRepairRequest(id, r.value || null));
  };

  // Convenience: run auto-generator now so the user can see the replacement
  // PR immediately after marking "cannot repair" instead of waiting for cron.
  const onAutoGenNow = async () => {
    const r = await Swal.fire({
      title: "Generate replacement PR now?",
      text: "Runs the auto-generator immediately. The replacement PR will appear in Purchase Requests as a draft.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      confirmButtonText: "Run now",
    });
    if (!r.isConfirmed) return;
    setBusy(true);
    try {
      const res = await triggerAutoGenerate();
      await load();
      Swal.fire("Done", `Total drafts created: ${res.data?.data?.total_generated ?? 0}`, "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Auto-generator failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="px-4 py-8 text-center text-xs text-gray-400">Loading…</p>;
  if (!row) return null;

  const st = STATUS[row.status] || STATUS.pending;
  // Auto-gen is pending iff the requester wanted a replacement AND the row
  // is in cannot_repair AND no replacement PR exists yet.
  const awaitingAutoGen =
    row.status === "cannot_repair" &&
    row.create_purchase_request &&
    !row.generated_purchase_request_id;

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-2 mb-4">
        <button onClick={() => navigate("/purchase/repair-requests")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-gray-800">{row.request_number}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`}>{st.label}</span>
            {row.create_purchase_request && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                Wants replacement
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{row.item_name} · {fmt(row.quantity)} unit(s)</p>
        </div>
        {row.status === "pending" && (
          <button onClick={() => navigate(`/purchase/repair-requests/edit/${id}`)}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold">Edit</button>
        )}
      </div>

      {/* Awaiting auto-gen banner */}
      {awaitingAutoGen && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-[11px] flex items-center justify-between gap-2">
          <p className="text-amber-800">
            ⏳ <strong>Awaiting auto-generation.</strong> A replacement Purchase Request will be created on the next daily scan, or trigger it now.
          </p>
          <button onClick={onAutoGenNow} disabled={busy}
            className="px-2 py-1 bg-amber-700 text-white rounded text-[10px] font-semibold hover:bg-amber-800 disabled:opacity-50 whitespace-nowrap">
            Generate now
          </button>
        </div>
      )}

      {/* Timeline */}
      <Timeline status={row.status} />

      {/* Action bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap gap-2">
        {row.status === "pending" && (
          <>
            <ActionBtn onClick={onStart}             color="indigo"  busy={busy}>Start repair</ActionBtn>
            <ActionBtn onClick={onMarkRepaired}      color="emerald" busy={busy}>Already fixed — mark as repaired</ActionBtn>
            <ActionBtn onClick={onMarkCannotRepair}  color="red"     busy={busy}>Cannot repair</ActionBtn>
            <ActionBtn onClick={onCancel}            color="gray"    busy={busy}>Cancel</ActionBtn>
          </>
        )}
        {row.status === "repairing" && (
          <>
            <ActionBtn onClick={onMarkRepaired}      color="emerald" busy={busy}>Mark as repaired</ActionBtn>
            <ActionBtn onClick={onMarkCannotRepair}  color="red"     busy={busy}>Cannot repair after all</ActionBtn>
            <ActionBtn onClick={onCancel}            color="gray"    busy={busy}>Cancel</ActionBtn>
          </>
        )}
        {["completed", "cannot_repair", "cancelled"].includes(row.status) && (
          <p className="text-[11px] text-gray-500 self-center">This request is closed. No further actions.</p>
        )}
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Panel label="Reporter">
          {row.requester?.name || "—"}
          <div className="text-[10px] text-gray-400">{row.reported_date}</div>
        </Panel>
        <Panel label="Branch">{row.branch?.name || "School-wide"}</Panel>
        <Panel label="Quantity">{fmt(row.quantity)}</Panel>
        <Panel label="Estimated repair cost">
          {row.estimated_cost ? `${fmt(row.estimated_cost)} AFN` : "—"}
        </Panel>
        {row.generated_purchase_request && (
          <Panel label="Replacement PR">
            <button onClick={() => navigate(`/purchase/purchase-requests/show/${row.generated_purchase_request.id}`)}
              className="text-teal-700 font-mono hover:underline">
              {row.generated_purchase_request.request_number}
            </button>
            <div className="text-[10px] text-gray-400 capitalize">{row.generated_purchase_request.status}</div>
          </Panel>
        )}
      </div>

      {/* Issue */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Reported issue</p>
        <p className="text-xs text-gray-700 whitespace-pre-line">{row.issue_description}</p>
      </div>

      {row.resolution_notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Resolution notes</p>
          <p className="text-xs text-gray-700 whitespace-pre-line">{row.resolution_notes}</p>
        </div>
      )}
    </div>
  );
}

function Timeline({ status }) {
  // Show the main happy path plus the "cannot_repair" branch when relevant.
  const isOffPath = status === "cannot_repair" || status === "cancelled";
  const stages = isOffPath ? ["pending", "repairing", status] : TIMELINE;
  const activeIdx = stages.findIndex((s) => s === status);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4">
      <div className="flex items-center gap-1 overflow-x-auto">
        {stages.map((s, i) => {
          const isActive = i === activeIdx;
          const isDone = i < activeIdx;
          const st = STATUS[s];
          return (
            <div key={s} className="flex items-center flex-shrink-0">
              <div className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border ${
                isActive ? st.cls : isDone ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-gray-50 text-gray-400 border-gray-200"
              }`}>{st.label}</div>
              {i < stages.length - 1 && (
                <div className={`w-6 h-px ${isDone ? "bg-teal-300" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
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

function ActionBtn({ onClick, color, busy, children }) {
  const map = {
    teal:    "bg-teal-600 hover:bg-teal-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    indigo:  "bg-indigo-600 hover:bg-indigo-700",
    red:     "bg-red-600 hover:bg-red-700",
    gray:    "bg-gray-500 hover:bg-gray-600",
  };
  return (
    <button onClick={onClick} disabled={busy}
      className={`px-3 py-1.5 text-white text-xs font-semibold rounded-lg disabled:opacity-50 ${map[color] || map.teal}`}>
      {children}
    </button>
  );
}
