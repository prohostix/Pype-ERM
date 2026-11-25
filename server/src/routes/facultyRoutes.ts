import express from 'express';
import { getFaculties, getFacultyById, createFaculty, updateFaculty, deleteFaculty } from '../controllers/facultyController.js';
import { protect } from '../middleware/auth.js';
import { pageAction } from '../access/pageGuard.js';
import type { Action } from '../access/catalog.js';

const router = express.Router();

router.use(protect);
const may = (action: Action) => pageAction('faculties', action, ['org_admin']);

router.get('/', may('view'), getFaculties);
router.get('/:id', may('view'), getFacultyById);
router.post('/', may('create'), createFaculty);
router.put('/:id', may('edit'), updateFaculty);
router.delete('/:id', may('delete'), deleteFaculty);

export default router;
