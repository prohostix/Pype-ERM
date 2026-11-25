/**
 * Sales Entry: data-entry staff who type applications in for a sales employee. The employee gets
 * the credit (`salesUserId`); the data-entry user handles the paperwork (`enteredBy`).
 */
import prisma from '../lib/prisma.js';

interface Person { role: string; department?: { type?: string | null } | null; departmentType?: string | null }

/** The Sales Entry role, or an employee in a Data Entry department. */
export const isEntryUser = (user: Person): boolean =>
  user.role === 'sales_entry' || (user.role === 'employee' && (user.department?.type === 'data_entry' || user.departmentType === 'data_entry'));

/** Who may be named as the sales employee: active sales staff of the organization (on leave is fine). */
export const salesPersonWhere = (organizationId: string, branchId?: string | null) => ({
  organizationId,
  status: { notIn: ['inactive', 'resigned'] as any },
  OR: [
    { role: { in: ['sales', 'sales_sub_admin', 'sales_admin'] as any } },
    { role: 'employee' as any, department: { type: 'sales' as any } },
  ],
  ...(branchId && { branchId }),
});

interface Owners { salesUserId?: string | null }

/** A notice for the sales employee who owns the application (and so handles any rejection). */
export const notifySalesAndEnterer = async (
  enrollment: Owners,
  data: { organizationId: string; title: string; message: string; type?: any; priority?: any; link?: string },
): Promise<void> => {
  if (!enrollment.salesUserId) return;
  await prisma.notification.create({ data: { type: 'general', priority: 'medium', ...data, userId: enrollment.salesUserId } });
};

/**
 * May this person work on an application owned by `salesUserId`? Data-entry staff work for sales
 * employees, so any application of an active sales employee they may choose is theirs to handle.
 */
export const entryMayActFor = async (user: Person & { id: string; organizationId: string; branchId?: string | null }, salesUserId?: string | null): Promise<boolean> => {
  if (!salesUserId || !isEntryUser(user)) return false;
  return Boolean(await prisma.user.findFirst({
    where: { id: salesUserId, ...salesPersonWhere(user.organizationId, user.branchId) },
    select: { id: true },
  }));
};
