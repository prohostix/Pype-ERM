import express from 'express';
import { submitEditDeleteRequest, getEditDeleteRequests, getEditDeleteRequest, respondToEditDeleteRequest, getEditDeleteStats, } from '../controllers/editDeleteController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();
// All routes require authentication
router.use(protect);
// Ops can submit requests, Finance can view all
router
    .route('/request')
    .post(authorize('ops_admin', 'super_admin', 'org_admin', 'ceo'), submitEditDeleteRequest);
router
    .route('/requests')
    .get(authorize('ops_admin', 'finance_admin', 'super_admin', 'org_admin', 'ceo'), getEditDeleteRequests);
router
    .route('/requests/:id')
    .get(authorize('ops_admin', 'finance_admin', 'super_admin', 'org_admin', 'ceo'), getEditDeleteRequest)
    .patch(authorize('finance_admin', 'super_admin', 'org_admin', 'ceo'), respondToEditDeleteRequest);
router
    .route('/stats')
    .get(authorize('finance_admin', 'super_admin', 'org_admin', 'ceo'), getEditDeleteStats);
export default router;
//# sourceMappingURL=editDeleteRoutes.js.map