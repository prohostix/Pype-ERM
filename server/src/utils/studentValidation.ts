import prisma from '../lib/prisma.js';

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes a phone number by stripping all non-digit characters.
 * Also strips leading standard country code (91) or leading trunk zero (0) for 10-digit mobile numbers.
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

export interface UniquenessCheckOptions {
  email?: string | null;
  phone?: string | null;
  organizationId?: string | null;
  excludeStudentId?: string | null;
  excludeEnrollmentId?: string | null;
}

export interface UniquenessResult {
  isUnique: boolean;
  field?: 'email' | 'phone';
  conflictEntity?: 'student' | 'enrollment' | 'user';
  message?: string;
  conflictDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    admissionNo?: string | null;
    status?: string;
  };
}

/**
 * Checks whether an email or phone number is already registered across:
 * 1. The Student table (existing admitted / created students)
 * 2. Active Enrollment applications (provisional, review, pipeline)
 * 3. The User table (staff/admin accounts using the same email)
 */
export async function checkStudentOrEnrollmentExists(
  options: UniquenessCheckOptions
): Promise<UniquenessResult> {
  const cleanEmail = normalizeEmail(options.email);
  const rawPhone = (options.phone || '').trim();
  const cleanPhone = normalizePhone(options.phone);

  // 1. Check Student table by Email
  if (cleanEmail) {
    const existingStudentByEmail = await prisma.student.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        ...(options.excludeStudentId ? { id: { not: options.excludeStudentId } } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, admissionNo: true, status: true }
    });

    if (existingStudentByEmail) {
      return {
        isUnique: false,
        field: 'email',
        conflictEntity: 'student',
        message: 'Email is already taken',
        conflictDetails: existingStudentByEmail
      };
    }
  }

  // 2. Check Student table by Phone
  if (cleanPhone && cleanPhone.length >= 7) {
    // Search by exact string or substring of phone
    const phoneCandidates = await prisma.student.findMany({
      where: {
        OR: [
          { phone: rawPhone },
          { phone: cleanPhone },
          ...(cleanPhone.length >= 10 ? [{ phone: { contains: cleanPhone.slice(-10) } }] : [])
        ],
        ...(options.excludeStudentId ? { id: { not: options.excludeStudentId } } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, admissionNo: true, status: true }
    });

    const matchingStudent = phoneCandidates.find(s => {
      const candidateNorm = normalizePhone(s.phone);
      return candidateNorm === cleanPhone || (candidateNorm.length >= 10 && cleanPhone.length >= 10 && candidateNorm.slice(-10) === cleanPhone.slice(-10));
    });

    if (matchingStudent) {
      return {
        isUnique: false,
        field: 'phone',
        conflictEntity: 'student',
        message: 'Phone number is already taken',
        conflictDetails: matchingStudent
      };
    }
  }

  // 3. Check active Enrollment applications by Email
  if (cleanEmail) {
    const existingEnrollmentByEmail = await prisma.enrollment.findFirst({
      where: {
        studentEmail: { equals: cleanEmail, mode: 'insensitive' },
        status: { notIn: ['rejected', 'cancelled'] },
        ...(options.excludeEnrollmentId ? { id: { not: options.excludeEnrollmentId } } : {}),
      },
      select: { id: true, studentName: true, studentEmail: true, studentPhone: true, status: true, isProvisional: true }
    });

    if (existingEnrollmentByEmail) {
      return {
        isUnique: false,
        field: 'email',
        conflictEntity: 'enrollment',
        message: 'Email is already taken',
        conflictDetails: {
          name: existingEnrollmentByEmail.studentName,
          email: existingEnrollmentByEmail.studentEmail,
          phone: existingEnrollmentByEmail.studentPhone,
          status: existingEnrollmentByEmail.status
        }
      };
    }
  }

  // 4. Check active Enrollment applications by Phone
  if (cleanPhone && cleanPhone.length >= 7) {
    const enrollmentCandidates = await prisma.enrollment.findMany({
      where: {
        OR: [
          { studentPhone: rawPhone },
          { studentPhone: cleanPhone },
          ...(cleanPhone.length >= 10 ? [{ studentPhone: { contains: cleanPhone.slice(-10) } }] : [])
        ],
        status: { notIn: ['rejected', 'cancelled'] },
        ...(options.excludeEnrollmentId ? { id: { not: options.excludeEnrollmentId } } : {}),
      },
      select: { id: true, studentName: true, studentEmail: true, studentPhone: true, status: true, isProvisional: true }
    });

    const matchingEnrollment = enrollmentCandidates.find(e => {
      const candidateNorm = normalizePhone(e.studentPhone);
      return candidateNorm === cleanPhone || (candidateNorm.length >= 10 && cleanPhone.length >= 10 && candidateNorm.slice(-10) === cleanPhone.slice(-10));
    });

    if (matchingEnrollment) {
      return {
        isUnique: false,
        field: 'phone',
        conflictEntity: 'enrollment',
        message: 'Phone number is already taken',
        conflictDetails: {
          name: matchingEnrollment.studentName,
          email: matchingEnrollment.studentEmail,
          phone: matchingEnrollment.studentPhone,
          status: matchingEnrollment.status
        }
      };
    }
  }

  // 5. Check User table for staff/admin email collisions
  if (cleanEmail) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' }
      },
      select: { id: true, email: true, role: true, name: true }
    });

    if (existingUser && existingUser.role !== 'student') {
      return {
        isUnique: false,
        field: 'email',
        conflictEntity: 'user',
        message: 'Email is already taken',
        conflictDetails: existingUser
      };
    }
  }

  return { isUnique: true };
}
