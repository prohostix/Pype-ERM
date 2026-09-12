import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getMyClasses, getClassBatches, getMyBatches, getMyStudents, getModulesForClass, createModule, updateModule, deleteModule, createLesson, updateLesson, deleteLesson, assignTeacherToLesson, getLessonHistory,
  getBatchSessions,
  uploadMaterial, deleteMaterial, getOrganizationFaculty, getMyAssignedLessons, startSession, getActiveSessions, getSessionStudents, submitSessionAttendance, endSession } from '../controllers/facultyPortalController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);
// This controller inherently checks for req.user?.role === 'faculty'

router.route('/classes').get(getMyClasses);
router.route('/batches/:batchId/students').get(getMyStudents);
router.route('/batches/:batchId/sessions').get(getBatchSessions);
router.route('/organization/faculty').get(getOrganizationFaculty);
router.route('/my-assignments').get(getMyAssignedLessons);

// Modules Management
router.route('/classes/:classId/modules')
  .get(getModulesForClass)
  .post(createModule);

router.route('/classes/:classId/batches')
  .get(getClassBatches);

router.route('/modules/:moduleId')
  .put(updateModule)
  .delete(deleteModule);

// Lessons Management
router.route('/modules/:moduleId/lessons')
  .post(createLesson);

router.route('/lessons/:lessonId')
  .put(updateLesson)
  .delete(deleteLesson);

router.route('/lessons/:lessonId/assign')
  .put(assignTeacherToLesson);

router.route('/lessons/:lessonId/history').get(getLessonHistory);


// Materials Management
router.route('/lessons/:lessonId/materials')
  .post(upload.single('file'), uploadMaterial);

router.route('/materials/:materialId')
  .delete(deleteMaterial);

// Live Class Sessions
router.route('/sessions/start').post(startSession);
router.route('/sessions/active').get(getActiveSessions);
router.route('/sessions/:sessionId/students').get(getSessionStudents);
router.route('/sessions/:sessionId/attendance').post(submitSessionAttendance);
router.route('/sessions/:sessionId/end').post(endSession);

export default router;
