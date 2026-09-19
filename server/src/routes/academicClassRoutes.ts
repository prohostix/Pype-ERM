import { Router } from 'express';
import { 
  getClassesByCenter, 
  createClass, 
  updateClass, 
  deleteClass,
  getTransferHistory
} from '../controllers/academicClassController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Protect all routes
router.use(protect);

// Get classes for a specific center
router.get('/center/:centerId', getClassesByCenter);

// Create, update, delete
router.post('/', authorize('org_admin', 'superadmin'), createClass);
router.put('/:id', authorize('org_admin', 'superadmin'), updateClass);
router.delete('/:id', authorize('org_admin', 'superadmin'), deleteClass);

// Get transfer history for a class
router.get('/:id/transfer-history', authorize('faculty'), getTransferHistory);

export default router;
