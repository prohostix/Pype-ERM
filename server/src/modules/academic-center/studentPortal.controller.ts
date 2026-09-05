import { Response } from 'express';
import { AcademicAuthRequest } from './academicAuth.middleware.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { comparePassword } from '../../utils/authUtils.js';
import jwt, { SignOptions } from 'jsonwebtoken';

// @desc    Student login for Academic Center
// @route   POST /api/v1/academic-center/student-portal/login
// @access  Public
export const studentLogin = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Please provide email and password' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const student = await prisma.centerStudent.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: 'insensitive',
      },
    },
    include: {
      center: true,
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          program: {
            include: { university: true },
          },
        },
      },
    },
  });

  if (!student || student.status !== 'ACTIVE') {
    res.status(401).json({ success: false, message: 'Invalid credentials or inactive student account' });
    return;
  }

  const isMatch = await comparePassword(password, student.password);
  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'secret';
  const options: SignOptions = { expiresIn: '30d' };
  const token = jwt.sign(
    {
      id: student.id,
      studentId: student.id,
      email: student.email,
      role: 'center_student',
      organizationId: student.organizationId,
      centerId: student.centerId,
    },
    secret,
    options
  );

  res.status(200).json({
    success: true,
    message: 'Student login successful',
    token,
    data: {
      id: student.id,
      studentCode: student.studentCode,
      name: student.name,
      email: student.email,
      phone: student.phone,
      role: 'center_student',
      center: student.center,
      enrollments: student.enrollments,
    },
  });
});

// @desc    Get student portal dashboard
// @route   GET /api/v1/academic-center/student-portal/dashboard
// @access  Private (Center Student, Org Admin)
export const getStudentDashboard = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const studentId = req.academicUser?.studentId;

  if (!studentId && req.academicUser?.role !== 'org_admin' && req.academicUser?.role !== 'superadmin') {
    res.status(403).json({ success: false, message: 'Center Student profile not found' });
    return;
  }

  // If org_admin, can pass ?studentId=
  const targetStudentId = studentId || (req.query.studentId as string);

  const student = await prisma.centerStudent.findUnique({
    where: { id: targetStudentId },
    include: {
      center: {
        include: {
          counselors: {
            where: { status: 'ACTIVE' },
            include: {
              counselor: {
                select: { id: true, name: true, email: true, phone: true, specialization: true },
              },
            },
          },
        },
      },
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          program: {
            include: {
              university: true,
              _count: {
                select: { centerMaterials: true, centerClassSchedules: true },
              },
            },
          },
        },
      },
    },
  });

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  const enrolledProgramIds = student.enrollments.map((e) => e.programId);

  // Fetch upcoming classes for enrolled programs
  const upcomingClasses = await prisma.centerClassSchedule.findMany({
    where: {
      programId: { in: enrolledProgramIds },
      status: { in: ['SCHEDULED', 'ONGOING'] },
    },
    orderBy: { startTime: 'asc' },
    take: 10,
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
      teacher: { select: { id: true, name: true, specialization: true } },
    },
  });

  // Fetch recent materials
  const recentMaterials = await prisma.centerMaterial.findMany({
    where: {
      programId: { in: enrolledProgramIds },
      isPublished: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        name: student.name,
        email: student.email,
        phone: student.phone,
        status: student.status,
      },
      center: student.center,
      programs: student.enrollments.map((e) => ({
        ...e.program,
        enrolledAt: e.enrolledAt,
        progressPercent: e.progressPercent,
      })),
      upcomingClasses,
      recentMaterials,
    },
  });
});

