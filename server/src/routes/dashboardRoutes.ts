import express from 'express';
import { getDashboardMetrics, getFinanceOverviewMetrics, getSalesOverviewMetrics } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/metrics', getDashboardMetrics);
router.get('/finance-overview', getFinanceOverviewMetrics);
router.get('/sales-overview', getSalesOverviewMetrics);

export default router;
