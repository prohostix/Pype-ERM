const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  
  const res = await client.query("SELECT * FROM \"Student\" WHERE name IN ('LUBAIBA P V', 'MOHAMED JUNAID V', 'MOHAMED ASLAM V K')");
  console.log("Students:", res.rows.map(r => ({ name: r.name, programId: r.programId, sessionId: r.sessionId })));

  if (res.rows.length > 0) {
    const programId = res.rows[0].programId;
    const feeStructures = await client.query("SELECT * FROM \"FeeStructure\" WHERE \"programId\" = $1", [programId]);
    console.log("FeeStructures for program:", feeStructures.rows);
  }

  await client.end();
}
main().catch(console.error);
