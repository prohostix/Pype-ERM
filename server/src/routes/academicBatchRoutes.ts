import { Router } from 'express';
import { 
  getBatchesByClass, 
  createBatch, 
  updateBatch, 
  deleteBatch,
  getBatchStudents,
  getUnallocatedStudents,
  smartAllocate,
  manualAllocate,
  transferStudent
} from '../controllers/academicBatchController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Protect all routes
router.use(protect);

// Get batches for a specific class
router.get('/class/:classId', getBatchesByClass);

// Create, update, delete
router.post('/', authorize('org_admin', 'superadmin'), createBatch);
router.put('/:id', authorize('org_admin', 'superadmin'), updateBatch);
router.delete('/:id', authorize('org_admin', 'superadmin'), deleteBatch);

// Student Allocation Routes
router.get('/:id/students', getBatchStudents);
router.get('/:id/unallocated', getUnallocatedStudents);
router.post('/:id/smart-allocate', authorize('org_admin', 'superadmin'), smartAllocate);
router.post('/:id/manual-allocate', authorize('org_admin', 'superadmin'), manualAllocate);
router.post('/:id/transfer', authorize('org_admin', 'superadmin'), transferStudent);

export default router;
