import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';

// Safe user select — never expose password hash
const USER_SELECT = {
  id: true, userId: true, email: true, name: true, role: true,
  phone: true, designation: true, status: true, lastLogin: true,
  avatar: true, reportingTo: true, organizationId: true,
  departmentId: true, subDepartmentId: true, branchId: true, studyCenterId: true,
  biometricId: true, additionalDepartmentIds: true,
  allowSystemPunchIn: true, requireSelfiePunchIn: true,
  organization: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
};

// Roles each creator level is allowed to create
const CREATABLE_ROLES: Record<string, string[]> = {
  superadmin: ['superadmin', 'org_admin', 'ceo', 'general_manager', 'finance_admin', 'hr_admin', 'ops_admin', 'sales_admin', 'collections_admin', 'center_admin', 'sales', 'sales_agent', 'bde', 'ops_sub_admin', 'staff', 'employee'],
  org_admin: ['ceo', 'general_manager', 'finance_admin', 'hr_admin', 'ops_admin', 'sales_admin', 'collections_admin', 'center_admin', 'sales', 'sales_agent', 'bde', 'ops_sub_admin', 'staff', 'employee'],
  ceo: ['general_manager', 'finance_admin', 'hr_admin', 'ops_admin', 'sales_admin', 'collections_admin', 'center_admin', 'sales', 'sales_agent', 'bde', 'ops_sub_admin', 'staff', 'employee'],
  general_manager: ['finance_admin', 'hr_admin', 'ops_admin', 'sales_admin', 'collections_admin', 'center_admin', 'sales', 'sales_agent', 'bde', 'ops_sub_admin', 'staff', 'employee'],
  finance_admin: ['staff', 'employee'],
  hr_admin: ['hr_admin', 'general_manager', 'finance_admin', 'ops_admin', 'sales_admin', 'collections_admin', 'center_admin', 'ops_sub_admin', 'sales', 'sales_agent', 'bde', 'staff', 'employee'],
  ops_admin: ['ops_sub_admin', 'staff', 'employee'],
  sales_admin: ['sales', 'sales_agent', 'bde', 'staff', 'employee'],
  collections_admin: ['staff', 'employee'],
};

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = {};

  if (req.user.role !== 'superadmin') {
    where.organizationId = req.user.organizationId;
  }

  // Branch-level isolation for users list
  if (req.user.role !== 'superadmin' && req.user.role !== 'org_admin' && req.user.role !== 'ceo' && req.user.branchId) {
    where.branchId = req.user.branchId;
  }

  if (req.query.role) {
    where.role = req.query.role as string;
  }
  if (req.query.departmentId) where.departmentId = req.query.departmentId as string;
  if (req.query.status) where.status = req.query.status as string;

  // Exclude students from the general users list by checking their emails
  const studentQuery = where.organizationId ? { organizationId: where.organizationId } : {};
  const students = await prisma.student.findMany({ where: studentQuery, select: { email: true } });
  const studentEmails = students.map((s: any) => s.email);
  if (studentEmails.length > 0) {
    where.email = { notIn: studentEmails };
  }

  const users = await prisma.user.findMany({ where, select: USER_SELECT });

  res.status(200).json({ success: true, count: users.length, data: users });
});

export const getUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { id: req.params.id };
  if (req.user.role !== 'superadmin') where.organizationId = req.user.organizationId;

  const user = await prisma.user.findFirst({ where, select: USER_SELECT });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.status(200).json({ success: true, data: user });
});

