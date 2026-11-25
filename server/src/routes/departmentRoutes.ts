import express from 'express';
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignManager,
  removeManager,
  addAssistantManager,
  removeAssistantManager,
  getSubDepartments,
  createSubDepartment,
  getDepartmentHierarchy,
  getMyDepartments,
} from '../controllers/departmentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { pageAction, type PageRequest } from '../access/pageGuard.js';
import prisma from '../lib/prisma.js';

const router = express.Router();

router.use(protect);

const DEPARTMENT_ADMINS = ['superadmin', 'org_admin'];
const MANAGER_ADMINS = ['superadmin', 'org_admin', 'hr_admin', 'hr_sub_admin'];

// A department named in the URL must belong to the caller's organization
router.param('id', async (req: PageRequest, res, next, id) => {
  try {
    if (req.user.role === 'superadmin') return next();
    const own = await prisma.department.findFirst({ where: { id, organizationId: req.user.organizationId }, select: { id: true } });
    if (!own) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Get departments managed by current user
router.get('/my-departments', getMyDepartments);

router
  .route('/')
  .get(getDepartments)
  .post(pageAction('departments', 'create', DEPARTMENT_ADMINS), createDepartment);

router
  .route('/:id')
  .get(getDepartment)
  .put(pageAction('departments', 'edit', DEPARTMENT_ADMINS), updateDepartment)
  .delete(pageAction('departments', 'delete', DEPARTMENT_ADMINS), deleteDepartment);

// Manager management
router.put('/:id/assign-manager', pageAction('managers', 'edit', MANAGER_ADMINS), assignManager);
router.delete('/:id/remove-manager', pageAction('managers', 'delete', MANAGER_ADMINS), removeManager);

// Assistant manager management
router.post('/:id/assistant-managers', authorize('superadmin', 'org_admin'), addAssistantManager);
router.delete('/:id/assistant-managers/:userId', authorize('superadmin', 'org_admin'), removeAssistantManager);

// Sub-departments
router.get('/:id/sub-departments', getSubDepartments);
router.post('/:id/sub-departments', pageAction('departments', 'create', DEPARTMENT_ADMINS), createSubDepartment);

// Department hierarchy
router.get('/:id/hierarchy', getDepartmentHierarchy);

export default router;
