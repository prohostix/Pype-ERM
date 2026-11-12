import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const role = req.user.role;

  const metrics: any = {};

  const orgQuery = role === 'superadmin' ? {} : { organizationId: orgId as string };

  if (role === 'superadmin') {
    metrics.totalOrganizations = await prisma.organization.count();
    metrics.activeOrganizations = await prisma.organization.count({ where: { status: 'active' } });
    metrics.totalBranches = await prisma.branch.count();
    metrics.totalEnrollments = await prisma.enrollment.count({ where: { source: null } }); // Study Abroad applications are not part of the enrollment totals
    metrics.totalLicenses = await prisma.license.count();

    // Total Revenue collected across platform
    const payments = await prisma.paymentEntry.findMany({ select: { amount: true } });
    metrics.totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    metrics.totalInvoices = await prisma.invoice.count();
    metrics.totalPayments = payments.length;

    // User Roles Breakdown
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { status: { not: 'resigned' } }
    });
    metrics.roleDistribution = roleCounts.map(r => ({ role: r.role, count: r._count.id }));

    // Monthly Enrollment Trend (Last 6 months)
    const allEnrollments = await prisma.enrollment.findMany({
      select: { createdAt: true, status: true }
    });
    const now = new Date();
    const monthMap: Record<string, { month: string; enrollments: number; completed: number; dropped: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthMap[key] = { month: key, enrollments: 0, completed: 0, dropped: 0 };
    }
    for (const e of allEnrollments) {
      const d = new Date(e.createdAt);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (monthMap[key]) {
        monthMap[key].enrollments++;
        if (e.status === 'completed' || e.status === 'enrolled') monthMap[key].completed++;
        if (e.status === 'dropped') monthMap[key].dropped++;
      }
    }
    metrics.enrollmentTrend = Object.values(monthMap);

    // Monthly Revenue Trend (Last 6 months)
    const allPaymentEntries = await prisma.paymentEntry.findMany({
      select: { createdAt: true, amount: true }
    });
    const revMap: Record<string, { month: string; amount: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      revMap[key] = { month: key, amount: 0 };
    }
    for (const p of allPaymentEntries) {
      const d = new Date(p.createdAt);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (revMap[key]) {
        revMap[key].amount += Number(p.amount) || 0;
      }
    }
    metrics.revenueTrend = Object.values(revMap);

    // Top Organizations with Live Stats
    const orgsList = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        license: { select: { name: true } },
        _count: {
          select: {
            users: true,
            students: true,
            studyCenters: true,
            branches: true,
            enrollments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    metrics.organizationsList = orgsList.map(o => ({
      id: o.id,
      name: o.name,
      email: o.email,
      phone: o.phone,
      status: o.status,
      createdAt: o.createdAt,
      licenseName: o.license?.name || 'Standard License',
      usersCount: o._count.users,
      studentsCount: o._count.students,
      studyCentersCount: o._count.studyCenters,
      branchesCount: o._count.branches,
      enrollmentsCount: o._count.enrollments
    }));

    // Real System Audit Logs
    const recentAudits = await prisma.auditLog.findMany({
      where: { NOT: { action: { startsWith: 'AI_' } } }, // AI report questions would crowd out real activity
      take: 8,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { name: true, email: true, role: true } },
        organization: { select: { name: true } }
      }
    });
    metrics.recentAuditLogs = recentAudits.map(a => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      timestamp: a.timestamp,
      ipAddress: a.ipAddress,
      userName: a.user?.name || a.user?.email || 'System User',
      userEmail: a.user?.email,
      userRole: a.user?.role,
      orgName: a.organization?.name || 'Platform'
    }));

    // Top Organizations for Comparison Graph
    metrics.orgComparison = [...metrics.organizationsList]
      .filter(o => o.id !== 'system')
      .sort((a, b) => (b.studentsCount + b.usersCount) - (a.studentsCount + a.usersCount))
      .slice(0, 6)
      .map(o => ({
        name: o.name.length > 14 ? o.name.slice(0, 12) + '..' : o.name,
        fullName: o.name,
        students: o.studentsCount,
        staff: o.usersCount,
        branches: o.branchesCount
      }));
  }

  if (['superadmin', 'ceo', 'general_manager', 'org_admin'].includes(role)) {
    metrics.totalEmployees = await prisma.user.count({
      where: { ...orgQuery, NOT: { role: { in: ['ceo', 'org_admin', 'superadmin', 'student'] } }, status: { not: 'resigned' } }
    });
    metrics.totalStudents = await prisma.student.count({ where: orgQuery });
    metrics.totalCenters = await prisma.studyCenter.count({ where: orgQuery });
    metrics.activeCenters = await prisma.studyCenter.count({ where: { ...orgQuery, status: 'active' } });
    metrics.totalDepartments = await prisma.department.count({ where: orgQuery });
    metrics.totalPrograms = await prisma.program.count({ where: orgQuery });
  }

  if (['ops_admin', 'ops_sub_admin', 'ceo', 'general_manager', 'org_admin'].includes(role)) {
    let studentWhere: any = { ...orgQuery };
    let enrollmentWhere: any = { ...orgQuery };

    if (role === 'ops_sub_admin') {
      const opsSubAdmin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assignedSalesUsers: true } });
      const assignedIds = Array.isArray(opsSubAdmin?.assignedSalesUsers) ? opsSubAdmin.assignedSalesUsers : [];
      
      studentWhere.OR = [
        { enrolledBy: null },
        { referredBy: null },
        { enrolledBy: { in: assignedIds } },
        { referredBy: { in: assignedIds } }
      ];

      enrollmentWhere.OR = [
        { salesUserId: null },
        { salesUserId: { in: assignedIds } }
      ];
    }

    if (metrics.totalStudents === undefined || role === 'ops_sub_admin') {
      metrics.totalStudents = await prisma.student.count({ where: studentWhere });
    }
    
    metrics.pendingApplications = await prisma.enrollment.count({
      where: { ...enrollmentWhere, status: { notIn: ['enrolled', 'rejected', 'department_rejected'] } }
    });
    
    const studentsStatus = await prisma.student.findMany({
      where: studentWhere,
      select: { id: true, name: true, enrollmentNo: true, admissionProgress: true, reregStatus: true, documents: true }
    });
    
    metrics.uniSubmissionsPending = studentsStatus.filter(s => {
      const prog = s.admissionProgress as any;
      return !prog || (!prog.universitySubmitted && !prog.uni_sub?.completed);
    }).length;
    
    metrics.documentsPending = studentsStatus.filter(s => {
      const docs = Array.isArray((s as any).documents) ? (s as any).documents : [];
      const hasUnapprovedDocs = docs.length === 0 || docs.some((d: any) => d && d.status !== 'approved');
      const photoStatus = (s.admissionProgress as any)?.photoStatus;
      return hasUnapprovedDocs || photoStatus !== 'approved';
    }).map(s => {
      const docs = Array.isArray((s as any).documents) ? (s as any).documents : [];
      const unapprovedDocs = docs.filter((d: any) => d && d.status !== 'approved');
      const photoStatus = (s.admissionProgress as any)?.photoStatus;
      return {
        id: (s as any).id,
        name: (s as any).name,
        enrollmentNo: (s as any).enrollmentNo,
        unapprovedDocs,
        photoStatus
      };
    });
    
    metrics.reRegistrationPending = studentsStatus.filter(s => {
      const rereg = s.reregStatus as any;
      return !rereg || !rereg.completed;
    }).length;
    
    metrics.enrollmentNumbersPending = await prisma.student.count({
      where: { ...orgQuery, enrollmentNo: null }
    });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    metrics.admissionAlerts = await prisma.student.count({
      where: { ...orgQuery, status: 'pending', createdAt: { lte: thirtyDaysAgo } }
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    metrics.todaysTasks = await prisma.task.count({ 
      where: { organizationId: orgId as string, targetDate: { gte: today, lt: tomorrow } } 
    }).catch(() => 0);
  }

  if (['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager', 'org_admin', 'branch_manager'].includes(role)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const userWhere: any = { organizationId: orgId as string, NOT: { role: { in: ['ceo', 'org_admin', 'superadmin', 'student'] } }, status: { not: 'resigned' } };
    const attendanceWhere: any = { organizationId: orgId as string, date: { gte: today, lte: endOfDay } };
    const leaveWhere: any = { organizationId: orgId as string, status: 'pending' };
    const profileWhere: any = { organizationId: orgId as string, probationEndDate: { lte: today }, confirmationDate: null, user: { status: 'active' } };

    if (['hr_admin', 'hr_sub_admin', 'branch_manager'].includes(role) && req.user.branchId) {
      userWhere.branchId = req.user.branchId;
      attendanceWhere.user = { branchId: req.user.branchId };
      leaveWhere.user = { branchId: req.user.branchId };
      profileWhere.user = { ...profileWhere.user, branchId: req.user.branchId };
    }

    if (metrics.totalEmployees === undefined) {
      metrics.totalEmployees = await prisma.user.count({ where: userWhere });
    }

    metrics.presentToday = await prisma.attendance.count({ where: { ...attendanceWhere, status: { in: ['present', 'late'] } } });
    metrics.onLeave = await prisma.attendance.count({ where: { ...attendanceWhere, status: 'leave' } });
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[today.getDay()];

    const settings = await prisma.hRSettings.findUnique({
      where: { organizationId: orgId as string }
    });
    
    let workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (settings && settings.officeHours) {
      const officeHours = settings.officeHours as any;
      if (officeHours.workingDays && Array.isArray(officeHours.workingDays)) {
        workingDays = officeHours.workingDays;
      }
    }
    const isWorkingDay = workingDays.includes(todayName);
    const holiday = await prisma.holiday.findFirst({
      where: {
        organizationId: orgId as string,
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lte: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    });

    if (!isWorkingDay || holiday) {
      metrics.absentToday = 0;
    } else {
      metrics.absentToday = Math.max(0, metrics.totalEmployees - metrics.presentToday - metrics.onLeave);
    }
    
    metrics.pendingLeaves = await prisma.leaveRequest.count({ where: leaveWhere });
    metrics.totalVacancies = await prisma.vacancy.count({ where: { organizationId: orgId, status: 'open' } });

    metrics.probationEnded = await prisma.employeeProfile.count({
      where: profileWhere
    });
  }

  if (['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager', 'org_admin'].includes(role)) {
    const invoices = await prisma.invoice.findMany({ where: { organizationId: orgId, status: 'paid' }, select: { total: true } });
    metrics.totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    metrics.pendingInvoices = await prisma.invoice.count({ where: { organizationId: orgId, status: { in: ['draft', 'sent'] } } });
    metrics.totalPayments = await prisma.paymentEntry.count({ where: { organizationId: orgId } });
    metrics.pendingExpenses = await prisma.expenseClaim.count({ where: { organizationId: orgId, status: 'pending' } });
  }

  if (['sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'org_admin'].includes(role)) {
    metrics.totalLeads = await prisma.lead.count({ where: { organizationId: orgId } });
    metrics.convertedLeads = await prisma.lead.count({ where: { organizationId: orgId, status: 'converted' } });
  }

  if (role !== 'superadmin') {
    const taskWhere: any = { organizationId: orgId };
    if (role === 'employee') taskWhere.assignedTo = req.user.id;

    metrics.pendingTasks = await prisma.task.count({ where: { ...taskWhere, status: 'pending' } });
    metrics.completedTasks = await prisma.task.count({ where: { ...taskWhere, status: 'completed' } });
  }

  if (role === 'ceo' || role === 'general_manager') {
    metrics.activeEscalations = await prisma.escalation.count({ where: { organizationId: orgId, status: 'active' } });
  }

  // Organization-level Deep Analytics (For Org Admin, CEO, GM or Superadmin viewing an Org)
  if (['org_admin', 'ceo', 'general_manager'].includes(role) || (role === 'superadmin' && req.query.organizationId)) {
    const targetOrgId = (req.query.organizationId as string) || orgId;
    if (targetOrgId) {
      // 1. Organization profile & counts
      const org = await prisma.organization.findUnique({
        where: { id: targetOrgId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          status: true,
          createdAt: true,
          license: { select: { name: true, tag: true } },
          _count: {
            select: {
              branches: true,
              departments: true,
              users: true,
              students: true,
              studyCenters: true,
              programs: true,
              enrollments: true
            }
          }
        }
      });
      metrics.organization = org;
      metrics.totalBranches = org?._count.branches ?? await prisma.branch.count({ where: { organizationId: targetOrgId } });
      metrics.totalEnrollments = await prisma.enrollment.count({ where: { organizationId: targetOrgId, source: null } });

      // Ensure totalStudents is accurate
      metrics.totalStudents = org?._count.students ?? await prisma.student.count({ where: { organizationId: targetOrgId } });

      // Accurate Workforce count (excluding student accounts)
      metrics.totalEmployees = await prisma.user.count({
        where: {
          organizationId: targetOrgId,
          role: { notIn: ['ceo', 'org_admin', 'superadmin', 'student'] },
          status: { not: 'resigned' }
        }
      });

      // 2. Real Admissions Breakdown & Status
      const studentStatuses = await prisma.student.groupBy({
        by: ['status'],
        where: { organizationId: targetOrgId },
        _count: { id: true }
      });
      let verifiedStudents = 0;
      let pendingStudents = 0;
      for (const s of studentStatuses) {
        if (['active', 'completed', 'enrolled'].includes(s.status)) {
          verifiedStudents += s._count.id;
        } else {
          pendingStudents += s._count.id;
        }
      }
      metrics.verifiedStudents = verifiedStudents;
      metrics.pendingStudents = pendingStudents;

      // 3. Organization Monthly Admissions Trend (Last 6 months)
      const now = new Date();
      const monthMap: Record<string, { month: string; enrollments: number; completed: number; pending: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        monthMap[key] = { month: key, enrollments: 0, completed: 0, pending: 0 };
      }

      // Query students for intake trajectory
      const orgStudents = await prisma.student.findMany({
        where: { organizationId: targetOrgId },
        select: { createdAt: true, joinDate: true, status: true }
      });

      if (orgStudents.length > 0) {
        for (const s of orgStudents) {
          const d = new Date(s.joinDate || s.createdAt);
          const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
          if (monthMap[key]) {
            monthMap[key].enrollments++;
            if (['active', 'completed', 'enrolled'].includes(s.status)) {
              monthMap[key].completed++;
            } else {
              monthMap[key].pending++;
            }
          }
        }
      } else {
        // Fallback to online portal enrollments if students table empty
        const orgEnrollments = await prisma.enrollment.findMany({
          where: { organizationId: targetOrgId },
          select: { createdAt: true, status: true }
        });
        for (const e of orgEnrollments) {
          const d = new Date(e.createdAt);
          const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
          if (monthMap[key]) {
            monthMap[key].enrollments++;
            if (['completed', 'enrolled'].includes(e.status)) {
              monthMap[key].completed++;
            } else {
              monthMap[key].pending++;
            }
          }
        }
      }
      metrics.enrollmentTrend = Object.values(monthMap);

      // 4. Organization Monthly Revenue Collections (Last 6 months from PaymentEntry)
      const orgPaymentEntries = await prisma.paymentEntry.findMany({
        where: { organizationId: targetOrgId },
        select: { createdAt: true, amount: true }
      });
      const revMap: Record<string, { month: string; amount: number; count: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        revMap[key] = { month: key, amount: 0, count: 0 };
      }
      let totalCollectedPayments = 0;
      for (const p of orgPaymentEntries) {
        const d = new Date(p.createdAt);
        const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        const val = Number(p.amount) || 0;
        totalCollectedPayments += val;
        if (revMap[key]) {
          revMap[key].amount += val;
          revMap[key].count++;
        }
      }
      metrics.revenueTrend = Object.values(revMap);
      if (totalCollectedPayments > 0 || !metrics.totalRevenue) {
        metrics.totalRevenue = totalCollectedPayments;
      }
      metrics.totalPayments = orgPaymentEntries.length;

      // Invoices & Settlement Efficiency
      const allInvoices = await prisma.invoice.findMany({
        where: { organizationId: targetOrgId },
        select: { total: true, status: true }
      });
      metrics.totalInvoices = allInvoices.length;
      metrics.totalInvoicedAmount = allInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      metrics.paidInvoicesCount = allInvoices.filter(i => i.status === 'paid').length;
      metrics.settlementRate = allInvoices.length > 0 
        ? Math.round((metrics.paidInvoicesCount / allInvoices.length) * 100)
        : (metrics.totalPayments > 0 ? 100 : 0);

      // 5. Branch Distribution (Students & Staff by Branch)
      const branches = await prisma.branch.findMany({
        where: { organizationId: targetOrgId },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          _count: {
            select: {
              students: true,
              users: true
            }
          }
        },
        orderBy: { students: { _count: 'desc' } },
        take: 8
      });
      metrics.branchDistribution = branches.map(b => ({
        id: b.id,
        name: b.name.length > 18 ? b.name.slice(0, 16) + '..' : b.name,
        fullName: b.name,
        city: b.city || '',
        students: b._count.students,
        staff: b._count.users
      }));

      // 6. Academic Programs Popularity
      const programs = await prisma.program.findMany({
        where: { organizationId: targetOrgId },
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: {
              students: true,
              enrollments: true
            }
          }
        },
        orderBy: { students: { _count: 'desc' } },
        take: 6
      });
      metrics.programDistribution = programs.map(p => ({
        id: p.id,
        name: p.code || (p.name.length > 14 ? p.name.slice(0, 12) + '..' : p.name),
        fullName: p.name,
        students: p._count.students,
        enrollments: p._count.enrollments
      }));

      // 7. User Roles Breakdown within Organization (excluding students)
      const roleCounts = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
        where: { 
          organizationId: targetOrgId, 
          status: { not: 'resigned' },
          role: { not: 'student' }
        }
      });
      metrics.roleDistribution = roleCounts.map(r => ({ role: r.role, count: r._count.id }));

      // 8. Recent Organization Activity Logs (combining audits, admissions, payments)
      const recentOrgAudits = await prisma.auditLog.findMany({
        where: { organizationId: targetOrgId, NOT: { action: { startsWith: 'AI_' } } }, // hide AI report questions
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { name: true, email: true, role: true } }
        }
      });
      const recentStudents = await prisma.student.findMany({
        where: { organizationId: targetOrgId },
        take: 4,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true }
      });
      const recentPayments = await prisma.paymentEntry.findMany({
        where: { organizationId: targetOrgId },
        take: 4,
        orderBy: { createdAt: 'desc' },
        select: { id: true, amount: true, createdAt: true, receiver: { select: { name: true } } }
      });

      const combinedActivities: any[] = [
        ...recentOrgAudits.map(a => ({
          id: 'audit-' + a.id,
          action: `${a.action} on ${a.entityType}`,
          entityType: a.entityType,
          userName: a.user?.name || a.user?.email || 'Administrator',
          userRole: a.user?.role || 'Admin',
          timestamp: a.timestamp
        })),
        ...recentStudents.map(s => ({
          id: 'student-' + s.id,
          action: 'Admitted into Student Body',
          entityType: 'Student',
          userName: s.name,
          userRole: 'Admission',
          timestamp: s.createdAt
        })),
        ...recentPayments.map(p => ({
          id: 'payment-' + p.id,
          action: `Received fee payment of ₹${Number(p.amount).toLocaleString('en-IN')}`,
          entityType: 'Fee Receipt',
          userName: p.receiver?.name || 'Accounts Desk',
          userRole: 'Finance',
          timestamp: p.createdAt
        }))
      ];
      combinedActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      metrics.recentAuditLogs = combinedActivities.slice(0, 8);

      // 9. Pending Reviews Count (admissions pending review in portal)
      metrics.pendingReviews = await prisma.enrollment.count({
        where: {
          organizationId: targetOrgId,
          status: { notIn: ['enrolled', 'completed', 'rejected', 'ops_rejected'] }
        }
      });
    }
  }

  res.status(200).json({ success: true, data: metrics });
});

