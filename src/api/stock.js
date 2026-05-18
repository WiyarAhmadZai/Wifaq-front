import { get, post, put, del } from './axios';

const BASE = '/purchase/stock';

export const listStock        = (params = {}) => get(`${BASE}/index`, { params });
export const getStock         = (id)          => get(`${BASE}/show/${id}`);
export const createStock      = (data)        => post(`${BASE}/store`, data);
export const updateStock      = (id, data)    => put(`${BASE}/edit/${id}`, data);
export const setStockStatus   = (id, status)  => put(`${BASE}/status/${id}`, { status });
export const deleteStock      = (id)          => del(`${BASE}/delete/${id}`);

// Movement ledger
export const issueStock       = (id, data)    => post(`${BASE}/issue/${id}`, data);
export const adjustStock      = (id, data)    => post(`${BASE}/adjust/${id}`, data);
export const getStockMovements = (id)         => get(`${BASE}/movements/${id}`);
