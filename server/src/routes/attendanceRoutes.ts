import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage() });
import {
  punchIn,
  punchOut,
  getTodayAttendance,
  getMonthlyLateSummary,
  getAttendances,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getHRSettings,
  createOrUpdateHRSettings,
  biometricSync,
  getPunchConfig,
  syncOfflinePunches,
  getAttendanceByUserId,
  getMonthlyAttendanceSummary,
  getAttendanceStats,
  importAttendance,
  exportAttendance,
} from '../controllers/attendanceController.js';
import { pageAction, givenContext } from '../access/pageGuard.js';

const router = express.Router();

// Static routes MUST come before /:id to avoid Express matching them as IDs

// HR Settings routes
router.get('/settings', protect, getHRSettings);
router.post('/settings', protect, pageAction('attendance_settings', 'edit', ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin']), createOrUpdateHRSettings);
router.put('/settings', protect, pageAction('attendance_settings', 'edit', ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin']), createOrUpdateHRSettings);

// Biometric sync endpoint (called by biometric device/middleware)
router.post('/biometric-sync', protect, authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin'), biometricSync);

// Employee routes - punch in/out
router.get('/punch-config', protect, getPunchConfig);
router.post('/sync-offline', protect, syncOfflinePunches);
router.post('/punch-in', protect, punchIn);
router.post('/punch-out', protect, punchOut);
router.get('/today', protect, getTodayAttendance);
router.get('/late-summary', protect, getMonthlyLateSummary);
router.get('/user/:userId', protect, givenContext('team_attendance'), getAttendanceByUserId);
router.get('/user/:userId/monthly-summary', protect, getMonthlyAttendanceSummary);

// HR routes - view all attendances
router.get('/stats', protect, authorize('hr_admin', 'hr_sub_admin', 'superadmin'), getAttendanceStats);
router.post('/import', protect, authorize('hr_admin', 'hr_sub_admin', 'superadmin'), upload.single('file'), importAttendance);
router.get('/export', protect, pageAction('team_attendance', 'view', ['hr_admin', 'hr_sub_admin', 'superadmin']), exportAttendance);
router.get('/', protect, pageAction('team_attendance', 'view', ['hr_admin', 'hr_sub_admin', 'superadmin']), getAttendances);
router.post('/', protect, pageAction('team_attendance', 'create', ['hr_admin', 'hr_sub_admin', 'superadmin']), createAttendance);
router.put('/:id', protect, pageAction('team_attendance', 'edit', ['hr_admin', 'hr_sub_admin', 'superadmin']), updateAttendance);
router.delete('/:id', protect, pageAction('team_attendance', 'delete', ['hr_admin', 'hr_sub_admin', 'superadmin']), deleteAttendance);

export default router;
