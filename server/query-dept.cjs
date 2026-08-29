const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
async function main() {
  await client.connect();
  const res = await client.query('SELECT name FROM "Department"');
  console.log(res.rows);
  await client.end();
}
main().catch(console.error);
