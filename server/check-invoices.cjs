const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  
  const studentEmail = 'bishrulhafi676@gmail.com';
  
  try {
    const res = await client.query(`
      SELECT i.id, i."invoiceNo", i.amount, i.total, i.status, i.items 
      FROM "Invoice" i
      JOIN "Student" s ON i."studentId" = s.id
      WHERE s.email = $1
    `, [studentEmail]);
    console.log('Invoices for student:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }

  await client.end();
}

main().catch(console.error);
