import { Response } from 'express';
import { NotificationType, UserRole } from '../generated/client/index.js';
export declare const getMyNotifications: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const markAsRead: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const markAllAsRead: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const deleteNotification: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
export declare const createNotification: (organizationId: string, userId: string, type: NotificationType, title: string, message: string, data?: any) => Promise<{
    id: string;
    organizationId: string;
    userId: string;
    title: string;
    message: string;
    type: import("../generated/client/index.js").$Enums.NotificationType;
    priority: import("../generated/client/index.js").$Enums.NotificationPriority;
    read: boolean;
    link: string | null;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare const broadcastNotification: (organizationId: string, type: NotificationType, title: string, message: string, roles?: UserRole[]) => Promise<import("../generated/client/runtime/client.js").GetBatchResult>;
//# sourceMappingURL=notificationController.d.ts.map