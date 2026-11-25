import express from 'express';
import {
  getPerformanceMetrics,
  getRiskMetrics,
  getEscalations,
  handleEscalation,
  getAnalytics,
  getDepartmentManagers,
  assignTask,
  getKPIKRAReport,
  getCenterOnboardingOverview,
  getStudentEnrollmentOverview,
  getActivityLogs,
  getSalesCounts,
  getOverallSalesCounts,
  getRevenueTrend,
  getSalesDetails,
  getRevenueDetails,
  getAdmissionsList,
  getPendingInvoicesList,
  getExecutiveOverview,
} from '../controllers/ceoController.js';
import { protect, authorize } from '../middleware/auth.js';
import { pageAction } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);
// router.use(authorize('ceo')); // Removed global restrict to allow specific roles on specific endpoints

// Metrics routes
router.get('/overview', authorize('ceo', 'general_manager'), getExecutiveOverview);
router.get('/metrics/performance', authorize('ceo', 'general_manager'), getPerformanceMetrics);
router.get('/metrics/risk', authorize('ceo', 'general_manager'), getRiskMetrics);
router.get('/analytics', pageAction('performance', 'view', ['ceo', 'general_manager']), getAnalytics);
router.get('/sales-counts', authorize('ceo', 'general_manager'), getSalesCounts);
router.get('/overall-sales-counts', authorize('ceo', 'general_manager'), getOverallSalesCounts);
router.get('/revenue-trend', authorize('ceo', 'general_manager'), getRevenueTrend);

router.get('/sales-details', authorize('ceo', 'general_manager'), getSalesDetails);
router.get('/revenue-details', authorize('ceo', 'general_manager'), getRevenueDetails);
router.get('/admissions-list', authorize('ceo', 'general_manager'), getAdmissionsList);
router.get('/pending-invoices', authorize('ceo', 'general_manager'), getPendingInvoicesList);

// Center onboarding & enrollment overview
router.get('/center-onboarding', authorize('ceo', 'general_manager'), getCenterOnboardingOverview);
router.get('/enrollment-overview', authorize('ceo', 'general_manager'), getStudentEnrollmentOverview);

// Escalation routes
router.get('/escalations', pageAction('escalations', 'view', ['ceo', 'general_manager', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'ops_admin', 'org_admin', 'superadmin']), getEscalations);
router.patch('/escalations/:id', pageAction('escalations', 'edit', ['ceo', 'general_manager', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'ops_admin', 'org_admin', 'superadmin']), handleEscalation);

// Task assignment routes
router.get('/managers', authorize('ceo', 'general_manager'), getDepartmentManagers);
router.post('/tasks', authorize('ceo', 'general_manager'), assignTask);

// KPI / KRA org-wide report
router.get('/kpi-kra-report', pageAction('kpi_report', 'view', ['ceo', 'general_manager', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'org_admin', 'superadmin']), getKPIKRAReport);

// Activity logs for ceo/org_admin
router.get('/activity-logs', authorize('ceo', 'general_manager', 'org_admin'), getActivityLogs);

export default router;
