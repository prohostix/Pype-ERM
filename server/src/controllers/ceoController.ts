import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { partnerBranchWhere, type PageRequest, userInReach, refuseOwnRecord } from '../access/pageGuard.js';

export const getPerformanceMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [total, completed] = await Promise.all([
    prisma.task.count({ where: { organizationId: req.user.organizationId } }),
    prisma.task.count({ where: { organizationId: req.user.organizationId, status: 'completed' } })
  ]);
  res.json({ success: true, data: { taskCompletionRate: total > 0 ? (completed / total) * 100 : 0 } });
});

export const getRiskMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const overdue = await prisma.task.count({ where: { organizationId: req.user.organizationId, status: 'overdue' } });
  res.json({ success: true, data: { overdueTasks: overdue } });
});

export const getEscalations = asyncHandler(async (req: PageRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const person = { select: { id: true, name: true, email: true, role: true } };
  // Someone given this page sees their own branch, or every branch if they have none
  const branch = req.ownBranchOnly ? req.user.branchId || null : null;
  const [rows, overdue] = await Promise.all([
    prisma.escalation.findMany({
      where: { organizationId, ...(branch && { employee: { branchId: branch } }) },
      orderBy: { escalatedAt: 'desc' },
      include: {
        employee: person, deptAdmin: person, handler: { select: { id: true, name: true } }, resolver: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, description: true, deadline: true, priority: true, status: true } },
      },
    }),
    // overdue work that is heading towards an escalation
    prisma.task.findMany({
      where: { organizationId, status: 'overdue', ...(branch && { assignee: { branchId: branch } }) },
      orderBy: { deadline: 'asc' },
      take: 50,
      select: { id: true, title: true, deadline: true, priority: true, gracePeriodEnd: true, escalationStatus: true, assignee: person },
    }),
  ]);

  // `priority` is what the screens show: the escalation's impact, else the task's own priority
  const data = rows.map((e) => ({ ...e, priority: e.impact || e.task?.priority || 'medium' }));
  res.json({ success: true, count: data.length, data, watchlist: overdue });
});

// Handle an escalation. The screens send { action, resolution, newDeadline, reassignTo }
// (action = resolve | reassign | extend | justify) rather than database columns, so
// translate that into the escalation's own fields and, where it applies, its task.
export const handleEscalation = asyncHandler(async (req: PageRequest, res: Response) => {
  const existing = await prisma.escalation.findFirst({
    where: {
      id: req.params.id, organizationId: req.user.organizationId,
      ...(req.ownBranchOnly && req.user.branchId && { employee: { branchId: req.user.branchId } }),
    },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Escalation not found' });
    return;
  }

  if (refuseOwnRecord(req, res, existing.employeeId, 'escalation')) return;

  const { action, resolution, newDeadline, reassignTo } = req.body || {};
  const now = new Date();
  const data: any = {};

  switch (action) {
    case 'resolve':
    case 'justify':
      if (!resolution || !String(resolution).trim()) {
        res.status(400).json({ success: false, message: 'Resolution notes are required' });
        return;
      }
      data.resolution = String(resolution).trim();
      break;
    case 'extend': {
      const d = newDeadline ? new Date(newDeadline) : null;
      if (!d || isNaN(d.getTime())) {
        res.status(400).json({ success: false, message: 'A valid new deadline is required' });
        return;
      }
      if (existing.taskId) {
        await prisma.task.update({ where: { id: existing.taskId }, data: { targetDate: d } });
      }
      data.resolution = `Deadline extended to ${d.toISOString().split('T')[0]}`;
      break;
    }
    case 'reassign': {
      if (!reassignTo) {
        res.status(400).json({ success: false, message: 'Choose who to reassign this to' });
        return;
      }
      const target = await prisma.user.findFirst({
        where: { id: String(reassignTo), organizationId: req.user.organizationId },
        select: { id: true, name: true },
      });
      if (!target) {
        res.status(400).json({ success: false, message: 'That user was not found in your organization' });
        return;
      }
      if (existing.taskId) {
        await prisma.task.update({ where: { id: existing.taskId }, data: { assignedTo: target.id } });
      }
      data.resolution = `Reassigned to ${target.name}`;
      break;
    }
    default:
      res.status(400).json({ success: false, message: 'Unknown action' });
      return;
  }

  data.status = 'resolved';
  data.resolvedAt = now;
  data.resolvedBy = req.user.id;
  data.handledBy = req.user.id;

  const escalation = await prisma.escalation.update({ where: { id: existing.id }, data });
  res.json({ success: true, data: escalation });
});

export const getSalesDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: orgId,
      createdAt: { gte: thirtyDaysAgo }
    },
    orderBy: { createdAt: 'desc' }
  });

  const grouped: Record<string, number> = {};
  enrollments.forEach(e => {
    const dateStr = e.createdAt.toISOString().split('T')[0];
    grouped[dateStr] = (grouped[dateStr] || 0) + 1;
  });

  const salesPerDay = Object.keys(grouped).map(date => ({ date, count: grouped[date] }));

  res.json({ success: true, data: { salesPerDay, details: enrollments } });
});

