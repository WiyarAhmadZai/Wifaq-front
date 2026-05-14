import { get, post, put, del } from './axios';

const BASE = '/purchase/routine-items';

export const listRoutineItems   = (params = {}) => get(BASE, { params });
export const getRoutineItem     = (id)          => get(`${BASE}/${id}`);
export const createRoutineItem  = (data)        => post(BASE, data);
export const updateRoutineItem  = (id, data)    => put(`${BASE}/${id}`, data);
export const deleteRoutineItem  = (id)          => del(`${BASE}/${id}`);
