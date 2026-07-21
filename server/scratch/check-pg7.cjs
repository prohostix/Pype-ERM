const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const sha = await client.query("SELECT * FROM \"Student\" WHERE name = 'MUHAMMED SHA S'");
  const student = sha.rows[0];
  console.log("Sha:", { universityId: student.universityId, sessionId: student.sessionId, programId: student.programId });

  const progFees = await client.query("SELECT * FROM \"FeeStructure\" WHERE \"programId\" = $1", [student.programId]);
  console.log("Program fees for Sha:", JSON.stringify(progFees.rows, null, 2));

  const univFees = await client.query("SELECT * FROM \"FeeStructure\" WHERE \"universityId\" = $1", [student.universityId]);
  console.log("University fees for Sha:", JSON.stringify(univFees.rows, null, 2));
  
  await client.end();
}
main().catch(console.error);
