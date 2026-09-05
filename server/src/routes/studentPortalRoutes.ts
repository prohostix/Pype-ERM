import express from 'express';
import {
  getStudentProfile,
  getStudentNotifications,
  getStudentMaterials,
  getStudentClasses,
  registerClassAttendance,
  getStudentFees,
  getStudentInvoices,
  submitReferral
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
router.get('/fees', getStudentFees);
router.get('/invoices', getStudentInvoices);
router.post('/refer', submitReferral);

export default router;
