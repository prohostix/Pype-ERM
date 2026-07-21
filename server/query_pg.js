const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL || "postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify",
});
async function main() {
  await client.connect();
  const res = await client.query('SELECT count(*) FROM "PaymentSchedule"');
  console.log("Total payment schedules:", res.rows[0].count);
  const students = await client.query('SELECT count(*) FROM "Student"');
  console.log("Total students:", students.rows[0].count);
  await client.end();
}
main().catch(console.error);
