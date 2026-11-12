import prisma from '../../lib/prisma.js';

/** Tell a Study Abroad partner what happened to one of their applications (no-op for other enrollments). */
export const notifyStudyAbroadPartner = async (
  enrollment: { organizationId: string; source?: string | null; studyAbroadPartnerId?: string | null; studentName: string },
  title: string,
  message: string,
): Promise<void> => {
  if (enrollment.source !== 'study_abroad' || !enrollment.studyAbroadPartnerId) return;
  try {
    const partner = await prisma.studyAbroadPartner.findUnique({
      where: { id: enrollment.studyAbroadPartnerId }, select: { adminUserId: true },
    });
    if (!partner?.adminUserId) return;
    await prisma.notification.create({
      data: {
        organizationId: enrollment.organizationId, userId: partner.adminUserId,
        title, message: message.replace('{student}', enrollment.studentName), type: 'general', priority: 'medium', link: 'applications',
      },
    });
  } catch { /* notifications must never block a review */ }
};

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
