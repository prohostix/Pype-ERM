import express from 'express';
import {
  getPaymentSchedules,
  createPaymentSchedule,
  updatePaymentSchedule,
  deletePaymentSchedule
} from '../controllers/paymentScheduleController.js';
import { protect, authorize } from '../middleware/auth.js';
import { pageAction, ownedBy, scheduleInBranch } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPaymentSchedules)
  .post(authorize('org_admin', 'superadmin', 'finance_admin', 'finance_sub_admin', 'ops_admin'), createPaymentSchedule);

router.route('/:id')
  .put(pageAction('collections', 'edit', ['org_admin', 'superadmin', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'employee'], { inOrganization: ownedBy('paymentSchedule'), inBranch: scheduleInBranch }), updatePaymentSchedule)
  .delete(authorize('org_admin', 'superadmin', 'finance_admin', 'finance_sub_admin'), deletePaymentSchedule);

export default router;
