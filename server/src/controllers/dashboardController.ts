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
  }

  if (['superadmin', 'ceo', 'org_admin'].includes(role)) {
    metrics.totalEmployees = await prisma.user.count({
      where: { ...orgQuery, NOT: { role: { in: ['ceo', 'org_admin', 'superadmin', 'staff'] } }, status: { not: 'resigned' } }
    });
    metrics.totalStudents = await prisma.student.count({ where: orgQuery });
    metrics.totalCenters = await prisma.studyCenter.count({ where: orgQuery });
    metrics.activeCenters = await prisma.studyCenter.count({ where: { ...orgQuery, status: 'active' } });
    metrics.totalDepartments = await prisma.department.count({ where: orgQuery });
    metrics.totalPrograms = await prisma.program.count({ where: orgQuery });
  }

  if (['ops_admin', 'ops_sub_admin', 'ceo', 'org_admin'].includes(role)) {
    if (metrics.totalStudents === undefined) {
      metrics.totalStudents = await prisma.student.count({ where: orgQuery });
    }
    
    metrics.pendingApplications = await prisma.enrollment.count({
      where: { ...orgQuery, status: { notIn: ['enrolled', 'rejected', 'department_rejected'] } }
    });
    
    const studentsStatus = await prisma.student.findMany({
      where: orgQuery,
      select: { admissionProgress: true, reregStatus: true }
    });
    
    metrics.uniSubmissionsPending = studentsStatus.filter(s => {
      const prog = s.admissionProgress as any;
      return !prog || (!prog.universitySubmitted && !prog.uni_sub?.completed);
    }).length;
    
    metrics.documentsPending = studentsStatus.filter(s => {
      const docs = Array.isArray(s.documents) ? s.documents : [];
      const hasUnapprovedDocs = docs.length === 0 || docs.some((d: any) => d && d.status !== 'approved');
      const photoStatus = (s.admissionProgress as any)?.photoStatus;
      return hasUnapprovedDocs || photoStatus !== 'approved';
    }).length;
    
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

  if (['hr_admin', 'ceo', 'org_admin'].includes(role)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (metrics.totalEmployees === undefined) {
      metrics.totalEmployees = await prisma.user.count({
        where: { organizationId: orgId as string, NOT: { role: { in: ['ceo', 'org_admin', 'superadmin', 'staff'] } }, status: { not: 'resigned' } }
      });
    }

    metrics.presentToday = await prisma.attendance.count({ where: { organizationId: orgId as string, date: today, status: 'present' } });
    metrics.onLeave = await prisma.attendance.count({ where: { organizationId: orgId as string, date: today, status: 'leave' } });
    
    const isSunday = today.getDay() === 0;
    const holiday = await prisma.holiday.findFirst({
      where: {
        organizationId: orgId as string,
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lte: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    });

    if (isSunday || holiday) {
      metrics.absentToday = 0;
    } else {
      metrics.absentToday = Math.max(0, metrics.totalEmployees - metrics.presentToday - metrics.onLeave);
    }
    
    metrics.pendingLeaves = await prisma.leaveRequest.count({ where: { organizationId: orgId, status: 'pending' } });
    metrics.totalVacancies = await prisma.vacancy.count({ where: { organizationId: orgId, status: 'open' } });
  }

  if (['finance_admin', 'ceo', 'org_admin'].includes(role)) {
    const invoices = await prisma.invoice.findMany({ where: { organizationId: orgId, status: 'paid' }, select: { total: true } });
    metrics.totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    metrics.pendingInvoices = await prisma.invoice.count({ where: { organizationId: orgId, status: { in: ['draft', 'sent'] } } });
    metrics.totalPayments = await prisma.paymentEntry.count({ where: { organizationId: orgId } });
    metrics.pendingExpenses = await prisma.expenseClaim.count({ where: { organizationId: orgId, status: 'pending' } });
  }

  if (['sales_admin', 'ceo'].includes(role)) {
    metrics.totalLeads = await prisma.lead.count({ where: { organizationId: orgId } });
    metrics.convertedLeads = await prisma.lead.count({ where: { organizationId: orgId, status: 'converted' } });
  }

  if (role !== 'superadmin') {
    const taskWhere: any = { organizationId: orgId };
    if (role === 'employee') taskWhere.assignedTo = req.user.id;

    metrics.pendingTasks = await prisma.task.count({ where: { ...taskWhere, status: 'pending' } });
    metrics.completedTasks = await prisma.task.count({ where: { ...taskWhere, status: 'completed' } });
  }

  if (role === 'ceo') {
    metrics.activeEscalations = await prisma.escalation.count({ where: { organizationId: orgId, status: 'active' } });
  }

  res.status(200).json({ success: true, data: metrics });
});

export const getFinanceOverviewMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const { dateRange } = req.query;
  const branchId = req.query.branchId as string;

  const whereBase: any = { organizationId: orgId };
  const branchFilter = (branchId && branchId !== 'all') ? branchId : undefined;

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
        recentCollections,
        recentExpenses,
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
