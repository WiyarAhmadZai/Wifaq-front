import { get, post } from './axios';

const BASE = '/financial/payroll-runs';

export const listPayrollRuns  = (params = {}) => get(BASE, { params });
export const getPayrollRun    = (id)          => get(`${BASE}/${id}`);
export const previewPayroll   = (data)        => post(`${BASE}/preview`, data);
export const commitPayroll    = (data)        => post(BASE, data);
export const payPayrollRun    = (id, data)    => post(`${BASE}/${id}/pay`, data);
export const payPayslip       = (id, data)    => post(`/financial/payslips/${id}/pay`, data);
