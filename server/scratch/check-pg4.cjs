const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const junaid = await client.query("SELECT * FROM \"Student\" WHERE name = 'MOHAMED JUNAID V'");
  const student = junaid.rows[0];
  console.log("Junaid:", { universityId: student.universityId, sessionId: student.sessionId, programId: student.programId });

  const univFees = await client.query("SELECT * FROM \"FeeStructure\" WHERE \"universityId\" = $1", [student.universityId]);
  console.log("University fees for Junaid's university:", JSON.stringify(univFees.rows, null, 2));
  
  await client.end();
}
main().catch(console.error);
