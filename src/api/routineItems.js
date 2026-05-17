import { get, post, put, del } from './axios';

const BASE = '/purchase/routine-items';

export const listRoutineItems   = (params = {}) => get(BASE, { params });
export const getRoutineItem     = (id)          => get(`${BASE}/${id}`);
export const createRoutineItem  = (data)        => post(BASE, data);
export const updateRoutineItem  = (id, data)    => put(`${BASE}/${id}`, data);
export const deleteRoutineItem  = (id)          => del(`${BASE}/${id}`);

// Manually spawn the reorder PR for one routine item (advances its cycle).
// force=true overrides the "already has an open PR" guard.
export const generateRoutineItem = (id, force = false) =>
  post(`${BASE}/${id}/generate`, { force });