export const getRevenueDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const payments = await prisma.paymentEntry.findMany({
    where: {
      organizationId: orgId,
      receivedAt: { gte: thirtyDaysAgo }
    },
    select: { amount: true, receivedAt: true }
  });

  const grouped: Record<string, number> = {};
  payments.forEach(p => {
    const dateStr = p.receivedAt.toISOString().split('T')[0];
    grouped[dateStr] = (grouped[dateStr] || 0) + p.amount;
  });

  const revenuePerDate = Object.keys(grouped).map(date => ({ date, revenue: grouped[date] }));

  res.json({ success: true, data: { revenuePerDate } });
});

export const getAdmissionsList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [totalCount, students] = await Promise.all([
    prisma.student.count({ where: { organizationId: orgId } }),
    prisma.student.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })
  ]);

  res.json({
    success: true,
    data: students,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit)
  });
});

export const getPendingInvoicesList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [totalCount, invoices] = await Promise.all([
    prisma.invoice.count({ where: { organizationId: orgId, status: 'draft' } }),
    prisma.invoice.findMany({
      where: { organizationId: orgId, status: 'draft' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        student: { select: { id: true, name: true, email: true } },
        center: { select: { id: true, name: true } }
      }
    })
  ]);

  res.json({
    success: true,
    data: invoices,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit)
  });
});

