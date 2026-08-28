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
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Invoices
router.route('/invoices').get(getInvoices).post(createInvoice);
router.route('/invoices/:id')
  .get(getInvoice)
  .put(updateInvoice)
  .delete(authorize('finance_admin', 'finance_sub_admin'), deleteInvoice);
router.put('/invoices/:id/approve', authorize('finance_admin', 'finance_sub_admin'), approveInvoice);

// Payments
router.route('/payments').get(getPayments).post(authorize('finance_admin', 'finance_sub_admin'), createPayment);
router.route('/payments/:id')
  .get(getPayment)
  .put(authorize('finance_admin', 'finance_sub_admin'), updatePayment)
  .delete(authorize('finance_admin', 'finance_sub_admin'), deletePayment);

// Expenses
router.route('/expenses').get(getExpenses).post(createExpense);
router.route('/expenses/:id')
  .get(getExpense)
  .put(updateExpense)
  .delete(authorize('finance_admin', 'finance_sub_admin'), deleteExpense);
router.put('/expenses/:id/approve', authorize('finance_admin', 'finance_sub_admin'), approveExpense);

// Targets
router.route('/targets').get(getTargets).post(authorize('finance_admin', 'finance_sub_admin'), createTarget);
router.route('/targets/:id')
  .get(getTarget)
  .put(authorize('finance_admin', 'finance_sub_admin'), updateTarget)
  .delete(authorize('finance_admin', 'finance_sub_admin'), deleteTarget);

// Fee Structures
router.route('/fees').get(getFeeStructures).post(authorize('finance_admin', 'finance_sub_admin'), createFeeStructure);
router.route('/fees/:id')
  .get(getFeeStructure)
  .put(authorize('finance_admin', 'finance_sub_admin'), updateFeeStructure)
  .delete(authorize('finance_admin', 'finance_sub_admin'), deleteFeeStructure);

// Discounts
router.route('/discounts').get(getDiscounts).post(authorize('finance_admin', 'finance_sub_admin'), applyDiscount);

// University Auth Fees
router.route('/auth-fees').get(authorize('finance_admin', 'finance_sub_admin'), getAuthFees).post(authorize('finance_admin', 'finance_sub_admin'), createAuthFee);
router.put('/auth-fees/:id', authorize('finance_admin', 'finance_sub_admin'), updateAuthFee);

// Study Center Payment Verification & Creation
router.get('/centers/pending-payment', authorize('finance_admin', 'finance_sub_admin'), getPendingPaymentCenters);
router.post('/centers', authorize('org_admin', 'superadmin'), createStudyCenter);
router.put('/centers/:id/finance-verify', authorize('finance_admin', 'finance_sub_admin'), financeVerifyCenter);



// Wallet Top-Ups
router.get('/wallet-topups', authorize('finance_admin', 'finance_sub_admin'), getWalletTopUps);
router.put('/wallet-topups/:id/approve', authorize('finance_admin', 'finance_sub_admin'), approveWalletTopUp);
router.put('/wallet-topups/:id/reject', authorize('finance_admin', 'finance_sub_admin'), rejectWalletTopUp);

// Finance Enrollment Review
router.get('/enrollments/all', authorize('finance_admin', 'finance_sub_admin'), getAllEnrollments);
router.get('/enrollments', authorize('finance_admin', 'finance_sub_admin'), getFinanceEnrollments);
router.put('/enrollments/:id/approve', authorize('finance_admin', 'finance_sub_admin'), approveFinanceEnrollment);
router.put('/enrollments/:id/reject', authorize('finance_admin', 'finance_sub_admin'), rejectFinanceEnrollment);
router.post('/enrollments/:id/verify-receipt', authorize('finance_admin', 'finance_sub_admin'), verifyReceipt);

// Reports
router.get('/reports/income-expenditure', authorize('finance_admin', 'finance_sub_admin'), getIncomeExpenditureReport);
router.get('/reports/collections', getCollectionReport);

// Sales users (for target assignment)
router.get('/sales-users', authorize('finance_admin', 'finance_sub_admin'), getFinanceSalesUsers);

// Salary Config Approval
router.get('/salary-configs', authorize('finance_admin', 'finance_sub_admin'), getFinanceSalaryConfigs);
router.put('/salary-configs/:id/approve', authorize('finance_admin', 'finance_sub_admin'), approveSalaryConfig);

// Payroll Batches (from HR)
router.get('/payroll-batches', authorize('finance_admin', 'finance_sub_admin', 'hr_admin'), getPayrollBatches);
router.get('/payroll-batches/:id', authorize('finance_admin', 'finance_sub_admin', 'hr_admin'), getPayrollBatch);
router.post('/payroll-batches/:id/approve', authorize('finance_admin', 'finance_sub_admin'), financeApprovePayrollBatch);
router.post('/payroll-batches/:id/reject', authorize('finance_admin', 'finance_sub_admin'), financeRejectPayrollBatch);
router.put('/payroll-batches/:id/payment-in-progress', authorize('finance_admin', 'finance_sub_admin'), markBatchPaymentInProgress);
router.put('/payroll-batches/:id/complete-payment', authorize('finance_admin', 'finance_sub_admin'), completeBatchPayment);

// Payment Reminders
router.get('/reminders/schedules', getOverdueSchedules);
router.post('/reminders/send', authorize('finance_admin', 'finance_sub_admin'), sendPaymentReminder);

// Receipt Generation
router.get('/receipt/invoice/:invoiceId', generateReceipt);
router.get('/receipt/payment/:paymentId', generateReceipt);

// Invoice from Schedule
router.get('/payment-plan/:studentId', getStudentPaymentPlan);
router.post('/payment-plan/schedule/:scheduleId/invoice', authorize('finance_admin', 'finance_sub_admin'), generateInvoiceFromSchedule);
router.post('/payment-plan/student/:studentId/generate-all', authorize('finance_admin', 'finance_sub_admin'), generateAllInvoicesForStudent);

// Bulk Old Fees
router.get('/old-fees', getOldFees);
router.post('/old-fees/bulk', authorize('finance_admin', 'finance_sub_admin'), bulkCreateOldFees);

// Payment Gateway
router.get('/payment-links', getPaymentLinks);
router.post('/payment-links', authorize('finance_admin', 'finance_sub_admin'), generatePaymentLink);
router.put('/payment-links/:id/status', authorize('finance_admin', 'finance_sub_admin'), updatePaymentLinkStatus);

// Student Payments Log & Extras
router.get('/student-payments-log', authorize('finance', 'finance_admin', 'finance_sub_admin', 'superadmin'), getStudentPaymentsLog);
router.post('/student-payments-log/extra-fee', authorize('finance', 'finance_admin', 'finance_sub_admin', 'superadmin'), addExtraFee);

// Commissions from Universities
router.route('/commissions')
  .get(getUniversityCommissions)
  .post(authorize('finance_admin', 'finance_sub_admin'), recordUniversityCommission);


// Payments to Universities
router.route('/university-payments')
  .get(getUniversityPayments)
  .post(authorize('finance_admin', 'finance_sub_admin'), recordUniversityPayment);

// Discounts
router.route('/discounts')
  .get(getDiscounts)
  .post(authorize('finance_admin', 'finance_sub_admin'), applyDiscount);

export default router;
