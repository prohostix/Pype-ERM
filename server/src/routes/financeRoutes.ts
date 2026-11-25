import express from 'express';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  approveInvoice,
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  getTargets,
  getTarget,
  createTarget,
  updateTarget,
  deleteTarget,
  getFeeStructures,
  getFeeStructure,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getAuthFees,
  createAuthFee,
  updateAuthFee,
  getPendingPaymentCenters,
  financeVerifyCenter,
  createStudyCenter,
  getIncomeExpenditureReport,
  getFinanceSalesUsers,
  getUniversityCommissions,
  getUniversityPayments,
  recordUniversityPayment,
  recordUniversityCommission,
  getCollectionReport,
} from '../controllers/financeController.js';
import {
  getOverdueSchedules,
  sendPaymentReminder,
  generateReceipt,
  getStudentPaymentPlan,
  generateInvoiceFromSchedule,
  generateAllInvoicesForStudent,
  bulkCreateOldFees,
  getOldFees,
  generatePaymentLink,
  getPaymentLinks,
  updatePaymentLinkStatus,
  getStudentPaymentsLog,
  getDiscounts,
  applyDiscount,
  addExtraFee,
} from '../controllers/financeExtController.js';
import {
  getWalletTopUps,
  approveWalletTopUp,
  rejectWalletTopUp,
} from '../controllers/walletTopUpController.js';
import {
  getAllEnrollments,
  getFinanceEnrollments,
  approveFinanceEnrollment,
  rejectFinanceEnrollment,
  verifyReceipt,
  getProvisionalEnrollments,
  verifyProvisionalReceipt,
  rejectProvisionalReceipt,
} from '../controllers/financeEnrollmentController.js';
import {
  getFinanceSalaryConfigs,
  approveSalaryConfig,
} from '../controllers/salaryController.js';
import {
  getPayrollBatches,
  getPayrollBatch,
  financeApprovePayrollBatch,
  financeRejectPayrollBatch,
  markBatchPaymentInProgress,
  completeBatchPayment,
} from '../controllers/payrollController.js';
import { protect, authorize, type AuthRequest } from '../middleware/auth.js';
import { requireAccess, requireAccessOrPaymentsSummary } from '../access/guard.js';
import { pageAction, expenseInBranch, paymentInBranch } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

const FINANCE_CHANGERS = ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'];

// Staff finance data: students and faculty see their own fees through the portal routes.
router.use((req: AuthRequest, res, next) => {
  if (['student', 'faculty'].includes(req.user.role)) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }
  next();
});

// Invoices (permissions: see access/catalog.ts)
router.route('/invoices')
  .get(requireAccessOrPaymentsSummary(['invoices', 'view'], ['bill_receipts', 'view']), getInvoices)
  .post(requireAccess(['invoices', 'create']), createInvoice);
router.route('/invoices/:id')
  .get(requireAccess(['invoices', 'view'], ['bill_receipts', 'view']), getInvoice)
  .put(requireAccess(['invoices', 'edit']), updateInvoice)
  .delete(requireAccess(['invoices', 'delete']), deleteInvoice);
router.put('/invoices/:id/approve', requireAccess(['invoices', 'approve']), approveInvoice);

// Payments
router.route('/payments')
  .get(pageAction('payments', 'view', null), getPayments)
  .post(pageAction('payments', 'create', FINANCE_CHANGERS), createPayment);
router.route('/payments/:id')
  .get(pageAction('payments', 'view', null, { inBranch: paymentInBranch }), getPayment)
  .put(pageAction('payments', 'edit', FINANCE_CHANGERS, { inBranch: paymentInBranch }), updatePayment)
  .delete(pageAction('payments', 'delete', FINANCE_CHANGERS, { inBranch: paymentInBranch }), deletePayment);

// Expenses: anyone may claim one; only approvers change its status
router.route('/expenses')
  .get(pageAction('expenses', 'view', null), getExpenses)
  .post(pageAction('expenses', 'create', null), createExpense);
router.route('/expenses/:id')
  .get(pageAction('expenses', 'view', null, { inBranch: expenseInBranch }), getExpense)
  .put(pageAction('expenses', 'edit', null, { inBranch: expenseInBranch }), updateExpense)
  .delete(pageAction('expenses', 'delete', FINANCE_CHANGERS, { inBranch: expenseInBranch }), deleteExpense);
router.put('/expenses/:id/approve', pageAction('expenses', 'approve', FINANCE_CHANGERS, { inBranch: expenseInBranch }), approveExpense);

// Targets
router.route('/targets').get(getTargets).post(authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), createTarget);
router.route('/targets/:id')
  .get(getTarget)
  .put(authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), updateTarget)
  .delete(authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), deleteTarget);

// Fee Structures (many forms read the list, so reading stays open)
router.route('/fees').get(getFeeStructures).post(pageAction('fee_structures', 'create', FINANCE_CHANGERS), createFeeStructure);
router.route('/fees/:id')
  .get(getFeeStructure)
  .put(pageAction('fee_structures', 'edit', FINANCE_CHANGERS), updateFeeStructure)
  .delete(pageAction('fee_structures', 'edit', FINANCE_CHANGERS), deleteFeeStructure);

