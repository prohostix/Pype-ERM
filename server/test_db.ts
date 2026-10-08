import { Client } from 'pg';
async function main() {
  const client = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await client.connect();
  const res = await client.query('SELECT id, "studyCenterId", "role" FROM "User" WHERE "email" = \'cccccc@gmail.com\';');
  console.log(res.rows);
  await client.end();
}
main();
