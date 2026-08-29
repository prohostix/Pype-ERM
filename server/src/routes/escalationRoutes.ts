import express from 'express';
import {
  getEscalations,
  getEscalation,
  createEscalation,
  updateEscalation,
  deleteEscalation,
  resolveEscalation,
} from '../controllers/escalationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getEscalations).post(createEscalation);
router.route('/:id')
  .get(getEscalation)
  .put(authorize('ceo', 'general_manager', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'), updateEscalation)
  .delete(authorize('ceo', 'general_manager', 'superadmin'), deleteEscalation);
router.put('/:id/resolve', authorize('ceo', 'general_manager', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'), resolveEscalation);

export default router;
