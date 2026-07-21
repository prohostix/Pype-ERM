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
    const programId = res.rows.find(r => r.name === 'LUBAIBA P V').programId;
    const feeStructures = await client.query("SELECT * FROM \"FeeStructure\" WHERE \"programId\" = $1", [programId]);
    console.log("FeeStructures for LUBAIBA program:", JSON.stringify(feeStructures.rows, null, 2));

    const junaid = res.rows.find(r => r.name === 'MOHAMED JUNAID V');
    const junaidProgramId = junaid.programId;
    console.log("Are program IDs the same?", programId === junaidProgramId);
  }

  await client.end();
}
main().catch(console.error);
