import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { appointmentError, type PageRequest } from '../access/pageGuard.js';

// A department's organization and managers are not set through create or edit requests
const departmentFields = (body: any) => {
  const { id: _id, organizationId: _organizationId, managerId: _managerId, manager: _manager, assistantManagers: _assistants, ...fields } = body || {};
  return fields;
};

/** The named parent, if any, is a department of the same organization */
const parentInOrganization = async (parentId: unknown, organizationId: string) =>
  !parentId || Boolean(await prisma.department.findFirst({ where: { id: String(parentId), organizationId }, select: { id: true } }));

// @desc    Get all departments
// @route   GET /api/v1/departments
// @access  Private
export const getDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = {};
  
  if (req.user.role !== 'superadmin') {
    where.organizationId = req.user.organizationId;
  }

  // Filter by parent department if specified
  if (req.query.parentDepartmentId) {
    where.parentDepartmentId = req.query.parentDepartmentId as string;
  } else if (req.query.topLevel === 'true') {
    // Only get top-level departments (no parent)
    where.parentDepartmentId = null;
  }

  const departments = await prisma.department.findMany({
    where,
    include: {
      organization: { select: { name: true } },
      parentDepartment: { select: { name: true } },
      manager: { select: { name: true, email: true, designation: true } },
    }
  });

  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments,
  });
});

// @desc    Get single department
// @route   GET /api/v1/departments/:id
// @access  Private
export const getDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const department = await prisma.department.findUnique({
    where: { id: req.params.id },
    include: {
      organization: { select: { name: true } },
      parentDepartment: { select: { name: true } },
      manager: { select: { name: true, email: true, designation: true } },
    }
  });

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: department,
  });
});

// @desc    Create department
// @route   POST /api/v1/departments
// @access  Private (OrgAdmin)
export const createDepartment = asyncHandler(async (req: PageRequest, res: Response) => {
  if (req.user.role !== 'superadmin') {
    req.body.organizationId = req.user.organizationId;
  } else if (!req.body.organizationId) {
    res.status(400).json({ 
      success: false, 
      message: 'Organization ID is required for superadmin' 
    });
    return;
  }

  const organizationId = req.body.organizationId;
  const data = req.ownBranchOnly
    ? { name: req.body.name, type: req.body.type, description: req.body.description, parentDepartmentId: req.body.parentDepartmentId }
    : departmentFields(req.body);
  if (!req.ownBranchOnly && req.body.managerId) {
    if (await appointmentError(req, req.body.managerId)) {
      res.status(404).json({ success: false, message: 'That person was not found' });
      return;
    }
    (data as any).managerId = req.body.managerId;
  }
  if (!(await parentInOrganization(data.parentDepartmentId, organizationId))) {
    res.status(404).json({ success: false, message: 'Parent department not found' });
    return;
  }

  const department = await prisma.department.create({
    data: { ...data, organizationId }
  });

  res.status(201).json({
    success: true,
    data: department,
  });
});

// @desc    Update department
// @route   PUT /api/v1/departments/:id
// @access  Private (OrgAdmin)
export const updateDepartment = asyncHandler(async (req: PageRequest, res: Response) => {
  const current = await prisma.department.findUnique({ where: { id: req.params.id }, select: { organizationId: true } });
  if (!current) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }
  // A department's type decides its members' screens, so given access cannot change it
  if (req.ownBranchOnly && req.params.id === req.user.departmentId) {
    res.status(403).json({ success: false, message: 'You cannot change your own department' });
    return;
  }
  const data = req.ownBranchOnly
    ? { name: req.body.name, description: req.body.description, status: req.body.status }
    : departmentFields(req.body);
  // Managers are still set by an Org Admin from the edit form
  if (!req.ownBranchOnly && req.body.managerId !== undefined) {
    if (req.body.managerId && (await appointmentError(req, req.body.managerId))) {
      res.status(404).json({ success: false, message: 'That person was not found' });
      return;
    }
    data.managerId = req.body.managerId || null;
  }
  if (!(await parentInOrganization((data as any).parentDepartmentId, current.organizationId))) {
    res.status(404).json({ success: false, message: 'Parent department not found' });
    return;
  }
  const department = await prisma.department.update({
    where: { id: req.params.id },
    data
  });

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: department,
  });
});