export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    email, name, phone, role, designation, reportingTo,
    departmentId, subDepartmentId, branchId, studyCenterId,
    organizationId: bodyOrgId, status, password, biometricId,
    allowSystemPunchIn, requireSelfiePunchIn
  } = req.body;

  // Enforce org scoping
  const targetOrgId = req.user.role === 'superadmin' ? (bodyOrgId || req.user.organizationId) : req.user.organizationId;

  // Role restriction — callers can only create roles they're permitted to
  const callerRole = req.user.role as string;
  const allowed = CREATABLE_ROLES[callerRole] || [];
  if (role && !allowed.includes(role)) {
    res.status(403).json({ success: false, message: `You cannot create a user with role '${role}'` });
    return;
  }

  const userId = await generateUserId();
  const hashedPassword = password ? await hashPassword(password) : await hashPassword(`User@${Math.floor(100000 + Math.random() * 900000)}`);

  const user = await prisma.user.create({
    data: {
      userId,
      organizationId: targetOrgId,
      email,
      password: hashedPassword,
      name,
      role: role || 'staff',
      phone,
      designation,
      reportingTo,
      departmentId,
      subDepartmentId,
      branchId: branchId || undefined,
      studyCenterId: studyCenterId || undefined,
      status: status || 'active',
      biometricId: biometricId || undefined,
      allowSystemPunchIn: allowSystemPunchIn !== undefined ? allowSystemPunchIn : true,
      requireSelfiePunchIn: requireSelfiePunchIn !== undefined ? requireSelfiePunchIn : false,
    },
    select: USER_SELECT,
  });

  res.status(201).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { id: req.params.id };
  if (req.user.role !== 'superadmin') where.organizationId = req.user.organizationId;

  const userExists = await prisma.user.findFirst({ where });
  if (!userExists) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  // Only superadmin can change organizationId or role to a higher level
  const {
    name, phone, designation, reportingTo, status, avatar,
    departmentId, subDepartmentId, branchId, studyCenterId, role, password, biometricId, additionalDepartmentIds,
    allowSystemPunchIn, requireSelfiePunchIn
  } = req.body;

  // Role restriction on update
  if (role) {
    const callerRole = req.user.role as string;
    const allowed = CREATABLE_ROLES[callerRole] || [];
    if (!allowed.includes(role)) {
      res.status(403).json({ success: false, message: `You cannot assign role '${role}'` });
      return;
    }
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (designation !== undefined) updateData.designation = designation;
  if (reportingTo !== undefined) updateData.reportingTo = reportingTo;
  if (status !== undefined) updateData.status = status;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (biometricId !== undefined) updateData.biometricId = biometricId;
  if (departmentId !== undefined) updateData.departmentId = departmentId;
  if (subDepartmentId !== undefined) updateData.subDepartmentId = subDepartmentId;
  if (branchId !== undefined) updateData.branchId = branchId || null;
  if (studyCenterId !== undefined) updateData.studyCenterId = studyCenterId || null;
  if (additionalDepartmentIds !== undefined) updateData.additionalDepartmentIds = additionalDepartmentIds;
  if (role !== undefined) updateData.role = role;
  if (password) updateData.password = await hashPassword(password);
  if (allowSystemPunchIn !== undefined) updateData.allowSystemPunchIn = allowSystemPunchIn;
  if (requireSelfiePunchIn !== undefined) updateData.requireSelfiePunchIn = requireSelfiePunchIn;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
    select: USER_SELECT,
  });

  res.status(200).json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { id: req.params.id };
  if (req.user.role !== 'superadmin') where.organizationId = req.user.organizationId;

  const user = await prisma.user.findFirst({ where });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});

export const getSubordinates = asyncHandler(async (req: AuthRequest, res: Response) => {
  const adminRole = req.user.role;
  let targetRoles: string[] = [];

  if (adminRole === 'finance_admin') {
    targetRoles = ['finance', 'collections', 'collections_admin'];
  } else if (adminRole === 'hr_admin') {
    targetRoles = ['employee', 'staff'];
  } else if (adminRole === 'ops_admin') {
    targetRoles = ['ops_sub_admin', 'center_admin', 'staff'];
  } else if (['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(adminRole)) {
    targetRoles = ['employee', 'staff', 'finance', 'ops_sub_admin', 'center_admin', 'collections', 'finance_admin', 'hr_admin', 'ops_admin'];
  }

  const where: any = {
    role: { in: targetRoles }
  };

  if (adminRole !== 'superadmin' && req.user.organizationId) {
    where.organizationId = req.user.organizationId;
  }

  // Filter to only show direct subordinates for department-level admins
  if (!['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(adminRole)) {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { designations: { select: { id: true } } }
    });

    const designationIds = currentUser?.designations?.map((d: any) => d.id) || [];

    if (designationIds.length > 0) {
      // If user has a role in the modern Org Chart, fetch subordinates based on designation hierarchy
      where.designations = {
        some: {
          parentDesignationId: { in: designationIds }
        }
      };
    } else {
      // Fallback to legacy reportingTo field
      where.reportingTo = req.user.id;
    }
  }

  // Exclude students from subordinates list
  const studentQuery = where.organizationId ? { organizationId: where.organizationId } : {};
  const students = await prisma.student.findMany({ where: studentQuery, select: { email: true } });
  const studentEmails = students.map((s: any) => s.email);
  if (studentEmails.length > 0) {
    where.email = { notIn: studentEmails };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      permissions: true,
      subDepartmentId: true,
      branchId: true,
      department: {
        select: {
          type: true
        }
      }
    }
  });

  res.json({ success: true, data: users });
});

export const updateUserPermissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    res.status(400).json({ success: false, message: 'Permissions must be an array' });
    return;
  }

  // Ensure user exists and belongs to the same org
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser || (req.user.role !== 'superadmin' && targetUser.organizationId !== req.user.organizationId)) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  // Security check: Verify the admin is allowed to manage this user's role
  const adminRole = req.user.role;
  let allowedRoles: string[] = [];

  if (adminRole === 'finance_admin') {
    allowedRoles = ['finance', 'collections', 'collections_admin'];
  } else if (adminRole === 'hr_admin') {
    allowedRoles = ['employee', 'staff'];
  } else if (adminRole === 'ops_admin') {
    allowedRoles = ['ops_sub_admin', 'center_admin', 'staff'];
  } else if (['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(adminRole)) {
    allowedRoles = ['employee', 'staff', 'finance', 'ops_sub_admin', 'center_admin', 'collections', 'finance_admin', 'hr_admin', 'ops_admin'];
  }

  if (!allowedRoles.includes(targetUser.role)) {
    res.status(403).json({ success: false, message: 'Forbidden: You cannot modify permissions for this user role' });
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { permissions },
    select: {
      id: true,
      name: true,
      role: true,
      permissions: true
    }
  });

  res.json({ success: true, data: updatedUser, message: 'Permissions updated successfully' });
});
