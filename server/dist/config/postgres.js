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
const prisma = new PrismaClient({ adapter: adapter });
export const connectPostgres = async () => {
    try {
        await prisma.$connect();
        console.log('✅ PostgreSQL Connected: Local PYPE ERM DB (via Prisma 7 + Driver Adapter)');
    }
    catch (error) {
        console.error('❌ PostgreSQL connection failed:', error);
    }
};
export { prisma };
export default prisma;
//# sourceMappingURL=postgres.js.map