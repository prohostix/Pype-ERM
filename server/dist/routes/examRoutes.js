import express from 'express';
import { getExamRegistrations, getExamRegistration, createExamRegistration, updateExamRegistration, deleteExamRegistration } from '../controllers/examController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();
router.use(protect);
router.route('/')
    .get(authorize('superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee'), getExamRegistrations)
    .post(authorize('superadmin', 'org_admin', 'ops_admin', 'employee'), createExamRegistration);
router.route('/:id')
    .get(authorize('superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee'), getExamRegistration)
    .put(authorize('superadmin', 'org_admin', 'ops_admin', 'employee'), updateExamRegistration)
    .delete(authorize('superadmin', 'org_admin', 'ops_admin', 'employee'), deleteExamRegistration);
export default router;
//# sourceMappingURL=examRoutes.js.map