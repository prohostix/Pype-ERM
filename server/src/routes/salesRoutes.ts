import express from 'express';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  convertLead,
  deleteLead,
  getTargets,
  getTarget,
  createTarget,
  updateTarget,
  deleteTarget,
  generateInvite,
  listMyInvites,
  regenerateInvite,
  getTeamPerformance,
  getMyCenters,
  getMyCenterAdmissions,
  getMyCenterDetail,
  getProgramsByUniversity,
  getSessionsByUniversity,
} from '../controllers/salesController.js';
import {
  getSalesEnrollmentPipeline,
  createDirectEnrollment,
  verifySalesEnrollment,
  resubmitPaymentReceipt,
  approveSalesEnrollmentOps,
  approveSalesEnrollmentFinance,
  rejectSalesEnrollment,
  getSalesAdminReviews,
  approveBySalesAdmin,
  rejectBySalesAdmin,
} from '../controllers/salesEnrollmentController.js';
import {
  getTeamReport,
  getTeamMemberStudents,
  getReportMembers,
  getCounselorReport,
  getAdmissionReport,
  getConversionReport
} from '../controllers/salesReportController.js';
import { protect, authorize } from '../middleware/auth.js';
import { pageAction, enrollmentInBranch, inviteInBranch } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

// Lead routes
router.route('/leads').get(getLeads).post(createLead);
router.route('/leads/:id').get(getLead).put(updateLead).delete(deleteLead);
router.put('/leads/:id/convert', convertLead);

// Target routes
router.route('/targets').get(getTargets).post(authorize('sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'org_admin', 'superadmin'), createTarget);
router.route('/targets/:id').get(getTarget).put(authorize('sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'org_admin', 'superadmin'), updateTarget).delete(authorize('sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'org_admin', 'superadmin'), deleteTarget);

// Invite routes — available to all sales department employees
router.route('/invites')
  .get(pageAction('invite_links', 'view', null), listMyInvites)
  .post(pageAction('invite_links', 'create', null), generateInvite);
router.patch('/invites/:id/regenerate', pageAction('invite_links', 'edit', null, { inBranch: inviteInBranch }), regenerateInvite);

// Programs by university (for invite creation)
router.get('/programs-by-university', getProgramsByUniversity);

// Sessions by university (for invite creation)
router.get('/sessions-by-university', getSessionsByUniversity);

// Team performance
router.get('/team-performance', getTeamPerformance);

// My study centers (via invite links — self + subordinates)
router.get('/my-centers', getMyCenters);
router.get('/my-centers/admissions', getMyCenterAdmissions);
router.get('/my-centers/:centerId', getMyCenterDetail);

// Sales-led Student applications & Direct enrollment
router.get('/student-applications', pageAction('admission_pipeline', 'view', null), getSalesEnrollmentPipeline);
router.post('/direct-enroll', createDirectEnrollment);
router.put('/student-applications/:id/verify', pageAction('admission_pipeline', 'edit', null, { inBranch: enrollmentInBranch }), verifySalesEnrollment);
router.put('/student-applications/:id/resubmit-receipt', pageAction('admission_pipeline', 'edit', null, { inBranch: enrollmentInBranch }), resubmitPaymentReceipt);
router.put('/student-applications/:id/approve-ops', authorize('ops_admin', 'superadmin', 'org_admin'), approveSalesEnrollmentOps);
router.put('/student-applications/:id/approve-finance', authorize('finance_admin', 'finance_sub_admin', 'superadmin', 'org_admin'), approveSalesEnrollmentFinance);
router.put('/student-applications/:id/reject', authorize('ops_admin', 'finance_admin', 'finance_sub_admin', 'superadmin', 'org_admin'), rejectSalesEnrollment);

// Sales Admin Review Flow
router.get('/sales-admin-reviews', pageAction('admission_approval', 'view', ['sales_admin', 'sales_sub_admin', 'superadmin', 'org_admin']), getSalesAdminReviews);
router.put('/student-applications/:id/sales-admin-approve', pageAction('admission_approval', 'approve', ['sales_admin', 'sales_sub_admin', 'superadmin', 'org_admin'], { inBranch: enrollmentInBranch }), approveBySalesAdmin);
router.put('/student-applications/:id/sales-admin-reject', pageAction('admission_approval', 'approve', ['sales_admin', 'sales_sub_admin', 'superadmin', 'org_admin'], { inBranch: enrollmentInBranch }), rejectBySalesAdmin);

// Sales Reports
router.get('/reports/members', getReportMembers);
router.get('/reports/team', getTeamReport);
router.get('/reports/team/:memberId/students', getTeamMemberStudents);
router.get('/reports/counselor', getCounselorReport);
router.get('/reports/admissions', getAdmissionReport);
router.get('/reports/conversions', getConversionReport);

export default router;
