import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getPurchaseRequest,
  submitPurchaseRequest,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  procurePurchaseRequest,
  completePurchaseRequest,
  cancelPurchaseRequest,
  addQuotation,
  deleteQuotation,
  setWinningQuote,
} from "../../api/purchaseRequests";
import { getAccounts, getParties } from "../../api/financial";
import { get } from "../../api/axios";
import Swal from "sweetalert2";

const STATUS = {
  draft:       { label: "Draft",       cls: "bg-gray-100 text-gray-700 border-gray-300" },
  pending:     { label: "Pending",     cls: "bg-amber-100 text-amber-700 border-amber-300" },
  approved:    { label: "Approved",    cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  rejected:    { label: "Rejected",    cls: "bg-red-100 text-red-700 border-red-300" },
  procurement: { label: "Procuring",   cls: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  completed:   { label: "Completed",   cls: "bg-teal-100 text-teal-700 border-teal-300" },
  cancelled:   { label: "Cancelled",   cls: "bg-gray-200 text-gray-600 border-gray-300" },
};

// Order of the timeline tiles. Rejected/cancelled break the chain — handled
// specially in the render.
const TIMELINE = ["draft", "pending", "approved", "procurement", "completed"];

const fmt = (n) => Number(n || 0).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);

export default function PurchaseRequestShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [staffParties, setStaffParties] = useState([]);

  useEffect(() => { fetchPR(); /* eslint-disable-next-line */ }, [id]);

  // Cash/bank accounts needed for the Complete dialog — load once.
  useEffect(() => {
    getAccounts({ per_page: 100 })
      .then((r) => setAccounts(r.data?.data?.data || r.data?.data || []))
      .catch(() => setAccounts([]));

    // Vendors for the quotation picker. The Add-Vendor page in HR posts to
    // /hr/vendors, so that's the index endpoint we list from.
    get("/hr/vendors", { params: { per_page: 200 } })
      .then((r) => {
        const rows = r.data?.data?.data || r.data?.data || r.data || [];
        setVendors(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setVendors([]));

    // Staff parties for the "who did the purchase" picker in the Complete
    // modal. We filter to staff-type only so the user can't accidentally
    // assign a vendor party as the runner.
    getParties({ party_type: "staff", per_page: 200 })
      .then((r) => {
        const rows = r.data?.data?.data || r.data?.data || [];
        setStaffParties(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setStaffParties([]));
  }, []);

  const fetchPR = async () => {
    setLoading(true);
    try {
      const r = await getPurchaseRequest(id);
      setPr(r.data?.data || null);
    } catch (e) {
      Swal.fire("Error", "Could not load this request.", "error");
      navigate("/purchase/purchase-requests");
    } finally {
      setLoading(false);
    }
  };

  // Wrap each workflow action with the same boilerplate: optional confirm,
  // server call, refresh, toast / error.
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
      await fetchPR();
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: `${label} done`, timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || `${label} failed.`, "error");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit  = () => runAction("Submit",   () => submitPurchaseRequest(id),  { confirm: true, confirmText: "Send for approval — you can no longer edit after this." });
  const onApprove = () => runAction("Approve",  () => approvePurchaseRequest(id), { confirm: true, confirmText: "Approve this request?" });
  const onProcure = () => runAction("Procure",  () => procurePurchaseRequest(id, pr?.vendor_id), { confirm: true, confirmText: "Move to procurement?" });

  const onReject = async () => {
    const r = await Swal.fire({
      title: "Reject this request?",
      input: "textarea",
      inputLabel: "Reason (required)",
      inputPlaceholder: "Why is this being rejected?",
      inputValidator: (v) => !v && "A reason is required.",
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#ef4444",
    });
    if (!r.isConfirmed) return;
    await runAction("Reject", () => rejectPurchaseRequest(id, r.value));
  };

  const onCancel = async () => {
    const r = await Swal.fire({
      title: "Cancel this request?",
      input: "textarea",
      inputLabel: "Reason (optional)",
      showCancelButton: true,
      confirmButtonText: "Cancel request",
      confirmButtonColor: "#ef4444",
    });
    if (!r.isConfirmed) return;
    await runAction("Cancel", () => cancelPurchaseRequest(id, r.value || null));
  };

  if (loading) return <p className="px-4 py-8 text-center text-xs text-gray-400">Loading…</p>;
  if (!pr) return null;

  const st = STATUS[pr.status] || STATUS.draft;
  const tier = pr.approval_tier || null;

  return (
    <div className="px-4 py-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-2 mb-4">
        <button onClick={() => navigate("/purchase/purchase-requests")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-gray-800">{pr.request_number}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`}>{st.label}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-50 text-gray-600 border-gray-200 capitalize">{pr.priority} priority</span>
            {tier?.name && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                Tier {tier.level} · {tier.name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{pr.purpose}</p>
        </div>
      </div>

      {/* Approval gate banner — only visible to non-authorised users on pending PRs */}
      {pr.status === "pending" && tier && !tier.can_user_approve && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 mb-4 text-[11px]">
          <strong>You don't have authority to approve this request.</strong>
          {" "}It requires <strong>{tier.name}</strong> approval (roles: {tier.roles?.join(", ") || "—"}).
        </div>
      )}

      {/* Timeline */}
      <Timeline pr={pr} />

      {/* Action bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap gap-2">
        {pr.status === "draft" && (
          <>
            <ActionBtn onClick={onSubmit} color="teal" busy={busy}>Submit for approval</ActionBtn>
            <ActionBtn onClick={onCancel} color="red" busy={busy}>Cancel</ActionBtn>
          </>
        )}
        {pr.status === "pending" && (
          <>
            <ActionBtn onClick={onApprove} color="emerald" busy={busy || !tier?.can_user_approve} disabledHint={!tier?.can_user_approve ? "Insufficient role" : null}>Approve</ActionBtn>
            <ActionBtn onClick={onReject}  color="red"     busy={busy || !tier?.can_user_approve} disabledHint={!tier?.can_user_approve ? "Insufficient role" : null}>Reject</ActionBtn>
            <ActionBtn onClick={onCancel}  color="gray"    busy={busy}>Cancel</ActionBtn>
          </>
        )}
        {pr.status === "approved" && (
          <>
            <ActionBtn onClick={onProcure} color="indigo" busy={busy}>Move to procurement</ActionBtn>
            <ActionBtn onClick={onCancel}  color="red"    busy={busy}>Cancel</ActionBtn>
          </>
        )}
        {pr.status === "procurement" && (
          <>
            <ActionBtn onClick={() => setCompleteOpen(true)} color="teal" busy={busy}>Mark goods received — complete</ActionBtn>
            <ActionBtn onClick={onCancel} color="red" busy={busy}>Cancel</ActionBtn>
          </>
        )}
        {["completed", "rejected", "cancelled"].includes(pr.status) && (
          <p className="text-[11px] text-gray-500 self-center">This request is in a terminal state. No further actions.</p>
        )}
      </div>

      {/* Audit panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Panel label="Requester">
          {pr.requester?.name || "—"}
          <div className="text-[10px] text-gray-400">{pr.request_date}</div>
        </Panel>
        <Panel label="Branch">{pr.branch?.name || "School-wide"}</Panel>
        {pr.approved_at && (
          <Panel label={pr.status === "rejected" ? "Rejected by" : "Approved by"}>
            {pr.approver?.name || "—"}
            <div className="text-[10px] text-gray-400">{new Date(pr.approved_at).toLocaleString()}</div>
            {pr.rejection_reason && <div className="text-[10px] text-red-600 mt-0.5">{pr.rejection_reason}</div>}
          </Panel>
        )}
        {pr.procured_at && (
          <Panel label="Procured by">
            {pr.procurer?.name || "—"}
            <div className="text-[10px] text-gray-400">{new Date(pr.procured_at).toLocaleString()}</div>
          </Panel>
        )}
        {pr.executed_by_party_id && (
          <Panel label="Purchased by (party)">
            {pr.executed_by_party?.full_name || `Party #${pr.executed_by_party_id}`}
            {/* Click-through to that staff party's ledger — handy if the
                school is also tracking their advances. */}
            {pr.executed_by_party?.id && (
              <div className="mt-1 text-[10px]">
                <a href={`/finance/parties/${pr.executed_by_party.id}/ledger`}
                  onClick={(e) => { e.preventDefault(); navigate(`/finance/parties/${pr.executed_by_party.id}/ledger`); }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full hover:bg-indigo-100">
                  <span className="font-mono">{pr.executed_by_party.party_code}</span>
                  <span>·</span>
                  <span>open ledger</span>
                </a>
              </div>
            )}
          </Panel>
        )}
        {pr.vendor_id && (
          <Panel label="Vendor">
            {pr.vendor?.name || `#${pr.vendor_id}`}
            {/* Linked accounts-payable Party for this vendor. Created on the
                fly when the winning quote is picked, so this badge appears
                automatically — gives the user a one-click jump to the AP
                ledger for this vendor. */}
            {pr.vendor?.party ? (
              <div className="mt-1 text-[10px]">
                <a href={`/finance/parties/${pr.vendor.party.id}/ledger`}
                  onClick={(e) => { e.preventDefault(); navigate(`/finance/parties/${pr.vendor.party.id}/ledger`); }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full hover:bg-indigo-100">
                  <span className="font-mono">{pr.vendor.party.party_code}</span>
                  <span>·</span>
                  <span>AP ledger</span>
                </a>
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 mt-1">No Party opened yet</div>
            )}
          </Panel>
        )}
        {pr.paid_from_party_id && (
          <Panel label="Settled against (party advance)">
            {pr.paid_from_party?.full_name || `Party #${pr.paid_from_party_id}`}
            <div className="mt-1 text-[10px]">
              <a href={`/finance/parties/${pr.paid_from_party_id}/ledger`}
                onClick={(e) => { e.preventDefault(); navigate(`/finance/parties/${pr.paid_from_party_id}/ledger`); }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full hover:bg-indigo-100">
                <span className="font-mono">{pr.paid_from_party?.party_code}</span>
                <span>·</span>
                <span>open ledger</span>
              </a>
            </div>
          </Panel>
        )}
        {pr.paid_from_account_id && (
          <Panel label="Paid from (account)">
            {pr.paid_from_account?.account_name || `Account #${pr.paid_from_account_id}`}
          </Panel>
        )}
        {pr.journal_entry_id && (
          <Panel label="Journal entry">
            <span className="font-mono">{pr.journal_entry?.entry_number || `#${pr.journal_entry_id}`}</span>
            <div className="text-[10px] text-gray-400">{pr.journal_entry?.transaction_date}</div>
          </Panel>
        )}
        {pr.vendor_invoice_number && (
          <Panel label="Bill / invoice number">
            <span className="font-mono">{pr.vendor_invoice_number}</span>
          </Panel>
        )}
        {pr.actual_amount != null && (
          <Panel label="Actual paid">
            <span className="font-mono font-semibold">{fmt(pr.actual_amount)} AFN</span>
            {Number(pr.estimated_total) > 0 && Math.abs(Number(pr.actual_amount) - Number(pr.estimated_total)) > 0.5 && (
              <div className="text-[10px] text-gray-400">
                planned {fmt(pr.estimated_total)} AFN
              </div>
            )}
          </Panel>
        )}
        {pr.invoice_id && (
          <Panel label="Linked invoice">{pr.invoice?.invoice_number || `#${pr.invoice_id}`}</Panel>
        )}
      </div>

      {/* Actual purchased items — the real receipt recorded at completion.
          Distinct from the planned line items below; this is what was
          physically bought (may include extras like A4, glass, rent). */}
      {Array.isArray(pr.actual_items) && pr.actual_items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-700">Actual purchased items</p>
              <p className="text-[10px] text-gray-400">What was physically bought — recorded at completion{pr.vendor_invoice_number ? ` · bill #${pr.vendor_invoice_number}` : ""}</p>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_4rem_7rem_7rem] gap-2 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase bg-white border-b border-gray-50">
            <span>Item</span><span className="text-right">Qty</span><span className="text-right">Unit price</span><span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-gray-50">
            {pr.actual_items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_4rem_7rem_7rem] gap-2 px-4 py-2 text-xs">
                <span className="text-gray-800">{it.name}</span>
                <span className="text-right text-gray-600 font-mono">{fmt(it.quantity)}</span>
                <span className="text-right text-gray-600 font-mono">{fmt(it.unit_price)}</span>
                <span className="text-right text-gray-800 font-mono font-semibold">{fmt(it.line_total ?? (Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end px-4 py-2.5 bg-teal-50 border-t border-teal-100 text-sm">
            <span className="text-teal-700 font-semibold mr-3">Total paid</span>
            <span className="font-mono font-bold text-teal-800">{fmt(pr.actual_amount)} AFN</span>
          </div>
        </div>
      )}

      {/* Quotations (Phase C).
          Always shown while the PR can still take quotes (draft/pending) so
          the panel never "disappears" — you can collect quotes on any PR,
          not just ones over the mandatory threshold. Once approved/onward
          it stays visible only if quotes were actually recorded (history). */}
      {(["draft", "pending"].includes(pr.status) ||
        (pr.quotations && pr.quotations.length > 0)) && (
        <QuotationsPanel
          pr={pr}
          vendors={vendors}
          busy={busy}
          onAdd={async (payload) => {
            setBusy(true);
            try {
              await addQuotation(id, payload);
              await fetchPR();
            } catch (err) {
              Swal.fire("Failed", err.response?.data?.message || "Could not add quote.", "error");
            } finally {
              setBusy(false);
            }
          }}
          onDelete={async (quoteId) => {
            const r = await Swal.fire({
              title: "Remove this quote?",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#ef4444",
              confirmButtonText: "Remove",
            });
            if (!r.isConfirmed) return;
            setBusy(true);
            try {
              await deleteQuotation(id, quoteId);
              await fetchPR();
            } catch (err) {
              Swal.fire("Failed", err.response?.data?.message || "Could not remove quote.", "error");
            } finally {
              setBusy(false);
            }
          }}
          onPickWinner={async (quoteId) => {
            setBusy(true);
            try {
              await setWinningQuote(id, quoteId);
              await fetchPR();
            } catch (err) {
              Swal.fire("Failed", err.response?.data?.message || "Could not set winner.", "error");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Items</h3>
          <p className="text-[11px] text-gray-500">{pr.items?.length || 0} item(s)</p>
        </div>
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
            <tr>
              <th className="text-left px-3 py-1.5">Item</th>
              <th className="text-left px-3 py-1.5">Description</th>
              <th className="text-right px-3 py-1.5">Qty</th>
              <th className="text-left px-3 py-1.5">Unit</th>
              <th className="text-right px-3 py-1.5">Unit price</th>
              <th className="text-left px-3 py-1.5">Category</th>
              <th className="text-left px-3 py-1.5" title="Completing the PR increments this stock row's quantity by the item's qty.">Stock</th>
              <th className="text-right px-3 py-1.5">Total</th>
              <th className="text-center px-3 py-1.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(pr.items || []).map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-1.5 text-gray-800 font-medium">{it.item_name}</td>
                <td className="px-3 py-1.5 text-gray-500">{it.description || "—"}</td>
                <td className="px-3 py-1.5 text-right text-gray-700">{fmt(it.quantity)}</td>
                <td className="px-3 py-1.5 text-gray-500">{it.unit}</td>
                <td className="px-3 py-1.5 text-right text-gray-700">{fmt(it.estimated_unit_price)}</td>
                <td className="px-3 py-1.5 text-[10px] text-gray-500">
                  {it.chart_account ? `${it.chart_account.code} · ${it.chart_account.name}` : "—"}
                </td>
                <td className="px-3 py-1.5 text-[10px]">
                  {it.stock ? (
                    <span className={pr.status === "completed" ? "text-emerald-700" : "text-gray-600"}>
                      {it.stock.item_name}
                      <span className="text-gray-400 ml-1">({fmt(it.stock.quantity)} {it.stock.unit} on hand)</span>
                    </span>
                  ) : <span className="text-gray-300">not stocked</span>}
                </td>
                <td className="px-3 py-1.5 text-right font-semibold text-gray-800">{fmt(it.total_price)}</td>
                <td className="px-3 py-1.5 text-center capitalize text-[10px] text-gray-600">{it.status}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={7} className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-gray-500">Estimated total</td>
              <td className="px-3 py-2 text-right text-sm font-bold text-teal-700">{fmt(pr.estimated_total)} <span className="text-[10px] font-normal">AFN</span></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {pr.notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Notes</p>
          <p className="text-xs text-gray-700 whitespace-pre-line">{pr.notes}</p>
        </div>
      )}

      {/* Complete dialog */}
      {completeOpen && (
        <CompleteModal
          pr={pr}
          accounts={accounts}
          staffParties={staffParties}
          busy={busy}
          onClose={() => setCompleteOpen(false)}
          onConfirm={async ({ paidFromPartyId, paidFromAccountId, completedAt, actualAmount, executedByPartyId, vendorInvoiceNumber, actualItems }) => {
            setCompleteOpen(false);
            await runAction("Complete", () => completePurchaseRequest(id, {
              paidFromPartyId,
              paidFromAccountId,
              completedAt,
              actualAmount,
              executedByPartyId,
              vendorInvoiceNumber,
              actualItems,
            }));
          }}
        />
      )}
    </div>
  );
}

function QuotationsPanel({ pr, vendors, busy, onAdd, onDelete, onPickWinner }) {
  const status = pr.quotation_status || {};
  const editable = ["draft", "pending"].includes(pr.status);
  const quotes = pr.quotations || [];
  const cheapest = quotes.length
    ? Math.min(...quotes.map((q) => Number(q.quotation_amount) || Infinity))
    : null;

  // Vendors that haven't quoted yet — used to limit the picker dropdown.
  const usedVendorIds = new Set(quotes.map((q) => q.vendor_id));
  const availableVendors = vendors.filter((v) => !usedVendorIds.has(v.id));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Quotations</h3>
          <p className="text-[10px] text-gray-500">
            {status.required
              ? `Required — total exceeds ${fmt(status.threshold_amount)} AFN. Need at least ${status.min_required} quotes${status.require_winner_picked ? " and a picked winner" : ""}.`
              : "Optional — small purchases don't require multiple quotes."}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
          !status.required
            ? "bg-gray-100 text-gray-600 border-gray-200"
            : status.has_enough
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          {quotes.length} quote{quotes.length === 1 ? "" : "s"}{status.required ? ` / ${status.min_required}` : ""}
        </span>
      </div>

      {status.blocker && pr.status === "pending" && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-800">
          ⚠ {status.blocker}
        </div>
      )}

      {quotes.length === 0 ? (
        <p className="text-center py-6 text-xs text-gray-400 italic">No quotes collected yet.</p>
      ) : (
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
            <tr>
              <th className="text-left px-3 py-1.5">Vendor</th>
              <th className="text-right px-3 py-1.5">Amount (AFN)</th>
              <th className="text-right px-3 py-1.5">Lead time</th>
              <th className="text-left px-3 py-1.5">Submitted</th>
              <th className="text-left px-3 py-1.5">Notes</th>
              <th className="text-center px-3 py-1.5">Status</th>
              {editable && <th className="text-center px-3 py-1.5">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quotes.map((q) => {
              const isCheapest = Number(q.quotation_amount) === cheapest;
              return (
                <tr key={q.id} className={q.is_winner ? "bg-emerald-50/40" : "hover:bg-gray-50"}>
                  <td className="px-3 py-1.5 text-gray-800 font-medium">
                    {q.vendor?.name || `Vendor #${q.vendor_id}`}
                    {q.vendor?.category && (
                      <span className="text-[10px] text-gray-400 ml-1">· {q.vendor.category}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold text-gray-800">
                    {fmt(q.quotation_amount)}
                    {isCheapest && quotes.length > 1 && (
                      <span className="ml-1 text-[9px] text-emerald-700 font-bold uppercase">Cheapest</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-600">
                    {q.lead_time_days != null ? `${q.lead_time_days} day(s)` : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">{q.submission_date}</td>
                  <td className="px-3 py-1.5 text-gray-500 max-w-[200px] truncate">{q.notes || "—"}</td>
                  <td className="px-3 py-1.5 text-center">
                    {q.is_winner ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-100 text-emerald-700 border-emerald-300">
                        ✓ Winner
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </td>
                  {editable && (
                    <td className="px-3 py-1.5 text-center whitespace-nowrap">
                      {!q.is_winner && (
                        <button onClick={() => onPickWinner(q.id)} disabled={busy}
                          className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 mr-2 disabled:opacity-50">
                          Pick winner
                        </button>
                      )}
                      <button onClick={() => onDelete(q.id)} disabled={busy}
                        className="text-[10px] font-semibold text-red-600 hover:text-red-800 disabled:opacity-50">
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editable && (
        <AddQuoteForm vendors={availableVendors} busy={busy} onAdd={onAdd} />
      )}
    </div>
  );
}

function AddQuoteForm({ vendors, busy, onAdd }) {
  const [vendorId, setVendorId] = useState("");
  const [amount, setAmount]     = useState("");
  const [date, setDate]         = useState(today());
  const [leadTime, setLeadTime] = useState("");
  const [docUrl, setDocUrl]     = useState("");
  const [notes, setNotes]       = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!vendorId) return;
    await onAdd({
      vendor_id: Number(vendorId),
      quotation_amount: Number(amount),
      submission_date: date,
      lead_time_days: leadTime === "" ? null : Number(leadTime),
      document_url: docUrl || null,
      notes: notes || null,
    });
    // Reset for the next quote.
    setVendorId(""); setAmount(""); setLeadTime(""); setDocUrl(""); setNotes("");
  };

  return (
    <form onSubmit={submit} className="border-t border-gray-100 p-3 bg-gray-50/40">
      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Add a quote</p>
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
        <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required
          className="sm:col-span-2 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-500">
          <option value="">— Vendor *</option>
          {vendors.length === 0 ? (
            <option disabled>No more vendors to quote</option>
          ) : vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name}{v.category ? ` (${v.category})` : ""}</option>
          ))}
        </select>
        <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount *" required
          className="px-2 py-1.5 text-xs text-right border border-gray-200 rounded focus:outline-none focus:border-teal-500" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
          className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-500" />
        <input type="number" min="0" step="1" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="Lead days"
          className="px-2 py-1.5 text-xs text-right border border-gray-200 rounded focus:outline-none focus:border-teal-500" />
        <button type="submit" disabled={busy || !vendorId}
          className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700 disabled:opacity-50">
          Add quote
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        <input type="url" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="Document URL (optional scan / PDF)"
          className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-500" />
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)"
          className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-500" />
      </div>
    </form>
  );
}

function CompleteModal({ pr, accounts, staffParties, busy, onClose, onConfirm }) {
  // Mode: "party" is the primary flow (settle staff advance). "account" is
  // the fallback (direct cash payment, no party involved).
  const [mode, setMode] = useState("party");
  const [paidFromPartyId, setPaidFromPartyId] = useState("");
  const [paidFromAccountId, setPaidFromAccountId] = useState("");
  const [executedByPartyId, setExecutedByPartyId] = useState("");
  const [completedAt, setCompletedAt] = useState(today());
  const [billNumber, setBillNumber] = useState("");
  const [error, setError] = useState(null);

  // Winning quote = the agreed price with the vendor. The pre-filled receipt
  // should default to THAT total, not the planned estimate.
  const winningQuote = (pr.quotations || []).find((q) => q.is_winner);
  const winningAmount = winningQuote ? Number(winningQuote.quotation_amount) || 0 : 0;

  // Actual purchased items — the REAL receipt. Pre-filled from the planned PR
  // lines (so the breakdown/quantities are kept) but unit prices are scaled
  // so the line totals add up to the WINNING QUOTE when one exists. The
  // runner then just tweaks and adds extras (A4, glass, rent…). The amount
  // posted is the sum of these — never typed by hand.
  const [items, setItems] = useState(() => {
    const planned = (pr.items || []).map((it) => ({
      name: it.item_name,
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.estimated_unit_price) || 0,
    }));
    if (!planned.length) {
      // No line items — seed a single row at the quote amount if we have one.
      return [{ name: winningQuote ? `Per quote — ${winningQuote.vendor?.name || "vendor"}` : "", quantity: 1, unit_price: winningAmount || "" }];
    }
    const plannedTotal = planned.reduce((s, it) => s + it.quantity * it.unit_price, 0);
    if (winningAmount > 0 && plannedTotal > 0) {
      const factor = winningAmount / plannedTotal;
      return planned.map((it) => ({
        ...it,
        unit_price: Math.round(it.unit_price * factor * 100) / 100,
      }));
    }
    return planned;
  });

  const updateItem = (i, patch) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem    = () => setItems((arr) => [...arr, { name: "", quantity: 1, unit_price: "" }]);
  const removeItem = (i) =>
    setItems((arr) => (arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i)));

  const amountNum = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );
  const variance = amountNum - (Number(pr.estimated_total) || 0);

  // For party-mode warning: check whether the chosen party has enough
  // advance balance to cover this purchase. Positive balance = party owes
  // school (i.e. has an advance to spend).
  const selectedParty = staffParties.find((p) => String(p.id) === String(paidFromPartyId));
  const partyBalance = Number(selectedParty?.balance || 0);
  const shortBalance = mode === "party" && selectedParty && partyBalance < amountNum;

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    if (mode === "party" && !paidFromPartyId) {
      setError("Pick the staff party whose advance covers this purchase.");
      return;
    }
    if (mode === "account" && !paidFromAccountId) {
      setError("Pick the cash / bank account that paid for these goods.");
      return;
    }
    if (amountNum <= 0) {
      setError("Add at least one item with a price — the receipt total can't be zero.");
      return;
    }
    const cleanItems = items
      .filter((it) => String(it.name).trim())
      .map((it) => ({
        name: String(it.name).trim(),
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
      }));
    onConfirm({
      paidFromPartyId: mode === "party" ? Number(paidFromPartyId) : null,
      paidFromAccountId: mode === "account" ? Number(paidFromAccountId) : null,
      // If the user didn't pick a separate runner, the paying party is the
      // runner by default. (Server applies the same default — belt-and-suspenders.)
      executedByPartyId: executedByPartyId
        ? Number(executedByPartyId)
        : (mode === "party" && paidFromPartyId ? Number(paidFromPartyId) : null),
      actualAmount: amountNum,
      completedAt,
      vendorInvoiceNumber: billNumber.trim() || null,
      actualItems: cleanItems.length ? cleanItems : null,
    });
  };

  const labelCls = "block text-[11px] font-semibold text-gray-600 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Sticky header */}
        <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 bg-teal-50/50">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-100 text-teal-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-teal-700">Complete — goods received</h3>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
              Record the real receipt: what was actually bought, the bill number, and who paid.
              {pr.items?.some((it) => it.stock_id) && <> Linked stock auto-increments.</>}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Context strip */}
        <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px]">
          <span className="text-gray-500">{pr.request_number} · planned <span className="font-mono">{fmt(pr.estimated_total)} AFN</span></span>
          <span className="text-gray-500">
            Receipt total{" "}
            <span className={`font-bold font-mono ${Math.abs(variance) > 0.5 ? (variance > 0 ? "text-red-600" : "text-emerald-600") : "text-gray-800"}`}>
              {fmt(amountNum)} AFN
            </span>
            {Math.abs(variance) > 0.5 && (
              <span className={variance > 0 ? "text-red-600" : "text-emerald-600"}>
                {" "}({variance > 0 ? "+" : ""}{fmt(variance)} vs plan)
              </span>
            )}
          </span>
        </div>

        <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
          <div className="px-6 py-5 space-y-5 overflow-y-auto">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            {/* Bill number + completion date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Bill / invoice number</label>
                <input type="text" value={billNumber} onChange={(e) => setBillNumber(e.target.value)}
                  maxLength={100} placeholder="Number on the vendor's receipt"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
              <div>
                <label className={labelCls}>Completion date</label>
                <input type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
            </div>

            {/* Purchased items — pre-filled from the plan, editable */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <div>
                  <p className="text-[11px] font-semibold text-gray-700">Purchased items</p>
                  <p className="text-[10px] text-gray-400">
                    {winningQuote
                      ? <>Pre-filled to the winning quote ({fmt(winningAmount)} AFN — {winningQuote.vendor?.name || "vendor"}) — adjust and add extras (A4, glass, rent…)</>
                      : <>Pre-filled from the request — adjust prices and add extras (A4, glass, rent…)</>}
                  </p>
                </div>
                <button type="button" onClick={addItem}
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-semibold text-teal-600 hover:bg-teal-50 hover:border-teal-200 transition flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add item
                </button>
              </div>
              <div className="grid grid-cols-[1fr_4rem_6rem_5.5rem_1.5rem] gap-2 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-white border-b border-gray-50">
                <span>Item</span><span className="text-right">Qty</span><span className="text-right">Unit price</span><span className="text-right">Total</span><span></span>
              </div>
              <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_4rem_6rem_5.5rem_1.5rem] gap-2 px-4 py-2 items-center">
                    <input type="text" value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })}
                      placeholder="e.g. A4 paper / Rent"
                      className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
                    <input type="number" min="0" step="0.01" value={it.quantity} onChange={(e) => updateItem(i, { quantity: e.target.value })}
                      className="px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
                    <input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: e.target.value })}
                      className="px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
                    <span className="text-right text-sm font-mono text-gray-700">
                      {fmt((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}
                    </span>
                    <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-teal-50 border-t border-teal-100">
                <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">Total paid (posts to books)</span>
                <span className="text-lg font-bold font-mono text-teal-800">{fmt(amountNum)} <span className="text-xs font-normal">AFN</span></span>
              </div>
            </div>

            {/* Settle against — party (primary) vs account (fallback) */}
            <div>
              <label className={labelCls}>Settle against *</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMode("party")}
                  className={`text-left border rounded-lg p-3 transition-colors ${
                    mode === "party" ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-teal-300"
                  }`}>
                  <p className={`text-sm font-bold ${mode === "party" ? "text-white" : "text-gray-800"}`}>Staff Party advance</p>
                  <p className={`text-[10px] mt-0.5 ${mode === "party" ? "text-teal-100" : "text-gray-500"}`}>Primary — clears their advance balance.</p>
                </button>
                <button type="button" onClick={() => setMode("account")}
                  className={`text-left border rounded-lg p-3 transition-colors ${
                    mode === "account" ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-teal-300"
                  }`}>
                  <p className={`text-sm font-bold ${mode === "account" ? "text-white" : "text-gray-800"}`}>Cash / bank account</p>
                  <p className={`text-[10px] mt-0.5 ${mode === "account" ? "text-teal-100" : "text-gray-500"}`}>Fallback — direct payment to vendor.</p>
                </button>
              </div>
            </div>

            {mode === "party" && (
              <div>
                <label className={labelCls}>Staff party *</label>
                {staffParties.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    No staff parties yet. Create one at Finance → Setup → Parties, then give them an advance first.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {staffParties.map((p) => {
                      const sel = String(paidFromPartyId) === String(p.id);
                      const bal = Number(p.balance || 0);
                      return (
                        <button key={p.id} type="button" onClick={() => setPaidFromPartyId(p.id)}
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between transition-colors ${
                            sel ? "bg-teal-50 ring-1 ring-inset ring-teal-200" : "hover:bg-gray-50"
                          }`}>
                          <div>
                            <p className={`text-sm font-semibold ${sel ? "text-teal-800" : "text-gray-800"}`}>{p.full_name}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{p.party_code}</p>
                          </div>
                          <p className={`text-[11px] font-semibold ${bal > 0 ? "text-emerald-700" : bal < 0 ? "text-amber-700" : "text-gray-400"}`}>
                            {bal > 0 ? `+${fmt(bal)} AFN advance` : bal < 0 ? `${fmt(bal)} AFN (school owes)` : "settled"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
                {shortBalance && (
                  <p className="text-[11px] text-amber-700 mt-1.5">
                    ⚠ Party's advance ({fmt(partyBalance)} AFN) is less than the receipt total — their balance goes negative (school owes them the difference).
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">Posts Dr Expense / Cr Staff Receivables — settles the advance.</p>
              </div>
            )}

            {mode === "account" && (
              <div>
                <label className={labelCls}>Money paid from *</label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    No cash / bank accounts found. Add one under Finance → Setup → Accounts first.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {accounts.map((a) => {
                      const sel = String(paidFromAccountId) === String(a.id);
                      return (
                        <button key={a.id} type="button" onClick={() => setPaidFromAccountId(a.id)}
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between transition-colors ${
                            sel ? "bg-teal-50 ring-1 ring-inset ring-teal-200" : "hover:bg-gray-50"
                          }`}>
                          <div>
                            <p className={`text-sm font-semibold ${sel ? "text-teal-800" : "text-gray-800"}`}>{a.account_name}</p>
                            <p className="text-[11px] text-gray-400 capitalize">{a.account_type}</p>
                          </div>
                          <p className="text-[11px] text-gray-500 font-mono">{fmt(a.current_balance)} AFN</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={labelCls}>Purchased by <span className="font-normal text-gray-400">(optional)</span></label>
              <select value={executedByPartyId} onChange={(e) => setExecutedByPartyId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500">
                <option value="">{mode === "party" && paidFromPartyId ? "— same as paying party —" : "— not specified —"}</option>
                {staffParties.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.party_code})</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Defaults to the paying party. Override only if a different staff member did the legwork.</p>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium transition">
              Cancel
            </button>
            <button type="submit" disabled={busy}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold disabled:opacity-50 transition">
              {busy ? "Posting…" : "Confirm — post journal entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Timeline({ pr }) {
  // Terminal "off-path" states get their own tile at the end of the strip.
  const isOffPath = ["rejected", "cancelled"].includes(pr.status);
  const stages = isOffPath ? [...TIMELINE, pr.status] : TIMELINE;
  const activeIdx = stages.findIndex((s) => s === pr.status);

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

function ActionBtn({ onClick, color, busy, children, disabledHint }) {
  const map = {
    teal:    "bg-teal-600 hover:bg-teal-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    indigo:  "bg-indigo-600 hover:bg-indigo-700",
    red:     "bg-red-600 hover:bg-red-700",
    gray:    "bg-gray-500 hover:bg-gray-600",
  };
  return (
    <button onClick={onClick} disabled={busy} title={busy && disabledHint ? disabledHint : undefined}
      className={`px-3 py-1.5 text-white text-xs font-semibold rounded-lg disabled:opacity-50 ${map[color] || map.teal}`}>
      {children}
    </button>
  );
}