export const getAnalytics = asyncHandler(async (req: PageRequest, res: Response) => {
  const orgId = req.user.organizationId;
  // Someone given this page sees their own branch, or every branch if they have none
  const branch = req.ownBranchOnly ? req.user.branchId || null : null;
  const inBranch = branch ? { branchId: branch } : {};
  const [totalStudents, totalCenters, activePrograms, tasks, departments, memberCounts] = await Promise.all([
    prisma.student.count({ where: { organizationId: orgId, ...inBranch } }),
    prisma.studyCenter.count({ where: { organizationId: orgId, ...partnerBranchWhere(branch) } }),
    prisma.program.count({ where: { organizationId: orgId, status: 'active' } }),
    prisma.task.findMany({
      where: { organizationId: orgId, ...(branch && { assignee: { branchId: branch } }) },
      select: { status: true, assignedTo: true, assignee: { select: { id: true, name: true, email: true, role: true, departmentId: true, status: true } } }
    }),
    prisma.department.findMany({ where: { organizationId: orgId, status: 'active' }, select: { id: true, name: true, type: true } }),
    prisma.user.groupBy({ by: ['departmentId'], where: { organizationId: orgId, status: { not: 'resigned' }, departmentId: { not: null }, ...inBranch }, _count: { _all: true } }),
  ]);

  // completion rate carries most of the weight; overdue work pulls the score down
  const rates = (t: { total: number; completed: number; overdue: number }) => {
    const completionRate = t.total ? Math.round((t.completed / t.total) * 100) : 0;
    const overdueRate = t.total ? Math.round((t.overdue / t.total) * 100) : 0;
    return { completionRate, overdueRate, score: t.total ? Math.max(0, Math.min(100, Math.round(completionRate * 0.7 + (100 - overdueRate) * 0.3))) : 0 };
  };
  const blank = () => ({ total: 0, completed: 0, overdue: 0, inProgress: 0 });
  const bump = (t: ReturnType<typeof blank>, status: string) => {
    t.total++;
    if (status === 'completed') t.completed++;
    else if (status === 'overdue') t.overdue++;
    else if (status === 'in_progress') t.inProgress++;
  };

  const perEmployee = new Map<string, ReturnType<typeof blank> & { user: any }>();
  const perDept = new Map<string, ReturnType<typeof blank>>();
  for (const task of tasks) {
    if (!task.assignee || task.assignee.status === 'resigned') continue;
    const e = perEmployee.get(task.assignedTo) || { ...blank(), user: task.assignee };
    bump(e, task.status); perEmployee.set(task.assignedTo, e);
    const dId = task.assignee.departmentId;
    if (dId) { const d = perDept.get(dId) || blank(); bump(d, task.status); perDept.set(dId, d); }
  }

  const employeePerformance = [...perEmployee.values()]
    .map((e) => ({ userId: e.user.id, name: e.user.name, email: e.user.email, role: e.user.role, total: e.total, completed: e.completed, overdue: e.overdue, inProgress: e.inProgress, ...rates(e) }))
    .sort((a, b) => b.score - a.score || b.completed - a.completed);

  const members = new Map(memberCounts.map((m) => [m.departmentId, m._count._all]));
  const departmentEfficiency = departments
    .filter((d) => perDept.has(d.id))
    .map((d) => {
      const t = perDept.get(d.id)!;
      const r = rates(t);
      return { departmentId: d.id, name: d.name, type: d.type, memberCount: members.get(d.id) || 0, ...t, completionRate: r.completionRate, overdueRate: r.overdueRate, efficiency: r.score };
    })
    .sort((a, b) => b.efficiency - a.efficiency);

  res.json({ success: true, data: { totalStudents, totalCenters, activePrograms, employeePerformance, departmentEfficiency } });
});

export const getDepartmentManagers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const managers = await prisma.user.findMany({ where: { organizationId: req.user.organizationId, role: { in: ['ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'] }, status: { not: 'resigned' } }, omit: { password: true } });
  res.json({ success: true, count: managers.length, data: managers });
});

export const assignTask = asyncHandler(async (req: PageRequest, res: Response) => {
  const { assigneeId, assignedTo, deadline, ...rest } = req.body;
  if (!(await userInReach(req, assignedTo || assigneeId))) {
    res.status(404).json({ success: false, message: 'That person was not found' });
    return;
  }
  const task = await prisma.task.create({
    data: {
      ...rest,
      assignedTo: assignedTo || assigneeId,
      createdBy: req.user.id,
      deadline: deadline ? new Date(deadline) : new Date(),
      organizationId: req.user.organizationId!
    }
  });
  res.status(201).json({ success: true, data: task });
});

