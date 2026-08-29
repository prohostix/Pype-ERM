import express from 'express';
import { getUsers, getUser, createUser, updateUser, deleteUser, getSubordinates, updateUserPermissions, updateSalesAssignment, } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();
router.use(protect);
router
    .route('/')
    .get(getUsers)
    .post(authorize('superadmin', 'org_admin', 'hr_admin', 'hr_sub_admin'), createUser);
router
    .route('/subordinates/team')
    .get(authorize('finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'ops_sub_admin'), getSubordinates);
router
    .route('/:id')
    .get(getUser)
    .put(authorize('superadmin', 'org_admin', 'hr_admin', 'hr_sub_admin'), updateUser)
    .delete(authorize('superadmin', 'org_admin', 'hr_admin', 'hr_sub_admin'), deleteUser);
router
    .route('/:id/permissions')
    .put(authorize('finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'superadmin', 'sales_admin', 'sales_sub_admin', 'org_admin', 'ceo', 'general_manager'), updateUserPermissions);
router
    .route('/:id/sales-assignment')
    .put(authorize('superadmin', 'org_admin', 'ops_admin'), updateSalesAssignment);
export default router;
//# sourceMappingURL=userRoutes.js.map