import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { isHrRole, manageableRoles, userChangeError, givenRoles, givenUserError } from '../utils/userGuards.js';
import { revokeOverrides } from '../access/load.js';
import type { PageRequest } from '../access/pageGuard.js';

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

// Scoping shared by the list and the department-count endpoints
const buildUserScope = (req: AuthRequest) => {
  const where: any = {};

  if (req.user.role !== 'superadmin') {
    where.organizationId = req.user.organizationId;
  }

  // Branch-level isolation for users list (admins and HR should see all branches)
  const globalRoles = [
    'superadmin', 'org_admin', 'ceo', 'general_manager'
  ];

  if (!globalRoles.includes(req.user.role) && req.user.branchId) {
    if (['hr_admin', 'hr_sub_admin'].includes(req.user.role)) {
      // HR also sees the General Manager, who belongs to no branch
      where.OR = [{ branchId: req.user.branchId }, { role: 'general_manager', branchId: null }];
    } else {
      where.branchId = req.user.branchId;
    }
  }
  return where;
};

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = buildUserScope(req);

  if (req.query.role) {
    where.role = req.query.role as string;
  }
  if (req.query.departmentId === 'unassigned') where.departmentId = null;
  else if (req.query.departmentId) where.departmentId = req.query.departmentId as string;
  if (req.query.status) where.status = req.query.status as string;

  if (!req.query.role) {
    if (['hr_admin', 'hr_sub_admin'].includes(req.user.role)) {
      where.role = { notIn: ['student', 'center_admin', 'study_abroad_admin'] };
    } else {
      where.role = { not: 'student' };
    }
  } else if (['center_admin', 'study_abroad_admin'].includes(req.query.role as string) && ['hr_admin', 'hr_sub_admin'].includes(req.user.role)) {
    // Prevent HR from explicitly fetching center admins
    where.role = 'none'; // invalid role to return empty
  }

  // Paged mode (used by the Users page): ?page=1&limit=12&search=...
  if (req.query.page) {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));
    const search = String(req.query.search || '').trim();

    if (!req.query.status) where.status = { not: 'resigned' };

    const and: any[] = [];
    if (where.OR) { and.push({ OR: where.OR }); delete where.OR; }
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { designation: { contains: search, mode: 'insensitive' } },
          { userId: { contains: search, mode: 'insensitive' } },
          { biometricId: { contains: search, mode: 'insensitive' } },
          { department: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, select: USER_SELECT, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    ]);

    res.status(200).json({
      success: true, count: users.length, data: users,
      total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)),
    });
    return;
  }

  const users = await prisma.user.findMany({ where, select: USER_SELECT });

  res.status(200).json({ success: true, count: users.length, data: users });
});

/** Number of (non-student, non-resigned) users per department and per role, for the Users page. */
export const getUserDepartmentCounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = buildUserScope(req);
  where.status = { not: 'resigned' };
  if (['hr_admin', 'hr_sub_admin'].includes(req.user.role)) {
    where.role = { notIn: ['student', 'center_admin', 'study_abroad_admin'] };
  } else {
    where.role = { not: 'student' };
  }

  const [groups, roleGroups] = await Promise.all([
    prisma.user.groupBy({ by: ['departmentId'], where, _count: { _all: true } }),
    prisma.user.groupBy({ by: ['role'], where, _count: { _all: true } }),
  ]);
  const data = groups.map(g => ({ departmentId: g.departmentId, count: g._count._all }));
  const roles = roleGroups.map(g => ({ role: g.role, count: g._count._all }));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  res.status(200).json({ success: true, data, roles, total });
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

