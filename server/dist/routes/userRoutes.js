import express from 'express';
import { getUsers, getUser, createUser, updateUser, deleteUser, getSubordinates, updateUserPermissions, } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();
router.use(protect);
router
    .route('/')
    .get(getUsers)
    .post(authorize('superadmin', 'org_admin', 'hr_admin'), createUser);
router
    .route('/subordinates/team')
    .get(authorize('finance_admin', 'hr_admin', 'ops_admin'), getSubordinates);
router
    .route('/:id')
    .get(getUser)
    .put(authorize('superadmin', 'org_admin', 'hr_admin'), updateUser)
    .delete(authorize('superadmin', 'org_admin', 'hr_admin'), deleteUser);
router
    .route('/:id/permissions')
    .put(authorize('finance_admin', 'hr_admin', 'ops_admin', 'superadmin'), updateUserPermissions);
export default router;
//# sourceMappingURL=userRoutes.js.map