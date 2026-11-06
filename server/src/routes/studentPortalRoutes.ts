import express from 'express';
import {
  getStudentProfile,
  getStudentNotifications,
  getStudentMaterials,
  getStudentClasses,
  getStudentTrialVideos,
  getLessonDoubts,
  createLessonDoubt,
  replyToLessonDoubt,
  getLessonNotes,
  createLessonNote,
  updateLessonNote,
  deleteLessonNote,
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
router.get('/trial-videos', getStudentTrialVideos);
router.get('/lessons/:lessonId/doubts', getLessonDoubts);
router.post('/lessons/:lessonId/doubts', createLessonDoubt);
router.post('/doubts/:doubtId/replies', replyToLessonDoubt);
router.get('/lessons/:lessonId/notes', getLessonNotes);
router.post('/lessons/:lessonId/notes', createLessonNote);
router.put('/notes/:noteId', updateLessonNote);
router.delete('/notes/:noteId', deleteLessonNote);
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
