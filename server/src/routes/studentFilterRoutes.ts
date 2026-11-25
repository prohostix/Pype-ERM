import express from 'express';
import { protect } from '../middleware/auth.js';
import { pageAction } from '../access/pageGuard.js';
import {
  getFilterTypes, createFilterType, updateFilterType, deleteFilterType,
  addFilterOption, updateFilterOption, deleteFilterOption,
} from '../controllers/studentFilterController.js';

const router = express.Router();

const ADMINS = ['org_admin', 'superadmin'];
const filters = (action: 'create' | 'edit' | 'delete') => pageAction('student_filters', action, ADMINS);
router.use(protect);

// Any signed-in staff member can read the filters (the student directory needs them); changing them needs the Student Filters permission
router.get('/', getFilterTypes);
router.post('/', filters('create'), createFilterType);
router.put('/options/:optionId', filters('edit'), updateFilterOption);
router.delete('/options/:optionId', filters('delete'), deleteFilterOption);
router.put('/:id', filters('edit'), updateFilterType);
router.delete('/:id', filters('delete'), deleteFilterType);
router.post('/:id/options', filters('edit'), addFilterOption);

export default router;
