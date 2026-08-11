import express from 'express';
import { submitEditDeleteRequest, getEditDeleteRequests, getEditDeleteRequest, respondToEditDeleteRequest, getEditDeleteStats, } from '../controllers/editDeleteController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();
// All routes require authentication
router.use(protect);
// Ops can submit requests, Finance can view all
router
    .route('/request')
    .post(authorize('ops_admin', 'super_admin', 'org_admin', 'ceo', 'general_manager'), submitEditDeleteRequest);
router
    .route('/requests')
    .get(authorize('ops_admin', 'finance_admin', 'super_admin', 'org_admin', 'ceo', 'general_manager'), getEditDeleteRequests);
router
    .route('/requests/:id')
    .get(authorize('ops_admin', 'finance_admin', 'super_admin', 'org_admin', 'ceo', 'general_manager'), getEditDeleteRequest)
    .patch(authorize('finance_admin', 'super_admin', 'org_admin', 'ceo', 'general_manager'), respondToEditDeleteRequest);
router
    .route('/stats')
    .get(authorize('finance_admin', 'super_admin', 'org_admin', 'ceo', 'general_manager'), getEditDeleteStats);
export default router;
//# sourceMappingURL=editDeleteRoutes.js.map