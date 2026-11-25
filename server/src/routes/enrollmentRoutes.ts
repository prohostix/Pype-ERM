import express from 'express';
import {
  getWallet,
  submitTopUp,
  getTopUpHistory,
  getEnrollablePrograms,
  createEnrollment,
  getMyEnrollments,
  getMyCenterStatus,
  submitMyCenterPayment,
  uploadReceipt,
  completeProvisionalEnrollment,
  getMyProvisionalEnrollments
} from '../controllers/enrollmentController.js';
import {
  getDeptReviewEnrollments,
  approveDeptEnrollment,
  rejectDeptEnrollment,
  resubmitUpgradeEnrollment,
  updateEnrollmentDocumentStatus,
  updateEnrollmentPhotoStatus,
} from '../controllers/enrollmentReviewController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { pageAction, enrollmentInBranch } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

// Study Center wallet routes
router.get('/wallet', authorize('center_admin', 'sales_admin', 'sales_sub_admin', 'sub_department_manager'), getWallet);
router.post('/wallet/topup', authorize('center_admin', 'sales_admin', 'sales_sub_admin', 'sub_department_manager'), upload.single('proofDocument'), submitTopUp);
router.get('/wallet/topups', authorize('center_admin', 'sales_admin', 'sales_sub_admin', 'sub_department_manager'), getTopUpHistory);

// Study Center enrollment routes
router.get('/programs', pageAction('provisional_enrollment', 'view', ['center_admin', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'org_admin', 'superadmin']), getEnrollablePrograms);
router.post('/enroll', pageAction('provisional_enrollment', 'create', ['center_admin', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'org_admin', 'superadmin']), createEnrollment);
router.get('/enrollments', authorize('center_admin', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'org_admin', 'superadmin'), getMyEnrollments);
router.get('/provisional', authorize('center_admin', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'finance_admin', 'finance_sub_admin', 'org_admin', 'superadmin'), getMyProvisionalEnrollments);

// Center onboarding status & payment (authenticated)
router.get('/my-center-status', authorize('center_admin'), getMyCenterStatus);
router.post('/submit-payment', authorize('center_admin'), upload.single('proofFile'), submitMyCenterPayment);
router.post('/:id/receipt', pageAction('provisional_enrollment', 'create', ['center_admin', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'org_admin', 'superadmin'], { inBranch: enrollmentInBranch }), upload.single('receipt'), uploadReceipt);
router.put('/:id/provisional-complete', authorize('center_admin', 'org_admin', 'superadmin', 'sales_admin', 'sales_sub_admin', 'sub_department_manager'), completeProvisionalEnrollment);

// Dept/Sub-dept manager review routes
// Branch managers, the CEO and the General Manager can view applications under review but cannot approve or reject them.
router.get('/review', pageAction('admission_review', 'view', ['ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'ceo', 'general_manager', 'branch_manager']), getDeptReviewEnrollments);
router.put('/review/:id/approve', pageAction('admission_review', 'approve', ['ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'ceo', 'general_manager', 'branch_manager'], { inBranch: enrollmentInBranch }), approveDeptEnrollment);
router.put('/review/:id/reject', pageAction('admission_review', 'approve', ['ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'ceo', 'general_manager', 'branch_manager'], { inBranch: enrollmentInBranch }), rejectDeptEnrollment);
router.put('/review/:id/resubmit-upgrade', authorize('sales_admin', 'sales_sub_admin', 'employee', 'center_admin', 'org_admin'), resubmitUpgradeEnrollment);
router.put('/review/:id/documents/:docIndex/status', pageAction('admission_review', 'edit', ['ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'ceo', 'general_manager', 'branch_manager'], { inBranch: enrollmentInBranch }), updateEnrollmentDocumentStatus);
router.put('/review/:id/photo/status', pageAction('admission_review', 'edit', ['ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'ceo', 'general_manager', 'branch_manager'], { inBranch: enrollmentInBranch }), updateEnrollmentPhotoStatus);

export default router;
