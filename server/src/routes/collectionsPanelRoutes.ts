import express, { Response, NextFunction } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import {
  getCollectionOverseers,
  addCollectionOverseer,
  removeCollectionOverseer,
  getCollectionMetrics
} from '../controllers/collectionsPanelController.js';

const router = express.Router();

// Middleware to check if user is admin OR designated overseer
const checkCollectionOversightAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const isAdmin = ['superadmin', 'org_admin', 'finance_admin'].includes(req.user?.role || '');
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

  res.status(403).json({
    success: false,
    message: 'Access denied: You do not have permission to oversee collections'
  });
};

router.use(protect);

// Metrics endpoint (accessible by Admins or Overseers)
router.get('/metrics', checkCollectionOversightAccess, getCollectionMetrics);

// Overseer management endpoints (Restricted to organization admins)
router.route('/overseers')
  .get(authorize('superadmin', 'org_admin', 'finance_admin'), getCollectionOverseers)
  .post(authorize('superadmin', 'org_admin', 'finance_admin'), addCollectionOverseer);

router.delete('/overseers/:userId', authorize('superadmin', 'org_admin', 'finance_admin'), removeCollectionOverseer);

export default router;
