/**
 * Study Abroad Partners — HTTP endpoints (mounted at /api/v1/study-abroad)
 *
 * Org admin only:  /partners (partner management and logins)
 * Applications run in their own pipeline (applications.ts), separate from the core Enrollment flow.
 * Partner portal (study_abroad_admin):  /me/*
 */
import express from 'express';
import { protect, authorize } from '../../middleware/auth.js';
import * as c from './controller.js';
import * as a from './applications.js';
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

// ── Partner portal: the study abroad pipeline (separate from the core Enrollment flow) ──
router.get('/me/applications', authorize(PARTNER), a.listMyApplications);
router.post('/me/applications', authorize(PARTNER), a.createMyApplication);
router.get('/me/commission', authorize(PARTNER), a.myCommission);
router.get('/me/applications/:id', authorize(PARTNER), a.getMyApplication);
router.put('/me/applications/:id/documents', authorize(PARTNER), a.updateMyDocuments);
router.put('/me/applications/:id/offer-response', authorize(PARTNER), a.respondToOffer);
router.put('/me/applications/:id/payment', authorize(PARTNER), a.submitPayment);
router.put('/me/applications/:id/visa-documents', authorize(PARTNER), a.submitVisaDocuments);
router.put('/me/applications/:id/withdraw', authorize(PARTNER), a.withdrawMine);

// ── Org admin: pipeline and commission ──
router.get('/applications', authorize(...ORG), a.listApplications);
router.get('/commissions', authorize(...ORG), a.commissionSummary);
router.get('/commission-rates', authorize(...ORG), a.listCommissionRates);
router.put('/commission-rates/:programId', authorize(...ORG), a.setCommissionRate);
router.get('/applications/:id', authorize(...ORG), a.getApplication);
router.put('/applications/:id/review', authorize(...ORG), a.reviewApplication);
router.put('/applications/:id/interview', authorize(...ORG), a.updateInterview);
router.put('/applications/:id/offer', authorize(...ORG), a.issueOffer);
router.put('/applications/:id/verify-payment', authorize(...ORG), a.verifyPayment);
router.put('/applications/:id/verify-visa-documents', authorize(...ORG), a.verifyVisaDocuments);
router.put('/applications/:id/visa-decision', authorize(...ORG), a.setVisaDecision);
router.put('/applications/:id/withdraw', authorize(...ORG), a.withdrawApplication);
router.post('/applications/:id/release-commission', authorize(...ORG), a.releaseCommission);

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
