import { Client } from 'pg';
async function main() {
  const client = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await client.connect();
  
  const delRes = await client.query('DELETE FROM "Attendance" WHERE id = $1', ['4a54adcd-1698-4d87-bd9a-4f42a15e30ae']);
  console.log('Deleted duplicate attendance row:', delRes.rowCount);
  
  await client.end();
}
main();