export const getFinanceOverviewMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const { dateRange } = req.query;
  const branchId = req.query.branchId as string;

  const whereBase: any = { organizationId: orgId };
  const globalRoles = ['superadmin', 'org_admin', 'ceo', 'general_manager'];
  let branchFilter = (branchId && branchId !== 'all') ? branchId : undefined;
  if (!globalRoles.includes(req.user.role) && req.user.branchId) {
    branchFilter = req.user.branchId;
  }

  // Date filtering
  let dateFilter = {};
  const today = new Date();
  today.setHours(0,0,0,0);
  
  if (dateRange === 'today') {
    dateFilter = { gte: today };
  } else if (dateRange === 'this_week') {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    dateFilter = { gte: startOfWeek };
  } else if (dateRange === 'this_month') {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    dateFilter = { gte: startOfMonth };
  }

  // 1. Total Receivables & 2. Total Collected (from Invoices & PaymentEntry)
  const invoices = await prisma.invoice.findMany({
    where: { 
      ...whereBase, 
      ...(branchFilter ? { student: { branchId: branchFilter } } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}) 
    }
  });
  
  const totalReceivables = invoices.reduce((sum, inv) => sum + inv.total, 0);
  
  const payments = await prisma.paymentEntry.findMany({
    where: { 
      ...whereBase, 
      ...(branchFilter ? { invoice: { student: { branchId: branchFilter } } } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}) 
    },
    include: {
      invoice: {
        include: {
          student: {
            include: {
              branch: true
            }
          }
        }
      }
    }
  });
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  // 3. Cash & Bank Balance (Absolute organization balance)
  const allPayments = await prisma.paymentEntry.findMany({ where: { organizationId: orgId } });
  const allTopups = await prisma.walletTopUp.findMany({ where: { organizationId: orgId } });
  
  const totalInflow = 
    allPayments.reduce((sum, p) => sum + p.amount, 0) + 
    allTopups.reduce((sum, t) => sum + t.amount, 0);

  const allExpenses = await prisma.expenseClaim.findMany({ 
    where: { organizationId: orgId, status: { in: ['approved', 'reimbursed'] } } 
  });
  const allPayrolls = await prisma.payrollBatch.findMany({
    where: { organizationId: orgId, status: { in: ['completed', 'payment_in_progress'] } }
  });
  const allUniPayments = await prisma.universityPayment.findMany({
    where: { organizationId: orgId, status: 'paid' }
  });

  const totalOutflow = 
    allExpenses.reduce((sum, e) => sum + e.amount, 0) +
    allPayrolls.reduce((sum, p) => sum + p.totalAmount, 0) +
    allUniPayments.reduce((sum, u) => sum + u.amountPaid, 0);

  const cashAndBankBalance = totalInflow - totalOutflow;

  // 4. Operational Expenses
  const expenses = await prisma.expenseClaim.findMany({
    where: { 
      ...whereBase, 
      ...(branchFilter ? { user: { branchId: branchFilter } } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}) 
    }
  });
  const operationalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 5. Committed Payments (using UniversityPayment or just 0 placeholder)
  const committedPayments = 0; // Placeholder

  // 6. University Fee Pending
  const universityFeeData = await prisma.universityPayment.findMany({
    where: { 
      organizationId: orgId, 
      status: 'pending',
      ...(branchFilter ? { student: { branchId: branchFilter } } : {})
    }
  });
  const universityFeePending = universityFeeData.reduce((sum, up) => sum + (up.amountPaid || 0), 0);

  // 7. Incentive Pending
  const incentivePending = 0;

  // 8. Payroll Pending
  const payrollPendingData = await prisma.payroll.findMany({
    where: { 
      organizationId: orgId, 
      status: 'transferred_to_finance',
      ...(branchFilter ? { user: { branchId: branchFilter } } : {})
    },
  });
  const payrollPending = payrollPendingData.reduce((acc, p) => acc + (p.netSalary || 0), 0);

  // 9. My Target
  const myTarget = await prisma.target.findFirst({
    where: { organizationId: orgId, employeeId: req.user?.id },
    orderBy: { createdAt: 'desc' },
  });
  const myTargetValue = myTarget?.target || 0;

  // Lists
  const recentCollections = await prisma.paymentEntry.findMany({
    where: { 
      ...whereBase, 
      ...(branchFilter ? { invoice: { student: { branchId: branchFilter } } } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}) 
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { invoice: { include: { student: true } } },
  });

  const recentExpenses = await prisma.expenseClaim.findMany({
    where: { 
      ...whereBase, 
      ...(branchFilter ? { user: { branchId: branchFilter } } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}) 
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: true },
  });

  const formattedRecentCollections = recentCollections.map(c => ({
    ...c,
    student: c.invoice?.student,
    paymentMode: c.method
  }));

  const formattedRecentExpenses = recentExpenses.map(e => ({
    ...e,
    employee: { user: e.user }
  }));

  // Charts data
  // 1. Collection Overview (Current Week)
  const startOfThisWeek = new Date();
  startOfThisWeek.setHours(0,0,0,0);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - (startOfThisWeek.getDay() === 0 ? 6 : startOfThisWeek.getDay() - 1)); // Mon=0, Sun=6

  const thisWeekPayments = await prisma.paymentEntry.findMany({
    where: {
      organizationId: orgId,
      ...(branchFilter ? { invoice: { student: { branchId: branchFilter } } } : {}),
      createdAt: { gte: startOfThisWeek }
    }
  });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const collectionOverview = weekDays.map(name => ({ name, value: 0 }));

  thisWeekPayments.forEach(p => {
    let dayIndex = p.createdAt.getDay() - 1;
    if (dayIndex === -1) dayIndex = 6;
    collectionOverview[dayIndex].value += p.amount;
  });

  // 2. Expense Overview
  const expenseMap: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category || 'Other';
    expenseMap[cat] = (expenseMap[cat] || 0) + e.amount;
  });
  const expenseOverview = Object.entries(expenseMap).map(([name, value]) => ({ name, value }));

  // 3. Branch-wise Collection
  const branchMap: Record<string, number> = {};
  payments.forEach(p => {
    const branchName = p.invoice?.student?.branch?.name || 'Unknown Branch';
    branchMap[branchName] = (branchMap[branchName] || 0) + p.amount;
  });
  const branchWiseCollection = Object.entries(branchMap).map(([name, value]) => ({ name, value }));

  // Alerts
  const overdueStudentFees = await prisma.invoice.count({
    where: { 
      ...whereBase, 
      status: 'overdue',
      ...(branchFilter ? { student: { branchId: branchFilter } } : {})
    }
  });

  const universityFeeDue = await prisma.universityPayment.count({
    where: { 
      organizationId: orgId, 
      status: 'pending',
      ...(branchFilter ? { student: { branchId: branchFilter } } : {})
    }
  });

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalReceivables,
        totalCollected,
        cashAndBankBalance,
        operationalExpenses,
        committedPayments,
        universityFeePending,
        incentivePending,
        payrollPending,
        myTargetValue
      },
      lists: {
        recentCollections: formattedRecentCollections,
        recentExpenses: formattedRecentExpenses,
        upcomingCommittedPayments: []
      },
      charts: {
        collectionOverview,
        expenseOverview,
        branchWiseCollection
      },
      alerts: {
        overdueStudentFees,
        universityFeeDue,
        committedPaymentDueToday: 0,
        incentivePending: 0
      }
    }
  });
});

