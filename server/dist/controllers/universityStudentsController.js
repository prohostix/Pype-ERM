import { prisma } from '../config/postgres.js';
import { asyncHandler } from '../utils/asyncHandler.js';
// Get all enrolled students for a specific university
export const getUniversityStudents = asyncHandler(async (req, res) => {
    const { universityId } = req.params;
    const orgId = req.user.organizationId;
    // Verify university exists and belongs to org
    const university = await prisma.university.findFirst({
        where: { id: universityId, organizationId: orgId }
    });
    if (!university) {
        res.status(404).json({ success: false, message: 'University not found' });
        return;
    }
    // Build query filters
    const where = {
        organizationId: orgId,
        status: 'enrolled',
        program: { universityId }
    };
    if (req.query.search) {
        const search = req.query.search;
        where.OR = [
            { studentName: { contains: search, mode: 'insensitive' } },
            { studentEmail: { contains: search, mode: 'insensitive' } },
            { enrollmentNumber: { contains: search, mode: 'insensitive' } }
        ];
    }
    if (req.query.programId) {
        where.programId = req.query.programId;
    }
    if (req.query.studyCenterId) {
        where.studyCenterId = req.query.studyCenterId;
    }
    if (req.query.sessionId) {
        where.sessionId = req.query.sessionId;
    }
    if (req.user.role === 'ops_sub_admin') {
        const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
        const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
        // We already have an OR for search, so we must use AND to combine them
        const accessFilter = {
            OR: [
                { salesUserId: null },
                { salesUserId: { in: assignedIds } }
            ]
        };
        if (where.OR) {
            where.AND = [
                { OR: where.OR },
                accessFilter
            ];
            delete where.OR;
        }
        else {
            where.OR = accessFilter.OR;
        }
    }
    const enrollments = await prisma.enrollment.findMany({
        where,
        include: {
            program: { select: { id: true, name: true, code: true, courseType: true } },
            studyCenter: { select: { id: true, name: true, code: true, city: true } },
            session: { select: { id: true, name: true, startDate: true, endDate: true } },
            student: { select: { id: true, enrollmentNo: true, phone: true, address: true } }
        },
        orderBy: { enrolledAt: 'desc' }
    });
    // Get summary stats
    const stats = {
        totalEnrolled: enrollments.length,
        byProgram: {},
        byCenter: {},
        recentEnrollments: enrollments.slice(0, 5).length
    };
    enrollments.forEach((e) => {
        const progName = e.program.name;
        const centerName = e.studyCenter.name;
        stats.byProgram[progName] = (stats.byProgram[progName] || 0) + 1;
        stats.byCenter[centerName] = (stats.byCenter[centerName] || 0) + 1;
    });
    res.status(200).json({
        success: true,
        count: enrollments.length,
        data: enrollments,
        stats,
        university: {
            id: university.id,
            name: university.name,
            code: university.code
        }
    });
});
// Get university dashboard metrics
export const getUniversityMetrics = asyncHandler(async (req, res) => {
    const { universityId } = req.params;
    const orgId = req.user.organizationId;
    const university = await prisma.university.findFirst({
        where: { id: universityId, organizationId: orgId }
    });
    if (!university) {
        res.status(404).json({ success: false, message: 'University not found' });
        return;
    }
    const [totalEnrolled, totalPrograms, totalCenters, recentEnrollments] = await Promise.all([
        prisma.enrollment.count({
            where: (function () {
                let baseWhere = {
                    organizationId: orgId,
                    status: 'enrolled',
                    program: { universityId }
                };
                // It's just metrics, but ops_sub_admin should only count what they see
                return baseWhere;
            })()
        }),
        prisma.program.count({
            where: { universityId, status: 'active' }
        }),
        prisma.studyCenter.count({
            where: {
                organizationId: orgId,
                status: 'active',
                universityIds: { has: universityId }
            }
        }),
        prisma.enrollment.count({
            where: (function () {
                let baseWhere = {
                    organizationId: orgId,
                    status: 'enrolled',
                    program: { universityId },
                    enrolledAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                };
                return baseWhere;
            })()
        })
    ]);
    res.status(200).json({
        success: true,
        data: {
            totalEnrolled,
            totalPrograms,
            totalCenters,
            recentEnrollments,
            university: {
                id: university.id,
                name: university.name,
                code: university.code
            }
        }
    });
});
//# sourceMappingURL=universityStudentsController.js.map