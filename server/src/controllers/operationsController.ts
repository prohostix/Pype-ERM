import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { sendEmail } from '../utils/emailService.js';

// Universities
export const getUniversities = asyncHandler(async (req: AuthRequest, res: Response) => {
  const universities = await prisma.university.findMany({
    where: { organizationId: req.user.organizationId },
    include: { allowedBranches: true }
  });
  const mapped = universities.map(u => ({
    ...u,
    allowedBranchIds: u.allowedBranches || []
  }));
  res.json({ success: true, count: mapped.length, data: mapped });
});
export const getUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await prisma.university.findUnique({
    where: { id: req.params.id },
    include: { allowedBranches: true }
  });
  if (university) {
    (university as any).allowedBranchIds = university.allowedBranches || [];
  }
  res.json({ success: true, data: university });
});
export const createUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { allowedBranchIds, ...rest } = req.body;
  const university = await prisma.university.create({
    data: {
      ...rest,
      organizationId: req.user.organizationId,
      allowedBranches: allowedBranchIds && allowedBranchIds.length > 0
        ? { connect: allowedBranchIds.map((id: string) => ({ id })) }
        : undefined
    }
  });
  res.status(201).json({ success: true, data: university });
});
export const updateUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { allowedBranchIds, ...rest } = req.body;
  const university = await prisma.university.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      allowedBranches: allowedBranchIds
        ? { set: allowedBranchIds.map((id: string) => ({ id })) }
        : undefined
    }
  });
  res.json({ success: true, data: university });
});
export const deleteUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.university.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const activateUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await prisma.university.update({ where: { id: req.params.id }, data: { status: 'active' } });
  res.json({ success: true, data: university });
});

// Programs
export const getPrograms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const programs = await prisma.program.findMany({ where: { organizationId: req.user.organizationId }, include: { university: true } });
  res.json({ success: true, count: programs.length, data: programs });
});
export const getProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.findUnique({ where: { id: req.params.id }, include: { university: true } });
  res.json({ success: true, data: program });
});
export const createProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: program });
});
export const updateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: program });
});
export const deleteProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.program.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const activateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.update({ where: { id: req.params.id }, data: { status: 'active' } });
  res.json({ success: true, data: program });
});

// Study Centers
export const getStudyCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: centers.length, data: centers });
});
export const getStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: center });
});
export const createStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isSales = req.user.role === 'sales_admin' || req.user.role === 'bde' || req.user.role === 'employee';
  const { name, code, email, contact, ...rest } = req.body;
  const targetEmail = email || `admin.${code}@example.com`;
  const generatedPassword = `Center@${Math.floor(100000 + Math.random() * 900000)}`;

  const center = await prisma.studyCenter.create({ 
    data: { 
      ...rest,
      name,
      code,
      email,
      contact,
      organizationId: req.user.organizationId,
      status: 'active',
      referredBy: isSales ? req.user.id : (req.body.referredBy || null),
      credentials: { email: targetEmail, password: generatedPassword }
    } 
  });

  const hashedPassword = await hashPassword(generatedPassword);
  const userId = await generateUserId();

  const user = await prisma.user.create({
    data: {
      userId,
      organizationId: req.user.organizationId,
      studyCenterId: center.id,
      email: targetEmail,
      password: hashedPassword,
      name: `${name} Admin`,
      role: 'center_admin',
      phone: contact,
      status: 'active'
    }
  });

  // Send credentials email
  await sendEmail(
    targetEmail,
    'Your Study Center Portal Credentials',
    `Hello ${name} Admin,\n\nYour study center account has been created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${targetEmail}\nPassword: ${generatedPassword}\n\nRegards,\nSchool Administration`,
    `<p>Hello <strong>${name} Admin</strong>,</p><p>Your study center account has been created.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>Email:</strong> ${targetEmail}<br/><strong>Password:</strong> ${generatedPassword}</p><p>Regards,<br/>School Administration</p>`
  );

  res.status(201).json({ success: true, data: center });
});

