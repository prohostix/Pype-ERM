import { PrismaClient } from '../generated/client/index.js';

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { parse as parseConnectionString } from 'pg-connection-string';

const pgConfig = parseConnectionString(process.env.DATABASE_URL || '');
const poolConfig: pg.PoolConfig = {
  host: pgConfig.host || undefined,
  port: pgConfig.port ? parseInt(pgConfig.port, 10) : undefined,
  database: pgConfig.database || undefined,
  user: pgConfig.user || undefined,
  password: pgConfig.password || undefined,
  ssl: { rejectUnauthorized: false },
  // A connection that sat idle can be silently dropped by RDS, a NAT or a router. Without these
  // settings the next query on it just hangs until the socket times out (about 30 seconds).
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  idleTimeoutMillis: 30_000,        // retire idle connections before the network kills them
  connectionTimeoutMillis: 10_000,  // fail fast instead of waiting for a free or new connection
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
};
const pool = new pg.Pool(poolConfig);
// An idle connection that errors must not crash the server; the pool replaces it
pool.on('error', (err) => console.error('[db] idle connection error:', err.message));

const adapter = new PrismaPg(pool as any);

const basePrisma = new PrismaClient({
  adapter: adapter as any,
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
              const userId = (result as any).userId || (args.data as any).userId;
              const title = (result as any).title || (args.data as any).title;
              const message = (result as any).message || (args.data as any).message;
              const link = (result as any).link || (args.data as any).link || '';

              if (userId && title && message) {
                sendPushNotification(userId as string, title as string, message as string, { link: link as string })
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
                Promise.allSettled(
                  dataArray.map(item => {
                    const userId = (item as any).userId;
                    const title = (item as any).title;
                    const message = (item as any).message;
                    const link = (item as any).link || '';
                    if (userId && title && message) {
                      return sendPushNotification(userId as string, title as string, message as string, { link: link as string });
                    }
                    return Promise.resolve(false);
                  })
                ).catch(err => console.error('Error in batch push notifications:', err));
              })
              .catch(err => console.error('Failed to load notification service:', err));
          }
          return result;
        }
      }
    }
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
