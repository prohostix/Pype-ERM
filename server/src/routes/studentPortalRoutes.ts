import express from 'express';
import {
  getStudentProfile,
  getStudentNotifications,
  getStudentMaterials,
  getStudentClasses,
  registerClassAttendance,
  getStudentFees,
  getStudentInvoices,
  submitReferral,
  rateSession,
  videoHeartbeat,
  recordVideoView,
  getLessonAssessmentForStudent,
  submitLessonAssessment
} from '../controllers/studentPortalController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('student', 'center_student', 'org_admin', 'superadmin'));

router.get('/profile', getStudentProfile);
router.get('/notifications', getStudentNotifications);
router.get('/materials', getStudentMaterials);
router.get('/classes', getStudentClasses);
router.post('/classes/:classId/attendance', registerClassAttendance);
router.post('/sessions/:sessionId/rate', rateSession);
router.post('/video-heartbeat', videoHeartbeat);
router.post('/video-view', recordVideoView);
router.get('/fees', getStudentFees);
router.get('/invoices', getStudentInvoices);
router.post('/refer', submitReferral);

router.get('/lessons/:lessonId/assessment', getLessonAssessmentForStudent);
router.post('/lessons/:lessonId/assessment', submitLessonAssessment);

export default router;
