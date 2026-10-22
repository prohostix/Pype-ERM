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
  identifier?: string | null;
  organizationId?: string | null;
  excludeStudentId?: string | null;
  excludeEnrollmentId?: string | null;
  existingStudentId?: string | null;
  isUpgrade?: boolean;
  programId?: string | null;
  sessionId?: string | null;
}

export interface UniquenessResult {
  isUnique: boolean;
  field?: 'email' | 'phone';
  conflictEntity?: 'student' | 'enrollment' | 'user';
  message?: string;
  isCompleted?: boolean;
  isInProgress?: boolean;
  canUpgrade?: boolean;
  previousProgram?: {
    id: string;
    name: string;
    code?: string;
    universityName?: string;
  } | null;
  activeEnrollment?: {
    id: string;
    programName?: string;
    status: string;
  } | null;
  studentData?: Record<string, any>;
  conflictDetails?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    admissionNo?: string | null;
    status?: string;
  };
}

/**
 * Checks whether an email, phone number, or student identifier is already registered across:
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
  const cleanIdentifier = (options.identifier || '').trim();

  // Helper to extract student upgrade status and full past data
  const buildStudentUpgradeResult = async (existingStudent: any, field: 'email' | 'phone'): Promise<UniquenessResult> => {
    // Organization privacy protection:
    // If the matched student belongs to a DIFFERENT organization, do NOT leak details or allow upgrade
    const isOtherOrg = Boolean(
      options.organizationId &&
      existingStudent.organizationId &&
      existingStudent.organizationId !== options.organizationId
    );

    if (isOtherOrg) {
      const fieldLabel = field === 'email' ? 'email address' : 'phone number';
      return {
        isUnique: false,
        field,
        conflictEntity: 'student',
        message: `This ${fieldLabel} is already registered in the system.`,
        isCompleted: false,
        isInProgress: false,
        canUpgrade: false,
        previousProgram: null,
        activeEnrollment: null,
        studentData: undefined,
        conflictDetails: undefined
      };
    }

    // Check if the student has completed their program (only within caller's organization)
    let isCompleted = Boolean(
      existingStudent.isPrevious === true || 
      (existingStudent.status || '').toLowerCase() === 'completed'
    );

    // If this specific record is not explicitly completed, check if any duplicate peer record
    // with the same phone or email is marked completed/previous within the same organization
    if (!isCompleted && (existingStudent.phone || existingStudent.email)) {
      const cleanP = normalizePhone(existingStudent.phone);
      const cleanE = normalizeEmail(existingStudent.email);
      const orConditions: any[] = [];
      if (cleanE) orConditions.push({ email: { equals: cleanE, mode: 'insensitive' as const } });
      if (cleanP) {
        orConditions.push({ phone: existingStudent.phone });
        orConditions.push({ phone: cleanP });
        if (cleanP.length >= 10) orConditions.push({ phone: { contains: cleanP.slice(-10) } });
      }

      if (orConditions.length > 0) {
        const completedPeer = await prisma.student.findFirst({
          where: {
            id: { not: existingStudent.id },
            ...(options.organizationId ? { organizationId: options.organizationId } : {}),
            OR: orConditions,
            AND: [
              {
                OR: [
                  { isPrevious: true },
                  { status: 'completed' }
                ]
              }
            ]
          }
        });
        if (completedPeer) {
          isCompleted = true;
        }
      }
    }

    // Check for any active ongoing enrollments for this student (excluding finalized/inactive ones)
    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: existingStudent.id,
        status: { notIn: ['rejected', 'cancelled', 'ops_rejected', 'completed', 'graduated', 'alumni'] }
      },
      include: {
        program: { select: { id: true, name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const pipelineStatuses = [
      'payment_pending', 'submitted', 'receipt_submitted', 'document_review',
      'finance_review', 'sales_admin_review', 'ops_upgrade_verification',
      'sales_verification_pending', 'provisional_finance_pending', 'provisional_finance_verified'
    ];

    // If the student has already completed their program, an 'enrolled' status on their past program
    // represents their finished degree and does NOT block an upgrade.
    // Ongoing enrollments that block re-enrollment are unverified pipeline applications or (if not completed) 'enrolled'.
    const activeCurrent = activeEnrollments.find(e => 
      pipelineStatuses.includes(e.status) || (!isCompleted && e.status === 'enrolled')
    ) || null;

    const hasActiveEnrollment = Boolean(activeCurrent);
    const isInProgress = !isCompleted || hasActiveEnrollment;
    const canUpgrade = isCompleted && !hasActiveEnrollment;

    const previousProgram = existingStudent.program ? {
      id: existingStudent.program.id,
      name: existingStudent.program.name,
      code: existingStudent.program.code,
      universityName: existingStudent.university?.name || existingStudent.program?.university?.name
    } : null;

    const activeEnrollmentInfo = activeCurrent ? {
      id: activeCurrent.id,
      programName: activeCurrent.program?.name || 'Current Program',
      status: activeCurrent.status
    } : null;

    const studentData = {
      id: existingStudent.id,
      name: existingStudent.name,
      email: existingStudent.email,
      phone: existingStudent.phone,
      dob: existingStudent.dob ? new Date(existingStudent.dob).toISOString().split('T')[0] : '',
      gender: existingStudent.gender || '',
      category: existingStudent.category || '',
      religion: existingStudent.religion || '',
      caste: existingStudent.caste || '',
      maritalStatus: existingStudent.maritalStatus || '',
      employmentStatus: existingStudent.employmentStatus || '',
      fatherName: existingStudent.fatherName || '',
      fatherPhone: existingStudent.fatherPhone || '',
      motherName: existingStudent.motherName || '',
      motherPhone: existingStudent.motherPhone || '',
      guardianName: existingStudent.guardianName || '',
      familyPhone: existingStudent.familyPhone || '',
      address: existingStudent.address || '',
      pinCode: existingStudent.pinCode || '',
      altPhone: existingStudent.altPhone || '',
      photo: existingStudent.photo || '',
      documents: Array.isArray(existingStudent.documents) ? existingStudent.documents : [],
      admissionNo: existingStudent.admissionNo,
      enrollmentNo: existingStudent.enrollmentNo,
      isPrevious: existingStudent.isPrevious,
      status: existingStudent.status,
      programId: existingStudent.programId,
      universityId: existingStudent.universityId,
      specialisation: existingStudent.specialisation
    };

    let message = 'Student record exists';
    if (canUpgrade) {
      message = `Student already existed and has completed ${previousProgram?.name || 'previous program'}. You can re-enroll this student in another program.`;
    } else if (isInProgress) {
      const progName = activeEnrollmentInfo?.programName || previousProgram?.name;
      message = progName
        ? `This student already exists in progress (${progName}), cannot enroll`
        : 'This student already exists in progress, cannot enroll';
    }

    // If options.isUpgrade is explicitly requested during submission
    if (options.isUpgrade) {
      if (!canUpgrade) {
        return {
          isUnique: false,
          field,
          conflictEntity: 'student',
          message: `Cannot enroll this student: This student is currently in progress. Only completed students can be upgraded to another program.`,
          isCompleted,
          isInProgress,
          canUpgrade,
          previousProgram,
          activeEnrollment: activeEnrollmentInfo,
          studentData,
          conflictDetails: existingStudent
        };
      }

      // Check if already applied/enrolled for the SAME target program
      if (options.programId) {
        const sameProgramEnrollment = await prisma.enrollment.findFirst({
          where: {
            studentId: existingStudent.id,
            programId: options.programId,
            ...(options.sessionId ? { sessionId: options.sessionId } : {}),
            status: { notIn: ['rejected', 'cancelled', 'ops_rejected'] }
          }
        });
        if (sameProgramEnrollment) {
          return {
            isUnique: false,
            field,
            conflictEntity: 'enrollment',
            message: `Student already has an active or completed application for this exact program.`,
            isCompleted,
            isInProgress,
            canUpgrade,
            previousProgram,
            activeEnrollment: activeEnrollmentInfo,
            studentData,
            conflictDetails: existingStudent
          };
        }
      }

      // Check User table for staff/admin email collisions
      if (cleanEmail) {
        const existingUser = await prisma.user.findFirst({
          where: { email: { equals: cleanEmail, mode: 'insensitive' } },
          select: { id: true, email: true, role: true, name: true }
        });
        if (existingUser && existingUser.role !== 'student') {
          return {
            isUnique: false,
            field: 'email',
            conflictEntity: 'user',
            message: 'Email is already taken by a staff or admin account',
            conflictDetails: existingUser
          };
        }
      }

      // Permitted upgrade!
      return {
        isUnique: true,
        isCompleted,
        isInProgress: false,
        canUpgrade: true,
        previousProgram,
        activeEnrollment: activeEnrollmentInfo,
        studentData,
        message
      };
    }

    return {
      isUnique: false,
      field,
      conflictEntity: 'student',
      message,
      isCompleted,
      isInProgress,
      canUpgrade,
      previousProgram,
      activeEnrollment: activeEnrollmentInfo,
      studentData,
      conflictDetails: {
        id: existingStudent.id,
        name: existingStudent.name,
        email: existingStudent.email,
        phone: existingStudent.phone,
        admissionNo: existingStudent.admissionNo,
        status: existingStudent.status
      }
    };
  };

  // Helper to extract enrollment collision info and full prefill data
  const buildEnrollmentConflictResult = (existingEnrollment: any, field: 'email' | 'phone'): UniquenessResult => {
    // Organization privacy protection:
    // If the enrollment belongs to a DIFFERENT organization, do NOT leak details
    const isOtherOrg = Boolean(
      options.organizationId &&
      existingEnrollment.organizationId &&
      existingEnrollment.organizationId !== options.organizationId
    );

    if (isOtherOrg) {
      const fieldLabel = field === 'email' ? 'email address' : 'phone number';
      return {
        isUnique: false,
        field,
        conflictEntity: 'enrollment',
        message: `This ${fieldLabel} is already registered in an ongoing enrollment.`,
        isCompleted: false,
        isInProgress: true,
        canUpgrade: false,
        previousProgram: null,
        activeEnrollment: null,
        studentData: undefined,
        conflictDetails: undefined
      };
    }

    const progName = existingEnrollment.program?.name;
    const studentData = {
      id: existingEnrollment.studentId || existingEnrollment.id,
      name: existingEnrollment.studentName,
      email: existingEnrollment.studentEmail,
      phone: existingEnrollment.studentPhone,
      address: existingEnrollment.studentAddress || '',
      altPhone: existingEnrollment.altPhone || '',
      dob: existingEnrollment.dob ? new Date(existingEnrollment.dob).toISOString().split('T')[0] : '',
      gender: existingEnrollment.gender || '',
      category: existingEnrollment.category || '',
      religion: existingEnrollment.religion || '',
      caste: existingEnrollment.caste || '',
      maritalStatus: existingEnrollment.maritalStatus || '',
      employmentStatus: existingEnrollment.employmentStatus || '',
      fatherName: existingEnrollment.fatherName || '',
      fatherPhone: existingEnrollment.fatherPhone || '',
      motherName: existingEnrollment.motherName || '',
      motherPhone: existingEnrollment.motherPhone || '',
      guardianName: existingEnrollment.guardianName || '',
      familyPhone: existingEnrollment.familyPhone || '',
      photo: existingEnrollment.photo || '',
      documents: Array.isArray(existingEnrollment.documents) ? existingEnrollment.documents : [],
      pinCode: existingEnrollment.pinCode || '',
      admissionNo: existingEnrollment.enrollmentNumber,
      enrollmentNo: existingEnrollment.enrollmentNumber,
      status: existingEnrollment.status,
      programId: existingEnrollment.programId,
      specialisation: existingEnrollment.specialisation
    };

    return {
      isUnique: false,
      field,
      conflictEntity: 'enrollment',
      isCompleted: false,
      isInProgress: true,
      canUpgrade: false,
      message: progName 
        ? `This student already exists in progress (${progName}), cannot enroll`
        : 'This student already exists in progress, cannot enroll',
      activeEnrollment: {
        id: existingEnrollment.id,
        programName: progName,
        status: existingEnrollment.status
      },
      studentData,
      conflictDetails: {
        id: existingEnrollment.id,
        name: existingEnrollment.studentName,
        email: existingEnrollment.studentEmail,
        phone: existingEnrollment.studentPhone,
        admissionNo: existingEnrollment.enrollmentNumber,
        status: existingEnrollment.status
      }
    };
  };

  // 0. If this is an upgrade and a specific student ID was specified (existingStudentId or excludeStudentId),
  // directly evaluate this target student rather than failing on duplicate phone/email matches!
  const targetUpgradeStudentId = options.isUpgrade ? (options.existingStudentId || options.excludeStudentId) : options.existingStudentId;
  if (options.isUpgrade && targetUpgradeStudentId) {
    const existingStudent = await prisma.student.findUnique({
      where: { id: targetUpgradeStudentId },
      include: {
        program: { include: { university: { select: { name: true } } } },
        university: { select: { name: true } },
      }
    });

    if (existingStudent) {
      return buildStudentUpgradeResult(existingStudent, options.phone ? 'phone' : 'email');
    }
  }

  // 1. Check by Identifier (Admission No, Enrollment No, or Student ID) if provided
  if (cleanIdentifier) {
    const existingStudentByIdentifier = await prisma.student.findFirst({
      where: {
        OR: [
          { admissionNo: { equals: cleanIdentifier, mode: 'insensitive' } },
          { enrollmentNo: { equals: cleanIdentifier, mode: 'insensitive' } },
          { id: cleanIdentifier }
        ],
        ...(options.excludeStudentId ? { id: { not: options.excludeStudentId } } : {}),
      },
      include: {
        program: { include: { university: { select: { name: true } } } },
        university: { select: { name: true } },
      }
    });

    if (existingStudentByIdentifier) {
      return buildStudentUpgradeResult(existingStudentByIdentifier, 'phone');
    }

    const existingEnrollmentByIdentifier = await prisma.enrollment.findFirst({
      where: {
        OR: [
          { enrollmentNumber: { equals: cleanIdentifier, mode: 'insensitive' } },
          { id: cleanIdentifier }
        ],
        status: { notIn: ['rejected', 'cancelled', 'ops_rejected', 'completed', 'graduated', 'alumni'] },
        ...(options.excludeEnrollmentId ? { id: { not: options.excludeEnrollmentId } } : {}),
        ...(options.excludeStudentId ? { NOT: { studentId: options.excludeStudentId } } : {}),
      },
      include: {
        program: { select: { id: true, name: true } }
      }
    });

    if (existingEnrollmentByIdentifier) {
      return buildEnrollmentConflictResult(existingEnrollmentByIdentifier, 'phone');
    }
  }

  // 2. Check Student table by Email
  if (cleanEmail) {
    const emailCandidates = await prisma.student.findMany({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        ...(options.excludeStudentId ? { id: { not: options.excludeStudentId } } : {}),
      },
      include: {
        program: { include: { university: { select: { name: true } } } },
        university: { select: { name: true } },
      }
    });

    if (emailCandidates.length > 0) {
      // Prioritize candidate from the caller's organization if available
      const ownOrgCandidate = options.organizationId
        ? emailCandidates.find(s => s.organizationId === options.organizationId)
        : null;
      const matchingStudent = ownOrgCandidate ||
        emailCandidates.find(s => Boolean(s.isPrevious || (s.status || '').toLowerCase() === 'completed')) ||
        emailCandidates[0];
      return buildStudentUpgradeResult(matchingStudent, 'email');
    }
  }

  // 3. Check Student table by Phone
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
      include: {
        program: { include: { university: { select: { name: true } } } },
        university: { select: { name: true } },
      }
    });

    const validCandidates = phoneCandidates.filter(s => {
      const candidateNorm = normalizePhone(s.phone);
      return candidateNorm === cleanPhone || (candidateNorm.length >= 10 && cleanPhone.length >= 10 && candidateNorm.slice(-10) === cleanPhone.slice(-10));
    });

    if (validCandidates.length > 0) {
      // Prioritize candidate from the caller's organization if available
      const ownOrgCandidate = options.organizationId
        ? validCandidates.find(s => s.organizationId === options.organizationId)
        : null;
      const matchingStudent = ownOrgCandidate ||
        validCandidates.find(s => Boolean(s.isPrevious || (s.status || '').toLowerCase() === 'completed')) ||
        validCandidates[0];
      return buildStudentUpgradeResult(matchingStudent, 'phone');
    }
  }

  // 4. Check active Enrollment applications by Email
  if (cleanEmail) {
    const enrollmentCandidates = await prisma.enrollment.findMany({
      where: {
        studentEmail: { equals: cleanEmail, mode: 'insensitive' },
        status: { notIn: ['rejected', 'cancelled', 'ops_rejected', 'department_rejected', 'completed', 'graduated', 'alumni'] },
        ...(options.excludeEnrollmentId ? { id: { not: options.excludeEnrollmentId } } : {}),
        ...(options.excludeStudentId ? { NOT: { studentId: options.excludeStudentId } } : {}),
      },
      include: {
        program: { select: { id: true, name: true } }
      }
    });

    if (enrollmentCandidates.length > 0) {
      const ownOrgCandidate = options.organizationId
        ? enrollmentCandidates.find(e => e.organizationId === options.organizationId)
        : null;
      const matchingEnrollment = ownOrgCandidate || enrollmentCandidates[0];
      return buildEnrollmentConflictResult(matchingEnrollment, 'email');
    }
  }

  // 5. Check active Enrollment applications by Phone
  if (cleanPhone && cleanPhone.length >= 7) {
    const enrollmentCandidates = await prisma.enrollment.findMany({
      where: {
        OR: [
          { studentPhone: rawPhone },
          { studentPhone: cleanPhone },
          ...(cleanPhone.length >= 10 ? [{ studentPhone: { contains: cleanPhone.slice(-10) } }] : [])
        ],
        status: { notIn: ['rejected', 'cancelled', 'ops_rejected', 'department_rejected', 'completed', 'graduated', 'alumni'] },
        ...(options.excludeEnrollmentId ? { id: { not: options.excludeEnrollmentId } } : {}),
        ...(options.excludeStudentId ? { NOT: { studentId: options.excludeStudentId } } : {}),
      },
      include: {
        program: { select: { id: true, name: true } }
      }
    });

    const matchingEnrollments = enrollmentCandidates.filter(e => {
      const candidateNorm = normalizePhone(e.studentPhone);
      return candidateNorm === cleanPhone || (candidateNorm.length >= 10 && cleanPhone.length >= 10 && candidateNorm.slice(-10) === cleanPhone.slice(-10));
    });

    if (matchingEnrollments.length > 0) {
      const ownOrgCandidate = options.organizationId
        ? matchingEnrollments.find(e => e.organizationId === options.organizationId)
        : null;
      const matchingEnrollment = ownOrgCandidate || matchingEnrollments[0];
      return buildEnrollmentConflictResult(matchingEnrollment, 'phone');
    }
  }

  // 6. Check User table for staff/admin email collisions
  if (cleanEmail) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' }
      },
      select: { id: true, email: true, role: true, name: true, organizationId: true }
    });

    if (existingUser && existingUser.role !== 'student') {
      const isSameOrg = Boolean(options.organizationId && existingUser.organizationId === options.organizationId);
      return {
        isUnique: false,
        field: 'email',
        conflictEntity: 'user',
        message: 'Email is already taken',
        conflictDetails: isSameOrg ? existingUser : undefined
      };
    }
  }

  return { isUnique: true };
}