export const createUser = asyncHandler(async (req: PageRequest, res: Response) => {
  const {
    email, name, phone, role, designation, reportingTo,
    departmentId, subDepartmentId, branchId, studyCenterId,
    organizationId: bodyOrgId, status, password, biometricId, additionalDepartmentIds,
    allowSystemPunchIn, requireSelfiePunchIn, allowAnywherePunchIn, requiresAttendance
  } = req.body;

  // Enforce org scoping
  const targetOrgId = req.user.role === 'superadmin' ? (bodyOrgId || req.user.organizationId) : req.user.organizationId;

  // Role restriction — callers can only create roles they're permitted to
  const callerRole = req.user.role as string;
  const allowed = req.ownBranchOnly ? givenRoles(callerRole) : CREATABLE_ROLES[callerRole] || [];
  if (role && !allowed.includes(role)) {
    res.status(403).json({ success: false, message: `You cannot create a user with role '${role}'` });
    return;
  }

  let finalRole = role || 'student';
  if (reportingTo) {
    const manager = await prisma.user.findUnique({ where: { id: reportingTo }, select: { role: true } });
    if (manager?.role === 'finance_admin' || manager?.role === 'finance_sub_admin') {
      finalRole = 'finance_sub_admin';
    } else if (manager?.role === 'sales_admin' || manager?.role === 'sales_sub_admin') {
      finalRole = 'sales_sub_admin';
    }
  }

  let finalBranchId = branchId;
  if (isHrRole(callerRole)) {
    if (!manageableRoles(callerRole, allowed).includes(finalRole)) {
      res.status(403).json({ success: false, message: `You cannot create a user with role '${finalRole}'` });
      return;
    }
    if (req.user.branchId) {
      if (branchId && branchId !== req.user.branchId) {
        res.status(403).json({ success: false, message: 'You can only create users in your own branch' });
        return;
      }
      finalBranchId = req.user.branchId;
    }
  }

  if (req.ownBranchOnly) {
    finalBranchId = branchId || req.user.branchId;
    const denied = givenUserError(req.user, null, {
      role: finalRole, branchId: finalBranchId, departmentId, subDepartmentId, reportingTo, studyCenterId, additionalDepartmentIds,
    });
    if (denied) {
      res.status(403).json({ success: false, message: denied });
      return;
    }
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
      role: finalRole,
      phone,
      designation,
      reportingTo,
      departmentId,
      subDepartmentId,
      branchId: finalBranchId || undefined,
      additionalDepartmentIds: Array.isArray(additionalDepartmentIds) ? additionalDepartmentIds : undefined,
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

export const updateUser = asyncHandler(async (req: PageRequest, res: Response) => {
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

  // Partner admins keep their role; their account is managed from Study Abroad Partners.
  if (userExists.role === 'study_abroad_admin' && role !== undefined && role !== 'study_abroad_admin') {
    res.status(403).json({ success: false, message: 'This is a Study Abroad Partner login. Manage it from Study Abroad Partners.' });
    return;
  }

  // Role restriction on update
  if (role && role !== userExists.role) {
    const callerRole = req.user.role as string;
    const allowed = req.ownBranchOnly ? givenRoles(callerRole) : CREATABLE_ROLES[callerRole] || [];
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

  const denied = req.ownBranchOnly
    ? givenUserError(req.user, await givenTarget(userExists), updateData)
    : userChangeError(req.user, userExists, CREATABLE_ROLES[req.user.role] || [], updateData);
  if (denied) {
    res.status(403).json({ success: false, message: denied });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
    select: USER_SELECT,
  });

  // Feature overrides belong to the role and department they were given for
  if (user.role !== userExists.role || (user.departmentId || null) !== (userExists.departmentId || null)) {
    await revokeOverrides(user.id, req.user.id);
  }

  res.status(200).json({ success: true, data: user });
});

/** The account with what decides whether someone on given access may touch it */
const givenTarget = async (user: any) => {
  const [branch, department, subDepartment, grants] = await Promise.all([
    prisma.branch.count({ where: { branchManagerId: user.id } }),
    prisma.department.count({ where: { OR: [{ managerId: user.id }, { assistantManagers: { some: { id: user.id } } }] } }),
    prisma.subDepartment.count({ where: { managerId: user.id } }),
    prisma.userAccessOverride.count({ where: { userId: user.id, effect: 'allow', revokedAt: null } }),
  ]);
  return { ...user, isManager: branch + department + subDepartment > 0, hasGivenAccess: grants > 0 };
};

/**
 * Runs before the delete handler. The handler itself is only reached after delete approval,
 * so a request the caller may not make has to be refused here.
 */
export const guardUserDelete = async (req: PageRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where: any = { id: req.params.id };
    if (req.user.role !== 'superadmin') where.organizationId = req.user.organizationId;
    const target = await prisma.user.findFirst({ where, select: { id: true, role: true, branchId: true, departmentId: true, subDepartmentId: true } });
    if (!target) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const denied = req.ownBranchOnly
      ? givenUserError(req.user, await givenTarget(target))
      : userChangeError(req.user, target, CREATABLE_ROLES[req.user.role] || []);
    if (denied) {
      res.status(403).json({ success: false, message: denied });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { id: req.params.id };
  if (req.user.role !== 'superadmin') where.organizationId = req.user.organizationId;

  const user = await prisma.user.findFirst({ where });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  // A study abroad partner's login belongs to its partner record; removing it here would leave the partner without access.
  if (user.role === 'study_abroad_admin') {
    res.status(400).json({ success: false, message: 'This is a Study Abroad Partner login. Manage it from Study Abroad Partners.' });
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
