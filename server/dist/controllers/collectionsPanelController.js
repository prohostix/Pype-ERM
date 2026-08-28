import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
// GET /collections/overseers
export const getCollectionOverseers = asyncHandler(async (req, res) => {
    const overseers = await prisma.collectionOverseer.findMany({
        where: { organizationId: req.user.organizationId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    avatar: true,
                    phone: true,
                }
            }
        }
    });
    res.status(200).json({
        success: true,
        data: overseers.map((o) => o.user)
    });
});
// POST /collections/overseers
export const addCollectionOverseer = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ success: false, message: 'Please provide a userId' });
        return;
    }
    // Verify user exists and is in the same organization
    const targetUser = await prisma.user.findFirst({
        where: { id: userId, organizationId: req.user.organizationId }
    });
    if (!targetUser) {
        res.status(404).json({ success: false, message: 'User not found in this organization' });
        return;
    }
    // Create overseer mapping (upsert behavior to avoid duplicate keys)
    const overseer = await prisma.collectionOverseer.upsert({
        where: {
            organizationId_userId: {
                organizationId: req.user.organizationId,
                userId: userId
            }
        },
        update: {},
        create: {
            organizationId: req.user.organizationId,
            userId: userId
        }
    });
    res.status(201).json({ success: true, data: overseer });
});
// DELETE /collections/overseers/:userId
export const removeCollectionOverseer = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const exists = await prisma.collectionOverseer.findFirst({
        where: { userId, organizationId: req.user.organizationId }
    });
    if (!exists) {
        res.status(404).json({ success: false, message: 'Overseer not found' });
        return;
    }
    await prisma.collectionOverseer.delete({
        where: {
            organizationId_userId: {
                organizationId: req.user.organizationId,
                userId: userId
            }
        }
    });
    res.status(200).json({ success: true, message: 'User removed from collections overseers' });
});
// GET /collections/metrics
export const getCollectionMetrics = asyncHandler(async (req, res) => {
    const organizationId = req.user.organizationId;
    const now = new Date();
    // Set date boundaries
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    // 1. Fetch Students status
    const students = await prisma.student.findMany({
        where: { organizationId },
        select: {
            id: true,
            name: true,
            status: true,
            enrollmentNo: true,
            phone: true,
            email: true,
            fatherName: true,
            fatherPhone: true,
            motherName: true,
            motherPhone: true,
            program: { select: { name: true } },
            enrollments: { select: { id: true } }
        }
    });
    // Calculate Student status counts
    const studentStatusCounts = students.reduce((acc, s) => {
        const status = s.status || 'active';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, { active: 0, inactive: 0, pending: 0 });
    // 2. Fetch Payment Schedules
    const schedules = await prisma.paymentSchedule.findMany({
        where: { organizationId },
        include: {
            student: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    altPhone: true,
                    enrollmentNo: true,
                    fatherName: true,
                    motherName: true,
                    fatherPhone: true,
                    motherPhone: true,
                    status: true
                }
            }
        }
    });
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalCollected = 0;
    let todayCollectedAmount = 0;
    let todayCollectedCount = 0;
    let todayDueAmount = 0;
    let todayDueCount = 0;
    let upcomingDueAmount = 0;
    let upcomingDueCount = 0;
    const todayCollectedSchedules = [];
    const todayDueSchedules = [];
    const upcomingSchedules = [];
    const overdueSchedules = [];
    const pendingSchedules = [];
    schedules.forEach((s) => {
        const isPaid = s.status === 'paid';
        const dueDate = new Date(s.dueDate);
        const isOverdue = !isPaid && dueDate < startOfToday;
        const isDueToday = dueDate >= startOfToday && dueDate <= endOfToday;
        const isUpcoming = !isPaid && dueDate > endOfToday && dueDate <= sevenDaysFromNow;
        if (isPaid) {
            totalCollected += s.amount;
            // Check if paid today
            if (s.paidAt) {
                const paidDate = new Date(s.paidAt);
                if (paidDate >= startOfToday && paidDate <= endOfToday) {
                    todayCollectedAmount += s.amount;
                    todayCollectedCount++;
                    todayCollectedSchedules.push(s);
                }
            }
        }
        else {
            totalOutstanding += s.amount;
            if (isOverdue) {
                totalOverdue += s.amount;
                overdueSchedules.push(s);
            }
            else if (isDueToday) {
                todayDueAmount += s.amount;
                todayDueCount++;
                todayDueSchedules.push(s);
            }
            else if (isUpcoming) {
                upcomingDueAmount += s.amount;
                upcomingDueCount++;
                upcomingSchedules.push(s);
            }
            else {
                pendingSchedules.push(s);
            }
        }
    });
    // 3. Fetch Organization Users for assigning oversee permission
    const users = await prisma.user.findMany({
        where: {
            organizationId,
            status: 'active',
            role: { not: 'superadmin' }
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
        }
    });
    // 4. Fetch Collection Target & Achieved metrics
    const targetRecords = await prisma.target.findMany({
        where: { organizationId, type: 'collections' }
    });
    const totalTarget = targetRecords.reduce((sum, t) => sum + t.target, 0);
    const totalAchieved = targetRecords.reduce((sum, t) => sum + t.achieved, 0);
    // 5. Check if current user is an overseer
    const isOverseer = await prisma.collectionOverseer.findFirst({
        where: { userId: req.user.id, organizationId }
    });
    res.status(200).json({
        success: true,
        data: {
            studentStats: {
                total: students.length,
                statusCounts: studentStatusCounts,
                students: students
            },
            paymentPendingStats: {
                outstandingAmount: totalOutstanding,
                overdueAmount: totalOverdue,
                pendingSchedulesCount: overdueSchedules.length + todayDueSchedules.length + upcomingSchedules.length + pendingSchedules.length
            },
            todayCollectingStats: {
                collectedAmount: todayCollectedAmount,
                collectedCount: todayCollectedCount,
                dueAmount: todayDueAmount,
                dueCount: todayDueCount,
                collectedSchedules: todayCollectedSchedules,
                dueSchedules: todayDueSchedules
            },
            upcomingStats: {
                dueAmount: upcomingDueAmount,
                dueCount: upcomingDueCount,
                schedules: upcomingSchedules
            },
            expectedPaymentsStats: {
                expectedTotal: totalOutstanding,
                overdueSchedules: overdueSchedules,
                pendingSchedules: pendingSchedules
            },
            targetStats: {
                target: totalTarget || 50000, // Fallback default targets if none defined
                achieved: totalAchieved || totalCollected,
            },
            orgUsers: users,
            currentUserOversight: {
                isAdmin: ['ceo', 'org_admin', 'superadmin', 'finance_admin', 'finance_sub_admin'].includes(req.user.role),
                isOverseer: Boolean(isOverseer)
            }
        }
    });
});
//# sourceMappingURL=collectionsPanelController.js.map