import express from 'express';
import {
  getAcademicCenters,
  getAcademicCenterById,
  createAcademicCenter,
  updateAcademicCenter,
  updateAcademicCenterAccessConfig,
  getProgramAccessConfigs,
  updateProgramAccessConfigs,
  deleteAcademicCenter
} from '../controllers/academicCenterController.js';
import { protect } from '../middleware/auth.js';
import { pageAction } from '../access/pageGuard.js';
import type { Action } from '../access/catalog.js';
import { requireAcademicCentersEnabled } from '../middleware/orgFeature.js';

const router = express.Router();

router.use(protect);
router.use(requireAcademicCentersEnabled);
const ORG_ADMINS = ['org_admin', 'superadmin'];
const may = (action: Action) => pageAction('academic_centers', action, ORG_ADMINS);

// Program-level access and fee locking configs
router.get('/program-access-configs', may('view'), getProgramAccessConfigs);
router.put('/program-access-configs', may('edit'), updateProgramAccessConfigs);

// Center routes
router.get('/', may('view'), getAcademicCenters);
router.get('/:id', may('view'), getAcademicCenterById);
router.post('/', may('create'), createAcademicCenter);
router.put('/:id', may('edit'), updateAcademicCenter);
router.put('/:id/access-config', may('edit'), updateAcademicCenterAccessConfig);
router.delete('/:id', may('delete'), deleteAcademicCenter);

export default router;
