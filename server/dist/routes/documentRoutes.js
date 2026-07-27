import express from 'express';
import { getDocumentLogs, getDocumentLog, createDocumentLog, updateDocumentLog, } from '../controllers/documentController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();
router.use(protect);
router.route('/')
    .get(authorize('superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee'), getDocumentLogs)
    .post(authorize('superadmin', 'org_admin', 'ops_admin', 'employee'), createDocumentLog);
router.route('/:id')
    .get(authorize('superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee'), getDocumentLog)
    .put(authorize('superadmin', 'org_admin', 'ops_admin', 'employee'), updateDocumentLog);
export default router;
//# sourceMappingURL=documentRoutes.js.map