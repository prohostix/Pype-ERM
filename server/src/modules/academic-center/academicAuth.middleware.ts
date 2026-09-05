import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';

export interface AcademicAuthRequest extends Request {
  user?: any;
  academicUser?: {
    id: string;
    email: string;
    role: 'superadmin' | 'org_admin' | 'academic_counselor' | 'center_student' | 'center_teacher';
    organizationId: string;
    counselorId?: string;
    studentId?: string;
    teacherId?: string;
    centerId?: string;
    name?: string;
  };
}

export const protectAcademic = async (
  req: AcademicAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Not authorized, token missing' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'secret';
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    // Check if token belongs to an Academic Counselor
    const counselorId = decoded.counselorId || decoded.id;
    if (counselorId) {
      const counselor = await prisma.academicCounselor.findUnique({
        where: { id: counselorId },
        include: { assignments: { where: { status: 'ACTIVE' } } }
      });
      if (counselor && counselor.status === 'ACTIVE') {
        req.academicUser = {
          id: counselor.id,
          email: counselor.email,
          role: 'academic_counselor',
          organizationId: counselor.organizationId,
          counselorId: counselor.id,
          name: counselor.name,
        };
        req.user = req.academicUser;
        next();
        return;
      }
    }

    // Check if token belongs to a Center Teacher
    const teacherId = decoded.teacherId || decoded.id;
    if (teacherId) {
      const teacher = await prisma.centerTeacher.findUnique({
        where: { id: teacherId },
        include: { center: true },
      });
      if (teacher && teacher.status === 'ACTIVE') {
        req.academicUser = {
          id: teacher.id,
          email: teacher.email,
          role: 'center_teacher',
          organizationId: teacher.organizationId,
          teacherId: teacher.id,
          centerId: teacher.centerId,
          name: teacher.name,
        };
        req.user = req.academicUser;
        next();
        return;
      }
    }

    // Check if token belongs to a Center Student
    const studentId = decoded.studentId || decoded.id;
    if (studentId) {
      const student = await prisma.centerStudent.findUnique({
        where: { id: studentId },
        include: { center: true }
      });
      if (student && student.status === 'ACTIVE') {
        req.academicUser = {
          id: student.id,
          email: student.email,
          role: 'center_student',
          organizationId: student.organizationId,
          studentId: student.id,
          centerId: student.centerId,
          name: student.name,
        };
        req.user = req.academicUser;
        next();
        return;
      }
    }

    // Fallback: Check if token belongs to standard User (org_admin, superadmin, etc.)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        status: true,
      }
    });

    if (user && user.status === 'active') {
      req.user = user;
      req.academicUser = {
        id: user.id,
        email: user.email,
        role: (user.role === 'superadmin' ? 'superadmin' : 'org_admin') as any,
        organizationId: user.organizationId || '',
        name: user.name,
      };

      // Also check if this user is linked to an AcademicCounselor record by email or userId
      const linkedCounselor = await prisma.academicCounselor.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { email: user.email }
          ]
        }
      });
      if (linkedCounselor) {
        req.academicUser.counselorId = linkedCounselor.id;
        if (user.role !== 'superadmin' && user.role !== 'org_admin') {
          req.academicUser.role = 'academic_counselor';
        }
      }

      next();
      return;
    }

    res.status(401).json({ success: false, message: 'User not found or inactive' });
  } catch (error: any) {
    console.error('Academic Auth protect error:', error);
    res.status(500).json({ success: false, message: 'Academic auth error' });
  }
};

export const requireRoles = (...allowedRoles: string[]) => {
  return (req: AcademicAuthRequest, res: Response, next: NextFunction): void => {
    let role = req.academicUser?.role || req.user?.role;
    if (role === 'teacher') role = 'center_teacher';
    if (!role || (!allowedRoles.includes(role) && !(role === 'center_teacher' && allowedRoles.includes('teacher')))) {
      res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
      return;
    }
    next();
  };
};
