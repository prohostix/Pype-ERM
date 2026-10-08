const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT *
      FROM "FeeStructure"
      WHERE "programId" = '754e37a0-8895-41da-b303-bc9a66dcc34e'
    `);
    console.log('Fee Structure:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }

  await client.end();
}

main().catch(console.error);
