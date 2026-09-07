import { get, post, put, del } from './axios';

const BASE = '/financial/payroll-runs';

export const listPayrollRuns  = (params = {}) => get(BASE, { params });
export const getPayrollRun    = (id)          => get(`${BASE}/${id}`);
export const previewPayroll   = (data)        => post(`${BASE}/preview`, data);
export const commitPayroll    = (data)        => post(BASE, data);
export const payPayrollRun    = (id, data)    => post(`${BASE}/${id}/pay`, data);
export const payPayslip       = (id, data)    => post(`/financial/payslips/${id}/pay`, data);

// Correct / remove. A committed run is only an accrual until it is paid, so
// wrong figures can be fixed and wrong runs removed. Needs payroll.update /
// payroll.delete respectively.
export const updatePayrollRun = (id, data)    => put(`${BASE}/${id}`, data);
export const deletePayrollRun = (id)          => del(`${BASE}/${id}`);
export const updatePayslip    = (id, data)    => put(`/financial/payslips/${id}`, data);
export const deletePayslip    = (id)          => del(`/financial/payslips/${id}`);

// One payslip with the full advance position, for the A5 payslip document.
// Gated on payroll.print (not payroll.view) so it can be delegated separately.
export const getPayslip = (id) => get(`/financial/payslips/${id}`);

// Re-set how much of an outstanding advance this month's pay claws back.
// `{ advance_recovery: n }` — 0 pays the salary in full, the cap pays nothing
// and clears as much advance as possible. Gated on payroll.advance.
export const setPayslipAdvance = (id, data) => post(`/financial/payslips/${id}/advance`, data);

// ── Corrections to money already recorded ────────────────────────────────
// All three need payroll.reverse (or payroll.manage).

// Un-pay ONE payslip: the disbursement is reversed, the cash goes back on the
// account it left, and the payslip returns to pending. The accrual, the staff
// advance ledger and every other account are untouched — the salary is simply
// unpaid again, not erased.
export const reversePayslipPayment = (id, data = {}) => post(`/financial/payslips/${id}/reverse-payment`, data);

// Same, for every paid payslip in a run — all-or-nothing.
export const reverseRunPayments = (id, data = {}) => post(`${BASE}/${id}/reverse-payments`, data);

// Move a run to the month it was meant for. Only the date moves: no amount and
// no account changes. Refused while any payslip is still paid.
export const changePayrollRunPeriod = (id, data) => put(`${BASE}/${id}/period`, data);
