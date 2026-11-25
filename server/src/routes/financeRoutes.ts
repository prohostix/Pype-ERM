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
import {
  pageAction, expenseInBranch, paymentInBranch, enrollmentInBranch, linkInBranch, ownedBy, partnerInBranch, targetInBranch, topUpInBranch,
} from '../access/pageGuard.js';

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
  // The Student Payment Log records receipts through the same request
  .post(pageAction('payments', 'create', FINANCE_CHANGERS, { alsoAllows: ['student_payment_log', 'create'] }), createPayment);
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
router.route('/targets').get(pageAction('sales_targets', 'view', null), getTargets).post(pageAction('sales_targets', 'create', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin']), createTarget);
router.route('/targets/:id')
  .get(pageAction('sales_targets', 'view', null, { inBranch: targetInBranch }), getTarget)
  .put(pageAction('sales_targets', 'edit', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inBranch: targetInBranch }), updateTarget)
  .delete(pageAction('sales_targets', 'delete', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inBranch: targetInBranch }), deleteTarget);

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
router.get('/centers/pending-payment', pageAction('pending_payments', 'view', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin']), getPendingPaymentCenters);
router.post('/centers', authorize('org_admin', 'superadmin'), createStudyCenter);
router.put('/centers/:id/finance-verify', pageAction('pending_payments', 'approve', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inOrganization: ownedBy('studyCenter'), inBranch: partnerInBranch }), financeVerifyCenter);



// Wallet Top-Ups
router.get('/wallet-topups', pageAction('wallet_topups', 'view', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin']), getWalletTopUps);
router.put('/wallet-topups/:id/approve', pageAction('wallet_topups', 'approve', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inOrganization: ownedBy('walletTopUp'), inBranch: topUpInBranch }), approveWalletTopUp);
router.put('/wallet-topups/:id/reject', pageAction('wallet_topups', 'approve', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inOrganization: ownedBy('walletTopUp'), inBranch: topUpInBranch }), rejectWalletTopUp);

// Finance Enrollment Review
router.get('/enrollments/all', pageAction('finance_enrollments', 'view', ['finance_admin', 'finance_sub_admin', 'branch_manager', 'ceo', 'general_manager', 'org_admin', 'superadmin']), getAllEnrollments);
router.get('/enrollments', pageAction('finance_enrollments', 'view', ['finance_admin', 'finance_sub_admin', 'branch_manager', 'ceo', 'general_manager', 'org_admin', 'superadmin']), getFinanceEnrollments);
router.put('/enrollments/:id/approve', pageAction('finance_enrollments', 'approve', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inOrganization: ownedBy('enrollment'), inBranch: enrollmentInBranch }), approveFinanceEnrollment);
router.put('/enrollments/:id/reject', pageAction('finance_enrollments', 'approve', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inOrganization: ownedBy('enrollment'), inBranch: enrollmentInBranch }), rejectFinanceEnrollment);
router.post('/enrollments/:id/verify-receipt', pageAction('finance_enrollments', 'approve', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inOrganization: ownedBy('enrollment'), inBranch: enrollmentInBranch }), verifyReceipt);

// Provisional Enrollment Finance Verification
router.get('/enrollments/provisional', pageAction('provisional_verifications', 'view', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin']), getProvisionalEnrollments);
router.post('/enrollments/:id/provisional-verify', pageAction('provisional_verifications', 'approve', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inOrganization: ownedBy('enrollment'), inBranch: enrollmentInBranch }), verifyProvisionalReceipt);
router.post('/enrollments/:id/provisional-reject', pageAction('provisional_verifications', 'approve', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inOrganization: ownedBy('enrollment'), inBranch: enrollmentInBranch }), rejectProvisionalReceipt);

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
router.get('/payment-links', pageAction('payment_gateway', 'view', null), getPaymentLinks);
router.post('/payment-links', pageAction('payment_gateway', 'create', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin']), generatePaymentLink);
router.put('/payment-links/:id/status', pageAction('payment_gateway', 'create', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'], { inOrganization: ownedBy('paymentLink'), inBranch: linkInBranch }), updatePaymentLinkStatus);

// Student Payments Log & Extras
router.get('/student-payments-log', pageAction('student_payment_log', 'view', ['finance', 'finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin']), getStudentPaymentsLog);
router.post('/student-payments-log/extra-fee', pageAction('student_payment_log', 'create', ['finance', 'finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin']), addExtraFee);

// Commissions from Universities
router.route('/commissions')
  .get(pageAction('university_commissions', 'view', null), getUniversityCommissions)
  .post(pageAction('university_commissions', 'create', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin']), recordUniversityCommission);


// Payments to Universities
router.route('/university-payments')
  .get(pageAction('university_fee', 'view', null), getUniversityPayments)
  .post(pageAction('university_fee', 'create', ['finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin']), recordUniversityPayment);

// Discounts
router.route('/discounts')
  .get(pageAction('discounts', 'view', null), getDiscounts)
  .post(pageAction('discounts', 'create', FINANCE_CHANGERS), applyDiscount);

export default router;
