import express from 'express';
import {
  getStudentProfile,
  getStudentNotifications,
  getStudentMaterials,
  getStudentFees,
  getStudentInvoices,
  submitReferral
} from '../controllers/studentPortalController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('student', 'org_admin', 'superadmin')); // staff = student role

router.get('/profile', getStudentProfile);
router.get('/notifications', getStudentNotifications);
router.get('/materials', getStudentMaterials);
router.get('/fees', getStudentFees);
router.get('/invoices', getStudentInvoices);
router.post('/refer', submitReferral);

export default router;
