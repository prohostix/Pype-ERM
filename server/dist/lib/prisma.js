import { PrismaClient } from '../generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
import { parse as parseConnectionString } from 'pg-connection-string';
const pgConfig = parseConnectionString(process.env.DATABASE_URL || '');
const poolConfig = {
    host: pgConfig.host || undefined,
    port: pgConfig.port ? parseInt(pgConfig.port, 10) : undefined,
    database: pgConfig.database || undefined,
    user: pgConfig.user || undefined,
    password: pgConfig.password || undefined,
    ssl: { rejectUnauthorized: false }
};
const pool = new pg.Pool(poolConfig);
const adapter = new PrismaPg(pool);
const basePrisma = new PrismaClient({
    adapter: adapter,
    log: ['error', 'warn'],
});
const prismaClientSingleton = () => {
    return basePrisma.$extends({
        query: {
            notification: {
                async create({ args, query }) {
                    const result = await query(args);
                    // Trigger push notification asynchronously using dynamic import to avoid circular dependencies
                    import('../services/notification.service.js')
                        .then(({ sendPushNotification }) => {
                        const userId = result.userId || args.data.userId;
                        const title = result.title || args.data.title;
                        const message = result.message || args.data.message;
                        const link = result.link || args.data.link || '';
                        if (userId && title && message) {
                            sendPushNotification(userId, title, message, { link: link })
                                .catch(err => console.error('Error sending push notification from Prisma extension:', err));
                        }
                    })
                        .catch(err => console.error('Failed to load notification service:', err));
                    return result;
                },
                async createMany({ args, query }) {
                    const result = await query(args);
                    // For createMany, we extract the data and send push notifications for each
                    if (args.data) {
                        const dataArray = Array.isArray(args.data) ? args.data : [args.data];
                        import('../services/notification.service.js')
                            .then(({ sendPushNotification }) => {
                            Promise.allSettled(dataArray.map(item => {
                                const userId = item.userId;
                                const title = item.title;
                                const message = item.message;
                                const link = item.link || '';
                                if (userId && title && message) {
                                    return sendPushNotification(userId, title, message, { link: link });
                                }
                                return Promise.resolve(false);
                            })).catch(err => console.error('Error in batch push notifications:', err));
                        })
                            .catch(err => console.error('Failed to load notification service:', err));
                    }
                    return result;
                }
            }
        }
    });
};
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
export default prisma;
if (process.env.NODE_ENV !== 'production')
    globalThis.prismaGlobal = prisma;
//# sourceMappingURL=prisma.js.map