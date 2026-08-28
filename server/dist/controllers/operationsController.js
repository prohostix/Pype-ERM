import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { sendEmail } from '../utils/emailService.js';
// Universities
export const getUniversities = asyncHandler(async (req, res) => {
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
export const getUniversity = asyncHandler(async (req, res) => {
    const university = await prisma.university.findUnique({
        where: { id: req.params.id },
        include: { allowedBranches: true }
    });
    if (university) {
        university.allowedBranchIds = university.allowedBranches || [];
    }
    res.json({ success: true, data: university });
});
export const createUniversity = asyncHandler(async (req, res) => {
    const { allowedBranchIds, ...rest } = req.body;
    const university = await prisma.university.create({
        data: {
            ...rest,
            organizationId: req.user.organizationId,
            allowedBranches: allowedBranchIds && allowedBranchIds.length > 0
                ? { connect: allowedBranchIds.map((id) => ({ id })) }
                : undefined
        }
    });
    res.status(201).json({ success: true, data: university });
});
export const updateUniversity = asyncHandler(async (req, res) => {
    try {
        const { allowedBranchIds, id, organizationId, createdAt, updatedAt, ...rest } = req.body;
        const university = await prisma.university.update({
            where: { id: req.params.id },
            data: {
                ...rest,
                allowedBranches: allowedBranchIds
                    ? { set: allowedBranchIds.map((bid) => ({ id: bid })) }
                    : undefined
            }
        });
        res.json({ success: true, data: university });
    }
    catch (error) {
        console.error("Error updating university:", error);
        res.status(400).json({ success: false, message: error.message || 'Failed to update university' });
    }
});
export const deleteUniversity = asyncHandler(async (req, res) => {
    await prisma.university.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
export const activateUniversity = asyncHandler(async (req, res) => {
    const university = await prisma.university.update({ where: { id: req.params.id }, data: { status: 'active' } });
    res.json({ success: true, data: university });
});
// Programs
export const getPrograms = asyncHandler(async (req, res) => {
    const programs = await prisma.program.findMany({ where: { organizationId: req.user.organizationId }, include: { university: true, feeStructures: true } });
    res.json({ success: true, count: programs.length, data: programs });
});
export const getProgram = asyncHandler(async (req, res) => {
    const program = await prisma.program.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId }, include: { university: true } });
    if (!program) {
        res.status(404).json({ success: false, message: 'Program not found' });
        return;
    }
    res.json({ success: true, data: program });
});
export const createProgram = asyncHandler(async (req, res) => {
    const { registrationFee, tuitionFee, syllabus, billingCycle, installments, ...programData } = req.body;
    const program = await prisma.program.create({
        data: {
            ...programData,
            syllabus,
            organizationId: req.user.organizationId
        }
    });
    if (registrationFee !== undefined || tuitionFee !== undefined || installments !== undefined) {
        await prisma.feeStructure.create({
            data: {
                programId: program.id,
                organizationId: req.user.organizationId,
                feeLevel: 'program',
                registrationFee: Number(registrationFee) || 0,
                tuitionFee: Number(tuitionFee) || 0,
                billingCycle: billingCycle || 'per_year',
                installments: installments || []
            }
        });
    }
    res.status(201).json({ success: true, data: program });
});
export const updateProgram = asyncHandler(async (req, res) => {
    const exists = await prisma.program.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Program not found' });
        return;
    }
    const { name, code, duration, description, status, universityId, sessionId, syllabus, courseType, hasSemesters, semesters, specialisations, subDepartmentId, registrationFee, tuitionFee, billingCycle, installments } = req.body;
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (code !== undefined)
        updateData.code = code;
    if (duration !== undefined)
        updateData.duration = duration;
    if (description !== undefined)
        updateData.description = description;
    if (status !== undefined)
        updateData.status = status;
    if (universityId !== undefined)
        updateData.universityId = universityId;
    if (sessionId !== undefined)
        updateData.sessionId = sessionId || null;
    if (syllabus !== undefined)
        updateData.syllabus = syllabus;
    if (courseType !== undefined)
        updateData.courseType = courseType;
    if (hasSemesters !== undefined)
        updateData.hasSemesters = hasSemesters;
    if (semesters !== undefined)
        updateData.semesters = semesters;
    if (specialisations !== undefined)
        updateData.specialisations = specialisations;
    if (subDepartmentId !== undefined)
        updateData.subDepartmentId = subDepartmentId;
    const program = await prisma.program.update({ where: { id: req.params.id }, data: updateData });
    if (registrationFee !== undefined || tuitionFee !== undefined || installments !== undefined) {
        const existingFee = await prisma.feeStructure.findFirst({ where: { programId: program.id, feeLevel: 'program' } });
        if (existingFee) {
            const feeData = {};
            if (registrationFee !== undefined)
                feeData.registrationFee = Number(registrationFee);
            if (tuitionFee !== undefined)
                feeData.tuitionFee = Number(tuitionFee);
            if (billingCycle !== undefined)
                feeData.billingCycle = billingCycle;
            if (installments !== undefined)
                feeData.installments = installments;
            await prisma.feeStructure.update({
                where: { id: existingFee.id },
                data: feeData
            });
        }
        else {
            await prisma.feeStructure.create({
                data: {
                    programId: program.id,
                    organizationId: req.user.organizationId,
                    feeLevel: 'program',
                    registrationFee: Number(registrationFee) || 0,
                    tuitionFee: Number(tuitionFee) || 0,
                    billingCycle: billingCycle || 'per_year',
                    installments: installments || []
                }
            });
        }
    }
    res.json({ success: true, data: program });
});
export const deleteProgram = asyncHandler(async (req, res) => {
    await prisma.program.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
export const activateProgram = asyncHandler(async (req, res) => {
    const program = await prisma.program.update({ where: { id: req.params.id }, data: { status: 'active' } });
    res.json({ success: true, data: program });
});
// Study Centers
export const getStudyCenters = asyncHandler(async (req, res) => {
    const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId } });
    res.json({ success: true, count: centers.length, data: centers });
});
export const getStudyCenter = asyncHandler(async (req, res) => {
    const center = await prisma.studyCenter.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!center) {
        res.status(404).json({ success: false, message: 'Study center not found' });
        return;
    }
    res.json({ success: true, data: center });
});
export const createStudyCenter = asyncHandler(async (req, res) => {
    const isSales = (req.user.role === 'sales_admin' || req.user.role === 'sales_sub_admin') || req.user.role === 'bde' || req.user.role === 'employee';
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
    try {
        await sendEmail(targetEmail, 'Your Study Center Portal Credentials', `Hello ${name} Admin,\n\nYour study center account has been created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${targetEmail}\nPassword: ${generatedPassword}\n\nRegards,\nSchool Administration`, `<p>Hello <strong>${name} Admin</strong>,</p><p>Your study center account has been created.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>Email:</strong> ${targetEmail}<br/><strong>Password:</strong> ${generatedPassword}</p><p>Regards,<br/>School Administration</p>`);
    }
    catch (mailErr) {
        console.error('Failed to send center credentials email:', mailErr.message);
    }
    res.status(201).json({ success: true, data: center });
});
export const updateStudyCenter = asyncHandler(async (req, res) => {
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
    const center = await prisma.studyCenter.update({
        where: { id: req.params.id },
        data: {
            name: req.body.name,
            code: req.body.code,
            email: req.body.email,
            contact: req.body.contact,
            address: req.body.address,
            status: req.body.status,
            state: req.body.state,
            city: req.body.city,
            ...(req.body.credentials ? { credentials: req.body.credentials } : {}),
        }
    });
    res.json({ success: true, data: center });
});
export const deleteStudyCenter = asyncHandler(async (req, res) => {
    const centerId = req.params.id;
    // Safely remove all related records before deleting
    await prisma.$transaction([
        // Nullify optional references
        prisma.student.updateMany({ where: { centerId }, data: { centerId: null } }),
        prisma.invoice.updateMany({ where: { centerId }, data: { centerId: null } }),
        prisma.enrollment.updateMany({ where: { studyCenterId: centerId }, data: { studyCenterId: null } }),
        prisma.admissionSession.updateMany({ where: { studyCenterId: centerId }, data: { studyCenterId: null } }),
        prisma.user.updateMany({ where: { studyCenterId: centerId }, data: { studyCenterId: null } }),
        // Delete child records
        prisma.walletTopUp.deleteMany({ where: { studyCenterId: centerId } }),
        prisma.studyCenterWallet.deleteMany({ where: { studyCenterId: centerId } }),
        prisma.programAllocation.deleteMany({ where: { centerId } }),
        prisma.sessionRequest.deleteMany({ where: { centerId } }),
        prisma.target.deleteMany({ where: { centerId } }),
        // Finally delete the center
        prisma.studyCenter.delete({ where: { id: centerId } }),
    ]);
    res.json({ success: true, data: {} });
});
export const approveStudyCenter = asyncHandler(async (req, res) => {
    const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'active' } });
    res.json({ success: true, data: center });
});
export const suspendStudyCenter = asyncHandler(async (req, res) => {
    const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'suspended' } });
    res.json({ success: true, data: center });
});
// Admission Sessions
export const getAdmissionSessions = asyncHandler(async (req, res) => {
    const sessions = await prisma.admissionSession.findMany({ where: { organizationId: req.user.organizationId } });
    res.json({ success: true, count: sessions.length, data: sessions });
});
export const getAdmissionSession = asyncHandler(async (req, res) => {
    const session = await prisma.admissionSession.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data: session });
});
export const createAdmissionSession = asyncHandler(async (req, res) => {
    const { examDate, universityId, ...rest } = req.body;
    const data = { ...rest, organizationId: req.user.organizationId, createdBy: req.user.id };
    if (universityId)
        data.universityId = universityId;
    if (req.user.role === 'ops_admin') {
        data.status = 'pending';
    }
    if (data.startDate)
        data.startDate = new Date(data.startDate);
    if (data.endDate)
        data.endDate = new Date(data.endDate);
    if (data.programId && !data.universityId) {
        const program = await prisma.program.findUnique({ where: { id: data.programId } });
        if (program)
            data.universityId = program.universityId;
    }
    const session = await prisma.admissionSession.create({ data });
    res.status(201).json({ success: true, data: session });
});
export const updateAdmissionSession = asyncHandler(async (req, res) => {
    const { examDate, universityId, ...rest } = req.body;
    const data = { ...rest };
    if (universityId !== undefined)
        data.universityId = universityId;
    if (req.user.role === 'ops_admin') {
        delete data.status;
    }
    if (data.startDate)
        data.startDate = new Date(data.startDate);
    if (data.endDate)
        data.endDate = new Date(data.endDate);
    if (data.programId && !data.universityId) {
        const program = await prisma.program.findUnique({ where: { id: data.programId } });
        if (program)
            data.universityId = program.universityId;
    }
    const session = await prisma.admissionSession.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: session });
});
export const deleteAdmissionSession = asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    // Nullify sessionId on any enrollments referencing this session before deleting
    await prisma.enrollment.updateMany({ where: { sessionId }, data: { sessionId: null } });
    await prisma.admissionSession.delete({ where: { id: sessionId } });
    res.json({ success: true, data: {} });
});
export const approveAdmissionSession = asyncHandler(async (req, res) => {
    const session = await prisma.admissionSession.update({ where: { id: req.params.id }, data: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() } });
    res.json({ success: true, data: session });
});
// Internal Marks
export const getInternalMarks = asyncHandler(async (req, res) => {
    const marks = await prisma.internalMark.findMany({ where: { organizationId: req.user.organizationId }, include: { student: true } });
    res.json({ success: true, count: marks.length, data: marks });
});
export const createInternalMark = asyncHandler(async (req, res) => {
    const mark = await prisma.internalMark.create({ data: { ...req.body, organizationId: req.user.organizationId, enteredBy: req.user.id } });
    res.status(201).json({ success: true, data: mark });
});
export const updateInternalMark = asyncHandler(async (req, res) => {
    const exists = await prisma.internalMark.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Internal mark not found' });
        return;
    }
    const { subject, marks, maxMarks, examType, remarks } = req.body;
    const updateData = {};
    if (subject !== undefined)
        updateData.subject = subject;
    if (marks !== undefined)
        updateData.marks = Number(marks);
    if (maxMarks !== undefined)
        updateData.maxMarks = Number(maxMarks);
    if (examType !== undefined)
        updateData.examType = examType;
    if (remarks !== undefined)
        updateData.remarks = remarks;
    const mark = await prisma.internalMark.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: mark });
});
export const deleteInternalMark = asyncHandler(async (req, res) => {
    await prisma.internalMark.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
// Announcements
export const getAnnouncements = asyncHandler(async (req, res) => {
    const announcements = await prisma.announcement.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, count: announcements.length, data: announcements });
});
export const getAnnouncement = asyncHandler(async (req, res) => {
    const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data: announcement });
});
export const createAnnouncement = asyncHandler(async (req, res) => {
    const announcement = await prisma.announcement.create({ data: { ...req.body, organizationId: req.user.organizationId, createdById: req.user.id } });
    res.status(201).json({ success: true, data: announcement });
});
export const updateAnnouncement = asyncHandler(async (req, res) => {
    const exists = await prisma.announcement.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId } });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Announcement not found' });
        return;
    }
    const { title, content, type, targetAudience, expiresAt } = req.body;
    const updateData = {};
    if (title !== undefined)
        updateData.title = title;
    if (content !== undefined)
        updateData.content = content;
    if (type !== undefined)
        updateData.type = type;
    if (targetAudience !== undefined)
        updateData.targetAudience = targetAudience;
    if (expiresAt !== undefined)
        updateData.expiresAt = new Date(expiresAt);
    const announcement = await prisma.announcement.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: announcement });
});
export const deleteAnnouncement = asyncHandler(async (req, res) => {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
// Onboarding
export const getPendingVerificationCenters = asyncHandler(async (req, res) => {
    const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId, status: 'pending_verification' } });
    res.json({ success: true, data: centers });
});
export const verifyCenter = asyncHandler(async (req, res) => {
    const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'verified' } });
    res.json({ success: true, data: center });
});
// Allocations
export const getProgramAllocations = asyncHandler(async (req, res) => {
    const allocations = await prisma.programAllocation.findMany({ where: { centerId: req.params.id }, include: { program: true } });
    res.json({ success: true, data: allocations });
});
export const allocateProgram = asyncHandler(async (req, res) => {
    const allocation = await prisma.programAllocation.create({ data: { ...req.body, centerId: req.params.id, organizationId: req.user.organizationId, allocatedBy: req.user.id } });
    res.status(201).json({ success: true, data: allocation });
});
export const removeAllocation = asyncHandler(async (req, res) => {
    await prisma.programAllocation.delete({ where: { id: req.params.allocId } });
    res.json({ success: true, data: {} });
});
//# sourceMappingURL=operationsController.js.map