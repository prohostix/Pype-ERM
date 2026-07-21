const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const progFees = await client.query("SELECT * FROM \"FeeStructure\" WHERE \"programId\" = '84f98559-5ad9-4844-839b-431af9d9ea6b'");
  console.log("Program fees for Sahal:", JSON.stringify(progFees.rows, null, 2));

  await client.end();
}
main().catch(console.error);