// Org-wide KPI / KRA report for one month (?month=YYYY-MM, default this month).
// Every active employee gets live KPIs worked out from real data:
//  - sales targets (revenue = fees collected, other types = admissions) for anyone who has a Target,
//  - tasks due in the month and how many were completed,
//  - attendance for people who must punch in.
// KPIs and KRAs HR typed into the employee profile are added on top, marked as manual.
export const getKPIKRAReport = asyncHandler(async (req: PageRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const now = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(String(req.query.month || ''));
  const year = m ? Number(m[1]) : now.getFullYear();
  const monthIdx = m ? Number(m[2]) - 1 : now.getMonth();
  const start = new Date(year, monthIdx, 1);
  const end = new Date(year, monthIdx + 1, 1);
  const isCurrent = now >= start && now < end;
  const isPast = now >= end;
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86400000);
  // how much of the month has gone, used to judge whether someone is on pace
  const elapsed = isPast ? 1 : isCurrent ? Math.max(0.05, (now.getDate() - 0.5) / daysInMonth) : 0;
  const monthLabel = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const inRange = (d: any) => { if (!d) return false; const t = new Date(d); return !isNaN(t.getTime()) && t >= start && t < end; };
  const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  type Status = 'on_track' | 'at_risk' | 'achieved' | 'missed';
  const judge = (achieved: number, target: number): Status => {
    if (target <= 0) return 'on_track';
    if (achieved >= target) return 'achieved';
    if (isPast) return 'missed';
    if (!isCurrent) return 'on_track'; // a future month has nothing to judge yet
    return achieved / target >= elapsed * 0.8 ? 'on_track' : 'at_risk';
  };

  const users = await prisma.user.findMany({
    where: {
      organizationId, status: { not: 'resigned' }, role: { notIn: ['student'] },
      ...(req.ownBranchOnly && req.user.branchId && { branchId: req.user.branchId }),
    },
    select: {
      id: true, name: true, email: true, designation: true, role: true, status: true, requiresAttendance: true,
      department: { select: { name: true } }, branch: { select: { name: true } },
      employeeProfileDetail: { select: { kpis: true, kras: true, overallRating: true, lastReviewDate: true, nextReviewDate: true, reviewRemarks: true } },
    },
    orderBy: { name: 'asc' },
  });
  const ids = users.map((u) => u.id);

  const [targets, tasks, attendance] = await Promise.all([
    prisma.target.findMany({ where: { organizationId, employeeId: { in: ids } } }),
    prisma.task.findMany({ where: { organizationId, assignedTo: { in: ids }, deadline: { gte: start, lt: end } }, select: { assignedTo: true, status: true } }),
    prisma.attendance.findMany({ where: { organizationId, employeeId: { in: ids }, date: { gte: start, lt: end } }, select: { employeeId: true, status: true } }),
  ]);

  // sales: admissions and collection per counselor, counted the way the sales dashboard counts them
  const targetOwners = [...new Set(targets.map((t) => t.employeeId!).filter(Boolean))];
  const admissions = new Map<string, number>();
  const collection = new Map<string, number>();
  if (targetOwners.length > 0) {
    const students = await prisma.student.findMany({
      where: { organizationId, OR: [{ enrolledBy: { in: targetOwners } }, { referredBy: { in: targetOwners } }] },
      select: {
        enrolledBy: true, referredBy: true, createdAt: true, admissionProgress: true,
        enrollments: { select: { createdAt: true, initialPaymentAmount: true, admissionProgress: true, payment: { select: { amount: true, debitedAt: true } } } },
      },
    });
    for (const st of students) {
      const owners = new Set([st.enrolledBy, st.referredBy].filter((x): x is string => !!x && targetOwners.includes(x)));
      const ap: any = st.admissionProgress && typeof st.admissionProgress === 'object' ? st.admissionProgress : {};
      let paid = 0;
      if (st.enrollments.length > 0) {
        for (const e of st.enrollments) {
          const eap: any = e.admissionProgress && typeof e.admissionProgress === 'object' ? e.admissionProgress : {};
          const date = e.payment?.debitedAt || eap.initialPaymentDate || ap.initialPaymentDate || e.createdAt || st.createdAt;
          if (inRange(date)) paid += num(e.payment?.amount || e.initialPaymentAmount);
        }
      } else if (ap.initialPaymentAmount && inRange(ap.initialPaymentDate || st.createdAt)) {
        paid += num(ap.initialPaymentAmount);
      }
      for (const o of owners) {
        if (inRange(st.createdAt)) admissions.set(o, (admissions.get(o) || 0) + 1);
        collection.set(o, (collection.get(o) || 0) + paid);
      }
    }
  }

  const taskMap = new Map<string, { total: number; done: number; overdue: number }>();
  for (const t of tasks) {
    const x = taskMap.get(t.assignedTo) || { total: 0, done: 0, overdue: 0 };
    x.total++; if (t.status === 'completed') x.done++; else if (t.status === 'overdue') x.overdue++;
    taskMap.set(t.assignedTo, x);
  }
  const attMap = new Map<string, { counted: number; present: number }>();
  for (const a of attendance) {
    if (a.status === 'leave') continue; // approved leave is not held against anyone
    const x = attMap.get(a.employeeId) || { counted: 0, present: 0 };
    x.counted++; x.present += a.status === 'absent' ? 0 : a.status === 'half_day' ? 0.5 : 1;
    attMap.set(a.employeeId, x);
  }

  const data = users.map((u) => {
    const kpis: any[] = [];

    for (const t of targets.filter((x) => x.employeeId === u.id)) {
      const isRevenue = t.type === 'revenue';
      const achieved = isRevenue ? Math.round(collection.get(u.id) || 0) : admissions.get(u.id) || 0;
      kpis.push({
        id: `target-${t.id}`, source: 'auto', category: 'Sales target',
        title: isRevenue ? 'Fee collection target' : 'Admissions target',
        description: isRevenue ? 'Fees collected from students this counselor enrolled or referred' : 'Students enrolled or referred this month',
        target: t.target, achieved, unit: isRevenue ? '₹' : 'students', period: monthLabel, status: judge(achieved, t.target),
      });
    }

    const tk = taskMap.get(u.id);
    if (tk && tk.total > 0) {
      kpis.push({
        id: `tasks-${u.id}`, source: 'auto', category: 'Tasks', title: 'Tasks completed',
        description: tk.overdue ? `${tk.overdue} overdue` : 'Tasks due this month',
        target: tk.total, achieved: tk.done, unit: 'tasks', period: monthLabel,
        status: tk.done >= tk.total ? 'achieved' : tk.overdue > 0 ? (isPast ? 'missed' : 'at_risk') : judge(tk.done, tk.total),
      });
    }

    const at = attMap.get(u.id);
    if (u.requiresAttendance !== false && at && at.counted > 0) {
      const pct = Math.round((at.present / at.counted) * 100);
      kpis.push({
        id: `att-${u.id}`, source: 'auto', category: 'Attendance', title: 'Attendance',
        description: `${at.present} of ${at.counted} working days`,
        target: 100, achieved: pct, unit: '%', period: monthLabel,
        status: pct >= 95 ? 'achieved' : pct >= 85 ? 'on_track' : isPast ? 'missed' : 'at_risk',
      });
    }

    const p: any = u.employeeProfileDetail;
    (Array.isArray(p?.kpis) ? p.kpis : []).filter((k: any) => k && typeof k === 'object').forEach((k: any, i: number) => {
      const target = num(k.target), achieved = num(k.achieved);
      kpis.push({
        id: String(k.id ?? `${u.id}-kpi-${i}`), source: 'manual', category: 'HR KPI', title: String(k.title ?? 'KPI'), description: k.description,
        target, achieved, unit: String(k.unit ?? ''), period: String(k.period ?? ''),
        status: ['on_track', 'at_risk', 'achieved', 'missed'].includes(k.status) ? k.status : (target > 0 && achieved >= target ? 'achieved' : 'on_track'),
      });
    });
    const kras = (Array.isArray(p?.kras) ? p.kras : []).filter((k: any) => k && typeof k === 'object').map((k: any, i: number) => ({
      id: String(k.id ?? `${u.id}-kra-${i}`), area: String(k.area ?? 'KRA'), description: k.description, weightage: num(k.weightage),
      rating: k.rating == null || k.rating === '' ? undefined : num(k.rating), remarks: k.remarks,
    }));

    const pcts = kpis.map((k) => (k.target > 0 ? Math.min(100, (k.achieved / k.target) * 100) : 0));
    const rated = kras.filter((k: any) => k.rating !== undefined);
    return {
      userId: u.id, name: u.name, email: u.email, designation: u.designation ?? undefined, role: u.role, status: u.status,
      department: u.department?.name ?? '', branch: u.branch?.name ?? '',
      overallRating: p?.overallRating ?? undefined, lastReviewDate: p?.lastReviewDate ?? undefined, nextReviewDate: p?.nextReviewDate ?? undefined, reviewRemarks: p?.reviewRemarks ?? undefined,
      kpis,
      kpiSummary: {
        total: kpis.length,
        achieved: kpis.filter((k) => k.status === 'achieved').length,
        atRisk: kpis.filter((k) => k.status === 'at_risk').length,
        missed: kpis.filter((k) => k.status === 'missed').length,
        avgPct: pcts.length ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length) : 0,
      },
      kras,
      kraSummary: {
        total: kras.length,
        avgRating: rated.length ? (rated.reduce((x: number, k: any) => x + (k.rating || 0), 0) / rated.length).toFixed(1) : null,
        totalWeightage: kras.reduce((x: number, k: any) => x + k.weightage, 0),
      },
    };
  });

  res.json({ success: true, month: `${year}-${String(monthIdx + 1).padStart(2, '0')}`, monthLabel, data });
});

