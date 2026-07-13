import express from 'express';
import { getDashboardMetrics, getFinanceOverviewMetrics } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/metrics', getDashboardMetrics);
router.get('/finance-overview', getFinanceOverviewMetrics);

export default router;
