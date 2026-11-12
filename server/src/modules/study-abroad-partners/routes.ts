/**
 * Study Abroad Partners — HTTP endpoints (mounted at /api/v1/study-abroad)
 *
 * Org admin only:  /partners (partner management and logins)
 * Applications are normal Enrollment rows, reviewed in Enrollment Review (Operations) and Enrollments (Finance).
 * Partner portal (study_abroad_admin):  /me/*
 */
import express from 'express';
import { protect, authorize } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import * as c from './controller.js';
import { requireStudyAbroadEnabled } from './featureGate.js';

const router = express.Router();
router.use(protect);
// Opt-in per organization: Superadmin switches it on in the plan configuration.
router.use(requireStudyAbroadEnabled);

const ORG = ['org_admin', 'superadmin'] as const;
const PARTNER = 'study_abroad_admin';

// ── Partner portal ──────────────────────────────────────────────────────────
router.get('/me', authorize(PARTNER), c.getMyPartner);
router.post('/me/verify-student', authorize(PARTNER), c.verifyStudent);
router.get('/me/catalog', authorize(PARTNER), c.getMyCatalog);
router.get('/me/enrollments', authorize(PARTNER), c.getMyEnrollments);
router.post('/me/enrollments', authorize(PARTNER), c.createMyEnrollment);
router.post('/me/enrollments/:id/documents', authorize(PARTNER), upload.array('documents', 10), c.uploadEnrollmentDocuments);
router.put('/me/enrollments/:id/resubmit', authorize(PARTNER), c.resubmitMyEnrollment);
router.put('/me/enrollments/:id/documents/:index', authorize(PARTNER), c.replaceDocument);
router.put('/me/enrollments/:id/photo', authorize(PARTNER), c.replacePhoto);
router.put('/me/enrollments/:id/receipt', authorize(PARTNER), c.replaceReceipt);


// ── Partner management (static paths above must stay before /partners/:id) ──
router.get('/partners', authorize(...ORG), c.listPartners);
router.post('/partners', authorize(...ORG), c.createPartner);
router.get('/partners/:id', authorize(...ORG), c.getPartner);
router.put('/partners/:id', authorize(...ORG), c.updatePartner);
router.put('/partners/:id/countries', authorize(...ORG), c.setPartnerCountries);
router.put('/partners/:id/reset-password', authorize(...ORG), c.resetPartnerPassword);
router.put('/partners/:id/suspend', authorize(...ORG), c.suspendPartner);
router.put('/partners/:id/reactivate', authorize(...ORG), c.reactivatePartner);

export default router;
