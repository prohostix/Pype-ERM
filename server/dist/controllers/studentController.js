import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { sendEmail } from '../utils/emailService.js';
const SALES_ROLES = ['sales_admin', 'sales', 'sales_agent', 'bde', 'employee', 'staff'];
export const getStudents = asyncHandler(async (req, res) => {
    const where = { organizationId: req.user.organizationId };
    if (req.query.status)
        where.status = req.query.status;
    // Branch-level isolation for students list
    if (req.user.role !== 'superadmin' && req.user.role !== 'org_admin' && req.user.role !== 'ceo' && req.user.branchId) {
        where.branchId = req.user.branchId;
    }
    // Sales users only see students they personally enrolled or referred
    if (SALES_ROLES.includes(req.user.role)) {
        where.OR = [
            { enrolledBy: req.user.id },
            { referredBy: req.user.id }
        ];
    }
    const students = await prisma.student.findMany({
        where,
        include: { enrollments: true, program: true, center: true, university: true, session: true, branch: true },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, count: students.length, data: students });
});
export const getStudent = asyncHandler(async (req, res) => {
    const student = await prisma.student.findUnique({
        where: { id: req.params.id },
        include: { enrollments: true, program: true, center: true, university: true, session: true, branch: true }
    });
    if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
    }
    res.status(200).json({ success: true, data: student });
});
export const createStudent = asyncHandler(async (req, res) => {
    const { email, name, phone, centerId, branchId, universityId, programId, dob, admissionDate, admissionNo, isPrevious, fatherName, fatherPhone, motherName, motherPhone, religion, caste, address, pinCode, altPhone, photo, documents, status } = req.body;
    if (!programId || programId.trim() === '') {
        res.status(400).json({ success: false, message: 'Program is required' });
        return;
    }
    // Verify that the referenced center exists (if provided)
    if (centerId && centerId.trim() !== '') {
        const centerExists = await prisma.studyCenter.findFirst({
            where: { id: centerId, organizationId: req.user.organizationId }
        });
        if (!centerExists) {
            res.status(400).json({ success: false, message: 'Selected Study Center does not exist' });
            return;
        }
    }
    // Verify that the referenced branch exists (if provided)
    if (branchId && branchId.trim() !== '') {
        const branchExists = await prisma.branch.findFirst({
            where: { id: branchId, organizationId: req.user.organizationId }
        });
        if (!branchExists) {
            res.status(400).json({ success: false, message: 'Selected Branch does not exist' });
            return;
        }
    }
    // Verify that the referenced program exists
    const programExists = await prisma.program.findFirst({
        where: { id: programId, organizationId: req.user.organizationId }
    });
    if (!programExists) {
        res.status(400).json({ success: false, message: 'Selected Program does not exist' });
        return;
    }
    let studentUser = await prisma.user.findUnique({ where: { email } });
    const defaultPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
    if (!studentUser) {
        const generatedUid = await generateUserId();
        const hashedPassword = await hashPassword(defaultPassword);
        studentUser = await prisma.user.create({
            data: {
                userId: generatedUid,
                organizationId: req.user.organizationId,
                email,
                password: hashedPassword,
                name,
                role: 'staff', // Fallback role for student in UserRole enum
                phone,
                status: 'active',
            },
        });
    }
    else {
        // If the user already exists, update their password so it matches the generated credentials
        const hashedPassword = await hashPassword(defaultPassword);
        studentUser = await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                name,
                phone,
                status: 'active'
            }
        });
    }
    const student = await prisma.student.create({
        data: {
            name,
            email,
            phone,
            address: address || '',
            enrollmentNo: req.body.enrollmentNo,
            admissionNo: admissionNo || null,
            admissionDate: admissionDate ? new Date(admissionDate) : null,
            dob: dob ? new Date(dob) : null,
            fatherName: fatherName || null,
            fatherPhone: fatherPhone || null,
            motherName: motherName || null,
            motherPhone: motherPhone || null,
            religion: religion || null,
            caste: caste || null,
            altPhone: altPhone || null,
            pinCode: pinCode || null,
            photo: photo || null,
            documents: documents || [],
            isPrevious: Boolean(isPrevious),
            status: status || 'pending',
            programId,
            universityId: universityId || null,
            centerId: (centerId && centerId.trim() !== '') ? centerId : null,
            branchId: (branchId && branchId.trim() !== '') ? branchId : null,
            organizationId: req.user.organizationId,
            credentials: { email, password: defaultPassword },
            // Track who enrolled this student (sales user)
            enrolledBy: req.user.id
        }
    });
    // Send credentials email — failure must not fail the creation
    try {
        await sendEmail(email, 'Your Student Portal Credentials', `Hello ${name},\n\nYour account has been created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${email}\nPassword: ${defaultPassword}\n\nRegards,\nSchool Administration`, `<p>Hello <strong>${name}</strong>,</p><p>Your account has been created.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>Email:</strong> ${email}<br/><strong>Password:</strong> ${defaultPassword}</p><p>Regards,<br/>School Administration</p>`);
    }
    catch (mailErr) {
        console.error('Failed to send student credentials email:', mailErr.message);
    }
    res.status(201).json({ success: true, data: student });
});
export const updateStudent = asyncHandler(async (req, res) => {
    const studentExists = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!studentExists) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
    }
    // If credentials.password is updated, hash it and update corresponding User record
    if (req.body.credentials && req.body.credentials.password) {
        const hashedPassword = await hashPassword(req.body.credentials.password);
        await prisma.user.update({
            where: { email: studentExists.email },
            data: { password: hashedPassword }
        });
    }
    const dataToUpdate = { ...req.body };
    delete dataToUpdate.id;
    delete dataToUpdate.email; // Do not allow updating primary email directly
    if (dataToUpdate.dob)
        dataToUpdate.dob = new Date(dataToUpdate.dob);
    if (dataToUpdate.admissionDate)
        dataToUpdate.admissionDate = new Date(dataToUpdate.admissionDate);
    if ('centerId' in dataToUpdate) {
        dataToUpdate.centerId = (dataToUpdate.centerId && dataToUpdate.centerId.trim() !== '') ? dataToUpdate.centerId : null;
    }
    if ('branchId' in dataToUpdate) {
        dataToUpdate.branchId = (dataToUpdate.branchId && dataToUpdate.branchId.trim() !== '') ? dataToUpdate.branchId : null;
    }
    if ('sessionId' in dataToUpdate) {
        dataToUpdate.sessionId = (dataToUpdate.sessionId && dataToUpdate.sessionId.trim() !== '') ? dataToUpdate.sessionId : null;
    }
    if ('universityId' in dataToUpdate) {
        dataToUpdate.universityId = (dataToUpdate.universityId && dataToUpdate.universityId.trim() !== '') ? dataToUpdate.universityId : null;
    }
    const student = await prisma.student.update({
        where: { id: req.params.id },
        data: dataToUpdate
    });
    res.status(200).json({ success: true, data: student });
});
export const deleteStudent = asyncHandler(async (req, res) => {
    const studentExists = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!studentExists) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
    }
    await prisma.student.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, data: {} });
});
export const approveStudent = asyncHandler(async (req, res) => {
    const studentExists = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!studentExists) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
    }
    const student = await prisma.student.update({
        where: { id: req.params.id },
        data: { status: 'active' }
    });
    res.status(200).json({ success: true, data: student });
});
export const bulkImportStudents = asyncHandler(async (req, res) => {
    const { students, isPrevious, branchId, salesUserId } = req.body;
    if (!Array.isArray(students)) {
        res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of students.' });
        return;
    }
    const organizationId = req.user.organizationId;
    const results = {
        imported: 0,
        skipped: 0,
        errors: []
    };
    for (const s of students) {
        try {
            if (!s.email || !s.name) {
                results.skipped++;
                results.errors.push(`Skipped record missing email or name`);
                continue;
            }
            // Check if student email is already registered
            const existingStudent = await prisma.student.findUnique({ where: { email: s.email } });
            if (existingStudent) {
                results.skipped++;
                results.errors.push(`Student with email ${s.email} already exists`);
                continue;
            }
            // Resolve program
            let program = null;
            if (s.programId) {
                program = await prisma.program.findFirst({
                    where: {
                        id: s.programId,
                        organizationId
                    }
                });
            }
            else {
                const programOr = [];
                if (s.programCode)
                    programOr.push({ code: s.programCode });
                if (s.programName)
                    programOr.push({ name: s.programName });
                if (programOr.length > 0) {
                    program = await prisma.program.findFirst({
                        where: {
                            OR: programOr,
                            organizationId
                        }
                    });
                }
            }
            if (!program) {
                results.skipped++;
                results.errors.push(`Program not found for student ${s.name} (${s.email})`);
                continue;
            }
            // Resolve study center (optional)
            let resolvedCenterId = null;
            if (s.centerId || s.centerCode || s.centerName) {
                const centerOr = [];
                if (s.centerId)
                    centerOr.push({ id: s.centerId });
                if (s.centerCode)
                    centerOr.push({ code: s.centerCode });
                if (s.centerName)
                    centerOr.push({ name: s.centerName });
                const center = await prisma.studyCenter.findFirst({
                    where: {
                        OR: centerOr.length > 0 ? centerOr : undefined,
                        organizationId
                    }
                });
                if (!center) {
                    results.skipped++;
                    results.errors.push(`Study Center not found for student ${s.name} (${s.email})`);
                    continue;
                }
                resolvedCenterId = center.id;
            }
            // Ensure user account exists
            let studentUser = await prisma.user.findUnique({ where: { email: s.email } });
            let generatedUid = s.enrollmentNo || s.enrollmentno || s.enrollment_no || s['enrollment no'] || s.enrollment || '';
            const defaultPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
            if (!studentUser) {
                if (!generatedUid) {
                    generatedUid = await generateUserId();
                }
                const hashedPassword = await hashPassword(defaultPassword);
                studentUser = await prisma.user.create({
                    data: {
                        userId: generatedUid,
                        organizationId,
                        email: s.email,
                        password: hashedPassword,
                        name: s.name,
                        role: 'staff',
                        phone: s.phone || '',
                        status: 'active',
                        branchId: branchId || undefined,
                    },
                });
            }
            else {
                if (!generatedUid) {
                    generatedUid = studentUser.userId || await generateUserId();
                }
                const hashedPassword = await hashPassword(defaultPassword);
                await prisma.user.update({
                    where: { email: s.email },
                    data: {
                        password: hashedPassword,
                        name: s.name,
                        phone: s.phone || '',
                        status: 'active',
                        branchId: branchId || undefined,
                    }
                });
            }
            // Resolve admission session (optional)
            let resolvedSessionId = null;
            if (s.sessionId) {
                resolvedSessionId = s.sessionId;
            }
            else if (s.session) {
                const sessionRec = await prisma.admissionSession.findFirst({
                    where: {
                        name: {
                            equals: s.session.toString().trim(),
                            mode: 'insensitive'
                        },
                        organizationId
                    }
                });
                if (sessionRec) {
                    resolvedSessionId = sessionRec.id;
                }
            }
            // Create student record
            await prisma.student.create({
                data: {
                    name: s.name,
                    email: s.email,
                    phone: s.phone || '',
                    address: s.address || '',
                    enrollmentNo: generatedUid,
                    programId: program.id,
                    universityId: program.universityId,
                    centerId: resolvedCenterId || undefined,
                    sessionId: resolvedSessionId || undefined,
                    status: s.status || 'active',
                    isPrevious: isPrevious || s.isPrevious || false,
                    organizationId,
                    branchId: branchId || undefined,
                    dob: s.dob ? new Date(s.dob) : undefined,
                    admissionDate: s.admissionDate ? new Date(s.admissionDate) : undefined,
                    credentials: { email: s.email, password: defaultPassword },
                    enrolledBy: SALES_ROLES.includes(req.user.role) ? req.user.id : (salesUserId && salesUserId !== 'none' ? salesUserId : null)
                }
            });
            results.imported++;
            // Send credentials email — wrapped separately so a mail failure
            // does NOT mark an already-saved student record as failed.
            try {
                await sendEmail(s.email, 'Your Student Portal Credentials', `Hello ${s.name},\n\nYour account has been created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${s.email}\nPassword: ${defaultPassword}\n\nRegards,\nSchool Administration`, `<p>Hello <strong>${s.name}</strong>,</p><p>Your account has been created.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>Email:</strong> ${s.email}<br/><strong>Password:</strong> ${defaultPassword}</p><p>Regards,<br/>School Administration</p>`);
            }
            catch (mailErr) {
                results.errors.push(`Student ${s.name} (${s.email}) imported but email delivery failed: ${mailErr.message}`);
            }
        }
        catch (err) {
            results.skipped++;
            results.errors.push(`Failed to import student ${s.name || 'Unknown'}: ${err.message}`);
        }
    }
    res.status(200).json({ success: true, data: results });
});
export const notifyStudent = asyncHandler(async (req, res) => {
    const student = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
    }
    const studentUser = await prisma.user.findUnique({ where: { email: student.email } });
    if (!studentUser) {
        res.status(404).json({ success: false, message: 'Student user account not found' });
        return;
    }
    const notification = await prisma.notification.create({
        data: {
            organizationId: req.user.organizationId,
            userId: studentUser.id,
            title: req.body.title || 'Student Notification',
            message: req.body.message,
            type: req.body.type || 'general',
            priority: req.body.priority || 'medium'
        }
    });
    res.status(201).json({ success: true, data: notification });
});
export const getInternalMarks = asyncHandler(async (req, res) => {
    const marks = await prisma.internalMark.findMany({
        where: { organizationId: req.user.organizationId },
        include: { student: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: marks });
});
export const getInternalMark = asyncHandler(async (req, res) => {
    const mark = await prisma.internalMark.findUnique({
        where: { id: req.params.id },
        include: { student: { select: { name: true } } }
    });
    if (!mark) {
        res.status(404).json({ success: false, message: 'Internal mark not found' });
        return;
    }
    res.status(200).json({ success: true, data: mark });
});
export const createInternalMark = asyncHandler(async (req, res) => {
    const mark = await prisma.internalMark.create({
        data: {
            ...req.body,
            organizationId: req.user.organizationId,
            enteredBy: req.user.id
        }
    });
    res.status(201).json({ success: true, data: mark });
});
export const updateInternalMark = asyncHandler(async (req, res) => {
    const markExists = await prisma.internalMark.findUnique({ where: { id: req.params.id } });
    if (!markExists) {
        res.status(404).json({ success: false, message: 'Internal mark not found' });
        return;
    }
    const mark = await prisma.internalMark.update({
        where: { id: req.params.id },
        data: req.body
    });
    res.status(200).json({ success: true, data: mark });
});
export const deleteInternalMark = asyncHandler(async (req, res) => {
    const markExists = await prisma.internalMark.findUnique({ where: { id: req.params.id } });
    if (!markExists) {
        res.status(404).json({ success: false, message: 'Internal mark not found' });
        return;
    }
    await prisma.internalMark.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, data: {} });
});
export const uploadStudentDocument = asyncHandler(async (req, res) => {
    const student = await prisma.student.findUnique({
        where: { id: req.params.id },
    });
    if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
    }
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const docName = req.body.name || req.file.originalname;
    const currentDocs = Array.isArray(student.documents) ? student.documents : [];
    const updatedDocs = [
        ...currentDocs,
        {
            name: docName,
            url: fileUrl,
            uploadedAt: new Date().toISOString(),
            uploadedBy: req.user.name || req.user.email,
        },
    ];
    const updatedStudent = await prisma.student.update({
        where: { id: req.params.id },
        data: {
            documents: updatedDocs,
        },
    });
    res.status(200).json({ success: true, data: updatedStudent });
});
//# sourceMappingURL=studentController.js.map