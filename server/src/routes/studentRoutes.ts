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
import { studentAction, studentContext, studentRead, type StudentRequest } from '../access/studentGuard.js';

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

// What an Org Admin has set for this user on the Students page
router.use(studentContext);

// Student uniqueness validation
router.get('/check-unique', checkStudentUniqueness);

// Internal marks routes (must come before /:id routes)
router.route('/marks').get(getInternalMarks).post(studentAction('edit', ['ops_admin', 'employee']), createInternalMark);
router.route('/marks/:id').get(getInternalMark).put(studentAction('edit', ['ops_admin', 'employee']), updateInternalMark).delete(studentAction('delete', ['ops_admin']), deleteInternalMark);

// Student routes
router.post('/bulk-import', studentAction('import', ['org_admin', 'superadmin', 'center_admin']), bulkImportStudents);
router.post('/bulk-enrollment-update', studentAction('edit', ['org_admin', 'superadmin', 'ops_admin', 'employee']), bulkEnrollmentUpdate);
router.post('/bulk-update-program', authorize('org_admin', 'superadmin'), bulkUpdateProgram);
router.post('/bulk-record-payment', authorize('org_admin', 'superadmin'), bulkRecordPayment);
const FILTER_EDITORS = ['org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin'];
router.post('/filters/bulk', studentAction('edit', [...FILTER_EDITORS]), bulkSetStudentFilterValue);
// Anyone given the Students page may read a student's filter values
router.get('/:id/filters', studentRead, (req: StudentRequest, res, next) => (req.studentLimits ? next() : authorize(...FILTER_EDITORS, 'ceo', 'general_manager', 'branch_manager', 'finance_admin', 'finance_sub_admin')(req, res, next)), getStudentFilterData);
router.put('/:id/filters/:typeId', studentAction('edit', [...FILTER_EDITORS]), setStudentFilterValue);
router.post('/:id/notify', studentAction('send', ['org_admin', 'superadmin', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'employee']), notifyStudent);
router.post('/:id/documents', studentAction('edit', ['org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee']), upload.single('file'), uploadStudentDocument);
router.put('/:id/documents/:docIndex/status', studentAction('edit', ['org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin', 'employee']), updateDocumentStatus);
router.put('/:id/photo/status', studentAction('edit', ['org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin', 'employee']), updatePhotoStatus);

router.route('/').get(getStudents).post(studentAction('create', ['org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin', 'general_manager']), createStudent);
router.route('/:id').get(studentRead, getStudent).put(studentAction('edit', ['org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin']), updateStudent).delete(studentAction('delete', ['org_admin', 'superadmin']), deleteStudent);
router.put('/:id/progress/:stepId', studentAction('edit', ['org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin']), upload.single('proof'), updateAdmissionProgress);
router.put('/:id/academic-progress', studentAction('edit', ['org_admin', 'superadmin', 'center_admin', 'sales_admin', 'sales_sub_admin', 'employee', 'ops_admin', 'ops_sub_admin']), updateStudentAcademicProgress);
router.put('/:id/video-block', authorize('org_admin', 'superadmin'), setStudentVideoBlock);
router.get('/:id/video-unlock', authorize('org_admin', 'superadmin'), getStudentVideoUnlock);
router.put('/:id/video-unlock', authorize('org_admin', 'superadmin'), unlockStudentNextVideo);
router.put('/:id/approve', authorize('finance_admin', 'finance_sub_admin', 'ops_admin'), approveStudent);
router.get('/:id/enrollments', studentRead, getStudentEnrollments);
const REMARK_ROLES = ['org_admin', 'superadmin', 'ceo', 'general_manager', 'branch_manager', 'center_admin', 'sales_admin', 'sales_sub_admin', 'ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'employee'];
router.get('/:id/communications', authorize(...REMARK_ROLES), studentRead, getStudentCommunications);
router.route('/:id/remarks').get(authorize(...REMARK_ROLES), studentRead, getStudentRemarks).post(studentAction('edit', REMARK_ROLES), addStudentRemark);
router.delete('/:id/remarks/:remarkId', studentAction('edit', REMARK_ROLES), deleteStudentRemark);
router.put('/:id/enrollments/:enrollmentId/dropout', authorize('org_admin', 'superadmin'), markEnrollmentDropout);

export default router;