export const getCenterOnboardingOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: centers });
});

export const getStudentEnrollmentOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: enrollments });
});

// One page of activity logs: ?page=&limit=&search=&action=&until=
export const getActivityLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));
  const search = String(req.query.search || '').trim();
  const action = String(req.query.action || '').trim();
  // Later pages pass back the first page's time, so new activity does not shift rows between pages
  const requested = new Date(String(req.query.until || ''));
  const until = Number.isNaN(requested.getTime()) ? new Date() : requested;

  const scope = { organizationId: req.user.organizationId, timestamp: { lte: until } };
  const contains = { contains: search, mode: 'insensitive' as const };
  const where: any = {
    ...scope,
    ...(action && { action: { equals: action, mode: 'insensitive' as const } }),
    ...(search && {
      OR: [
        { user: { is: { OR: [{ name: contains }, { email: contains }] } } },
        { entityType: contains },
        { entityId: contains },
      ],
    }),
  };

  const [logs, total, overall, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      // Only what the screen shows: the stored old and new values can be large
      select: {
        id: true, timestamp: true, action: true, entityType: true, entityId: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: scope }),
    // The action filter buttons are only needed with the first page
    page === 1 ? prisma.auditLog.groupBy({ by: ['action'], where: scope, orderBy: { action: 'asc' } }) : null,
  ]);

  res.json({
    success: true,
    data: logs,
    total,
    overall,
    until: until.toISOString(),
    ...(actions && { actions: actions.map((a) => a.action) }),
  });
});

