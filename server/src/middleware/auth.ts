import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) throw new Error('JWT_SECRET not configured');
      const decoded: any = jwt.verify(token, jwtSecret);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true, userId: true, email: true, name: true, role: true,
          phone: true, designation: true, status: true, lastLogin: true,
          avatar: true, reportingTo: true, createdAt: true, updatedAt: true,
          organizationId: true, departmentId: true, subDepartmentId: true,
          branchId: true, studyCenterId: true, ceoPanelId: true,
          allowSystemPunchIn: true, requireSelfiePunchIn: true, allowAnywherePunchIn: true,
          organization: true, department: true, branch: true, studyCenter: true,
        }
      });

      if (!user) {
        // Check if token belongs to an Academic Counselor
        const counselor = await prisma.academicCounselor.findUnique({
          where: { id: decoded.id },
          select: { id: true, email: true, name: true, phone: true, specialization: true, status: true, organizationId: true },
        });
        if (counselor && counselor.status === 'ACTIVE') {
          req.user = {
            id: counselor.id,
            email: counselor.email,
            name: counselor.name,
            role: 'academic_counselor',
            organizationId: counselor.organizationId,
            status: 'active',
          };
          next();
          return;
        }

        // Check if token belongs to a Center Teacher
        const teacherId = decoded.teacherId || decoded.id;
        const centerTeacher = await prisma.centerTeacher.findUnique({
          where: { id: teacherId },
          select: { id: true, email: true, name: true, phone: true, specialization: true, status: true, organizationId: true, centerId: true },
        });
        if (centerTeacher && centerTeacher.status === 'ACTIVE') {
          req.user = {
            id: centerTeacher.id,
            email: centerTeacher.email,
            name: centerTeacher.name,
            role: 'center_teacher',
            organizationId: centerTeacher.organizationId,
            centerId: centerTeacher.centerId,
            status: 'active',
          };
          next();
          return;
        }

        // Check if token belongs to a Center Student
        const centerStudent = await prisma.centerStudent.findUnique({
          where: { id: decoded.id },
          select: { id: true, email: true, name: true, phone: true, studentCode: true, status: true, organizationId: true, centerId: true },
        });
        if (centerStudent && centerStudent.status === 'ACTIVE') {
          req.user = {
            id: centerStudent.id,
            email: centerStudent.email,
            name: centerStudent.name,
            role: 'center_student',
            organizationId: centerStudent.organizationId,
            status: 'active',
          };
          next();
          return;
        }

        res.status(401).json({ success: false, message: 'User not found' });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Auth protect error:', error); res.status(401).json({ success: false, message: 'Invalid token: ' + (error instanceof Error ? error.message : String(error)) });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Auth error' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    next();
  };
};
