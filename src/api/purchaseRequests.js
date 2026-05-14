import { get, post, put, del } from './axios';

const BASE = '/purchase/purchase-requests';

// CRUD
export const listPurchaseRequests   = (params = {}) => get(BASE, { params });
export const getPurchaseRequest     = (id)          => get(`${BASE}/${id}`);
export const createPurchaseRequest  = (data)        => post(BASE, data);
export const updatePurchaseRequest  = (id, data)    => put(`${BASE}/${id}`, data);
export const deletePurchaseRequest  = (id)          => del(`${BASE}/${id}`);

// Workflow transitions — every one is a server-side guarded state change.
export const submitPurchaseRequest   = (id)               => post(`${BASE}/${id}/submit`);
export const approvePurchaseRequest  = (id)               => post(`${BASE}/${id}/approve`);
export const rejectPurchaseRequest   = (id, reason)       => post(`${BASE}/${id}/reject`, { reason });
export const procurePurchaseRequest  = (id, vendorId)     => post(`${BASE}/${id}/procure`, { vendor_id: vendorId ?? null });
// Completion has two payment modes — pass EXACTLY ONE:
//   paidFromPartyId    — primary flow: settle a staff Party's advance (the
//                        usual case — school had previously given them cash
//                        and the PR records what they spent it on).
//   paidFromAccountId  — fallback: pay the vendor directly from a cash/bank
//                        account (no party advance involved).
// Other fields:
//   actualAmount       — what we actually paid (defaults to winning quote /
//                        estimated_total on the frontend; override allowed
//                        for receipt variance).
//   executedByPartyId  — Staff Party who physically ran the errand. Often
//                        the same as paidFromPartyId — server defaults to it
//                        when this is left null.
//   invoiceId          — optional vendor-invoice link.
export const completePurchaseRequest = (id, {
  paidFromPartyId = null,
  paidFromAccountId = null,
  invoiceId = null,
  completedAt = null,
  actualAmount = null,
  executedByPartyId = null,
} = {}) =>
  post(`${BASE}/${id}/complete`, {
    paid_from_party_id: paidFromPartyId,
    paid_from_account_id: paidFromAccountId,
    invoice_id: invoiceId,
    completed_at: completedAt,
    actual_amount: actualAmount,
    executed_by_party_id: executedByPartyId,
  });
export const cancelPurchaseRequest   = (id, reason)       => post(`${BASE}/${id}/cancel`, { reason: reason ?? null });

// Phase C — quotations (sub-resource of a PR)
export const listQuotations    = (prId)             => get(`${BASE}/${prId}/quotations`);
export const addQuotation      = (prId, data)       => post(`${BASE}/${prId}/quotations`, data);
export const deleteQuotation   = (prId, quoteId)    => del(`${BASE}/${prId}/quotations/${quoteId}`);
export const setWinningQuote   = (prId, quoteId)    => post(`${BASE}/${prId}/quotations/${quoteId}/winner`);
