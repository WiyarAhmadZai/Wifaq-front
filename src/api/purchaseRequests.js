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
// Phase B: completion requires the cash/bank account the goods were paid from
// so the server can post a balanced journal entry. `invoiceId` stays optional.
export const completePurchaseRequest = (id, { paidFromAccountId, invoiceId = null, completedAt = null } = {}) =>
  post(`${BASE}/${id}/complete`, {
    paid_from_account_id: paidFromAccountId,
    invoice_id: invoiceId,
    completed_at: completedAt,
  });
export const cancelPurchaseRequest   = (id, reason)       => post(`${BASE}/${id}/cancel`, { reason: reason ?? null });

// Phase C — quotations (sub-resource of a PR)
export const listQuotations    = (prId)             => get(`${BASE}/${prId}/quotations`);
export const addQuotation      = (prId, data)       => post(`${BASE}/${prId}/quotations`, data);
export const deleteQuotation   = (prId, quoteId)    => del(`${BASE}/${prId}/quotations/${quoteId}`);
export const setWinningQuote   = (prId, quoteId)    => post(`${BASE}/${prId}/quotations/${quoteId}/winner`);
