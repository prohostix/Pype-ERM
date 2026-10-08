import { Client } from 'pg';

async function main() {
  const db = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await db.connect();

  console.log('Finding user hr@xyz.com...');
  const userRes = await db.query(
    `SELECT id, name, email FROM "User" WHERE email ILIKE $1`,
    ['hr@xyz.com']
  );

  if (userRes.rows.length === 0) {
    console.log('User not found!');
    await db.end();
    return;
  }
  
  const user = userRes.rows[0];
  console.log(`Found user: ${user.name} (${user.email}), ID: ${user.id}`);
  
  // Delete all attendance records for this user
  const delRes = await db.query(`DELETE FROM "Attendance" WHERE "employeeId" = $1`, [user.id]);
  console.log(`Deleted ${delRes.rowCount} attendance records for hr@xyz.com`);

  await db.end();
}

main().catch(console.error);
