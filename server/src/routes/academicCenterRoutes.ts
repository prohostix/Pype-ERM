import express from 'express';
import {
  getAcademicCenters,
  getAcademicCenterById,
  createAcademicCenter,
  updateAcademicCenter,
  deleteAcademicCenter
} from '../controllers/academicCenterController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('org_admin'));

router.get('/', getAcademicCenters);
router.get('/:id', getAcademicCenterById);
router.post('/', createAcademicCenter);
router.put('/:id', updateAcademicCenter);
router.delete('/:id', deleteAcademicCenter);

export default router;
