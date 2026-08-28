import express from 'express';
import {
  getExamRegistrations,
  getExamRegistration,
  createExamRegistration,
  updateExamRegistration,
  deleteExamRegistration
} from '../controllers/examController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee', 'ops_sub_admin'), getExamRegistrations)
  .post(authorize('superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin'), createExamRegistration);

router.route('/:id')
  .get(authorize('superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee', 'ops_sub_admin'), getExamRegistration)
  .put(authorize('superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin'), updateExamRegistration)
  .delete(authorize('superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin'), deleteExamRegistration);

export default router;
