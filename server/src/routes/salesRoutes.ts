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
import { pageAction, anyPageAction, enrollmentInBranch, inviteInBranch } from '../access/pageGuard.js';
import { staffAndPartnersOnly } from '../access/partnerSecrets.js';
import { givenContext, ownedBy, targetInBranch } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

// Lead routes
// Leads are staff records
router.use('/leads', staffAndPartnersOnly);
router.route('/leads').get(getLeads).post(createLead);
router.route('/leads/:id').get(getLead).put(updateLead).delete(deleteLead);
router.put('/leads/:id/convert', convertLead);

// Target routes
router.route('/targets').get(givenContext('targets'), getTargets).post(pageAction('targets', 'create', ['sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'org_admin', 'superadmin']), createTarget);
const ownTarget = { inOrganization: ownedBy('target'), inBranch: targetInBranch };
router.route('/targets/:id').get(getTarget).put(pageAction('targets', 'edit', ['sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'org_admin', 'superadmin'], ownTarget), updateTarget).delete(pageAction('targets', 'delete', ['sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'org_admin', 'superadmin'], ownTarget), deleteTarget);

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
router.get('/team-performance', givenContext('team_performance'), getTeamPerformance);

// My study centers (via invite links — self + subordinates)
router.get('/my-centers', staffAndPartnersOnly, pageAction('partners_sales', 'view', null), getMyCenters);
router.get('/my-centers/admissions', staffAndPartnersOnly, pageAction('partners_sales', 'view', null), getMyCenterAdmissions);
router.get('/my-centers/:centerId', staffAndPartnersOnly, pageAction('partners_sales', 'view', null), getMyCenterDetail);

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
router.get('/reports/members', anyPageAction(['sales_team_report', 'sales_admission_report', 'conversion_report'], 'view', null), getReportMembers);
router.get('/reports/team', pageAction('sales_team_report', 'view', null), getTeamReport);
router.get('/reports/team/:memberId/students', pageAction('sales_team_report', 'view', null), getTeamMemberStudents);
router.get('/reports/counselor', getCounselorReport);
router.get('/reports/admissions', pageAction('sales_admission_report', 'view', null), getAdmissionReport);
router.get('/reports/conversions', pageAction('conversion_report', 'view', null), getConversionReport);

export default router;
