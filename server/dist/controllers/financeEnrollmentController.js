import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { provisionStudentAfterApproval } from '../utils/studentProvisioning.js';
export const getAllEnrollments = asyncHandler(async (req, res) => {
    const { status, search } = req.query;
    const where = { organizationId: req.user.organizationId };
    if (status)
        where.status = status;
    if (search) {
        where.OR = [
            { studentName: { contains: search, mode: 'insensitive' } },
            { studentEmail: { contains: search, mode: 'insensitive' } },
            { enrollmentNumber: { contains: search, mode: 'insensitive' } },
        ];
    }
    const [enrollments, summary] = await Promise.all([
        prisma.enrollment.findMany({
            where,
            include: {
                program: {
                    include: {
                        university: { select: { id: true, name: true, address: true, code: true } },
                        feeStructures: {
                            select: {
                                id: true, registrationFee: true, tuitionFee: true,
                                examFee: true, universityFee: true, billingCycle: true, yearlyFees: true,
                            }
                        },
                    },
                },
                studyCenter: { select: { name: true, code: true } },
                session: { select: { name: true } },
                student: {
                    select: {
                        id: true, name: true, email: true, phone: true, altPhone: true,
                        dob: true, address: true, pinCode: true,
                        fatherName: true, motherName: true, fatherPhone: true, motherPhone: true,
                        religion: true, caste: true, photo: true, documents: true,
                    }
                },
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.enrollment.groupBy({
            by: ['status'],
            where: { organizationId: req.user.organizationId },
            _count: { status: true },
        }),
    ]);
    const summaryMap = summary.reduce((acc, s) => {
        acc[s.status] = s._count.status;
        return acc;
    }, { payment_pending: 0, receipt_submitted: 0, document_review: 0, finance_review: 0, enrolled: 0, rejected: 0, department_rejected: 0 });
    res.status(200).json({ success: true, count: enrollments.length, data: enrollments, summary: summaryMap });
});
export const getFinanceEnrollments = asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({
        where: { organizationId: req.user.organizationId, status: 'finance_review' },
        include: { program: true, studyCenter: true, student: true },
        orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, count: enrollments.length, data: enrollments });
});
export const approveFinanceEnrollment = asyncHandler(async (req, res) => {
    const enrollment = await prisma.enrollment.update({
        where: { id: req.params.id },
        data: { status: 'enrolled', financeReviewedBy: req.user.id, financeReviewedAt: new Date() }
    });
    // Provision student/user account post-approval
    await provisionStudentAfterApproval(enrollment.id);
    // Refetch the updated enrollment with provisioned student info
    const updatedEnrollment = await prisma.enrollment.findUnique({
        where: { id: enrollment.id },
        include: { program: true, studyCenter: true }
    });
    res.json({ success: true, data: updatedEnrollment || enrollment });
});
export const rejectFinanceEnrollment = asyncHandler(async (req, res) => {
    const enrollment = await prisma.enrollment.update({
        where: { id: req.params.id },
        data: { status: 'rejected', financeReviewedBy: req.user.id, financeReviewedAt: new Date(), financeRemarks: req.body.remarks }
    });
    res.json({ success: true, data: enrollment });
});
export const verifyReceipt = asyncHandler(async (req, res) => {
    const enrollmentId = req.params.id;
    const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
            program: {
                include: {
                    feeStructures: true
                }
            }
        }
    });
    if (!enrollment) {
        res.status(404);
        throw new Error('Enrollment not found');
    }
    if (enrollment.receiptVerified) {
        res.status(400);
        throw new Error('Receipt already verified');
    }
    // Calculate amount paid based on billing cycle
    let amountPaid = 0;
    const feeStructure = enrollment.program?.feeStructures?.[0]; // Assuming one fee structure for simplicity or we should match by session
    if (enrollment.initialPaymentAmount !== null && enrollment.initialPaymentAmount !== undefined) {
        amountPaid = enrollment.initialPaymentAmount;
    }
    else if (feeStructure) {
        if (feeStructure.billingCycle === 'one_time') {
            amountPaid = feeStructure.registrationFee + feeStructure.tuitionFee + feeStructure.examFee + feeStructure.universityFee;
        }
        else if (feeStructure.billingCycle === 'per_year') {
            // Use yearlyFees if available, else tuitionFee
            const yearlyFees = feeStructure.yearlyFees || [];
            if (yearlyFees.length > 0 && yearlyFees[0].amount) {
                amountPaid = Number(yearlyFees[0].amount);
            }
            else {
                amountPaid = feeStructure.tuitionFee;
            }
        }
        else if (feeStructure.billingCycle === 'per_semester') {
            // First semester fee
            const yearlyFees = feeStructure.yearlyFees || [];
            if (yearlyFees.length > 0 && yearlyFees[0].amount) {
                amountPaid = Number(yearlyFees[0].amount); // Assuming yearlyFees actually holds semester fees if per_semester
            }
            else {
                amountPaid = feeStructure.tuitionFee / 2;
            }
        }
        else {
            amountPaid = feeStructure.tuitionFee;
        }
    }
    // Create payment record
    await prisma.enrollmentPayment.create({
        data: {
            enrollmentId: enrollment.id,
            amount: amountPaid,
            // studyCenterId and walletId are now optional
            ...(enrollment.studyCenterId ? { studyCenterId: enrollment.studyCenterId } : {})
        }
    });
    // Update enrollment
    const historyEntry = {
        status: 'document_review',
        changedAt: new Date().toISOString(),
        changedBy: req.user.id,
        remarks: 'Receipt verified by Finance'
    };
    const updatedEnrollment = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
            receiptVerified: true,
            receiptVerifiedAt: new Date(),
            receiptVerifiedBy: req.user.id,
            status: 'document_review', // Move forward
            statusHistory: {
                push: historyEntry
            }
        }
    });
    res.json({ success: true, data: updatedEnrollment });
});
//# sourceMappingURL=financeEnrollmentController.js.map