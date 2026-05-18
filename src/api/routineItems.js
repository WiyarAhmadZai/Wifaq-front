import { get, post, put, del } from './axios';

const BASE = '/purchase/routine-items';

export const listRoutineItems   = (params = {}) => get(BASE, { params });
export const getRoutineItem     = (id)          => get(`${BASE}/${id}`);
export const createRoutineItem  = (data)        => post(BASE, data);
export const updateRoutineItem  = (id, data)    => put(`${BASE}/${id}`, data);
export const deleteRoutineItem  = (id)          => del(`${BASE}/${id}`);

// Direct one-step routine purchase: records the buy, posts the books,
// fills stock, advances the cycle. No requisition workflow.
// data: { quantity, unit_price, vendor_invoice_number, date,
//         paid_from_account_id | paid_from_party_id }
export const recordRoutinePurchase = (id, data) =>
  post(`${BASE}/${id}/purchase`, data);
