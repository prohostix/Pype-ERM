const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  // check what fee structures exist for this organization
  const feeStructures = await client.query("SELECT * FROM \"FeeStructure\" WHERE \"organizationId\" = $1", ['12d196f2-a642-4fce-94ad-22f458d5733e']);
  console.log("FeeStructures:", feeStructures.rows.map(r => ({ id: r.id, programId: r.programId, universityId: r.universityId, sessionId: r.sessionId, level: r.feeLevel })));
  
  await client.end();
}
main().catch(console.error);
