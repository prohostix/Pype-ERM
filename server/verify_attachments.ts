import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const db = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await db.connect();

  const res = await db.query(`SELECT id, "employeeId", date, "checkOutPhoto" FROM "Attendance" WHERE notes LIKE '%Recovered offline punch-out photo%'`);
  
  console.log(`Found ${res.rows.length} recently recovered attendances.`);
  for (const row of res.rows) {
    const userRes = await db.query('SELECT name FROM "User" WHERE id = $1', [row.employeeId]);
    console.log(`User: ${userRes.rows[0]?.name}, Attached Date: ${row.date.toISOString()}, Photo: ${row.checkOutPhoto}`);
  }
  
  await db.end();
}
main().catch(console.error);
