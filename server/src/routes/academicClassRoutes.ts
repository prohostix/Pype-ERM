import { Router } from 'express';
import { 
  getClassesByCenter, 
  createClass, 
  updateClass, 
  deleteClass,
  getTransferHistory,
  getClassStudents,
  getClassContent
} from '../controllers/academicClassController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireAcademicCentersEnabled } from '../middleware/orgFeature.js';
import { pageAction } from '../access/pageGuard.js';
import type { Action } from '../access/catalog.js';

const router = Router();

// Protect all routes
router.use(protect);
// Classes and batches are part of the Academic Centers page
const may = (action: Action) => pageAction('academic_centers', action, ['org_admin', 'superadmin']);
router.use(requireAcademicCentersEnabled);

// Get classes for a specific center
router.get('/center/:centerId', getClassesByCenter);

// Create, update, delete
router.post('/', may('create'), createClass);
router.put('/:id', may('edit'), updateClass);
router.delete('/:id', may('delete'), deleteClass);

// Students of a class (used for blocking video access in online classes)
router.get('/:id/students', may('view'), getClassStudents);

// Everything faculty uploaded to a class (read-only view for admins)
router.get('/:id/content', may('view'), getClassContent);

// Get transfer history for a class
router.get('/:id/transfer-history', authorize('faculty'), getTransferHistory);

export default router;
