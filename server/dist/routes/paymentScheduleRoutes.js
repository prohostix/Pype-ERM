import express from 'express';
import { getPaymentSchedules, createPaymentSchedule, updatePaymentSchedule, deletePaymentSchedule } from '../controllers/paymentScheduleController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();
router.use(protect);
router.route('/')
    .get(getPaymentSchedules)
    .post(authorize('org_admin', 'superadmin', 'finance_admin', 'finance_sub_admin', 'ops_admin'), createPaymentSchedule);
router.route('/:id')
    .put(authorize('org_admin', 'superadmin', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'employee'), updatePaymentSchedule)
    .delete(authorize('org_admin', 'superadmin', 'finance_admin', 'finance_sub_admin'), deletePaymentSchedule);
export default router;
//# sourceMappingURL=paymentScheduleRoutes.js.map