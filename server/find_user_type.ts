import { Client } from 'pg';

async function main() {
  const db = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await db.connect();

  const userRes = await db.query(
    `SELECT id, name, email, role, type, designation FROM "User" WHERE email ILIKE $1`,
    ['athirapkgireesan@gmail.com']
  );

  if (userRes.rows.length === 0) {
    // maybe it's a Student?
    const stdRes = await db.query(
      `SELECT id, name, email, role FROM "Student" WHERE email ILIKE $1`,
      ['athirapkgireesan@gmail.com']
    );
    if (stdRes.rows.length === 0) {
      console.log('User not found in User or Student tables.');
    } else {
      console.log('Found in Student table:', stdRes.rows[0]);
    }
  } else {
    console.log('Found in User table:', userRes.rows[0]);
  }
  
  await db.end();
}

main().catch(console.error);
