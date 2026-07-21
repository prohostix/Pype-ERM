const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const progs = await client.query("SELECT id, name, \"universityId\" FROM \"Program\" WHERE name = 'MBA'");
  console.log("MBA Programs:", progs.rows);
  
  await client.end();
}
main().catch(console.error);
