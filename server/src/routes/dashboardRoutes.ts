import express from 'express';
import { getDashboardMetrics, getDocumentsPending, getFinanceOverviewMetrics, getSalesOverviewMetrics, getBranchHierarchy, getPlatformUsageMetrics, getPlatformAuditLogs } from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/metrics', getDashboardMetrics);
router.get('/documents-pending', authorize('ops_admin', 'ops_sub_admin', 'ceo', 'general_manager', 'org_admin'), getDocumentsPending);
router.get('/usage', getPlatformUsageMetrics);
router.get('/usage/audit-logs', getPlatformAuditLogs);
router.get('/finance-overview', getFinanceOverviewMetrics);
router.get('/sales-overview', getSalesOverviewMetrics);

router.get('/branch-hierarchy', getBranchHierarchy);

export default router;
