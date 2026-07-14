import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify' });
await client.connect();
const res = await client.query("SELECT id, email, role, \"organizationId\" FROM \"User\" WHERE role='hr_admin' LIMIT 1;");
console.log(res.rows);
await client.end();
