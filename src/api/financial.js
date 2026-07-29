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
// Cash movements — every call posts a balanced journal entry server-side.
export const depositToAccount       = (id, data) => post(`${BASE}/accounts/${id}/deposit`, data);
export const withdrawFromAccount    = (id, data) => post(`${BASE}/accounts/${id}/withdraw`, data);
export const transferBetweenAccounts = (id, data) => post(`${BASE}/accounts/${id}/transfer`, data);
export const getAccountMovements    = (id, params = {}) => get(`${BASE}/accounts/${id}/movements`, { params });

// Parties (Students, Employees, Suppliers)
export const getParties = (params = {}) => get(`${BASE}/parties`, { params });
export const getParty = (id) => get(`${BASE}/parties/${id}`);
export const createParty = (data) => post(`${BASE}/parties`, data);
export const updateParty = (id, data) => put(`${BASE}/parties/${id}`, data);
export const deleteParty = (id) => del(`${BASE}/parties/${id}`);
export const getPartyLedger = (id, params = {}) => get(`${BASE}/parties/${id}/ledger`, { params });
export const getPartyBalance = (id) => get(`${BASE}/parties/${id}/balance`);
// The four canonical party-money actions — staff advances flow.
export const givePartyAdvance       = (id, data) => post(`${BASE}/parties/${id}/advance`, data);
export const recordPartyExpense     = (id, data) => post(`${BASE}/parties/${id}/expense`, data);
export const recordPartyRepayment   = (id, data) => post(`${BASE}/parties/${id}/repayment`, data);
export const recordPartyReimbursement = (id, data) => post(`${BASE}/parties/${id}/reimbursement`, data);
// Corrections — amend or remove a movement recorded by mistake. Gated on
// party-ledger.correct / party-ledger.delete (or parties.manage) server-side.
export const updatePartyLedgerEntry = (id, entryId, data) => put(`${BASE}/parties/${id}/ledger/${entryId}`, data);
export const deletePartyLedgerEntry = (id, entryId) => del(`${BASE}/parties/${id}/ledger/${entryId}`);

// Journal Entries
export const getJournalEntries = (params = {}) => get(`${BASE}/journal-entries`, { params });
export const getJournalEntry = (id) => get(`${BASE}/journal-entries/${id}`);
export const createJournalEntry = (data) => post(`${BASE}/journal-entries`, data);
// Body may carry `budget_override_reason` if the previous attempt returned
// a 409 budget_breach (soft-warn-and-override model — see BudgetGuard).
export const postJournalEntry = (id, body = {}) =>
  post(`${BASE}/journal-entries/${id}/post`, body);
export const getTrialBalance = (params = {}) => get(`${BASE}/trial-balance`, { params });

// ── Finance reports ───────────────────────────────────────────────────
// Backend-derived board-pack reports. Everything is computed from POSTED
// journal entries only — drafts are excluded. The monthly endpoint also
// has a /pdf companion that streams a print-ready board pack.
export const getBalanceSheet = (asOf) =>
  get(`${BASE}/reports/balance-sheet`, { params: asOf ? { as_of: asOf } : {} });
export const getProfitLoss = (from, to) =>
  get(`${BASE}/reports/profit-loss`, { params: { from, to } });
export const getMonthlyReport = (year, month) =>
  get(`${BASE}/reports/monthly`, { params: { year, month } });
/**
 * Download the monthly PDF as a Blob via axios (so the Sanctum auth header
 * goes along) and trigger a browser save. Caller invokes:
 *   await downloadMonthlyReportPdf(2026, 6);
 */
export const downloadMonthlyReportPdf = async (year, month) => {
  const res = await get(`${BASE}/reports/monthly/pdf`, {
    params: { year, month },
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `monthly-finance-report-${year}-${String(month).padStart(2, "0")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick to let the click handler finish in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

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

// Uniform is a one-off charge per registration year (never monthly).
// `settle` marks it paid so billing stops adding it; `reset` re-enables one charge.
export const settleStudentUniform = (studentId) => post(`${BASE}/fees/students/${studentId}/uniform/settle`);
export const resetStudentUniform = (studentId) => post(`${BASE}/fees/students/${studentId}/uniform/reset`);

// Dashboard / Summary (aggregated on server)
export const getFinancialOverview = () => get(`${BASE}/dashboard`);

// Leadership Financial Report — consolidated GL-derived report for a month
export const getLeadershipReport = (params = {}) => get(`${BASE}/leadership-report`, { params });

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
