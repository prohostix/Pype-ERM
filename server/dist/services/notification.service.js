import { getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import prisma from '../lib/prisma.js';
export const sendPushNotification = async (userId, title, body, data) => {
    try {
        const userTokens = await prisma.userFCMToken.findMany({
            where: { userId },
        });
        if (!userTokens || userTokens.length === 0) {
            console.log(`No FCM tokens found for user ${userId}`);
            return false;
        }
        const tokens = userTokens.map(ut => ut.token);
        const message = {
            notification: {
                title,
                body,
            },
            data: data || {},
            tokens: tokens,
        };
        // Make sure Firebase Admin is initialized before sending
        if (getApps().length > 0) {
            const response = await getMessaging().sendEachForMulticast(message);
            console.log(`${response.successCount} messages were sent successfully`);
            // Cleanup expired or invalid tokens
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        // Check for invalid tokens
                        if (resp.error?.code === 'messaging/invalid-registration-token' ||
                            resp.error?.code === 'messaging/registration-token-not-registered') {
                            failedTokens.push(tokens[idx]);
                        }
                    }
                });
                if (failedTokens.length > 0) {
                    await prisma.userFCMToken.deleteMany({
                        where: {
                            token: {
                                in: failedTokens,
                            },
                        },
                    });
                    console.log(`Removed ${failedTokens.length} invalid FCM tokens for user ${userId}`);
                }
            }
            return true;
        }
        else {
            console.warn('Firebase Admin is not initialized, cannot send push notification.');
            return false;
        }
    }
    catch (error) {
        console.error(`Error sending push notification to user ${userId}:`, error);
        return false;
    }
};
//# sourceMappingURL=notification.service.js.map