import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import crypto from 'crypto';
export const generateReferralLink = asyncHandler(async (req, res) => {
    const slug = req.body.customSlug || `${req.user.name.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomBytes(4).toString('hex')}`;
    // Since model only requires code, userId, organizationId
    const link = await prisma.referralLink.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
            code: slug
        }
    });
    res.status(201).json({ success: true, data: { ...link, slug, fullUrl: `${process.env.FRONTEND_URL}/referral/${slug}`, status: 'active' } });
});
export const getMyReferralLinks = asyncHandler(async (req, res) => {
    const links = await prisma.referralLink.findMany({ where: { userId: req.user.id } });
    const mapped = links.map(l => ({ ...l, slug: l.code, fullUrl: `${process.env.FRONTEND_URL}/referral/${l.code}`, status: 'active' }));
    res.json({ success: true, count: mapped.length, data: mapped });
});
export const getAllReferralLinks = asyncHandler(async (req, res) => {
    const links = await prisma.referralLink.findMany({ where: { organizationId: req.user.organizationId } });
    const mapped = links.map(l => ({ ...l, slug: l.code, fullUrl: `${process.env.FRONTEND_URL}/referral/${l.code}`, status: 'active' }));
    res.json({ success: true, count: mapped.length, data: mapped });
});
export const updateReferralLinkStatus = asyncHandler(async (req, res) => {
    res.json({ success: true, data: { id: req.params.id, status: req.body.status } });
});
export const getReferredCenters = asyncHandler(async (req, res) => {
    const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId, referredBy: req.user.id } });
    res.json({ success: true, count: centers.length, data: centers });
});
export const getReferredStudents = asyncHandler(async (req, res) => {
    res.json({ success: true, data: [] });
});
export const getReferralMetrics = asyncHandler(async (req, res) => {
    res.json({ success: true, data: {} });
});
export const validateReferralSlug = asyncHandler(async (req, res) => {
    const link = await prisma.referralLink.findUnique({ where: { code: req.params.slug } });
    res.json({ success: true, data: link ? { ...link, slug: link.code, fullUrl: `${process.env.FRONTEND_URL}/referral/${link.code}`, status: 'active' } : null });
});
export const getReferralLeaderboard = asyncHandler(async (req, res) => {
    res.json({ success: true, data: [] });
});
//# sourceMappingURL=referralController.js.map