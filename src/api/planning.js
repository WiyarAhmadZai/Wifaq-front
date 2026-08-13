import { get, post, put, del } from './axios';

// Planning module — Annual / Monthly / Weekly plans (WEN-DEV-PLANNING-002).
// Mirrors /api/planning/*. Approval fires the server-side cascade into the
// existing Tasks / Events / Budget / Notification modules.
const BASE = '/planning/plans';

export const DIMENSIONS = [
  { value: 'cognitive', label: 'Cognitive', tone: 'blue' },
  { value: 'character', label: 'Character', tone: 'purple' },
  { value: 'practical', label: 'Practical', tone: 'emerald' },
  { value: 'social_structural', label: 'Social-Structural', tone: 'amber' },
];

export const PLAN_TYPES = [
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
];

export const KR_TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'count', label: 'Count' },
  { value: 'currency', label: 'Currency (AFN)' },
  { value: 'binary', label: 'Binary (0/1)' },
];

// Afghan Solar-Hijri months, index 1–12.
export const SHAMSI_MONTHS = [
  '', 'Hamal', 'Sawr', 'Jawza', 'Saratan', 'Asad', 'Sonbola',
  'Mizan', 'Aqrab', 'Qaws', 'Jadi', 'Dalwa', 'Hut',
];

// PDCA states in order.
export const PLAN_STATES = ['draft', 'submitted', 'approved', 'active', 'completed', 'archived'];

export const getPlanOptions  = ()            => get('/planning/options');

export const listPlans       = (params = {}) => get(BASE, { params });
export const getPlan         = (id)          => get(`${BASE}/${id}`);
export const createPlan      = (data)        => post(BASE, data);
export const updatePlan      = (id, data)    => put(`${BASE}/${id}`, data);
export const deletePlan      = (id)          => del(`${BASE}/${id}`);

// Workflow transitions.
export const submitPlan      = (id, note)    => post(`${BASE}/${id}/submit`, { note });
// `confirmLargeSeries` re-posts after the approver accepted the volume warning
// a big series triggers (addendum A 10.1).
export const approvePlan     = (id, note, confirmLargeSeries = false) =>
  post(`${BASE}/${id}/approve`, { note, confirm_large_series: confirmLargeSeries });
export const rejectPlan      = (id, note)    => post(`${BASE}/${id}/reject`, { note });
export const completePlan    = (id)          => post(`${BASE}/${id}/complete`, {});
export const archivePlan     = (id)          => post(`${BASE}/${id}/archive`, {});
export const addDiscussion   = (id, body)    => post(`${BASE}/${id}/discussions`, { body });

// Addendum A: clone a plan into a new year, preview a monthly rollout, and
// amend one item of an auto-drafted monthly (local vs propagating).
export const duplicatePlan   = (id, data)    => post(`${BASE}/${id}/duplicate`, data);
export const rolloutPreview  = (id, month)   => get(`${BASE}/${id}/rollout-preview`, { params: { month } });
export const amendPlanItem   = (itemId, d)   => put(`/planning/plan-items/${itemId}/amend`, d);

// Check-ins (per key result).
export const storeCheckIn    = (krId, data)  => post(`/planning/keyresults/${krId}/check-ins`, data);

// Reflection (1:1).
export const getReflection   = (id)          => get(`${BASE}/${id}/reflection`);
export const saveReflection  = (id, data)    => put(`${BASE}/${id}/reflection`, data);

// Per-plan sharing (admin grants whole-plan access to chosen users).
export const getPlanAccess    = (id)             => get(`${BASE}/${id}/access`);
export const updatePlanAccess = (id, userIds)    => put(`${BASE}/${id}/access`, { user_ids: userIds });

// The approval inbox (submitted plans only).
export const listAwaitingApproval = () => get(BASE, { params: { awaiting_approval: 1 } });
