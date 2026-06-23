import prisma from '../lib/prisma.js';
import { hashPassword, generateUserId } from './authUtils.js';
import { sendEmail } from './emailService.js';

export async function provisionStudentAfterApproval(enrollmentId: string) {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      console.error(`Enrollment not found for provisioning: ${enrollmentId}`);
      return;
    }

    // 1. Provision User account if not exists
    let studentUser = await prisma.user.findUnique({ where: { email: enrollment.studentEmail } });
    let generatedPassword = '';
    let generatedUid = '';
    if (!studentUser) {
      generatedUid = await generateUserId();
      generatedPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;
      const hashedPassword = await hashPassword(generatedPassword);
      studentUser = await prisma.user.create({
        data: {
          userId: generatedUid,
          organizationId: enrollment.organizationId,
          email: enrollment.studentEmail,
          password: hashedPassword,
          name: enrollment.studentName,
          role: 'staff', // Fallback role for student in UserRole enum
          phone: enrollment.studentPhone,
          status: 'active',
        },
      });
    } else {
      generatedUid = studentUser.userId || 'PYPEERM0000';
      generatedPassword = '(Existing student account)';
    }

    // 2. Provision Student record if not exists
    let studentRecord = await prisma.student.findUnique({ where: { email: enrollment.studentEmail } });
    if (!studentRecord) {
      studentRecord = await prisma.student.create({
        data: {
          centerId: enrollment.studyCenterId,
          organizationId: enrollment.organizationId,
          enrollmentNo: generatedUid,
          name: enrollment.studentName,
          email: enrollment.studentEmail,
          phone: enrollment.studentPhone,
          address: enrollment.studentAddress,
          fatherName: enrollment.fatherName,
          dob: enrollment.dob,
          altPhone: enrollment.altPhone,
          pinCode: enrollment.pinCode,
          programId: enrollment.programId,
          sessionId: enrollment.sessionId,
          status: 'active',
          referredBy: enrollment.salesUserId,
          credentials: generatedPassword !== '(Existing student account)' ? { email: enrollment.studentEmail, password: generatedPassword } : undefined
        },
      });
    } else {
      // Update student record status to active if it was pending
      studentRecord = await prisma.student.update({
        where: { id: studentRecord.id },
        data: {
          status: 'active',
          enrollmentNo: studentRecord.enrollmentNo || generatedUid,
          centerId: studentRecord.centerId || enrollment.studyCenterId,
          programId: studentRecord.programId || enrollment.programId,
          sessionId: studentRecord.sessionId || enrollment.sessionId,
        }
      });
    }

    // 3. Update the enrollment with student record ID & enrollment number
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        studentId: studentRecord.id,
        enrollmentNumber: studentRecord.enrollmentNo || generatedUid,
      }
    });

    // Send credentials email if generated
    if (generatedPassword && generatedPassword !== '(Existing student account)') {
      await sendEmail(
        enrollment.studentEmail,
        'Your Student Portal Credentials',
        `Hello ${enrollment.studentName},\n\nYour enrollment has been approved and account created.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\nEmail: ${enrollment.studentEmail}\nPassword: ${generatedPassword}\n\nRegards,\nSchool Administration`,
        `<p>Hello <strong>${enrollment.studentName}</strong>,</p><p>Your enrollment has been approved and account created.</p><p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a><br/><strong>Email:</strong> ${enrollment.studentEmail}<br/><strong>Password:</strong> ${generatedPassword}</p><p>Regards,<br/>School Administration</p>`
      );
    }

    console.log(`Successfully provisioned student/user for enrollment: ${enrollmentId}`);
  } catch (error) {
    console.error('Error provisioning student/user after enrollment approval:', error);
  }
}
