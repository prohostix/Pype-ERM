import prisma from '../lib/prisma.js';
import { hashPassword, generateUserId } from './authUtils.js';
import { sendEmail } from './emailService.js';

export async function provisionStudentAfterApproval(enrollmentId: string) {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { program: true }
    });

    if (!enrollment) {
      console.error(`Enrollment not found for provisioning: ${enrollmentId}`);
      return;
    }

    // 1. Resolve or generate credentials
    let studentRecord = await prisma.student.findUnique({ where: { email: enrollment.studentEmail } });
    let generatedPassword = '';
    const existingCreds: any = studentRecord?.credentials;
    if (existingCreds && typeof existingCreds === 'object' && existingCreds.password && !existingCreds.password.includes('(')) {
      generatedPassword = existingCreds.password;
    }
    if (!generatedPassword) {
      generatedPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
    }
    const hashedPassword = await hashPassword(generatedPassword);

    // 2. Provision or activate User account
    let studentUser = await prisma.user.findUnique({ where: { email: enrollment.studentEmail } });
    let generatedUid = '';

    if (!studentUser) {
      generatedUid = await generateUserId();
      studentUser = await prisma.user.create({
        data: {
          userId: generatedUid,
          organizationId: enrollment.organizationId,
          email: enrollment.studentEmail,
          password: hashedPassword,
          name: enrollment.studentName,
          role: 'student',
          phone: enrollment.studentPhone || '',
          status: 'active',
        },
      });
    } else {
      generatedUid = studentUser.userId || await generateUserId();
      await prisma.user.update({
        where: { id: studentUser.id },
        data: {
          userId: generatedUid,
          status: 'active',
          password: hashedPassword
        }
      });
    }

    // Determine admission prefix
    const org = await prisma.organization.findUnique({ where: { id: enrollment.organizationId } });
    let admissionPrefix = 'ADM';
    if (org?.metadata && (org.metadata as any).admissionPrefix) {
      admissionPrefix = (org.metadata as any).admissionPrefix;
    } else if (org?.name) {
      admissionPrefix = org.name.substring(0, 3).toUpperCase();
    }

    let salesUserBranchId = null;
    if (enrollment.salesUserId) {
      const salesUser = await prisma.user.findUnique({ where: { id: enrollment.salesUserId }, select: { branchId: true } });
      if (salesUser) salesUserBranchId = salesUser.branchId;
    }

    // Generate unique admission number if needed
    let isUnique = false;
    let newAdmissionNo = '';
    while (!isUnique) {
      const randomStr = Math.floor(100000 + Math.random() * 900000).toString();
      newAdmissionNo = `${admissionPrefix}-${randomStr}`;
      const existing = await prisma.student.findFirst({ where: { admissionNo: newAdmissionNo } });
      if (!existing) isUnique = true;
    }

    // 3. Provision or update Student record
    if (!studentRecord) {
      studentRecord = await prisma.student.create({
        data: {
          centerId: enrollment.studyCenterId,
          organizationId: enrollment.organizationId,
          branchId: salesUserBranchId,
          name: enrollment.studentName,
          email: enrollment.studentEmail,
          phone: enrollment.studentPhone,
          address: enrollment.studentAddress,
          fatherName: enrollment.fatherName,
          motherName: enrollment.motherName,
          fatherPhone: enrollment.fatherPhone,
          motherPhone: enrollment.motherPhone,
          guardianName: enrollment.guardianName,
          familyPhone: enrollment.familyPhone,
          dob: enrollment.dob,
          altPhone: enrollment.altPhone,
          pinCode: enrollment.pinCode,
          gender: enrollment.gender,
          category: enrollment.category,
          religion: enrollment.religion,
          maritalStatus: enrollment.maritalStatus,
          employmentStatus: enrollment.employmentStatus,
          caste: enrollment.caste,
          specialisation: enrollment.specialisation,
          programId: enrollment.programId,
          sessionId: enrollment.sessionId,
          universityId: enrollment.program?.universityId || null,
          photo: enrollment.photo,
          documents: enrollment.documents ? enrollment.documents : undefined,
          status: 'active',
          referredBy: enrollment.salesUserId,
          enrolledBy: enrollment.salesUserId,
          admissionNo: newAdmissionNo,
          credentials: { email: enrollment.studentEmail, password: generatedPassword }
        },
      });
    } else {
      studentRecord = await prisma.student.update({
        where: { id: studentRecord.id },
        data: {
          status: 'active',
          admissionNo: studentRecord.admissionNo || newAdmissionNo,
          branchId: studentRecord.branchId || salesUserBranchId || undefined,
          centerId: studentRecord.centerId || enrollment.studyCenterId,
          programId: studentRecord.programId || enrollment.programId,
          sessionId: studentRecord.sessionId || enrollment.sessionId,
          universityId: studentRecord.universityId || enrollment.program?.universityId || undefined,
          photo: studentRecord.photo || enrollment.photo || undefined,
          documents: (studentRecord.documents && Array.isArray(studentRecord.documents) && studentRecord.documents.length > 0)
            ? studentRecord.documents
            : (enrollment.documents || undefined),
          credentials: { email: enrollment.studentEmail, password: generatedPassword }
        }
      });
    }

    // 4. Update enrollment with student record ID
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        studentId: studentRecord.id
      }
    });

    // 5. Send credentials email to student
    try {
      await sendEmail(
        enrollment.studentEmail,
        'Your Student Portal Credentials',
        `Hello ${enrollment.studentName},\n\nYour enrollment has been approved and account created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${enrollment.studentEmail}\nPassword: ${generatedPassword}\nUser ID: ${generatedUid}\n\nRegards,\nSchool Administration`,
        `<p>Hello <strong>${enrollment.studentName}</strong>,</p><p>Your enrollment has been approved and your account is active.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>User ID:</strong> ${generatedUid}<br/><strong>Email:</strong> ${enrollment.studentEmail}<br/><strong>Password:</strong> ${generatedPassword}</p><p>Regards,<br/>School Administration</p>`
      );
    } catch (mailErr: any) {
      console.error('Failed to send student credentials email:', mailErr.message);
    }

    console.log(`Successfully provisioned student/user for enrollment: ${enrollmentId}`);
  } catch (error) {
    console.error('Error provisioning student/user after enrollment approval:', error);
  }
}
