const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const junaid = await client.query("SELECT * FROM \"Program\" WHERE id = '90cc6d27-26ee-4ad7-87a1-5c1c37ffed26'");
  console.log("Junaid's Program:", junaid.rows);
  
  await client.end();
}
main().catch(console.error);
