import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getFilterTypes, createFilterType, updateFilterType, deleteFilterType,
  addFilterOption, updateFilterOption, deleteFilterOption,
} from '../controllers/studentFilterController.js';

const router = express.Router();
router.use(protect);

// Any signed-in staff member can read the filters (the student directory needs them); only org admins change them
router.get('/', getFilterTypes);
router.post('/', authorize('org_admin', 'superadmin'), createFilterType);
router.put('/options/:optionId', authorize('org_admin', 'superadmin'), updateFilterOption);
router.delete('/options/:optionId', authorize('org_admin', 'superadmin'), deleteFilterOption);
router.put('/:id', authorize('org_admin', 'superadmin'), updateFilterType);
router.delete('/:id', authorize('org_admin', 'superadmin'), deleteFilterType);
router.post('/:id/options', authorize('org_admin', 'superadmin'), addFilterOption);

export default router;
