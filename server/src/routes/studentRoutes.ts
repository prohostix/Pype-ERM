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
  updateStudentAcademicProgress,
  getStudentEnrollments,
  markEnrollmentDropout,
  updateDocumentStatus,
  updatePhotoStatus,
  checkStudentUniqueness,
  setStudentVideoBlock,
  getStudentVideoUnlock,
  unlockStudentNextVideo,
  getStudentCommunications,
  getStudentRemarks,
  addStudentRemark,
  deleteStudentRemark,
} from '../controllers/studentController.js';
import { bulkSetStudentFilterValue, setStudentFilterValue, getStudentFilterData } from '../controllers/studentFilterController.js';
import { protect, authorize, type AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Staff records: students and faculty use their own portal routes.
router.use((req: AuthRequest, res, next) => {
  if (['student', 'faculty'].includes(req.user.role)) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }
  next();
});

// Student uniqueness validation
router.get('/check-unique', checkStudentUniqueness);

// Internal marks routes (must come before /:id routes)
router.route('/marks').get(getInternalMarks).post(authorize('ops_admin', 'employee'), createInternalMark);
router.route('/marks/:id').get(getInternalMark).put(authorize('ops_admin', 'employee'), updateInternalMark).delete(authorize('ops_admin'), deleteInternalMark);

// Student routes
router.post('/bulk-import', authorize('org_admin', 'superadmin', 'center_admin'), bulkImportStudents);
router.post('/bulk-enrollment-update', authorize('org_admin', 'superadmin', 'ops_admin', 'employee'), bulkEnrollmentUpdate);
router.post('/bulk-update-program', authorize('org_admin', 'superadmin'), bulkUpdateProgram);
router.post('/bulk-record-payment', authorize('org_admin', 'superadmin'), bulkRecordPayment);
const FILTER_EDITORS = ['org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin'];
router.post('/filters/bulk', authorize(...FILTER_EDITORS), bulkSetStudentFilterValue);
router.get('/:id/filters', authorize(...FILTER_EDITORS, 'ceo', 'general_manager', 'branch_manager', 'finance_admin', 'finance_sub_admin'), getStudentFilterData);
router.put('/:id/filters/:typeId', authorize(...FILTER_EDITORS), setStudentFilterValue);
router.post('/:id/notify', authorize('org_admin', 'superadmin', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'employee'), notifyStudent);
router.post('/:id/documents', authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee'), upload.single('file'), uploadStudentDocument);
router.put('/:id/documents/:docIndex/status', authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin', 'employee'), updateDocumentStatus);
router.put('/:id/photo/status', authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin', 'employee'), updatePhotoStatus);

router.route('/').get(getStudents).post(authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin', 'general_manager'), createStudent);
router.route('/:id').get(getStudent).put(authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin'), updateStudent).delete(authorize('org_admin', 'superadmin'), deleteStudent);
router.put('/:id/progress/:stepId', authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin'), upload.single('proof'), updateAdmissionProgress);
router.put('/:id/academic-progress', authorize('org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin'), updateStudentAcademicProgress);
router.put('/:id/video-block', authorize('org_admin', 'superadmin'), setStudentVideoBlock);
router.get('/:id/video-unlock', authorize('org_admin', 'superadmin'), getStudentVideoUnlock);
router.put('/:id/video-unlock', authorize('org_admin', 'superadmin'), unlockStudentNextVideo);
router.put('/:id/approve', authorize('finance_admin', 'finance_sub_admin', 'ops_admin'), approveStudent);
router.get('/:id/enrollments', getStudentEnrollments);
const REMARK_ROLES = ['org_admin', 'superadmin', 'ceo', 'general_manager', 'branch_manager', 'center_admin', 'sales_admin', 'sales_sub_admin', 'ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'employee'];
router.get('/:id/communications', authorize(...REMARK_ROLES), getStudentCommunications);
router.route('/:id/remarks').get(authorize(...REMARK_ROLES), getStudentRemarks).post(authorize(...REMARK_ROLES), addStudentRemark);
router.delete('/:id/remarks/:remarkId', authorize(...REMARK_ROLES), deleteStudentRemark);
router.put('/:id/enrollments/:enrollmentId/dropout', authorize('org_admin', 'superadmin'), markEnrollmentDropout);

export default router;
