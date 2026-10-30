import express from 'express';
import {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  assignLicense,
  getOrgInquiries,
  updateOrgInquiryStatus,
  getEnrollmentLinkConfig,
  updateEnrollmentLinkConfig,
  getLoginBrandingBySlug,
  initLoginBranding,
  updateLoginBranding,
  generateOrgBill,
  getBillHistory,
  updateBillStatus,
  getOrgMonthEnrollments,
} from '../controllers/organizationController.js';
import {
  getCommunicationSettings,
  updateCommunicationSettings,
  testSmtpSettings,
  testWhatsAppSettings,
  getEmailTemplatePreview,
  getOrgCommunicationLogs,
  resendOrgCommunicationLog,
} from '../controllers/communicationSettingsController.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.get('/login-branding/:slug', getLoginBrandingBySlug);

router.use(protect);

router.get('/inquiries', authorize('superadmin'), getOrgInquiries);
router.patch('/inquiries/:id', authorize('superadmin'), updateOrgInquiryStatus);

router
  .route('/')
  .get(authorize('superadmin', 'org_admin', 'ceo', 'general_manager', 'hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'sales_sub_admin', 'employee'), getOrganizations)
  .post(authorize('superadmin'), auditLog('create', 'Organization'), createOrganization);

// Enrollment link configuration (must be before /:id to avoid route conflict)
router.get('/enrollment-link-config', authorize('superadmin', 'org_admin', 'sales_admin', 'sales_sub_admin'), getEnrollmentLinkConfig);
router.put('/enrollment-link-config', authorize('superadmin', 'org_admin'), updateEnrollmentLinkConfig);

// Communication Settings (SMTP & WhatsApp)
router.get('/communication-settings', authorize('superadmin', 'org_admin'), getCommunicationSettings);
router.put('/communication-settings', authorize('superadmin', 'org_admin'), updateCommunicationSettings);
router.post('/communication-settings/test-smtp', authorize('superadmin', 'org_admin'), testSmtpSettings);
router.post('/communication-settings/test-whatsapp', authorize('superadmin', 'org_admin'), testWhatsAppSettings);
router.get('/communication-settings/email-template-preview', authorize('superadmin', 'org_admin'), getEmailTemplatePreview);

// Communication Audit Logs & Resend
router.get('/communication-logs', authorize('superadmin', 'org_admin'), getOrgCommunicationLogs);
router.post('/communication-logs/:id/resend', authorize('superadmin', 'org_admin'), resendOrgCommunicationLog);

// Login Branding
router.post('/login-branding/init', authorize('org_admin', 'superadmin'), initLoginBranding);
router.put('/login-branding', authorize('org_admin', 'superadmin'), updateLoginBranding);

// Organization Bill History (must be before /:id)
router.get('/bills/history', authorize('superadmin', 'org_admin'), getBillHistory);

router
  .route('/:id')
  .get(getOrganization)
  .put(authorize('superadmin', 'org_admin'), auditLog('update', 'Organization'), updateOrganization)
  .delete(authorize('superadmin'), auditLog('delete', 'Organization'), deleteOrganization);

router.put('/:id/license', authorize('superadmin'), assignLicense);
router.get('/:id/month-enrollments', authorize('superadmin', 'org_admin'), getOrgMonthEnrollments);
router.post('/:id/generate-bill', authorize('superadmin'), generateOrgBill);
router.patch('/:id/bills/:billId/status', authorize('superadmin'), updateBillStatus);

export default router;
