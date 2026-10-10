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
  assignedSalesUsers: true,
  allowSystemPunchIn: true, requireSelfiePunchIn: true, allowAnywherePunchIn: true, requiresAttendance: true,
  organization: { select: { id: true, name: true } },
  department: { select: { id: true, name: true, type: true } },
  branch: { select: { id: true, name: true } },
};

// Roles each creator level is allowed to create
const CREATABLE_ROLES: Record<string, string[]> = {
  superadmin: ['superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin', 'center_admin', 'sales', 'ops_sub_admin', 'student', 'employee'],
  org_admin: ['ceo', 'general_manager', 'branch_manager', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin', 'center_admin', 'sales', 'ops_sub_admin', 'student', 'employee'],
  ceo: ['general_manager', 'branch_manager', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin', 'center_admin', 'sales', 'ops_sub_admin', 'student', 'employee'],
  branch_manager: ['finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin', 'center_admin', 'sales', 'ops_sub_admin', 'student', 'employee'],
  general_manager: ['finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin', 'center_admin', 'sales', 'ops_sub_admin', 'student', 'employee'],
  finance_admin: ['student', 'employee'],
  finance_sub_admin: ['student', 'employee'],
  hr_admin: ['hr_admin', 'hr_sub_admin', 'general_manager', 'branch_manager', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin', 'center_admin', 'ops_sub_admin', 'sales', 'student', 'employee'],
  hr_sub_admin: ['hr_sub_admin', 'general_manager', 'branch_manager', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'collections_admin', 'center_admin', 'ops_sub_admin', 'sales', 'student', 'employee'],
  ops_admin: ['ops_sub_admin', 'student', 'employee'],
  sales_admin: ['sales_sub_admin', 'sales', 'student', 'employee'],
  sales_sub_admin: ['sales', 'student', 'employee'],
  collections_admin: ['student', 'employee'],
};

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = {};

  if (req.user.role !== 'superadmin') {
    where.organizationId = req.user.organizationId;
  }

  // Branch-level isolation for users list (admins and HR should see all branches)
  const globalRoles = [
    'superadmin', 'org_admin', 'ceo', 'general_manager'
  ];
  
  if (!globalRoles.includes(req.user.role) && req.user.branchId) {
    where.branchId = req.user.branchId;
  }

  if (req.query.role) {
    where.role = req.query.role as string;
  }
  if (req.query.departmentId) where.departmentId = req.query.departmentId as string;
  if (req.query.status) where.status = req.query.status as string;

  if (!req.query.role) {
    if (['hr_admin', 'hr_sub_admin'].includes(req.user.role)) {
      where.role = { notIn: ['student', 'center_admin'] };
    } else {
      where.role = { not: 'student' };
    }
  } else if (req.query.role === 'center_admin' && ['hr_admin', 'hr_sub_admin'].includes(req.user.role)) {
    // Prevent HR from explicitly fetching center admins
    where.role = 'none'; // invalid role to return empty
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
    allowSystemPunchIn, requireSelfiePunchIn, allowAnywherePunchIn, requiresAttendance
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

  let finalRole = role || 'student';
  if (reportingTo) {
    const manager = await prisma.user.findUnique({ where: { id: reportingTo }, select: { role: true } });
    if (manager?.role === 'finance_admin' || manager?.role === 'finance_sub_admin') {
      finalRole = 'finance_sub_admin';
    } else if (manager?.role === 'sales_admin' || manager?.role === 'sales_sub_admin') {
      finalRole = 'sales_sub_admin';
    }
  }

  const user = await prisma.user.create({
    data: {
      userId,
      organizationId: targetOrgId,
      email,
      password: hashedPassword,
      name,
      role: finalRole,
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
      allowAnywherePunchIn: allowAnywherePunchIn !== undefined ? allowAnywherePunchIn : false,
      requiresAttendance: requiresAttendance !== undefined ? requiresAttendance : true,
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
    allowSystemPunchIn, requireSelfiePunchIn, allowAnywherePunchIn, requiresAttendance
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
  
  let finalRole = role !== undefined ? role : userExists.role;
  let finalReportingTo = reportingTo !== undefined ? reportingTo : userExists.reportingTo;
  
  if (finalReportingTo) {
    const manager = await prisma.user.findUnique({ where: { id: finalReportingTo }, select: { role: true } });
    if (manager?.role === 'finance_admin' || manager?.role === 'finance_sub_admin') {
      finalRole = 'finance_sub_admin';
    } else if (manager?.role === 'sales_admin' || manager?.role === 'sales_sub_admin') {
      finalRole = 'sales_sub_admin';
    }
  }
  
  if (finalRole !== userExists.role) updateData.role = finalRole;
  // If role was explicitly sent and equals finalRole, we update it too (handled by logic above)
  if (role !== undefined && finalRole === role) updateData.role = role;

  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (designation !== undefined) updateData.designation = designation;
  if (reportingTo !== undefined) updateData.reportingTo = reportingTo;
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
  if (allowAnywherePunchIn !== undefined) updateData.allowAnywherePunchIn = allowAnywherePunchIn;
  if (requiresAttendance !== undefined) updateData.requiresAttendance = requiresAttendance;

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

  // If the user is a center_admin and has a study center, delete the study center too
  if (user.role === 'center_admin' && user.studyCenterId) {
    const centerId = user.studyCenterId;
    await prisma.$transaction([
      prisma.student.updateMany({ where: { centerId }, data: { centerId: null } }),
      prisma.invoice.updateMany({ where: { centerId }, data: { centerId: null } }),
      prisma.enrollment.updateMany({ where: { studyCenterId: centerId }, data: { studyCenterId: null } }),
      prisma.admissionSession.updateMany({ where: { studyCenterId: centerId }, data: { studyCenterId: null } }),
      prisma.user.deleteMany({ where: { studyCenterId: centerId, role: 'center_admin' } }),
      prisma.user.updateMany({ where: { studyCenterId: centerId }, data: { studyCenterId: null } }),
      prisma.walletTopUp.deleteMany({ where: { studyCenterId: centerId } }),
      prisma.studyCenterWallet.deleteMany({ where: { studyCenterId: centerId } }),
      prisma.programAllocation.deleteMany({ where: { centerId } }),
      prisma.sessionRequest.deleteMany({ where: { centerId } }),
      prisma.target.deleteMany({ where: { centerId } }),
      prisma.studyCenter.delete({ where: { id: centerId } }),
    ]);
  } else {
    await prisma.user.delete({ where: { id: req.params.id } });
  }

  res.status(200).json({ success: true, data: {} });
});

export const getSubordinates = asyncHandler(async (req: AuthRequest, res: Response) => {
  const adminRole = req.user.role;
  let targetRoles: string[] = [];

  if (['finance_admin', 'finance_sub_admin'].includes(adminRole)) {
    targetRoles = ['finance', 'collections', 'collections_admin'];
  } else if (['hr_admin', 'hr_sub_admin'].includes(adminRole)) {
    targetRoles = ['employee', 'student'];
  } else if (adminRole === 'ops_admin' || adminRole === 'ops_sub_admin') {
    targetRoles = ['ops_sub_admin', 'center_admin', 'student', 'employee'];
  } else if (['sales_admin', 'sales_sub_admin'].includes(adminRole)) {
    targetRoles = ['sales_sub_admin', 'sales', 'student'];
  } else if (['superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager'].includes(adminRole)) {
    targetRoles = ['employee', 'student', 'finance', 'ops_sub_admin', 'center_admin', 'collections', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'sales'];
  }

  const where: any = {
    role: { in: targetRoles }
  };

  if (adminRole !== 'superadmin' && req.user.organizationId) {
    where.organizationId = req.user.organizationId;
  }

  // Exclude resigned employees from task assignees
  where.status = { not: 'resigned' };

  // Enforce branch isolation for non-global roles
  if (!['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(adminRole) && req.user.branchId) {
    where.branchId = req.user.branchId;
  }

  // Filter to only show direct subordinates for department-level admins
  // HR admins should see all users in their branch, not just direct subordinates
  if (!['superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager', 'hr_admin', 'hr_sub_admin'].includes(adminRole)) {
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
      // Modern Org Chart defines the true hierarchy, so we usually bypass legacy role restrictions
      if (['finance_admin', 'finance_sub_admin'].includes(adminRole)) {
        // Finance admins specifically requested not to see sales users in their subordinates
        where.role = { notIn: ['sales', 'sales_sub_admin', 'sales_admin'] };
      } else {
        delete where.role;
      }
    } else {
      // Fallback to legacy reportingTo field
      where.reportingTo = req.user.id;
    }
  }

  // Exclude students
  if (!where.role) {
    where.role = { not: 'student' };
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
      assignedSalesUsers: true,
      assignedOpsUsers: true,
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

  if (['finance_admin', 'finance_sub_admin'].includes(adminRole)) {
    allowedRoles = ['finance', 'collections', 'collections_admin'];
  } else if (['hr_admin', 'hr_sub_admin'].includes(adminRole)) {
    allowedRoles = ['employee', 'student'];
  } else if (adminRole === 'ops_admin') {
    allowedRoles = ['ops_sub_admin', 'center_admin', 'student'];
  } else if (['sales_admin', 'sales_sub_admin'].includes(adminRole)) {
    allowedRoles = ['sales', 'student', 'employee'];
  } else if (['superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager'].includes(adminRole)) {
    allowedRoles = ['employee', 'student', 'finance', 'ops_sub_admin', 'center_admin', 'collections', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'sales', 'collections_admin'];
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

export const updateSalesAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignedSalesUsers } = req.body;
  if (!Array.isArray(assignedSalesUsers)) {
    res.status(400).json({ success: false, message: 'Assigned users must be an array' });
    return;
  }
  
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { assignedSalesUsers },
    select: { id: true, assignedSalesUsers: true }
  });

  res.status(200).json({ success: true, data: user, message: 'Sales assignment updated successfully' });
});

export const updateOpsAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignedOpsUsers } = req.body;
  if (!Array.isArray(assignedOpsUsers)) {
    res.status(400).json({ success: false, message: 'Assigned ops users must be an array' });
    return;
  }
  
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { assignedOpsUsers },
    select: { id: true, assignedOpsUsers: true }
  });

  res.status(200).json({ success: true, data: user, message: 'Operations assignment updated successfully' });
});
