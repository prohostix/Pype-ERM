const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const feeStructures = await client.query("SELECT * FROM \"FeeStructure\" WHERE \"programId\" = $1", ['90cc6d27-26ee-4ad7-87a1-5c1c37ffed26']);
  console.log("FeeStructures for JUNAID program:", JSON.stringify(feeStructures.rows, null, 2));

  // Let's also check if they are in different sessions.
  await client.end();
}
main().catch(console.error);
