import { PrismaClient } from '../generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

import { parse as parseConnectionString } from 'pg-connection-string';

const pgConfig = parseConnectionString(process.env.DATABASE_URL || '');
const poolConfig: pg.PoolConfig = {
  host: pgConfig.host || undefined,
  port: pgConfig.port ? parseInt(pgConfig.port, 10) : undefined,
  database: pgConfig.database || undefined,
  user: pgConfig.user || undefined,
  password: pgConfig.password || undefined,
  ssl: { rejectUnauthorized: false }
};
const pool = new pg.Pool(poolConfig);

const adapter = new PrismaPg(pool as any);

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter: adapter as any,
    log: ['error', 'warn'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