// @desc    Delete department
// @route   DELETE /api/v1/departments/:id
// @access  Private (OrgAdmin)
export const deleteDepartment = asyncHandler(async (req: PageRequest, res: Response) => {
  const department = await prisma.department.findUnique({ where: { id: req.params.id } });
  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }
  if (req.ownBranchOnly && department.id === req.user.departmentId) {
    res.status(403).json({ success: false, message: 'You cannot delete your own department' });
    return;
  }
  await prisma.department.delete({
    where: { id: req.params.id }
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Assign manager to department
// @route   PUT /api/v1/departments/:id/assign-manager
// @access  Private (OrgAdmin, Superadmin)
export const assignManager = asyncHandler(async (req: PageRequest, res: Response) => {
  const { managerId } = req.body;

  if (!managerId) {
    res.status(400).json({ success: false, message: 'Manager ID is required' });
    return;
  }

  const refusal = await appointmentError(req, managerId);
  if (refusal) {
    res.status(403).json({ success: false, message: refusal });
    return;
  }

  const department = await prisma.department.update({
    where: { id: req.params.id },
    data: { managerId },
    include: {
      manager: { select: { name: true, email: true, designation: true } }
    }
  });

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: department,
    message: 'Manager assigned successfully',
  });
});

// @desc    Remove manager from department
// @route   DELETE /api/v1/departments/:id/remove-manager
// @access  Private (OrgAdmin, Superadmin)
export const removeManager = asyncHandler(async (req: AuthRequest, res: Response) => {
  const department = await prisma.department.update({
    where: { id: req.params.id },
    data: { managerId: null }
  });

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: department,
    message: 'Manager removed successfully',
  });
});

// @desc    Add assistant manager to department
// @route   POST /api/v1/departments/:id/assistant-managers
// @access  Private (OrgAdmin, Superadmin)
export const addAssistantManager = asyncHandler(async (req: PageRequest, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, message: 'User ID is required' });
    return;
  }

  const refusal = await appointmentError(req, userId);
  if (refusal) {
    res.status(403).json({ success: false, message: refusal });
    return;
  }

  const department = await prisma.department.findUnique({
    where: { id: req.params.id },
    include: { assistantManagers: true }
  });

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  // Check if already an assistant manager
  if (department.assistantManagers.some(m => m.id === userId)) {
    res.status(400).json({ success: false, message: 'User is already an assistant manager' });
    return;
  }

  const updatedDept = await prisma.department.update({
    where: { id: req.params.id },
    data: {
      assistantManagers: {
        connect: { id: userId }
      }
    }
  });

  res.status(200).json({
    success: true,
    data: updatedDept,
    message: 'Assistant manager added successfully',
  });
});

// @desc    Remove assistant manager from department
// @route   DELETE /api/v1/departments/:id/assistant-managers/:userId
// @access  Private (OrgAdmin, Superadmin)
export const removeAssistantManager = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const department = await prisma.department.findUnique({
    where: { id: req.params.id },
    include: { assistantManagers: true }
  });

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  const updatedDept = await prisma.department.update({
    where: { id: req.params.id },
    data: {
      assistantManagers: {
        disconnect: { id: userId }
      }
    }
  });

  res.status(200).json({
    success: true,
    data: updatedDept,
    message: 'Assistant manager removed successfully',
  });
});

// @desc    Get sub-departments
// @route   GET /api/v1/departments/:id/sub-departments
// @access  Private
export const getSubDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subDepartments = await prisma.department.findMany({ 
    where: { parentDepartmentId: req.params.id },
    include: {
      manager: { select: { name: true, email: true, designation: true } }
    }
  });

  res.status(200).json({
    success: true,
    count: subDepartments.length,
    data: subDepartments,
  });
});

// @desc    Create sub-department
// @route   POST /api/v1/departments/:id/sub-departments
// @access  Private (OrgAdmin, Department Manager)
export const createSubDepartment = asyncHandler(async (req: PageRequest, res: Response) => {
  const parentDepartment = await prisma.department.findUnique({
    where: { id: req.params.id }
  });

  if (!parentDepartment) {
    res.status(404).json({ success: false, message: 'Parent department not found' });
    return;
  }

  req.body = req.ownBranchOnly ? { name: req.body.name, description: req.body.description } : departmentFields(req.body);
  req.body.organizationId = parentDepartment.organizationId;
  req.body.parentDepartmentId = req.params.id;
  req.body.type = parentDepartment.type; // Inherit type from parent

  const subDepartment = await prisma.department.create({
    data: req.body
  });

  res.status(201).json({
    success: true,
    data: subDepartment,
    message: 'Sub-department created successfully',
  });
});

// @desc    Get department hierarchy (with sub-departments)
// @route   GET /api/v1/departments/:id/hierarchy
// @access  Private
export const getDepartmentHierarchy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const department = await prisma.department.findUnique({
    where: { id: req.params.id },
    include: {
      manager: { select: { name: true, email: true, designation: true } }
    }
  });

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  const subDepartments = await prisma.department.findMany({ 
    where: { parentDepartmentId: req.params.id },
    include: {
      manager: { select: { name: true, email: true, designation: true } }
    }
  });

  res.status(200).json({
    success: true,
    data: {
      department,
      subDepartments,
    },
  });
});

// @desc    Get departments managed by user
// @route   GET /api/v1/departments/my-departments
// @access  Private
export const getMyDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const departments = await prisma.department.findMany({
    where: {
      OR: [
        { managerId: req.user.id },
        { assistantManagers: { some: { id: req.user.id } } }
      ]
    },
    include: {
      organization: { select: { name: true } },
      parentDepartment: { select: { name: true } },
      manager: { select: { name: true, email: true, designation: true } },
    }
  });

  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments,
  });
});