export const getSalesOverviewMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const userId = req.user.id;

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // 1. Team and My Targets for this month
  const targets = await prisma.target.findMany({
    where: { 
      organizationId: orgId,
      createdAt: { gte: startOfMonth }
    }
  });
  
  let teamTarget = 0;
  let myTarget = 0;
  
  targets.forEach(t => {
    teamTarget += t.target;
    if (t.employeeId === userId) {
      myTarget += t.target;
    }
  });

  // 2. Team and My Admissions (Enrollments) this month
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: orgId,
      createdAt: { gte: startOfMonth }
    },
    include: {
      student: true
    }
  });

  let teamAdmissions = enrollments.length;
  let myAdmissions = 0;
  
  // assuming student.counselorId is the user id or we just assume all if not tracking counselor in enrollment directly.
  // Actually, we'll check student's counselor.
  // We can just rely on the count where student.userId = req.user.id, or enrollment creator if exists.
  // We'll count myAdmissions based on student userId if it exists.
  enrollments.forEach(e => {
    // If student model has a relation to user or counselor
    if (e.student && (e.student as any).userId === userId) {
      myAdmissions++;
    }
  });

  // 3. Team and My Sales (Revenue via PaymentEntry or just total sales value)
  const payments = await prisma.paymentEntry.findMany({
    where: {
      organizationId: orgId,
      createdAt: { gte: startOfMonth }
    },
    include: {
      invoice: {
        include: {
          student: true
        }
      }
    }
  });

  let teamSales = 0;
  let mySales = 0;

  payments.forEach(p => {
    teamSales += p.amount;
    if (p.invoice && p.invoice.student && (p.invoice.student as any).userId === userId) {
      mySales += p.amount;
    }
  });

  const teamAchieved = teamTarget > 0 ? Math.round((teamSales / teamTarget) * 100) : 0;
  const myAchieved = myTarget > 0 ? Math.round((mySales / myTarget) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      teamSales,
      mySales,
      teamAdmissions,
      myAdmissions,
      teamTarget,
      myTarget,
      teamAchieved,
      myAchieved
    }
  });
});

