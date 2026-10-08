import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, comparePassword, generateUserId } from '../utils/authUtils.js';

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public (or Superadmin/OrgAdmin only)
export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    organizationId,
    departmentId,
    subDepartmentId,
    email,
    password,
    name,
    role,
    phone,
    designation,
    reportingTo,
  } = req.body;

  const normalizedEmail = email.trim().toLowerCase();

  // Check if user exists
  const userExists = await prisma.user.findFirst({ 
    where: { 
      email: {
        equals: normalizedEmail,
        mode: 'insensitive'
      }
    } 
  });
  if (userExists) {
    res.status(400).json({ success: false, message: 'User already exists' });
    return;
  }

  // Generate userId and hash password
  const userId = await generateUserId();
  const hashedPassword = await hashPassword(password);

  // Prevent privilege escalation — nobody can register themselves as superadmin
  const assignedRole = (role === 'superadmin' || role === 'org_admin' || role === 'center_admin') ? 'student' : (role || 'student');

  // Create user
  const user = await prisma.user.create({
    data: {
      userId,
      organizationId,
      departmentId,
      subDepartmentId,
      email: normalizedEmail,
      password: hashedPassword,
      name,
      role: assignedRole,
      phone,
      designation,
      reportingTo,
      status: 'active',
    },
  });

  if (user) {
    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      },
    });
  } else {
    res.status(400).json({ success: false, message: 'Invalid user data' });
  }
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password, organizationId } = req.body;

  if (!email || !password) {
    res.status(400).json({ 
      success: false, 
      message: 'Please provide email and password' 
    });
    return;
  }

  const normalizedEmail = email.trim();

  // 4. Check for standard system user
  const user = await prisma.user.findFirst({ 
    where: { 
      email: {
        equals: normalizedEmail,
        mode: 'insensitive'
      }
    },
    include: {
      organization: true,
      department: true,
      subDepartment: true,
    }
  });

  if (!user) {
    const faculty = await prisma.faculty.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      }
    });

    if (faculty) {
      if (!faculty.password) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }
      
      const isMatch = await comparePassword(password, faculty.password);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      // If logging in from a custom org page, restrict to that org
      if (organizationId && faculty.organizationId !== organizationId) {
        res.status(403).json({ success: false, message: 'Your account is not registered with this organization.' });
        return;
      }

      const token = generateToken(faculty.id);
      const refreshToken = generateRefreshToken(faculty.id);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: faculty.id,
            name: faculty.name,
            email: faculty.email,
            role: 'faculty',
            organizationId: faculty.organizationId,
            status: faculty.status,
          },
          token,
          refreshToken,
        },
      });
      return;
    }

    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  // Check if password matches
  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  // If logging in from a custom org page, restrict to that org (allow superadmin to bypass)
  if (organizationId && user.organizationId !== organizationId && user.role !== 'superadmin') {
    res.status(403).json({ success: false, message: 'Your account is not registered with this organization.' });
    return;
  }

  // Update last login
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // For center_admin, include center status so frontend can gate the dashboard
  let centerStatus: string | null = null;
  if (user.role === 'center_admin' && user.studyCenterId) {
    const center = await prisma.studyCenter.findUnique({
      where: { id: user.studyCenterId },
      select: { status: true }
    });
    centerStatus = center?.status ?? null;
  }

  const managedBranch = await prisma.branch.findFirst({
    where: { branchManagerId: user.id },
    select: { id: true }
  });

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        departmentId: user.departmentId,
        subDepartmentId: user.subDepartmentId,
        studyCenterId: user.studyCenterId,
        designation: user.designation,
        status: user.status,
        allowSystemPunchIn: user.allowSystemPunchIn,
        requireSelfiePunchIn: user.requireSelfiePunchIn,
        allowAnywherePunchIn: user.allowAnywherePunchIn,
        requiresAttendance: user.requiresAttendance,
        isBranchManager: !!managedBranch,
        organization: user.organization,
        ...(centerStatus !== null && { centerStatus }),
      },
      token,
      refreshToken,
    },
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {

  let user: any = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      userId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatar: true,
      designation: true,
      lastLogin: true,
      organizationId: true,
      departmentId: true,
      subDepartmentId: true,
      branchId: true,
      studyCenterId: true,
      ceoPanelId: true,
      department: { select: { id: true, name: true, type: true } },
      subDepartment: { select: { id: true, name: true } },
      employeeProfileDetail: { select: { joinDate: true, probationEndDate: true } },
      organization: true,
    }
  });

  if (!user) {
    const faculty = await prisma.faculty.findUnique({
      where: { id: req.user.id },
      include: { organization: true }
    });
    if (faculty) {
      user = {
        id: faculty.id,
        name: faculty.name,
        email: faculty.email,
        phone: faculty.phone,
        role: 'faculty',
        status: faculty.status,
        avatar: faculty.avatar,
        designation: faculty.specialization,
        organizationId: faculty.organizationId,
        organization: faculty.organization,
      };
    }
  }

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const managedBranch = await prisma.branch.findFirst({
    where: { branchManagerId: req.user.id },
    select: { id: true }
  });

  res.status(200).json({
    success: true,
    data: { ...user, isBranchManager: !!managedBranch },
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
// Profile pictures are uploaded through POST /auth/upload first, which answers
// with `/uploads/<key>`; only that kind of value (or an https link) is accepted.
const AVATAR_PATH = /^\/uploads\/[A-Za-z0-9._-]+$/;
const isValidAvatar = (v: string) => AVATAR_PATH.test(v) || /^https:\/\/[^\s]+$/i.test(v);

export const updateDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, phone, avatar } = req.body;
  const isFaculty = req.user.role === 'faculty';

  const data: Record<string, any> = {};

  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      res.status(400).json({ success: false, message: 'Name cannot be empty' });
      return;
    }
    data.name = trimmed;
  }

  if (phone !== undefined) {
    if (phone !== null && typeof phone !== 'string') {
      res.status(400).json({ success: false, message: 'Invalid phone number' });
      return;
    }
    data.phone = phone ? phone.trim() : null;
  }

  // Faculty sign in with their email, so only staff accounts may change it here.
  if (email !== undefined && !isFaculty) {
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalized || !normalized.includes('@')) {
      res.status(400).json({ success: false, message: 'Enter a valid email address' });
      return;
    }
    const clash = await prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' }, NOT: { id: req.user.id } },
      select: { id: true },
    });
    if (clash) {
      res.status(409).json({ success: false, message: 'That email is already in use' });
      return;
    }
    data.email = normalized;
  }

  if (avatar !== undefined) {
    if (avatar === null || avatar === '') {
      data.avatar = null; // remove the picture
    } else if (typeof avatar === 'string' && isValidAvatar(avatar)) {
      data.avatar = avatar;
    } else {
      res.status(400).json({ success: false, message: 'Invalid profile picture' });
      return;
    }
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ success: false, message: 'Nothing to update' });
    return;
  }

  let updated: any;
  if (isFaculty) {
    updated = await prisma.faculty.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, phone: true, avatar: true, status: true, organizationId: true },
    });
    updated = { ...updated, role: 'faculty' };
  } else {
    updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      // Never send the password hash back.
      select: {
        id: true, userId: true, name: true, email: true, phone: true, role: true,
        status: true, avatar: true, designation: true, organizationId: true,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: updated,
  });
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
export const updatePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  // Check current password
  const isMatch = await comparePassword(req.body.currentPassword, user.password);

  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Password is incorrect' });
    return;
  }

  const hashedPassword = await hashPassword(req.body.newPassword);
  
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  const token = generateToken(user.id);

  res.status(200).json({
    success: true,
    data: { token },
  });
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(200).json({
    success: true,
    data: {},
  });
});
