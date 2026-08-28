import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { getCollectionOverseers, addCollectionOverseer, removeCollectionOverseer, getCollectionMetrics } from '../controllers/collectionsPanelController.js';
const router = express.Router();
// Middleware to check if user is admin OR designated overseer
const checkCollectionOversightAccess = async (req, res, next) => {
    const isAdmin = ['ceo', 'general_manager', 'superadmin', 'org_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin', 'collections'].includes(req.user?.role || '');
    if (isAdmin) {
        return next();
    }
    // Check if they are designated collections overseer
    const isOverseer = await prisma.collectionOverseer.findFirst({
        where: {
            userId: req.user.id,
            organizationId: req.user.organizationId
        }
    });
    if (isOverseer) {
        return next();
    }
    res.status(200).json({
        success: true, data: { currentUserOversight: { isOverseer: false } },
        message: 'Access denied: You do not have permission to oversee collections'
    });
};
router.use(protect);
// Metrics endpoint (accessible by Admins or Overseers)
router.get('/metrics', checkCollectionOversightAccess, getCollectionMetrics);
// Overseer management endpoints (Restricted to organization admins)
router.route('/overseers')
    .get(authorize('ceo', 'general_manager', 'superadmin', 'org_admin', 'finance_admin', 'finance_sub_admin'), getCollectionOverseers)
    .post(authorize('ceo', 'general_manager', 'superadmin', 'org_admin', 'finance_admin', 'finance_sub_admin'), addCollectionOverseer);
router.delete('/overseers/:userId', authorize('ceo', 'general_manager', 'superadmin', 'org_admin', 'finance_admin', 'finance_sub_admin'), removeCollectionOverseer);
export default router;
//# sourceMappingURL=collectionsPanelRoutes.js.map