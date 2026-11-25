import express from 'express';
import {
  getEscalations,
  getEscalation,
  createEscalation,
  updateEscalation,
  deleteEscalation,
  resolveEscalation,
} from '../controllers/escalationController.js';
import { protect, authorize, type AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = express.Router();

router.use(protect);

// An escalation named in the URL must belong to the caller's organization
router.param('id', async (req: AuthRequest, res, next, id) => {
  try {
    if (req.user.role === 'superadmin') return next();
    if (!(await prisma.escalation.findFirst({ where: { id, organizationId: req.user.organizationId }, select: { id: true } }))) {
      res.status(404).json({ success: false, message: 'Escalation not found' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});

router.route('/').get(getEscalations).post(createEscalation);
router.route('/:id')
  .get(getEscalation)
  .put(authorize('ceo', 'general_manager', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'), updateEscalation)
  .delete(authorize('ceo', 'general_manager', 'superadmin'), deleteEscalation);
router.put('/:id/resolve', authorize('ceo', 'general_manager', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'), resolveEscalation);

export default router;
