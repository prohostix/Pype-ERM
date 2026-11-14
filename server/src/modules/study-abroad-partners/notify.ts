import prisma from '../../lib/prisma.js';

/** Tell the Operations or Finance team that a Study Abroad partner changed something they need to look at. */
export const notifyStaff = async (
  organizationId: string, roles: string[], title: string, message: string, link: string,
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({ where: { organizationId, role: { in: roles as any }, status: 'active' }, select: { id: true } });
    for (const u of users) {
      await prisma.notification.create({ data: { organizationId, userId: u.id, title, message, type: 'general', priority: 'medium', link } });
    }
  } catch { /* notifications must never block the partner */ }
};
