import express from 'express';
import {
  getPayrolls,
  getPayroll,
  createPayroll,
  updatePayroll,
  processPayroll,
  markPayrollPaid,
  deletePayroll,
  generateMonthlyPayroll,
  confirmPayroll,
  transferToFinance,
  getPayrollBatches,
  getPayrollBatch,
  financeApprovePayrollBatch,
  financeRejectPayrollBatch,
  markBatchPaymentInProgress,
  completeBatchPayment,
} from '../controllers/payrollController.js';
import { protect } from '../middleware/auth.js';
import { pageAction } from '../access/pageGuard.js';
import { payrollContext } from '../access/payrollGuard.js';

const router = express.Router();

router.use(protect);

const BATCH_READERS = ['hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin', 'superadmin'];
const BATCH_PAYERS = ['finance_admin', 'finance_sub_admin', 'superadmin'];
const PAYROLL_EDITORS = ['hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin'];
const CONFIRMERS = ['hr_admin', 'hr_sub_admin', 'superadmin'];

// Payroll batch routes (for finance)
router.get('/batches', pageAction('payroll_batches', 'view', BATCH_READERS), getPayrollBatches);
router.get('/batches/:id', pageAction('payroll_batches', 'view', BATCH_READERS), getPayrollBatch);
router.post('/batches/:id/approve', pageAction('payroll_batches', 'approve', BATCH_PAYERS), financeApprovePayrollBatch);
router.post('/batches/:id/reject', pageAction('payroll_batches', 'approve', BATCH_PAYERS), financeRejectPayrollBatch);
router.put('/batches/:id/payment-in-progress', pageAction('payroll_batches', 'edit', BATCH_PAYERS), markBatchPaymentInProgress);
router.put('/batches/:id/complete-payment', pageAction('payroll_batches', 'edit', BATCH_PAYERS), completeBatchPayment);

// Payroll actions (must be before /:id to avoid param conflicts)
router.post('/generate', pageAction('payroll', 'create', PAYROLL_EDITORS), generateMonthlyPayroll);
router.post('/transfer-to-finance', pageAction('payroll', 'approve', CONFIRMERS), transferToFinance);

// Payroll CRUD
router.route('/').get(payrollContext, getPayrolls).post(pageAction('payroll', 'create', PAYROLL_EDITORS), createPayroll);
router.route('/:id')
  .get(payrollContext, getPayroll)
  .put(pageAction('payroll', 'edit', PAYROLL_EDITORS), updatePayroll)
  .delete(pageAction('payroll', 'delete', PAYROLL_EDITORS), deletePayroll);

// Payroll instance actions
router.put('/:id/process', pageAction('payroll', 'approve', PAYROLL_EDITORS), processPayroll);
router.put('/:id/confirm', pageAction('payroll', 'approve', CONFIRMERS), confirmPayroll);
router.put('/:id/pay', pageAction('payroll_batches', 'edit', ['finance_admin', 'finance_sub_admin']), markPayrollPaid);

export default router;
