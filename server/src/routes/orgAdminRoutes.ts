import express from 'express';
import {
  createCeoPanel, getCeoPanels, getCeoPanel, updateCeoPanel, deleteCeoPanel,
  createCustomDepartment, getCustomDepartments,
  getOrgHierarchy, assignHierarchy,
  getDesignations, createDesignation, updateDesignation, deleteDesignation,
  assignUserToDesignation, unassignUserFromDesignation,
} from '../controllers/orgAdminController.js';
import {
  getBranches, getBranch, createBranch, updateBranch, deleteBranch,
  assignBranchManager, updateBranchDepartments, getMyBranch,
} from '../controllers/branchController.js';
import { protect, authorize } from '../middleware/auth.js';
import { pageAction, anyPageAction, ownedBy } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

// Branch manager self-service — accessible to any authenticated user with a branchId
router.get('/branches/my', getMyBranch);

// Branches and positions follow per-user access; the rest of this router is for the roles below
const BRANCH_READERS = ['org_admin', 'superadmin', 'hr_admin', 'hr_sub_admin', 'ceo', 'general_manager', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'finance_admin', 'finance_sub_admin', 'ops_sub_admin', 'branch_manager'];
const STRUCTURE_ADMINS = ['org_admin', 'superadmin', 'hr_admin', 'hr_sub_admin', 'ceo', 'general_manager', 'branch_manager'];
const branch = { inOrganization: ownedBy('branch') };
const designation = { inOrganization: ownedBy('designation') };

router.get('/branches', anyPageAction(['branches', 'employees', 'users', 'org_chart'], 'view', BRANCH_READERS), getBranches);
router.get('/designations', anyPageAction(['org_chart', 'branch_hierarchy', 'users'], 'view', STRUCTURE_ADMINS), getDesignations);
router.post('/designations', pageAction('org_chart', 'create', STRUCTURE_ADMINS), createDesignation);
router.patch('/designations/:id', pageAction('org_chart', 'edit', STRUCTURE_ADMINS, designation), updateDesignation);
router.delete('/designations/:id', pageAction('org_chart', 'delete', STRUCTURE_ADMINS, designation), deleteDesignation);
router.patch('/designations/:id/assign', pageAction('org_chart', 'edit', STRUCTURE_ADMINS, designation), assignUserToDesignation);
router.patch('/designations/:id/unassign', pageAction('org_chart', 'edit', STRUCTURE_ADMINS, designation), unassignUserFromDesignation);
router.post('/branches', pageAction('branches', 'create', STRUCTURE_ADMINS), createBranch);
router.get('/branches/:id', pageAction('branches', 'view', STRUCTURE_ADMINS, branch), getBranch);
router.patch('/branches/:id', pageAction('branches', 'edit', STRUCTURE_ADMINS, branch), updateBranch);
router.delete('/branches/:id', pageAction('branches', 'delete', STRUCTURE_ADMINS, branch), deleteBranch);
router.patch('/branches/:id/manager', pageAction('branches', 'edit', STRUCTURE_ADMINS, branch), assignBranchManager);
router.patch('/branches/:id/departments', pageAction('branches', 'edit', STRUCTURE_ADMINS, branch), updateBranchDepartments);

router.use(authorize('org_admin', 'superadmin', 'hr_admin', 'hr_sub_admin', 'ceo', 'general_manager', 'branch_manager'));

// CEO Panel routes
router.route('/ceo-panels').get(getCeoPanels).post(createCeoPanel);
router.route('/ceo-panels/:id').get(getCeoPanel).patch(updateCeoPanel).delete(deleteCeoPanel);

// Custom Department routes
router.route('/departments/custom').get(getCustomDepartments).post(createCustomDepartment);

// Hierarchy routes
router.get('/hierarchy', getOrgHierarchy);
router.patch('/hierarchy/assign', assignHierarchy);

export default router;
