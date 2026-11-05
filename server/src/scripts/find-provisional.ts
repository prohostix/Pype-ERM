import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  console.log('=== ALL ORGANIZATIONS ===');
  const orgs = await client.query(`
    SELECT o.id, o.name, o.email, o.phone, o.address, 
           COUNT(s.id) as student_count
    FROM "Organization" o
    LEFT JOIN "Student" s ON s."organizationId" = o.id
    GROUP BY o.id, o.name, o.email, o.phone, o.address
    ORDER BY student_count DESC
  `);
  console.log(orgs.rows);

  console.log('\n=== STUDY CENTERS IN TIMS OR EDUFOLIO ===');
  const centers = await client.query(`
    SELECT sc.id, sc.name, sc.code, o.name as orgName
    FROM "StudyCenter" sc
    LEFT JOIN "Organization" o ON sc."organizationId" = o.id
  `);
  console.log(centers.rows);

  console.log('\n=== ANY STUDENT NAMED GALIB/GHALIB/BIN AHAMED IN ANY TABLE IN DB ===');
  const allTables = await client.query(`
    SELECT 'Student' as tbl, s.id, s.name, s.email, s.phone, s.status, o.name as org
    FROM "Student" s
    LEFT JOIN "Organization" o ON s."organizationId" = o.id
    WHERE s.name ILIKE '%Galib%' OR s.name ILIKE '%Ghalib%' OR s.email ILIKE '%almashoor%'
    UNION ALL
    SELECT 'Enrollment' as tbl, e.id, e."studentName", e."studentEmail", e."studentPhone", e.status, o.name as org
    FROM "Enrollment" e
    LEFT JOIN "Organization" o ON e."organizationId" = o.id
    WHERE e."studentName" ILIKE '%Galib%' OR e."studentName" ILIKE '%Ghalib%' OR e."studentEmail" ILIKE '%almashoor%'
    UNION ALL
    SELECT 'User' as tbl, u.id, u.name, u.email, u.phone, u.status, o.name as org
    FROM "User" u
    LEFT JOIN "Organization" o ON u."organizationId" = o.id
    WHERE u.name ILIKE '%Galib%' OR u.name ILIKE '%Ghalib%' OR u.email ILIKE '%almashoor%'
  `);
  console.log(allTables.rows);

  await client.end();
}

run().catch(console.error);
