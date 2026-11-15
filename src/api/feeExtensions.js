import { get, post, put, del } from './axios';

const BASE = '/financial/fees/extensions';

// ── Staff / fee officer ─────────────────────────────────────────
export const getFeeExtensions = (params = {}) => get(BASE, { params });
export const getFeeExtensionStats = () => get(`${BASE}/stats`);
export const getFeeExtensionFormData = () => get(`${BASE}/form-data`);
export const getFeeExtension = (id) => get(`${BASE}/${id}`);
export const createFeeExtension = (data) => post(BASE, data);
export const updateFeeExtension = (id, data) => put(`${BASE}/${id}`, data);
export const approveFeeExtension = (id, data) => put(`${BASE}/${id}/approve`, data);
export const rejectFeeExtension = (id, data) => put(`${BASE}/${id}/reject`, data);
export const modifyFeeExtension = (id, data) => put(`${BASE}/${id}/modify`, data);
export const completeFeeExtension = (id) => post(`${BASE}/${id}/complete`);
export const deleteFeeExtension = (id) => del(`${BASE}/${id}`);
export const generateFeeExtensionLink = (data) => post(`${BASE}/public-link`, data);

// ── Parent portal (row-scoped to the caller's own children) ─────
export const getMyFeeExtensions = () => get('/fee-extensions/my-requests');
export const submitFeeExtension = (data) => post('/fee-extensions', data);

// ── Public link (no login; the token pins one student) ──────────
export const getPublicFeeExtension = (token) => get(`/public/fee-extensions/${token}`);
export const submitPublicFeeExtension = (data) => post('/public/fee-extensions', data);
