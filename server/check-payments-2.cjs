const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  
  const enrollmentId = 'cb225ac1-e3e1-40d9-9479-dcf7386aae42';
  
  try {
    const p1 = await client.query(`SELECT * FROM "EnrollmentPayment" WHERE "enrollmentId" = $1`, [enrollmentId]);
    console.log('EnrollmentPayments:', p1.rows);
  } catch (err) {
    console.log('Error 1:', err.message);
  }
  
  try {
    const p2 = await client.query(`SELECT * FROM "PaymentEntry" WHERE "studentId" = (SELECT "studentId" FROM "Enrollment" WHERE id = $1)`, [enrollmentId]);
    console.log('PaymentEntries:', p2.rows);
  } catch (err) {
    console.log('Error 2:', err.message);
  }

  await client.end();
}

main().catch(console.error);
