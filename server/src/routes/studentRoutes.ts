import express from 'express';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  approveStudent,
  deleteStudent,
  bulkImportStudents,
  notifyStudent,
  getInternalMarks,
  getInternalMark,
  createInternalMark,
  updateInternalMark,
  deleteInternalMark,
  uploadStudentDocument,
  bulkEnrollmentUpdate,
  bulkUpdateProgram,
  bulkRecordPayment,
  updateAdmissionProgress,
  getStudentEnrollments,
  updateDocumentStatus,
  updatePhotoStatus,
} from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Internal marks routes (must come before /:id routes)
router.route('/marks').get(getInternalMarks).post(authorize('ops_admin', 'employee'), createInternalMark);
router.route('/marks/:id').get(getInternalMark).put(authorize('ops_admin', 'employee'), updateInternalMark).delete(authorize('ops_admin'), deleteInternalMark);

// Student routes
router.post('/bulk-import', authorize('org_admin', 'superadmin', 'center_admin'), bulkImportStudents);
router.post('/bulk-enrollment-update', authorize('org_admin', 'superadmin', 'ops_admin', 'employee'), bulkEnrollmentUpdate);
router.post('/bulk-update-program', authorize('org_admin', 'superadmin'), bulkUpdateProgram);
router.post('/bulk-record-payment', authorize('org_admin', 'superadmin'), bulkRecordPayment);
router.post('/:id/notify', authorize('org_admin', 'superadmin', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'employee'), notifyStudent);
router.post('/:id/documents', authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'employee'), upload.single('file'), uploadStudentDocument);
router.put('/:id/documents/:docIndex/status', authorize('org_admin', 'superadmin', 'ops_admin', 'employee', 'ceo'), updateDocumentStatus);
router.put('/:id/photo/status', authorize('org_admin', 'superadmin', 'ops_admin', 'employee', 'ceo'), updatePhotoStatus);

router.route('/').get(getStudents).post(authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_manager', 'employee', 'ops_admin', 'ops_sub_admin', 'general_manager'), createStudent);
router.route('/:id').get(getStudent).put(authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'employee', 'ops_admin', 'ops_sub_admin'), updateStudent).delete(authorize('org_admin', 'superadmin'), deleteStudent);
router.put('/:id/progress/:stepId', authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'employee', 'ops_admin', 'ops_sub_admin'), upload.single('proof'), updateAdmissionProgress);
router.put('/:id/approve', authorize('finance_admin', 'finance_sub_admin', 'ops_admin'), approveStudent);
router.get('/:id/enrollments', getStudentEnrollments);

export default router;