// University Auth Fees
router.route('/auth-fees').get(authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), getAuthFees).post(authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), createAuthFee);
router.put('/auth-fees/:id', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), updateAuthFee);

// Study Center Payment Verification & Creation
router.get('/centers/pending-payment', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), getPendingPaymentCenters);
router.post('/centers', authorize('org_admin', 'superadmin'), createStudyCenter);
router.put('/centers/:id/finance-verify', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), financeVerifyCenter);



// Wallet Top-Ups
router.get('/wallet-topups', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), getWalletTopUps);
router.put('/wallet-topups/:id/approve', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), approveWalletTopUp);
router.put('/wallet-topups/:id/reject', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), rejectWalletTopUp);

// Finance Enrollment Review
router.get('/enrollments/all', authorize('finance_admin', 'finance_sub_admin', 'branch_manager', 'ceo', 'general_manager', 'org_admin', 'superadmin'), getAllEnrollments);
router.get('/enrollments', authorize('finance_admin', 'finance_sub_admin', 'branch_manager', 'ceo', 'general_manager', 'org_admin', 'superadmin'), getFinanceEnrollments);
router.put('/enrollments/:id/approve', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), approveFinanceEnrollment);
router.put('/enrollments/:id/reject', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), rejectFinanceEnrollment);
router.post('/enrollments/:id/verify-receipt', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), verifyReceipt);

// Provisional Enrollment Finance Verification
router.get('/enrollments/provisional', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), getProvisionalEnrollments);
router.post('/enrollments/:id/provisional-verify', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), verifyProvisionalReceipt);
router.post('/enrollments/:id/provisional-reject', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), rejectProvisionalReceipt);

// Reports
router.get('/reports/income-expenditure', authorize('finance_admin', 'finance_sub_admin'), getIncomeExpenditureReport);
router.get('/reports/collections', getCollectionReport);

// Sales users (for target assignment)
router.get('/sales-users', authorize('finance_admin', 'finance_sub_admin'), getFinanceSalesUsers);

// Salary Config Approval
router.get('/salary-configs', authorize('finance_admin', 'finance_sub_admin'), getFinanceSalaryConfigs);
router.put('/salary-configs/:id/approve', authorize('finance_admin', 'finance_sub_admin'), approveSalaryConfig);

// Payroll Batches (from HR)
router.get('/payroll-batches', authorize('finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin'), getPayrollBatches);
router.get('/payroll-batches/:id', authorize('finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin'), getPayrollBatch);
router.post('/payroll-batches/:id/approve', authorize('finance_admin', 'finance_sub_admin'), financeApprovePayrollBatch);
router.post('/payroll-batches/:id/reject', authorize('finance_admin', 'finance_sub_admin'), financeRejectPayrollBatch);
router.put('/payroll-batches/:id/payment-in-progress', authorize('finance_admin', 'finance_sub_admin'), markBatchPaymentInProgress);
router.put('/payroll-batches/:id/complete-payment', authorize('finance_admin', 'finance_sub_admin'), completeBatchPayment);

// Payment Reminders
router.get('/reminders/schedules', getOverdueSchedules);
router.post('/reminders/send', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), sendPaymentReminder);

// Receipt Generation
router.get('/receipt/invoice/:invoiceId', requireAccess(['invoices', 'download'], ['bill_receipts', 'download']), generateReceipt);
router.get('/receipt/payment/:paymentId', requireAccess(['invoices', 'download'], ['bill_receipts', 'download']), generateReceipt);

// Invoice from Schedule
router.get('/payment-plan/:studentId', getStudentPaymentPlan);
router.post('/payment-plan/schedule/:scheduleId/invoice', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), generateInvoiceFromSchedule);
router.post('/payment-plan/student/:studentId/generate-all', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), generateAllInvoicesForStudent);

// Bulk Old Fees
router.get('/old-fees', getOldFees);
router.post('/old-fees/bulk', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), bulkCreateOldFees);

// Payment Gateway
router.get('/payment-links', getPaymentLinks);
router.post('/payment-links', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), generatePaymentLink);
router.put('/payment-links/:id/status', authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), updatePaymentLinkStatus);

// Student Payments Log & Extras
router.get('/student-payments-log', authorize('finance', 'finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), getStudentPaymentsLog);
router.post('/student-payments-log/extra-fee', authorize('finance', 'finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), addExtraFee);

// Commissions from Universities
router.route('/commissions')
  .get(getUniversityCommissions)
  .post(authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), recordUniversityCommission);


// Payments to Universities
router.route('/university-payments')
  .get(getUniversityPayments)
  .post(authorize('finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), recordUniversityPayment);

// Discounts
router.route('/discounts')
  .get(pageAction('discounts', 'view', null), getDiscounts)
  .post(pageAction('discounts', 'create', FINANCE_CHANGERS), applyDiscount);

export default router;
