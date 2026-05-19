import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getRepairRequest, approveRepair, rejectRepair,
  startRepair, closeRepair, cancelRepairRequest,
} from "../../api/repairRequests";
import { getAccounts, getParties, getChartOfAccounts } from "../../api/financial";
import Swal from "sweetalert2";

import { fmtDate, fmtDateTime } from "../../utils/formErrors";

const fmt = (n) => Number(n || 0).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);

const STATUS = {
  pending:       { label: "Pending",      cls: "bg-amber-100 text-amber-700 border-amber-300" },
  approved:      { label: "Approved",     cls: "bg-blue-100 text-blue-700 border-blue-300" },
  rejected:      { label: "Rejected",     cls: "bg-red-100 text-red-700 border-red-300" },
  repairing:     { label: "Repairing",    cls: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  cannot_repair: { label: "Unrepairable", cls: "bg-red-100 text-red-700 border-red-300" },
  completed:     { label: "Completed",    cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  cancelled:     { label: "Cancelled",    cls: "bg-gray-200 text-gray-600 border-gray-300" },
};
const TIMELINE = ["pending", "approved", "repairing", "completed"];

export default function RepairRequestShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rr, setRr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [parties, setParties] = useState([]);
  const [expenseAccts, setExpenseAccts] = useState([]);

  useEffect(() => { fetchRR(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    getAccounts({ per_page: 100 }).then((r) => setAccounts(r.data?.data?.data || r.data?.data || [])).catch(() => {});
    getParties({ per_page: 200 }).then((r) => setParties(r.data?.data?.data || r.data?.data || [])).catch(() => {});
    getChartOfAccounts().then((r) => {
      const all = r.data?.data || [];
      setExpenseAccts(all.filter((c) => c.type === "Expense" && c.is_active !== false && (c.level ?? 1) >= 3)
        .sort((a, b) => String(a.code).localeCompare(String(b.code))));
    }).catch(() => {});
  }, []);

  const fetchRR = async () => {
    setLoading(true);
    try {
      const r = await getRepairRequest(id);
      setRr(r.data?.data || null);
    } catch {
      Swal.fire("Error", "Could not load this repair request.", "error");
      navigate("/purchase/repair-requests");
    } finally {
      setLoading(false);
    }
  };

  const run = async (label, fn, confirmText) => {
    if (confirmText) {
      const c = await Swal.fire({ title: `${label}?`, text: confirmText, icon: "question", showCancelButton: true, confirmButtonText: label, confirmButtonColor: "#0d9488" });
      if (!c.isConfirmed) return;
    }
    setBusy(true);
    try {
      await fn();
      await fetchRR();
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: `${label} done`, timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || `${label} failed.`, "error");
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    const r = await Swal.fire({ title: "Reject this repair?", input: "textarea", inputLabel: "Reason (required)", inputValidator: (v) => !v && "A reason is required.", showCancelButton: true, confirmButtonText: "Reject", confirmButtonColor: "#ef4444" });
    if (!r.isConfirmed) return;
    await run("Reject", () => rejectRepair(id, r.value));
  };
  const onCancel = async () => {
    const r = await Swal.fire({ title: "Cancel this repair?", input: "textarea", inputLabel: "Reason (optional)", showCancelButton: true, confirmButtonText: "Cancel request", confirmButtonColor: "#ef4444" });
    if (!r.isConfirmed) return;
    await run("Cancel", () => cancelRepairRequest(id, r.value || null));
  };

  if (loading) return <p className="px-4 py-8 text-center text-xs text-gray-400">Loading…</p>;
  if (!rr) return null;

  const st = STATUS[rr.status] || STATUS.pending;
  const tier = rr.approval_tier;

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto">
      <div className="flex items-start gap-2 mb-4">
        <button onClick={() => navigate("/purchase/repair-requests")} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-gray-800">{rr.request_number}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`}>{st.label}</span>
            {tier?.name && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">Tier {tier.level} · {tier.name}</span>}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{rr.item_name} ×{fmt(rr.quantity)} — {rr.issue_description}</p>
        </div>
      </div>

      {rr.status === "pending" && tier && !tier.can_user_approve && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 mb-4 text-[11px]">
          <strong>You can't approve this repair.</strong> It needs <strong>{tier.name}</strong> authority (roles: {tier.roles?.join(", ") || "—"}).
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(["rejected", "cancelled", "cannot_repair"].includes(rr.status) ? [...TIMELINE, rr.status] : TIMELINE).map((s, i, arr) => {
            const order = TIMELINE.indexOf(rr.status);
            const sOrder = TIMELINE.indexOf(s);
            const isActive = s === rr.status;
            const done = sOrder !== -1 && order !== -1 && sOrder < order;
            const meta = STATUS[s];
            return (
              <div key={s} className="flex items-center flex-shrink-0">
                <div className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border ${isActive ? meta.cls : done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>{meta.label}</div>
                {i < arr.length - 1 && <div className={`w-6 h-px ${done ? "bg-emerald-300" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap gap-2">
        {rr.status === "pending" && <>
          <Btn c="emerald" busy={busy || !tier?.can_user_approve} onClick={() => run("Approve", () => approveRepair(id), "Approve this repair?")}>Approve</Btn>
          <Btn c="red" busy={busy || !tier?.can_user_approve} onClick={onReject}>Reject</Btn>
          <Btn c="gray" busy={busy} onClick={onCancel}>Cancel</Btn>
        </>}
        {rr.status === "approved" && <>
          <Btn c="indigo" busy={busy} onClick={() => run("Start repair", () => startRepair(id), "Begin the repair work?")}>Start repair</Btn>
          <Btn c="teal" busy={busy} onClick={() => setCloseOpen(true)}>Close repair</Btn>
          <Btn c="red" busy={busy} onClick={onCancel}>Cancel</Btn>
        </>}
        {rr.status === "repairing" && <>
          <Btn c="teal" busy={busy} onClick={() => setCloseOpen(true)}>Close repair</Btn>
          <Btn c="red" busy={busy} onClick={onCancel}>Cancel</Btn>
        </>}
        {["completed", "rejected", "cancelled", "cannot_repair"].includes(rr.status) && (
          <p className="text-[11px] text-gray-500 self-center">This repair is closed. No further actions.</p>
        )}
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Panel label="Reported by">{rr.requester?.name || "—"}<div className="text-[10px] text-gray-400">{fmtDate(rr.reported_date)}</div></Panel>
        <Panel label="Branch">{rr.branch?.name || "School-wide"}</Panel>
        <Panel label="Estimated cost">{rr.estimated_cost ? `${fmt(rr.estimated_cost)} AFN` : "—"}</Panel>
        <Panel label="Wants replacement if unfixable">{rr.create_purchase_request ? "Yes" : "No"}</Panel>
        {rr.approved_at && (
          <Panel label={rr.status === "rejected" ? "Rejected by" : "Approved by"}>
            {rr.approver?.name || "—"}<div className="text-[10px] text-gray-400">{fmtDateTime(rr.approved_at)}</div>
            {rr.rejection_reason && <div className="text-[10px] text-red-600 mt-0.5">{rr.rejection_reason}</div>}
          </Panel>
        )}
        {rr.actual_cost != null && (
          <Panel label="Actual cost">
            <span className="font-mono font-semibold">{fmt(rr.actual_cost)} AFN</span>
            {rr.vendor_invoice_number && <div className="text-[10px] text-gray-400">bill #{rr.vendor_invoice_number}</div>}
          </Panel>
        )}
        {(rr.paid_from_account_id || rr.paid_from_party_id) && (
          <Panel label="Paid via">
            {rr.paid_from_party_id
              ? <>Party advance — {rr.paid_from_party?.full_name || `#${rr.paid_from_party_id}`}</>
              : <>Cash — {rr.paid_from_account?.account_name || `#${rr.paid_from_account_id}`}</>}
          </Panel>
        )}
        {rr.journal_entry_id && (
          <Panel label="Journal entry">
            <span className="font-mono">{rr.journal_entry?.entry_number || `#${rr.journal_entry_id}`}</span>
            <div className="text-[10px] text-gray-400">{fmtDate(rr.journal_entry?.transaction_date)}</div>
          </Panel>
        )}
        {rr.generated_purchase_request && (
          <Panel label="Replacement PR">
            <a href={`/purchase/purchase-requests/show/${rr.generated_purchase_request.id}`}
              onClick={(e) => { e.preventDefault(); navigate(`/purchase/purchase-requests/show/${rr.generated_purchase_request.id}`); }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full hover:bg-indigo-100 text-[10px]">
              <span className="font-mono">{rr.generated_purchase_request.request_number}</span><span>· open</span>
            </a>
          </Panel>
        )}
      </div>

      {rr.resolution_notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Resolution notes</p>
          <p className="text-xs text-gray-700 whitespace-pre-line">{rr.resolution_notes}</p>
        </div>
      )}

      {closeOpen && (
        <CloseModal rr={rr} accounts={accounts} parties={parties} expenseAccts={expenseAccts}
          onClose={() => setCloseOpen(false)}
          onDone={async () => { setCloseOpen(false); await fetchRR(); }} />
      )}
    </div>
  );
}

function CloseModal({ rr, accounts, parties, expenseAccts, onClose, onDone }) {
  const [outcome, setOutcome] = useState("repaired");
  const [cost, setCost] = useState(rr.estimated_cost || "");
  const [billNo, setBillNo] = useState("");
  const [expenseId, setExpenseId] = useState("");
  const [payMode, setPayMode] = useState("account");      // account | party | none
  const [accountId, setAccountId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [notes, setNotes] = useState("");
  const [makeReplacement, setMakeReplacement] = useState(rr.create_purchase_request ?? true);
  const [date, setDate] = useState(today());
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const costNum = Number(cost) || 0;
  const needsPayment = costNum > 0;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (needsPayment && payMode === "account" && !accountId) return setError("Pick the cash/bank account that paid.");
    if (needsPayment && payMode === "party" && !partyId) return setError("Pick the party whose advance covered it.");
    setBusy(true);
    try {
      await closeRepair(rr.id, {
        outcome,
        actual_cost: costNum,
        vendor_invoice_number: billNo.trim() || null,
        expense_chart_account_id: expenseId || null,
        paid_from_account_id: needsPayment && payMode === "account" ? Number(accountId) : null,
        paid_from_party_id: needsPayment && payMode === "party" ? Number(partyId) : null,
        resolution_notes: notes || null,
        create_purchase_request: outcome === "unrepairable" ? makeReplacement : false,
        date,
      });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Repair closed", timer: 1600, showConfirmButton: false });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Could not close the repair.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 bg-teal-50/50">
          <div>
            <h3 className="text-base font-bold text-teal-700">Close repair</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">{rr.item_name} · record the outcome and any cost</p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
          <div className="px-6 py-5 space-y-4 overflow-y-auto">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">{error}</div>}

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Outcome *</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setOutcome("repaired")}
                  className={`text-left border rounded-lg p-2.5 ${outcome === "repaired" ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 hover:border-teal-300"}`}>
                  <p className={`text-xs font-bold ${outcome === "repaired" ? "text-white" : "text-gray-800"}`}>Repaired ✓</p>
                  <p className={`text-[10px] mt-0.5 ${outcome === "repaired" ? "text-teal-100" : "text-gray-500"}`}>Fixed and back in service</p>
                </button>
                <button type="button" onClick={() => setOutcome("unrepairable")}
                  className={`text-left border rounded-lg p-2.5 ${outcome === "unrepairable" ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-200 hover:border-red-300"}`}>
                  <p className={`text-xs font-bold ${outcome === "unrepairable" ? "text-white" : "text-gray-800"}`}>Unrepairable ✗</p>
                  <p className={`text-[10px] mt-0.5 ${outcome === "unrepairable" ? "text-red-100" : "text-gray-500"}`}>Beyond fixing — write off</p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Cost (AFN)</label>
                <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)}
                  placeholder="0 = in-house"
                  className="w-full px-3 py-2.5 text-sm text-right font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Bill / invoice #</label>
                <input value={billNo} onChange={(e) => setBillNo(e.target.value)} maxLength={100}
                  placeholder="Repair shop receipt number"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
            </div>

            {needsPayment && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Expense category</label>
                  <select value={expenseId} onChange={(e) => setExpenseId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500">
                    <option value="">Maintenance (5320) — default</option>
                    {expenseAccts.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Paid via *</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button type="button" onClick={() => setPayMode("account")}
                      className={`border rounded-lg p-2 text-xs font-semibold ${payMode === "account" ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-700"}`}>Cash / bank</button>
                    <button type="button" onClick={() => setPayMode("party")}
                      className={`border rounded-lg p-2 text-xs font-semibold ${payMode === "party" ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-700"}`}>Party advance</button>
                  </div>
                  {payMode === "account" ? (
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500">
                      <option value="">— pick account —</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance)} AFN)</option>)}
                    </select>
                  ) : (
                    <select value={partyId} onChange={(e) => setPartyId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500">
                      <option value="">— pick party —</option>
                      {parties.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.party_code})</option>)}
                    </select>
                  )}
                </div>
              </>
            )}

            {outcome === "unrepairable" && (
              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-100 cursor-pointer">
                <input type="checkbox" checked={makeReplacement} onChange={(e) => setMakeReplacement(e.target.checked)} className="mt-0.5 rounded text-teal-600 focus:ring-teal-500" />
                <span className="text-xs text-gray-700"><strong>Raise a replacement purchase request</strong><span className="block text-[11px] text-gray-500">A draft PR for a new unit is created and linked back to this repair.</span></span>
              </label>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Resolution notes</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="What was done / why it couldn't be fixed…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={busy}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold disabled:opacity-50">
              {busy ? "Closing…" : needsPayment ? `Close & post ${fmt(costNum)} AFN` : "Close repair"}
            </button>
          </div>
        </form>
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

function Btn({ onClick, c, busy, children }) {
  const map = {
    teal: "bg-teal-600 hover:bg-teal-700", emerald: "bg-emerald-600 hover:bg-emerald-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700", red: "bg-red-600 hover:bg-red-700",
    gray: "bg-gray-500 hover:bg-gray-600",
  };
  return (
    <button onClick={onClick} disabled={busy}
      className={`px-3 py-1.5 text-white text-xs font-semibold rounded-lg disabled:opacity-50 ${map[c] || map.teal}`}>
      {children}
    </button>
  );
}
