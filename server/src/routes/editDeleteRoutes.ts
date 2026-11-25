import express from 'express';
import {
  submitEditDeleteRequest,
  getEditDeleteRequests,
  getEditDeleteRequest,
  respondToEditDeleteRequest,
  getEditDeleteStats,
} from '../controllers/editDeleteController.js';
import { protect, authorize } from '../middleware/auth.js';
import { pageAction, type PageRequest } from '../access/pageGuard.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

const REQUESTERS = ['ops_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager'];
// Asking to remove a program allocation also follows the Program Allocation page
const removeAllocationRequest = pageAction('program_allocation', 'delete', REQUESTERS);
const otherRequest = authorize(...REQUESTERS);

// Ops can submit requests, Finance can view all
router
  .route('/request')
  .post((req: PageRequest, res, next) => (req.body?.entityType === 'program_allocation' ? removeAllocationRequest : otherRequest)(req, res, next), submitEditDeleteRequest);

router
  .route('/requests')
  .get(authorize('ops_admin', 'finance_admin', 'finance_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager'), getEditDeleteRequests);

router
  .route('/requests/:id')
  .get(authorize('ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager'), getEditDeleteRequest)
  .patch(authorize('ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager'), respondToEditDeleteRequest);

router
  .route('/stats')
  .get(authorize('finance_admin', 'finance_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager'), getEditDeleteStats);

export default router;
