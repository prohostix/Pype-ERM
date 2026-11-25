import express from 'express';
import {
  getExamRegistrations,
  getExamRegistration,
  createExamRegistration,
  updateExamRegistration,
  deleteExamRegistration
} from '../controllers/examController.js';
import { protect } from '../middleware/auth.js';
import { pageAction } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(pageAction('exam_registration', 'view', ['superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee', 'ops_sub_admin']), getExamRegistrations)
  .post(pageAction('exam_registration', 'create', ['superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin']), createExamRegistration);

router.route('/:id')
  .get(pageAction('exam_registration', 'view', ['superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee', 'ops_sub_admin']), getExamRegistration)
  .put(pageAction('exam_registration', 'edit', ['superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin']), updateExamRegistration)
  .delete(pageAction('exam_registration', 'delete', ['superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin']), deleteExamRegistration);

export default router;
