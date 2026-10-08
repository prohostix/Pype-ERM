const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  
  const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'PaymentEntry'`);
  console.log(res.rows);
  
  const res2 = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'EnrollmentPayment'`);
  console.log(res2.rows);

  await client.end();
}

main().catch(console.error);
