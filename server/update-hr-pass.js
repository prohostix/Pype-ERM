import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify' });

async function run() {
  await client.connect();
  const hash = await bcrypt.hash('password123', 12);
  const res = await client.query("UPDATE \"User\" SET password=$1 WHERE email='hrtimseducation@gmail.com' RETURNING email;", [hash]);
  console.log('Updated:', res.rows);
  await client.end();
}
run();
