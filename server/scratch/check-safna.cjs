const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const sha = await client.query("SELECT * FROM \"Student\" WHERE name = 'Safna E'");
  const student = sha.rows[0];
  console.log("Safna:", { universityId: student.universityId, sessionId: student.sessionId, programId: student.programId });

  const progFees = await client.query("SELECT * FROM \"FeeStructure\" WHERE \"programId\" = $1", [student.programId]);
  console.log("Program fees for Safna:", JSON.stringify(progFees.rows, null, 2));

  await client.end();
}
main().catch(console.error);
