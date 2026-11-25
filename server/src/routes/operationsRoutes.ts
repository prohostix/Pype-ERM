import express from 'express';
import {
  getUniversities,
  getUniversity,
  createUniversity,
  getCountries,
  createCountry,
  updateUniversity,
  deleteUniversity,
  activateUniversity,
  getPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  activateProgram,
  getStudyCenters,
  getStudyCenter,
  createStudyCenter,
  updateStudyCenter,
  deleteStudyCenter,
  approveStudyCenter,
  suspendStudyCenter,
  getAdmissionSessions,
  getAdmissionSession,
  createAdmissionSession,
  updateAdmissionSession,
  deleteAdmissionSession,
  approveAdmissionSession,
  getInternalMarks,
  createInternalMark,
  updateInternalMark,
  deleteInternalMark,
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getPendingVerificationCenters,
  verifyCenter,
  getProgramAllocations,
  allocateProgram,
  removeAllocation,
  updateCenterOpsSubAdmin,
} from '../controllers/operationsController.js';
import {
  getProgramDetail,
  getProgramMaterials,
  uploadProgramMaterial,
  updateProgramMaterial,
  deleteProgramMaterial,
} from '../controllers/programMaterialController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Countries — each organization keeps its own list; anyone who can see universities can read it
const ORG_ADMINS = ['org_admin', 'superadmin'];
const university = { inOrganization: ownedBy('university') };
const program = { inOrganization: ownedBy('program') };
const partner = { inOrganization: ownedBy('studyCenter'), inBranch: partnerInBranch };
/** For partner requests outside per-user access: the record must still be in the organization */
const ownPartner = async (req: PageRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user.role !== 'superadmin' && !(await ownedBy('studyCenter')(req))) {
      res.status(404).json({ success: false, message: 'Study center not found' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

router.route('/countries').get(getCountries).post(pageAction('universities', 'create', ORG_ADMINS), createCountry);

// Universities — write access restricted to org_admin / superadmin only
router.route('/universities').get(getUniversities).post(pageAction('universities', 'create', ORG_ADMINS), createUniversity);
router.route('/universities/:id')
  .get(getUniversity)
  .put(pageAction('universities', 'edit', ORG_ADMINS, university), updateUniversity)
  .delete(pageAction('universities', 'delete', ORG_ADMINS, university), deleteUniversity);
router.put('/universities/:id/activate', pageAction('universities', 'edit', ORG_ADMINS, university), activateUniversity);

// Programs — write access restricted to org_admin / superadmin only
router.route('/programs').get(getPrograms).post(pageAction('programs', 'create', ORG_ADMINS), createProgram);
router.route('/programs/:id')
  .get(getProgram)
  .put(pageAction('programs', 'edit', ORG_ADMINS, program), updateProgram)
  .delete(pageAction('programs', 'delete', ORG_ADMINS, program), deleteProgram);
router.put('/programs/:id/activate', pageAction('programs', 'edit', ORG_ADMINS, program), activateProgram);

// Onboarding — document verification (must be before /centers/:id to avoid route conflict)
router.get('/centers/pending-verification', partnerContext, authorize('ops_admin', 'ops_sub_admin', 'employee'), getPendingVerificationCenters);
router.put('/centers/:id/verify', authorize('ops_admin', 'ops_sub_admin', 'employee'), ownPartner, verifyCenter);

// Study Centers
router.route('/centers')
  .get(staffAndPartnersOnly, partnerContext, getStudyCenters)
  .post(pageAction('academic_partners', 'create', ORG_ADMINS), createStudyCenter);
router.route('/centers/:id')
  .get(staffAndPartnersOnly, partnerContext, getStudyCenter)
  .put(pageAction('academic_partners', 'edit', ORG_ADMINS, partner), updateStudyCenter)
  .delete(pageAction('academic_partners', 'delete', ORG_ADMINS, partner), deleteStudyCenter);
router.put('/centers/:id/approve', authorize('ops_admin', 'finance_admin', 'finance_sub_admin'), ownPartner, approveStudyCenter);
router.put('/centers/:id/suspend', authorize('org_admin', 'superadmin'), ownPartner, suspendStudyCenter);

// Admission Sessions
router.route('/sessions').get(getAdmissionSessions).post(authorize('org_admin', 'superadmin', 'ops_admin', 'ceo', 'general_manager'), createAdmissionSession);
router.route('/sessions/:id')
  .get(getAdmissionSession)
  .put(authorize('org_admin', 'superadmin', 'ops_admin', 'ceo', 'general_manager'), updateAdmissionSession)
  .delete(pageAction('admission_sessions', 'delete', ['org_admin', 'superadmin', 'ops_admin', 'ceo', 'general_manager']), deleteAdmissionSession);
router.put('/sessions/:id/approve', pageAction('admission_sessions', 'approve', ['finance_admin', 'finance_sub_admin']), approveAdmissionSession);

// Internal Marks — study centers enter marks, ops has read-only
router.route('/marks').get(getInternalMarks).post(authorize('center_admin', 'ops_admin', 'org_admin', 'superadmin'), createInternalMark);
router.route('/marks/:id').put(authorize('center_admin', 'ops_admin', 'org_admin', 'superadmin'), updateInternalMark).delete(authorize('center_admin', 'ops_admin', 'org_admin', 'superadmin'), deleteInternalMark);

// Announcements
router.route('/announcements').get(getAnnouncements).post(pageAction('announcements', 'create', ['ops_admin', 'hr_admin', 'hr_sub_admin']), createAnnouncement);
router.route('/announcements/:id')
  .get(getAnnouncement)
  .put(pageAction('announcements', 'edit', ['ops_admin', 'hr_admin', 'hr_sub_admin'], { inOrganization: ownedBy('announcement') }), updateAnnouncement)
  .delete(pageAction('announcements', 'delete', ['ops_admin', 'hr_admin', 'hr_sub_admin'], { inOrganization: ownedBy('announcement') }), deleteAnnouncement);

// Onboarding — program allocation
router.route('/centers/:id/allocations')
  .get(pageAction('program_allocation', 'view', ['ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin', 'finance_admin', 'finance_sub_admin', 'ceo', 'general_manager', 'branch_manager'], partner), getProgramAllocations)
  .post(pageAction('program_allocation', 'create', ['ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin'], partner), allocateProgram);
router.put('/centers/:id/ops-sub-admin', pageAction('program_allocation', 'edit', ['ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin'], partner), updateCenterOpsSubAdmin);
router.delete('/centers/:id/allocations/:allocId', pageAction('program_allocation', 'delete', ['ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin'], partner), removeAllocation);

// Program detail & materials
router.get('/programs/:programId/detail', getProgramDetail);
router.get('/programs/:programId/materials', getProgramMaterials);
router.post('/programs/:programId/materials', authorize('ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin'), upload.single('file'), uploadProgramMaterial);
router.put('/programs/:programId/materials/:materialId', authorize('ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin'), upload.single('file'), updateProgramMaterial);
router.delete('/programs/:programId/materials/:materialId', authorize('ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin'), deleteProgramMaterial);

export default router;

// Operations Reports
import {
  getAdmissionReport,
  getEnrollmentReport,
  getUniversityReport,
  getReRegistrationReport
} from '../controllers/opsReportController.js';
import { pageAction } from '../access/pageGuard.js';
import type { Response, NextFunction } from 'express';
import { ownedBy, partnerInBranch, type PageRequest } from '../access/pageGuard.js';
import { staffAndPartnersOnly, partnerContext } from '../access/partnerSecrets.js';

router.get('/reports/admissions', pageAction('admission_report', 'view', ['ops_admin', 'ops_sub_admin', 'org_admin', 'superadmin']), getAdmissionReport);
router.get('/reports/enrollments', pageAction('enrollment_report', 'view', ['ops_admin', 'ops_sub_admin', 'org_admin', 'superadmin']), getEnrollmentReport);
router.get('/reports/universities', pageAction('university_report', 'view', ['ops_admin', 'ops_sub_admin', 'org_admin', 'superadmin']), getUniversityReport);
router.get('/reports/reregistrations', pageAction('rereg_report', 'view', ['ops_admin', 'ops_sub_admin', 'org_admin', 'superadmin']), getReRegistrationReport);