export const getBranchHierarchy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branchId = req.user.branchId;
  if (!branchId && req.user.role !== 'branch_manager' && req.user.role !== 'superadmin' && req.user.role !== 'org_admin' && req.user.role !== 'ceo' && req.user.role !== 'general_manager') {
    return res.status(403).json({ success: false, message: 'Not authorized for branch view' });
  }

  // Fetch ALL active users in the organization to compute the reporting hierarchy
  const allOrgUsers = await prisma.user.findMany({
    where: { organizationId: req.user.organizationId, status: 'active' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      reportingTo: true,
      departmentId: true,
      branchId: true,
    }
  });

  // Recursively find everyone who reports to the logged-in user (or reports to someone who reports to them, etc.)
  const hierarchyUserIds = new Set([req.user.id]);
  let addedNew = true;
  while (addedNew) {
    addedNew = false;
    for (const u of allOrgUsers) {
      const isDirectReport = u.reportingTo && hierarchyUserIds.has(u.reportingTo);
      const isSameBranch = req.user.role === 'branch_manager' && u.branchId === req.user.branchId;
      
      if ((isDirectReport || isSameBranch) && !hierarchyUserIds.has(u.id)) {
        hierarchyUserIds.add(u.id);
        addedNew = true;
      }
    }
  }

  // Filter the users to ONLY include those in the logged-in user's direct/indirect reporting hierarchy
  const users = allOrgUsers.filter(u => hierarchyUserIds.has(u.id));

  const userIds = users.map(u => u.id);

  // Get today's attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId: { in: userIds },
      date: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  // Get total sales for sales users
  const salesUsers = users.filter(u => u.role.includes('sales'));
  const salesUserIds = salesUsers.map(u => u.id);
  
  const payments = await prisma.paymentEntry.groupBy({
    by: ['createdAt'], // Dummy group by
    _sum: {
      amount: true
    },
    where: {
      invoice: {
        student: {
          OR: [
            { referredBy: { in: salesUserIds } },
            { enrolledBy: { in: salesUserIds } }
          ]
        }
      }
    }
  });
  const totalSales = payments.reduce((acc, p) => acc + (p._sum.amount || 0), 0);

  // Dynamic department logic
  const departments = await prisma.department.findMany({
    where: { organizationId: req.user.organizationId },
    select: { id: true, name: true, type: true, managerId: true }
  });

  const hierarchyData: any[] = [];
  const assignedUserIds = new Set();

  departments.forEach(dept => {
    const deptUsers = users.filter(u => u.departmentId === dept.id);
    
    let manager = null;
    if (dept.managerId) {
      manager = users.find(u => u.id === dept.managerId);
    }
    if (!manager && deptUsers.length > 0) {
      manager = deptUsers.find(u => u.role.includes('admin') || u.designation?.toLowerCase().includes('manager'));
    }

    const team = deptUsers.filter(u => u.id !== manager?.id);
    
    deptUsers.forEach(u => assignedUserIds.add(u.id));

    if (!manager && team.length === 0) return;

    const mapAtt = (u: any) => {
      const att = attendances.find(a => a.employeeId === u.id);
      return { ...u, attendance: att ? att.status : 'Absent' };
    };

    hierarchyData.push({
      id: dept.id,
      name: dept.name,
      type: dept.type,
      head: manager ? mapAtt(manager) : null,
      team: team.map(mapAtt),
      attendance: deptUsers.map(mapAtt),
      totalSales: dept.type === 'sales' ? totalSales : undefined
    });
  });

  // Handle Unassigned users (who don't belong to any department)
  const unassigned = users.filter(u => !assignedUserIds.has(u.id) && u.id !== req.user.id && u.role !== 'branch_manager');
  if (unassigned.length > 0) {
    hierarchyData.push({
      id: 'unassigned',
      name: 'Unassigned Staff',
      type: 'general',
      head: null,
      team: unassigned.map(u => {
        const att = attendances.find(a => a.employeeId === u.id);
        return { ...u, attendance: att ? att.status : 'Absent' };
      }),
      attendance: unassigned.map(u => {
        const att = attendances.find(a => a.employeeId === u.id);
        return { ...u, attendance: att ? att.status : 'Absent' };
      })
    });
  }

  res.status(200).json({ success: true, data: hierarchyData });
});

