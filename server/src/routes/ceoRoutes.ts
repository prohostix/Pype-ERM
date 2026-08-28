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
} from '../controllers/ceoController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
// router.use(authorize('ceo')); // Removed global restrict to allow specific roles on specific endpoints

// Metrics routes
router.get('/metrics/performance', authorize('ceo', 'general_manager'), getPerformanceMetrics);
router.get('/metrics/risk', authorize('ceo', 'general_manager'), getRiskMetrics);
router.get('/analytics', authorize('ceo', 'general_manager'), getAnalytics);

// Center onboarding & enrollment overview
router.get('/center-onboarding', authorize('ceo', 'general_manager'), getCenterOnboardingOverview);
router.get('/enrollment-overview', authorize('ceo', 'general_manager'), getStudentEnrollmentOverview);

// Escalation routes
router.get('/escalations', authorize('ceo', 'general_manager', 'sales_admin', 'sales_sub_admin', 'bde', 'sub_department_manager', 'ops_admin', 'org_admin', 'superadmin'), getEscalations);
router.patch('/escalations/:id', authorize('ceo', 'general_manager', 'sales_admin', 'sales_sub_admin', 'bde', 'sub_department_manager', 'ops_admin', 'org_admin', 'superadmin'), handleEscalation);

// Task assignment routes
router.get('/managers', authorize('ceo', 'general_manager'), getDepartmentManagers);
router.post('/tasks', authorize('ceo', 'general_manager'), assignTask);

// KPI / KRA org-wide report
router.get('/kpi-kra-report', authorize('ceo', 'general_manager', 'sales_admin', 'sales_sub_admin', 'bde', 'sub_department_manager', 'hr_admin', 'ops_admin', 'org_admin', 'superadmin'), getKPIKRAReport);

// Activity logs for ceo/org_admin
router.get('/activity-logs', authorize('ceo', 'general_manager', 'org_admin'), getActivityLogs);

export default router;
