const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  
  try {
    const res = await client.query(`DELETE FROM "Enrollment" WHERE id = 'da89ee5e-3ed2-4662-90d6-798901429665' RETURNING id, "studentEmail", status`);
    console.log('Deleted Enrollment:', res.rows);
  } catch (err) {
    console.error('Error deleting enrollment:', err.message);
  }
  
  await client.end();
}

main().catch(console.error);
