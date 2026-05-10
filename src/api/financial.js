import { get, post, put, del } from './axios';

const BASE = '/financial';

// Chart of Accounts
export const getChartOfAccounts = (params = {}) => get(`${BASE}/chart-of-accounts`, { params });
export const getChartOfAccount = (id) => get(`${BASE}/chart-of-accounts/${id}`);
export const createChartOfAccount = (data) => post(`${BASE}/chart-of-accounts`, data);
export const updateChartOfAccount = (id, data) => put(`${BASE}/chart-of-accounts/${id}`, data);
export const deleteChartOfAccount = (id) => del(`${BASE}/chart-of-accounts/${id}`);
export const getChartAccountBalance = (id) => get(`${BASE}/chart-of-accounts/${id}/balance`);

// Accounts (Bank/Cash/Digital)
export const getAccounts = (params = {}) => get(`${BASE}/accounts`, { params });
export const getAccount = (id) => get(`${BASE}/accounts/${id}`);
export const createAccount = (data) => post(`${BASE}/accounts`, data);
export const updateAccount = (id, data) => put(`${BASE}/accounts/${id}`, data);
export const deleteAccount = (id) => del(`${BASE}/accounts/${id}`);

// Parties (Students, Employees, Suppliers)
export const getParties = (params = {}) => get(`${BASE}/parties`, { params });
export const getParty = (id) => get(`${BASE}/parties/${id}`);
export const createParty = (data) => post(`${BASE}/parties`, data);
export const getPartyLedger = (id, params = {}) => get(`${BASE}/parties/${id}/ledger`, { params });
export const getPartyBalance = (id) => get(`${BASE}/parties/${id}/balance`);

// Journal Entries
export const getJournalEntries = (params = {}) => get(`${BASE}/journal-entries`, { params });
export const getJournalEntry = (id) => get(`${BASE}/journal-entries/${id}`);
export const createJournalEntry = (data) => post(`${BASE}/journal-entries`, data);
export const postJournalEntry = (id) => post(`${BASE}/journal-entries/${id}/post`);
export const getTrialBalance = (params = {}) => get(`${BASE}/trial-balance`, { params });

// Invoices (Supplier)
export const getInvoices = (params = {}) => get(`${BASE}/invoices`, { params });
export const getInvoice = (id) => get(`${BASE}/invoices/${id}`);
export const createInvoice = (data) => post(`${BASE}/invoices`, data);
export const updateInvoice = (id, data) => put(`${BASE}/invoices/${id}`, data);
export const deleteInvoice = (id) => del(`${BASE}/invoices/${id}`);
export const approveInvoice = (id) => post(`${BASE}/invoices/${id}/approve`);

// Payments
export const getPayments = (params = {}) => get(`${BASE}/payments`, { params });
export const getPayment = (id) => get(`${BASE}/payments/${id}`);
export const createPayment = (data) => post(`${BASE}/payments`, data);
export const updatePayment = (id, data) => put(`${BASE}/payments/${id}`, data);
export const deletePayment = (id) => del(`${BASE}/payments/${id}`);
export const clearPayment = (id) => post(`${BASE}/payments/${id}/clear`);

// Budgets
export const getBudgets = (params = {}) => get(`${BASE}/budgets`, { params });
export const getBudget = (id) => get(`${BASE}/budgets/${id}`);
export const createBudget = (data) => post(`${BASE}/budgets`, data);
export const updateBudget = (id, data) => put(`${BASE}/budgets/${id}`, data);
export const deleteBudget = (id) => del(`${BASE}/budgets/${id}`);
export const approveBudget = (id) => post(`${BASE}/budgets/${id}/approve`);
export const closeBudget = (id) => post(`${BASE}/budgets/${id}/close`);
export const getBudgetReport = (id) => get(`${BASE}/budgets/${id}/report`);