export const updateStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centerExists = await prisma.studyCenter.findUnique({ where: { id: req.params.id } });
  if (!centerExists) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  // If credentials.password is updated, hash it and update corresponding User record
  if (req.body.credentials && req.body.credentials.password) {
    const hashedPassword = await hashPassword(req.body.credentials.password);
    await prisma.user.updateMany({
      where: { studyCenterId: req.params.id, role: 'center_admin' },
      data: { password: hashedPassword }
    });
  }

  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: center });
});
export const deleteStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centerId = req.params.id;
  // Nullify optional centerId relations before deleting to avoid FK constraint errors
  await prisma.$transaction([
    prisma.student.updateMany({ where: { centerId }, data: { centerId: null } }),
    prisma.enrollment.updateMany({ where: { centerId }, data: { centerId: null } }),
    prisma.invoice.updateMany({ where: { centerId }, data: { centerId: null } }),
    prisma.enrollmentPayment.updateMany({ where: { centerId }, data: { centerId: null } }),
    prisma.internalMark.deleteMany({ where: { centerId } }),
    prisma.programAllocation.deleteMany({ where: { centerId } }),
    prisma.sessionRequest.deleteMany({ where: { centerId } }),
    prisma.target.deleteMany({ where: { centerId } }),
    prisma.studyCenter.delete({ where: { id: centerId } }),
  ]);
  res.json({ success: true, data: {} });
});
export const approveStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'active' } });
  res.json({ success: true, data: center });
});
export const suspendStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'suspended' } });
  res.json({ success: true, data: center });
});

// Admission Sessions
export const getAdmissionSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sessions = await prisma.admissionSession.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: sessions.length, data: sessions });
});
export const getAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await prisma.admissionSession.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: session });
});
export const createAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = { ...req.body, organizationId: req.user.organizationId };
  if (req.user.role === 'ops_admin') {
    data.status = 'pending';
  }
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  if (data.examDate) data.examDate = new Date(data.examDate);
  const session = await prisma.admissionSession.create({ data });
  res.status(201).json({ success: true, data: session });
});
export const updateAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = { ...req.body };
  if (req.user.role === 'ops_admin') {
    delete data.status;
  }
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  if (data.examDate) data.examDate = new Date(data.examDate);
  const session = await prisma.admissionSession.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: session });
});
export const deleteAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.admissionSession.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const approveAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await prisma.admissionSession.update({ where: { id: req.params.id }, data: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() } });
  res.json({ success: true, data: session });
});

// Internal Marks
export const getInternalMarks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const marks = await prisma.internalMark.findMany({ where: { organizationId: req.user.organizationId }, include: { student: true } });
  res.json({ success: true, count: marks.length, data: marks });
});
export const createInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await prisma.internalMark.create({ data: { ...req.body, organizationId: req.user.organizationId, enteredBy: req.user.id } });
  res.status(201).json({ success: true, data: mark });
});
export const updateInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await prisma.internalMark.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: mark });
});
export const deleteInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.internalMark.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Announcements
export const getAnnouncements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcements = await prisma.announcement.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, count: announcements.length, data: announcements });
});
export const getAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: announcement });
});
export const createAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await prisma.announcement.create({ data: { ...req.body, organizationId: req.user.organizationId, createdById: req.user.id } });
  res.status(201).json({ success: true, data: announcement });
});
export const updateAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await prisma.announcement.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: announcement });
});
export const deleteAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Onboarding
export const getPendingVerificationCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId, status: 'pending_verification' } });
  res.json({ success: true, data: centers });
});
export const verifyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'verified' } });
  res.json({ success: true, data: center });
});

// Allocations
export const getProgramAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const allocations = await prisma.programAllocation.findMany({ where: { centerId: req.params.id }, include: { program: true } });
  res.json({ success: true, data: allocations });
});
export const allocateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const allocation = await prisma.programAllocation.create({ data: { ...req.body, centerId: req.params.id, organizationId: req.user.organizationId, allocatedBy: req.user.id } });
  res.status(201).json({ success: true, data: allocation });
});
export const removeAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.programAllocation.delete({ where: { id: req.params.allocId } });
  res.json({ success: true, data: {} });
});
