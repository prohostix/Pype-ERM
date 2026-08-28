import express from 'express';
import {
  getDocumentLogs,
  getDocumentLog,
  createDocumentLog,
  updateDocumentLog,
} from '../controllers/documentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee', 'ops_sub_admin'), getDocumentLogs)
  .post(authorize('superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin'), createDocumentLog);

router.route('/:id')
  .get(authorize('superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee', 'ops_sub_admin'), getDocumentLog)
  .put(authorize('superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin'), updateDocumentLog);

export default router;
