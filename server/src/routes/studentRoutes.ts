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
router.post('/:id/notify', authorize('org_admin', 'superadmin', 'ops_admin', 'finance_admin', 'employee'), notifyStudent);
router.post('/:id/documents', authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'employee'), upload.single('file'), uploadStudentDocument);

router.route('/').get(getStudents).post(authorize('org_admin', 'superadmin', 'center_admin'), createStudent);
router.route('/:id').get(getStudent).put(authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'employee'), updateStudent).delete(authorize('org_admin', 'superadmin'), deleteStudent);
router.put('/:id/approve', authorize('finance_admin', 'ops_admin'), approveStudent);

export default router;