// Fee Module
export const getFeeInvoices = (params = {}) => get(`${BASE}/fees/invoices`, { params });
export const getFeeInvoiceMonths = () => get(`${BASE}/fees/invoices/months`);
export const getFeeInvoice = (id) => get(`${BASE}/fees/invoices/${id}`);
export const regenerateFeeInvoice = (id, data) => post(`${BASE}/fees/invoices/${id}/regenerate`, data);
export const addInvoiceLine = (id, data) => post(`${BASE}/fees/invoices/${id}/lines`, data);
export const generateMonthlyFees = (data) => post(`${BASE}/fees/generate-monthly`, data); // DEPRECATED: use Billing Runs
export const generateUniformInvoice = (studentId, data = {}) => post(`${BASE}/fees/students/${studentId}/uniform-invoice`, data); // DEPRECATED: use pending charges
export const applyFeeDiscount = (id, data) => post(`${BASE}/fees/invoices/${id}/discount`, data);
export const getFeePayments = (params = {}) => get(`${BASE}/fees/payments`, { params });
export const getFeePayment = (id) => get(`${BASE}/fees/payments/${id}`);
export const createFeePayment = (data) => post(`${BASE}/fees/payments`, data);

// --- Phase 3 redesign endpoints (FEE_MODULE_REDESIGN_PLAN.md §5) ---

// Fee Items catalog
export const getFeeItems = (params = {}) => get(`${BASE}/fees/items`, { params });
export const createFeeItem = (data) => post(`${BASE}/fees/items`, data);
export const updateFeeItem = (id, data) => put(`${BASE}/fees/items/${id}`, data);
export const deleteFeeItem = (id) => del(`${BASE}/fees/items/${id}`);

// Class fee plans
export const getClassFeePlans = (params = {}) => get(`${BASE}/fees/class-plans`, { params });
export const getClassFeePlan = (id) => get(`${BASE}/fees/class-plans/${id}`);
export const createClassFeePlan = (data) => post(`${BASE}/fees/class-plans`, data);
export const updateClassFeePlan = (id, data) => put(`${BASE}/fees/class-plans/${id}`, data);
export const deleteClassFeePlan = (id) => del(`${BASE}/fees/class-plans/${id}`);

// Per-student fee profile
export const getStudentFeeProfile = (studentId) => get(`${BASE}/fees/students/${studentId}/fee-profile`);
export const updateStudentFeeProfile = (studentId, data) => put(`${BASE}/fees/students/${studentId}/fee-profile`, data);

// Pending charges queue
export const getPendingCharges = (studentId, params = {}) => get(`${BASE}/fees/students/${studentId}/pending-charges`, { params });
export const addPendingCharge = (studentId, data) => post(`${BASE}/fees/students/${studentId}/pending-charges`, data);
export const cancelPendingCharge = (id, data = {}) => del(`${BASE}/fees/pending-charges/${id}`, { data });

// Billing Runs
export const getBillingRuns = (params = {}) => get(`${BASE}/fees/billing-runs`, { params });
export const getBillingRun = (id) => get(`${BASE}/fees/billing-runs/${id}`);
export const previewBillingRun = (data) => post(`${BASE}/fees/billing-runs/preview`, data);
export const commitBillingRun = (data) => post(`${BASE}/fees/billing-runs`, data);

// Student statement
export const getStudentStatement = (studentId, params = {}) => get(`${BASE}/fees/students/${studentId}/statement`, { params });

// Reference data needed by the Billing Run screen
export const getSchoolClasses = (params = {}) => get('/class-management/classes/list', { params });

// Dashboard / Summary (aggregated on server)
export const getFinancialOverview = () => get(`${BASE}/dashboard`);

/** @deprecated Prefer getFinancialOverview — kept for older callers */
export const getFinanceDashboard = async () => {
  try {
    const res = await getFinancialOverview();
    const d = res.data?.data;
    if (d) {
      return {
        accounts: d.accounts || [],
        budgets: d.budgets || [],
        pendingInvoices: d.pending_supplier_invoices || [],
        pendingFeeInvoices: d.pending_fee_invoices || [],
        recentJournalEntries: d.recent_journal_entries || [],
        totals: d.totals || {},
      };
    }
  } catch {
    // fallback
  }
  const [accounts, budgets, invoices, feeInvoices] = await Promise.all([
    getAccounts(),
    getBudgets({ status: 'active' }),
    getInvoices({}),
    getFeeInvoices({ status: 'pending' }),
  ]);

  return {
    accounts: accounts.data?.data || [],
    budgets: budgets.data?.data || [],
    pendingInvoices: invoices.data?.data?.data || invoices.data?.data || [],
    pendingFeeInvoices: feeInvoices.data?.data?.data || feeInvoices.data?.data || [],
    recentJournalEntries: [],
    totals: {},
  };
};