export const getSalesCounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [totalSales, revenueAgg, totalAdmission, totalPendingPayments] = await Promise.all([
    prisma.enrollment.count({ where: { organizationId: orgId, source: null, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.paymentEntry.aggregate({ where: { organizationId: orgId, receivedAt: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
    prisma.student.count({ where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.invoice.count({ where: { organizationId: orgId, status: 'draft', createdAt: { gte: thirtyDaysAgo } } })
  ]);
  
  const totalRevenue = revenueAgg._sum.amount || 0;
  
  res.json({ success: true, data: { totalSales, totalRevenue, totalAdmission, totalPendingPayments } });
});

export const getOverallSalesCounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  
  const [totalSales, revenueAgg, totalAdmission, totalPendingPayments] = await Promise.all([
    prisma.enrollment.count({ where: { organizationId: orgId, source: null } }),
    prisma.paymentEntry.aggregate({ where: { organizationId: orgId }, _sum: { amount: true } }),
    prisma.student.count({ where: { organizationId: orgId } }),
    prisma.invoice.count({ where: { organizationId: orgId, status: 'draft' } })
  ]);
  
  const totalRevenue = revenueAgg._sum.amount || 0;
  
  res.json({ success: true, data: { totalSales, totalRevenue, totalAdmission, totalPendingPayments } });
});

export const getRevenueTrend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  
  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const payments = await prisma.paymentEntry.findMany({
    where: {
      organizationId: orgId,
      receivedAt: {
        gte: thirtyDaysAgo,
      }
    },
    select: {
      amount: true,
      receivedAt: true
    }
  });

  const trend: Record<string, number> = {};
  
  // Initialize last 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    trend[dateStr] = 0;
  }

  // Aggregate payments by day
  payments.forEach(p => {
    const dateStr = p.receivedAt.toISOString().split('T')[0];
    if (trend[dateStr] !== undefined) {
      trend[dateStr] += p.amount;
    }
  });

  const result = Object.keys(trend).map(date => ({
    date,
    revenue: trend[date]
  }));

  res.json({ success: true, data: result });
});


// @desc    One-call data for the Executive Overview page: money, admissions, branch comparison and what needs attention
// @route   GET /api/v1/ceo/overview
export const getExecutiveOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(startOfToday); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const sum = (v: any) => Number(v?._sum?.amount || 0);

  const [
    paidThisMonth, paidLastMonth, paymentsLast30, monthPaymentsByStudent,
    unpaidSchedules, expensesThisMonth, expensesLastMonth,
    studentsTotal, studentsThisMonth, studentsLastMonth, studentsByStatus, studentsByBranch, newByBranch,
    leadsThisMonth, leadsLastMonth,
    branches, staffByBranch, staffTotal, presentToday,
    pendingDeletes, activeEscalations, criticalEscalations, overdueTasks, pendingLeaves, pendingExpenses,
  ] = await Promise.all([
    prisma.paymentEntry.aggregate({ where: { organizationId, receivedAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.paymentEntry.aggregate({ where: { organizationId, receivedAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { amount: true } }),
    prisma.paymentEntry.findMany({ where: { organizationId, receivedAt: { gte: thirtyDaysAgo } }, select: { amount: true, receivedAt: true } }),
    prisma.paymentEntry.findMany({ where: { organizationId, receivedAt: { gte: startOfMonth } }, select: { amount: true, invoice: { select: { student: { select: { branchId: true } } } } } }),
    prisma.paymentSchedule.findMany({ where: { student: { organizationId }, status: { not: 'paid' } }, select: { amount: true, dueDate: true, studentId: true } }),
    prisma.expenseClaim.aggregate({ where: { organizationId, status: 'approved', submittedAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.expenseClaim.aggregate({ where: { organizationId, status: 'approved', submittedAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { amount: true } }),
    prisma.student.count({ where: { organizationId } }),
    prisma.student.count({ where: { organizationId, createdAt: { gte: startOfMonth } } }),
    prisma.student.count({ where: { organizationId, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.student.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true } }),
    prisma.student.groupBy({ by: ['branchId'], where: { organizationId }, _count: { _all: true } }),
    prisma.student.groupBy({ by: ['branchId'], where: { organizationId, createdAt: { gte: startOfMonth } }, _count: { _all: true } }),
    prisma.lead.count({ where: { organizationId, createdAt: { gte: startOfMonth } } }),
    prisma.lead.count({ where: { organizationId, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.branch.findMany({ where: { organizationId }, select: { id: true, name: true } }),
    prisma.user.groupBy({ by: ['branchId'], where: { organizationId, status: { notIn: ['resigned'] }, role: { notIn: ['student'] } }, _count: { _all: true } }),
    prisma.user.count({ where: { organizationId, status: { notIn: ['resigned'] }, role: { notIn: ['student'] } } }),
    prisma.attendance.count({ where: { organizationId, date: { gte: startOfToday }, status: { in: ['present', 'late', 'wfh', 'half_day'] } } }),
    req.user.role === 'ceo' ? prisma.editDeleteRequest.count({ where: { organizationId, status: { in: ['pending_ceo', 'pending_manager'] } } }) : Promise.resolve(0),
    prisma.escalation.count({ where: { organizationId, status: 'active' } }),
    prisma.escalation.count({ where: { organizationId, status: 'active', impact: { in: ['high', 'critical'] } } }),
    prisma.task.count({ where: { organizationId, status: 'overdue' } }),
    prisma.leaveRequest.count({ where: { organizationId, status: { in: ['pending', 'dept_approved'] } } }),
    prisma.expenseClaim.count({ where: { organizationId, status: 'pending' } }),
  ]);

  // daily collections for the last 30 days
  const daily: Record<string, number> = {};
  for (let i = 0; i < 30; i++) { const d = new Date(thirtyDaysAgo); d.setDate(d.getDate() + i); daily[d.toISOString().slice(0, 10)] = 0; }
  paymentsLast30.forEach((p) => { const k = new Date(p.receivedAt).toISOString().slice(0, 10); if (k in daily) daily[k] += p.amount; });

  // fees still due
  const dueAmount = unpaidSchedules.reduce((t, x) => t + x.amount, 0);
  const overdue = unpaidSchedules.filter((x) => new Date(x.dueDate).getTime() < startOfToday.getTime());
  const overdueAmount = overdue.reduce((t, x) => t + x.amount, 0);
  const overdueStudents = new Set(overdue.map((x) => x.studentId)).size;

  // branch comparison
  const collectedByBranch = new Map<string | null, number>();
  monthPaymentsByStudent.forEach((p) => { const b = p.invoice?.student?.branchId ?? null; collectedByBranch.set(b, (collectedByBranch.get(b) || 0) + p.amount); });
  const countMap = (rows: { branchId: string | null; _count: { _all: number } }[]) => new Map(rows.map((r) => [r.branchId, r._count._all]));
  const studentsMap = countMap(studentsByBranch as any), newMap = countMap(newByBranch as any), staffMap = countMap(staffByBranch as any);
  const branchRows = [...branches.map((b) => ({ id: b.id as string | null, name: b.name })), { id: null as string | null, name: 'No branch' }]
    .map((b) => ({
      id: b.id, name: b.name,
      students: studentsMap.get(b.id) || 0,
      newThisMonth: newMap.get(b.id) || 0,
      collectedThisMonth: collectedByBranch.get(b.id) || 0,
      staff: staffMap.get(b.id) || 0,
    }))
    .filter((b) => b.id !== null || b.students > 0 || b.collectedThisMonth > 0)
    .sort((a, b) => b.collectedThisMonth - a.collectedThisMonth);

  res.json({
    success: true,
    data: {
      generatedAt: now.toISOString(),
      collections: {
        thisMonth: sum(paidThisMonth), lastMonth: sum(paidLastMonth),
        trend: Object.entries(daily).map(([date, amount]) => ({ date, amount })),
        dueAmount, overdueAmount, overdueStudents,
        expensesThisMonth: sum(expensesThisMonth), expensesLastMonth: sum(expensesLastMonth),
      },
      admissions: {
        totalStudents: studentsTotal, newThisMonth: studentsThisMonth, newLastMonth: studentsLastMonth,
        leadsThisMonth, leadsLastMonth,
        byStatus: studentsByStatus.map((r) => ({ status: r.status, count: r._count._all })).sort((a, b) => b.count - a.count),
      },
      branches: branchRows,
      people: { staff: staffTotal, presentToday },
      attention: { pendingDeletes, activeEscalations, criticalEscalations, overdueTasks, pendingLeaves, pendingExpenses, overdueFeeStudents: overdueStudents },
    }
  });
});
