import { Client } from 'pg';
async function main() {
  const client = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await client.connect();
  
  const userRes = await client.query('SELECT id, email FROM "User" WHERE email = $1', ['operation@skilldad']);
  if (userRes.rows.length === 0) {
    console.log('No user found with email operation@skilldad');
    // Try with .com or something? Let's check with ILIKE just in case.
    const userRes2 = await client.query('SELECT id, email FROM "User" WHERE email ILIKE $1', ['%operation@skilldad%']);
    if (userRes2.rows.length === 0) {
      console.log('No user found at all');
      await client.end();
      return;
    } else {
      console.log('Found with fuzzy search:', userRes2.rows[0]);
      var empId = userRes2.rows[0].id;
    }
  } else {
    var empId = userRes.rows[0].id;
  }
  
  console.log('Employee ID:', empId);
  
  const attRes = await client.query('SELECT id, date, "checkIn", "checkOut", status, notes FROM "Attendance" WHERE "employeeId" = $1 ORDER BY date DESC LIMIT 10', [empId]);
  console.log('Recent Attendances:', JSON.stringify(attRes.rows, null, 2));
  
  await client.end();
}
main();
