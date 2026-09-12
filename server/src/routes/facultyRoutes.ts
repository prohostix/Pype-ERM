import express from 'express';
import { getFaculties, getFacultyById, createFaculty, updateFaculty, deleteFaculty } from '../controllers/facultyController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('org_admin'));

router.get('/', getFaculties);
router.get('/:id', getFacultyById);
router.post('/', createFaculty);
router.put('/:id', updateFaculty);
router.delete('/:id', deleteFaculty);

export default router;
