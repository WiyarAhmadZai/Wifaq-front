import { get, post, put, del } from './axios';

const BASE = '/purchase/repair-requests';

export const listRepairRequests   = (params = {}) => get(BASE, { params });
export const getRepairRequest     = (id)          => get(`${BASE}/${id}`);
export const createRepairRequest  = (data)        => post(BASE, data);
export const updateRepairRequest  = (id, data)    => put(`${BASE}/${id}`, data);
export const deleteRepairRequest  = (id)          => del(`${BASE}/${id}`);

// Workflow transitions
export const startRepair           = (id)        => post(`${BASE}/${id}/start`);
export const markRepaired          = (id, notes) => post(`${BASE}/${id}/mark-repaired`, { resolution_notes: notes ?? null });
export const markCannotRepair      = (id, notes) => post(`${BASE}/${id}/mark-cannot-repair`, { resolution_notes: notes ?? null });
export const cancelRepairRequest   = (id, notes) => post(`${BASE}/${id}/cancel`, { resolution_notes: notes ?? null });

// Manual trigger for the daily auto-generator (creates PR drafts from routines / low stock / unrepairable items).
export const triggerAutoGenerate = () => post('/purchase/auto-generate');