export const getPlatformUsageMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user.role !== 'superadmin') {
    res.status(403).json({ success: false, message: 'Superadmin privileges required' });
    return;
  }

  const requestedOrgId = req.query.organizationId as string;
  const isOrgFiltered = requestedOrgId && requestedOrgId !== 'all';
  const orgWhere = isOrgFiltered ? { organizationId: requestedOrgId } : {};

  // 1. Fetch available organizations for dropdown
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      customLoginSlug: true,
      status: true,
      _count: {
        select: {
          students: true,
          users: true,
          enrollments: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  // 2. Summary KPIs
  const [
    totalEnrollments,
    totalStudents,
    totalUsers,
    totalAuditLogs,
    paymentsAggregate
  ] = await Promise.all([
    prisma.enrollment.count({ where: { ...orgWhere, source: null } }),
    prisma.student.count({ where: isOrgFiltered ? { organizationId: requestedOrgId } : {} }),
    prisma.user.count({ where: isOrgFiltered ? { organizationId: requestedOrgId, status: { not: 'resigned' } } : { status: { not: 'resigned' } } }),
    prisma.auditLog.count({ where: orgWhere }),
    prisma.paymentEntry.aggregate({
      where: orgWhere,
      _sum: { amount: true },
      _count: { id: true }
    })
  ]);

  const totalRevenue = Number(paymentsAggregate._sum.amount || 0);

  // 3. Historical Months (Last 6 months)
  const now = new Date();
  const monthsCount = 6;
  const monthMap: Record<string, {
    month: string;
    enrollments: number;
    completed: number;
    revenue: number;
    actions: number;
  }> = {};

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    monthMap[key] = {
      month: key,
      enrollments: 0,
      completed: 0,
      revenue: 0,
      actions: 0
    };
  }

  const startDate = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);

  // Fetch enrollments over period
  const enrollmentsList = await prisma.enrollment.findMany({
    where: {
      ...orgWhere,
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true,
      status: true,
      studyCenterId: true
    }
  });

  enrollmentsList.forEach(e => {
    const d = new Date(e.createdAt);
    const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    if (monthMap[key]) {
      monthMap[key].enrollments++;
      if (['completed', 'enrolled'].includes(e.status)) {
        monthMap[key].completed++;
      }
    }
  });

  // Fetch payments over period
  const paymentsList = await prisma.paymentEntry.findMany({
    where: {
      ...orgWhere,
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true,
      amount: true
    }
  });

  paymentsList.forEach(p => {
    const d = new Date(p.createdAt);
    const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    if (monthMap[key]) {
      monthMap[key].revenue += Number(p.amount || 0);
    }
  });

  // Fetch audit logs over period for actions timeline
  const auditsList = await prisma.auditLog.findMany({
    where: {
      ...orgWhere,
      timestamp: { gte: startDate }
    },
    select: {
      timestamp: true,
      action: true,
      entityType: true,
      userId: true
    }
  });

  auditsList.forEach(a => {
    const d = new Date(a.timestamp);
    const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    if (monthMap[key]) {
      monthMap[key].actions++;
    }
  });

  const correlationTrend = Object.values(monthMap);

  // 4. User Actions Breakdown
  const actionCounts: Record<string, number> = {};
  const entityCounts: Record<string, number> = {};

  auditsList.forEach(a => {
    const actionKey = (a.action || 'other').toLowerCase();
    actionCounts[actionKey] = (actionCounts[actionKey] || 0) + 1;

    const entityKey = a.entityType || 'General';
    entityCounts[entityKey] = (entityCounts[entityKey] || 0) + 1;
  });

  const actionDistribution = Object.entries(actionCounts).map(([action, count]) => ({
    name: action.charAt(0).toUpperCase() + action.slice(1),
    action,
    count
  })).sort((a, b) => b.count - a.count);

  const entityDistribution = Object.entries(entityCounts).map(([entity, count]) => ({
    name: entity,
    count
  })).sort((a, b) => b.count - a.count).slice(0, 8);

  // 5. Recent Detailed Audit Logs (last 100)
  const auditLogs = await prisma.auditLog.findMany({
    where: orgWhere,
    take: 100,
    orderBy: { timestamp: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      organization: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  // 6. Top Active Operators
  const userActionMap: Record<string, { user: any; count: number }> = {};
  auditLogs.forEach(a => {
    if (a.user) {
      if (!userActionMap[a.user.id]) {
        userActionMap[a.user.id] = { user: a.user, count: 0 };
      }
      userActionMap[a.user.id].count++;
    }
  });

  const topOperators = Object.values(userActionMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.status(200).json({
    success: true,
    data: {
      selectedOrgId: isOrgFiltered ? requestedOrgId : 'all',
      organizations,
      summary: {
        totalEnrollments,
        totalStudents,
        totalUsers,
        totalAuditLogs,
        totalRevenue,
        paymentsCount: paymentsAggregate._count.id || 0,
      },
      correlationTrend,
      actionDistribution,
      entityDistribution,
      topOperators,
      auditLogs
    }
  });
});