// @desc    Get student classes (offline lectures & online live classes)
// @route   GET /api/v1/academic-center/student-portal/classes
// @access  Private (Center Student)
export const getStudentClasses = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const studentId = req.academicUser?.studentId;

  if (!studentId) {
    res.status(403).json({ success: false, message: 'Student ID not found in token' });
    return;
  }

  const student = await prisma.centerStudent.findUnique({
    where: { id: studentId },
    select: { email: true },
  });
  const studentEmail = (student?.email || '').toLowerCase().trim();

  const enrollments = await prisma.centerEnrollment.findMany({
    where: { studentId, status: 'ACTIVE' },
    select: { programId: true },
  });

  const programIds = enrollments.map((e) => e.programId);

  const classes = await prisma.centerClassSchedule.findMany({
    where: {
      programId: { in: programIds },
    },
    orderBy: { startTime: 'asc' },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
      teacher: { select: { id: true, name: true, email: true, specialization: true } },
      center: { select: { id: true, name: true, type: true, city: true, address: true } },
      attendances: studentEmail
        ? {
            where: { studentEmail },
            select: { id: true, status: true, markedBy: true, markedAt: true, notes: true },
          }
        : false,
    },
  });

  const formattedClasses = classes.map((cls) => {
    const myAttendance = cls.attendances && cls.attendances.length > 0 ? cls.attendances[0] : null;
    return {
      ...cls,
      myAttendance,
    };
  });

  res.status(200).json({
    success: true,
    data: formattedClasses,
  });
});

// @desc    Register online class attendance by student
// @route   POST /api/v1/academic-center/student-portal/classes/:classId/attendance
// @access  Private (Center Student)
export const registerStudentAttendance = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const studentId = req.academicUser?.studentId;
  const { classId } = req.params;

  if (!studentId) {
    res.status(403).json({ success: false, message: 'Student ID not found in token' });
    return;
  }

  const student = await prisma.centerStudent.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    res.status(404).json({ success: false, message: 'Student record not found' });
    return;
  }

  const classSchedule = await prisma.centerClassSchedule.findUnique({
    where: { id: classId },
    include: { center: true },
  });

  if (!classSchedule) {
    res.status(404).json({ success: false, message: 'Class schedule not found' });
    return;
  }

  // Enforce rule:
  // If academic center is OFFLINE: attendance must be marked by the teacher at the center.
  // If ONLINE: student has access to mark attendance.
  const isOffline = classSchedule.center?.type === 'OFFLINE' || classSchedule.type === 'OFFLINE_LECTURE';
  if (isOffline) {
    res.status(400).json({
      success: false,
      message: 'This is an offline campus class. Attendance must be marked by the teacher at the center.',
    });
    return;
  }

  const studentEmail = (student.email || '').toLowerCase().trim();
  const attendance = await prisma.centerClassAttendance.upsert({
    where: {
      classScheduleId_studentEmail: {
        classScheduleId: classId,
        studentEmail,
      },
    },
    create: {
      organizationId: student.organizationId,
      classScheduleId: classId,
      studentId: student.id,
      studentEmail,
      studentName: student.name,
      status: 'PRESENT',
      markedBy: 'STUDENT',
      markedAt: new Date(),
    },
    update: {
      status: 'PRESENT',
      markedBy: 'STUDENT',
      markedAt: new Date(),
    },
  });

  res.status(200).json({
    success: true,
    message: 'Attendance registered successfully!',
    data: attendance,
  });
});

// @desc    Get student learning materials (videos, documents, e-books)
// @route   GET /api/v1/academic-center/student-portal/materials
// @access  Private (Center Student)
export const getStudentMaterials = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const studentId = req.academicUser?.studentId;
  const { programId, type } = req.query;

  if (!studentId) {
    res.status(403).json({ success: false, message: 'Student ID not found in token' });
    return;
  }

  const enrollments = await prisma.centerEnrollment.findMany({
    where: { studentId, status: 'ACTIVE' },
    select: { programId: true },
  });

  const allowedProgramIds = enrollments.map((e) => e.programId);

  const whereClause: any = {
    programId: programId ? String(programId) : { in: allowedProgramIds },
    isPublished: true,
  };

  if (type) {
    whereClause.type = type as any;
  }

  const materials = await prisma.centerMaterial.findMany({
    where: whereClause,
    orderBy: [
      { chapterOrTopic: 'asc' },
      { sequenceOrder: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, logo: true } },
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: materials,
  });
});
