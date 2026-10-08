import { Client } from 'pg';
async function main() {
  const client = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await client.connect();
  
  const orgRes = await client.query('SELECT id, name FROM "Organization" WHERE name ILIKE \'%xyz%\' OR email ILIKE \'%xyz%\' LIMIT 1');
  if (orgRes.rows.length === 0) {
    console.log('No org found');
    await client.end();
    return;
  }
  
  const orgId = orgRes.rows[0].id;
  console.log('Found org:', orgRes.rows[0].name, orgId);
  
  const delRes = await client.query('DELETE FROM "Attendance" WHERE "organizationId" = $1', [orgId]);
  console.log('Deleted attendance rows:', delRes.rowCount);
  
  await client.end();
}
main();
