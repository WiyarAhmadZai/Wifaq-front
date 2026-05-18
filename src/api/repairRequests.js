import { get, post, put, del } from './axios';

const BASE = '/purchase/repair-requests';

export const listRepairRequests   = (params = {}) => get(BASE, { params });
export const getRepairRequest     = (id)          => get(`${BASE}/${id}`);
export const createRepairRequest  = (data)        => post(BASE, data);
export const updateRepairRequest  = (id, data)    => put(`${BASE}/${id}`, data);
export const deleteRepairRequest  = (id)          => del(`${BASE}/${id}`);

// Workflow: pending → approve → start → close (repaired | unrepairable)
export const approveRepair       = (id)            => post(`${BASE}/${id}/approve`);
export const rejectRepair        = (id, reason)    => post(`${BASE}/${id}/reject`, { reason });
export const startRepair         = (id)            => post(`${BASE}/${id}/start`);
// data: { outcome:'repaired'|'unrepairable', actual_cost, vendor_invoice_number,
//   expense_chart_account_id, paid_from_account_id|paid_from_party_id,
//   resolution_notes, create_purchase_request, date }
export const closeRepair         = (id, data)      => post(`${BASE}/${id}/close`, data);
export const cancelRepairRequest = (id, reason)    => post(`${BASE}/${id}/cancel`, { reason: reason ?? null });

// Manual trigger for the daily auto-generator (creates PR drafts from routines / low stock / unrepairable items).
export const triggerAutoGenerate = () => post('/purchase/auto-generate');
