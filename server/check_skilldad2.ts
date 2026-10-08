import { Client } from 'pg';
async function main() {
  const client = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await client.connect();
  
  const userRes2 = await client.query('SELECT id, email, name FROM "User" WHERE email ILIKE $1', ['%skilldad%']);
  console.log('Found users:', userRes2.rows);
  if (userRes2.rows.length === 0) {
    await client.end();
    return;
  }
  
  const empId = userRes2.rows.find(u => u.email.includes('operation'))?.id || userRes2.rows[0].id;
  
  console.log('Checking attendances for Employee ID:', empId);
  
  const attRes = await client.query('SELECT id, date, "checkIn", "checkOut", status, notes FROM "Attendance" WHERE "employeeId" = $1 ORDER BY date DESC LIMIT 10', [empId]);
  console.log('Recent Attendances:', JSON.stringify(attRes.rows, null, 2));
  
  await client.end();
}
main();
