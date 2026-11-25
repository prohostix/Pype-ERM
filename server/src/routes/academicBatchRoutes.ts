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
import { requireAcademicCentersEnabled } from '../middleware/orgFeature.js';
import { pageAction } from '../access/pageGuard.js';
import type { Action } from '../access/catalog.js';

const router = Router();

// Protect all routes
router.use(protect);
// Classes and batches are part of the Academic Centers page
const may = (action: Action) => pageAction('academic_centers', action, ['org_admin', 'superadmin']);
router.use(requireAcademicCentersEnabled);

// Get batches for a specific class
router.get('/class/:classId', getBatchesByClass);

// Create, update, delete
router.post('/', may('create'), createBatch);
router.put('/:id', may('edit'), updateBatch);
router.delete('/:id', may('delete'), deleteBatch);

// Student Allocation Routes
router.get('/:id/students', getBatchStudents);
router.get('/:id/unallocated', getUnallocatedStudents);
router.post('/:id/smart-allocate', authorize('faculty'), smartAllocate);
router.post('/:id/manual-allocate', authorize('faculty'), manualAllocate);
router.post('/:id/transfer', authorize('faculty'), transferStudent);

export default router;
