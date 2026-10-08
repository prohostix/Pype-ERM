import pg from 'pg';
import dotenv from 'dotenv';
import { parse as parseConnectionString } from 'pg-connection-string';

dotenv.config();

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

async function main() {
  try {
    await pool.query(`UPDATE "Organization" SET "customLoginSlug" = NULL, "loginBranding" = NULL WHERE "customLoginSlug" = 'xyz';`);
    console.log('✅ Cleared xyz slug so you can test the new logic');
  } catch (error) {
    console.error('❌ Error updating database:', error);
  } finally {
    await pool.end();
  }
}

main();
