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
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('org_admin', 'superadmin'));

// Program-level access and fee locking configs
router.get('/program-access-configs', getProgramAccessConfigs);
router.put('/program-access-configs', updateProgramAccessConfigs);

// Center routes
router.get('/', getAcademicCenters);
router.get('/:id', getAcademicCenterById);
router.post('/', createAcademicCenter);
router.put('/:id', updateAcademicCenter);
router.put('/:id/access-config', updateAcademicCenterAccessConfig);
router.delete('/:id', deleteAcademicCenter);

export default router;
