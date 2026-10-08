const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  
  const enrolls = await client.query(`SELECT id, "studentEmail", status, "salesUserId" FROM "Enrollment" WHERE "studentEmail" ILIKE $1`, ['%bishrulhafi676%']);
  console.log('All Enrollments with this email:', enrolls.rows);
  
  await client.end();
}

main().catch(console.error);
