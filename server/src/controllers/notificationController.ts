import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotificationType, UserRole } from '../generated/client/index.js';

export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userIds = [req.user.id];
  if (req.user.email) {
    const shadowUser = await prisma.user.findFirst({
      where: { email: { equals: req.user.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (shadowUser && !userIds.includes(shadowUser.id)) {
      userIds.push(shadowUser.id);
    }
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: 'desc' }
  });
  const unreadCount = await prisma.notification.count({ where: { userId: { in: userIds }, read: false } });
  res.json({ success: true, data: notifications, unreadCount });
});

export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notification = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
  res.json({ success: true, data: notification });
});

export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userIds = [req.user.id];
  if (req.user.email) {
    const shadowUser = await prisma.user.findFirst({
      where: { email: { equals: req.user.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (shadowUser && !userIds.includes(shadowUser.id)) {
      userIds.push(shadowUser.id);
    }
  }
  await prisma.notification.updateMany({ where: { userId: { in: userIds } }, data: { read: true } });
  res.json({ success: true, message: 'All marked as read' });
});

export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.notification.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const createNotification = async (organizationId: string, userId: string, type: NotificationType, title: string, message: string, data?: any) => {
  const notification = await prisma.notification.create({
    data: { 
      organizationId, 
      userId, 
      type, 
      title, 
      message, 
      read: false,
      link: data && typeof data === 'string' ? data : (data?.link || undefined)
    }
  });

  return notification;
};

export const broadcastNotification = async (organizationId: string, type: NotificationType, title: string, message: string, roles?: UserRole[]) => {
  const users = await prisma.user.findMany({
    where: { organizationId, role: roles ? { in: roles } : undefined, status: { not: 'resigned' } }
  });
  const notifications = users.map(u => ({ organizationId, userId: u.id, type, title, message, read: false }));
  const result = await prisma.notification.createMany({ data: notifications });

  return result;
};
