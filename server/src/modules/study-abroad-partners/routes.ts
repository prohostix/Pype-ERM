/**
 * Study Abroad Partners — HTTP endpoints (mounted at /api/v1/study-abroad)
 *
 * Staff (Sales/Ops/Finance/Org):  /partners, /enrollments/review
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
const OPS = ['ops_admin', 'ops_sub_admin'] as const;
const FINANCE = ['finance_admin', 'finance_sub_admin'] as const;
const SALES = ['sales_admin', 'sales_sub_admin'] as const;
const PARTNER = 'study_abroad_admin';

// ── Partner portal ──────────────────────────────────────────────────────────
router.get('/me', authorize(PARTNER), c.getMyPartner);
router.get('/me/enrollments', authorize(PARTNER), c.getMyEnrollments);
router.post('/me/enrollments', authorize(PARTNER), c.createMyEnrollment);
router.post('/me/enrollments/:id/documents', authorize(PARTNER), upload.array('documents', 10), c.uploadEnrollmentDocuments);
router.put('/me/enrollments/:id/resubmit', authorize(PARTNER), c.resubmitMyEnrollment);


// ── Application review ──────────────────────────────────────────────────────
router.get('/enrollments/review', authorize(...OPS, ...FINANCE, ...ORG, 'ceo', 'general_manager'), c.listEnrollmentsForReview);
router.put('/enrollments/:id/ops-approve', authorize(...OPS, ...ORG), c.opsApproveEnrollment);
router.put('/enrollments/:id/ops-reject', authorize(...OPS, ...ORG), c.opsRejectEnrollment);
router.put('/enrollments/:id/finance-approve', authorize(...FINANCE, ...ORG), c.financeApproveEnrollment);
router.put('/enrollments/:id/finance-reject', authorize(...FINANCE, ...ORG), c.financeRejectEnrollment);

// ── Partner management (static paths above must stay before /partners/:id) ──
router.get('/partners', authorize(...OPS, ...FINANCE, ...SALES, ...ORG, 'ceo', 'general_manager'), c.listPartners);
router.post('/partners', authorize(...SALES, ...OPS, ...ORG), c.createPartner);
router.get('/partners/:id', authorize(...OPS, ...FINANCE, ...SALES, ...ORG, 'ceo', 'general_manager'), c.getPartner);
router.put('/partners/:id', authorize(...OPS, ...SALES, ...ORG), c.updatePartner);
router.put('/partners/:id/countries', authorize(...OPS, ...ORG), c.setPartnerCountries);
router.put('/partners/:id/reset-password', authorize(...OPS, ...SALES, ...ORG), c.resetPartnerPassword);
router.put('/partners/:id/suspend', authorize(...ORG), c.suspendPartner);
router.put('/partners/:id/reactivate', authorize(...ORG), c.reactivatePartner);

export default router;
