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

const router = Router();

// Protect all routes
router.use(protect);
router.use(requireAcademicCentersEnabled);

// Get classes for a specific center
router.get('/center/:centerId', getClassesByCenter);

// Create, update, delete
router.post('/', authorize('org_admin', 'superadmin'), createClass);
router.put('/:id', authorize('org_admin', 'superadmin'), updateClass);
router.delete('/:id', authorize('org_admin', 'superadmin'), deleteClass);

// Students of a class (used for blocking video access in online classes)
router.get('/:id/students', authorize('org_admin', 'superadmin'), getClassStudents);

// Everything faculty uploaded to a class (read-only view for admins)
router.get('/:id/content', authorize('org_admin', 'superadmin'), getClassContent);

// Get transfer history for a class
router.get('/:id/transfer-history', authorize('faculty'), getTransferHistory);

export default router;
