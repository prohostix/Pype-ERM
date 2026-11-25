import express from 'express';
import {
  getUsers,
  getUserDepartmentCounts,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  guardUserDelete,
  getSubordinates,
  updateUserPermissions,
  updateSalesAssignment, updateOpsAssignment,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { pageAction } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

const USER_ADMINS = ['superadmin', 'org_admin', 'hr_admin', 'hr_sub_admin'];

router
  .route('/')
  .get(getUsers)
  .post(pageAction('users', 'create', USER_ADMINS), createUser);

router.get('/stats/departments', getUserDepartmentCounts);

router
  .route('/subordinates/team')
  .get(authorize('finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin'), getSubordinates);

router
  .route('/:id')
  .get(getUser)
  .put(pageAction('users', 'edit', USER_ADMINS), updateUser)
  .delete(pageAction('users', 'delete', USER_ADMINS), guardUserDelete, deleteUser);

router
  .route('/:id/permissions')
  .put(authorize('finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'superadmin', 'sales_admin', 'sales_sub_admin', 'org_admin', 'ceo', 'general_manager'), updateUserPermissions);

router
  .route('/:id/sales-assignment')
  .put(authorize('superadmin', 'org_admin', 'ops_admin', 'sales_admin'), updateSalesAssignment);

router
  .route('/:id/ops-assignment')
  .put(authorize('superadmin', 'org_admin', 'finance_admin'), updateOpsAssignment);
export default router;
