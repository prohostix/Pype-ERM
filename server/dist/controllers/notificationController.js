import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getMyNotifications = asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, read: false } });
    res.json({ success: true, data: notifications, unreadCount });
});
export const markAsRead = asyncHandler(async (req, res) => {
    const notification = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ success: true, data: notification });
});
export const markAllAsRead = asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user.id }, data: { read: true } });
    res.json({ success: true, message: 'All marked as read' });
});
export const deleteNotification = asyncHandler(async (req, res) => {
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
});
export const createNotification = async (organizationId, userId, type, title, message, data) => {
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
export const broadcastNotification = async (organizationId, type, title, message, roles) => {
    const users = await prisma.user.findMany({
        where: { organizationId, role: roles ? { in: roles } : undefined, status: { not: 'resigned' } }
    });
    const notifications = users.map(u => ({ organizationId, userId: u.id, type, title, message, read: false }));
    const result = await prisma.notification.createMany({ data: notifications });
    return result;
};
//# sourceMappingURL=notificationController.js.map