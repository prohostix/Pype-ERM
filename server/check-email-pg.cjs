const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  const res = await client.query(`SELECT id, name, email, role FROM "User" WHERE email ILIKE $1`, ['%bishrulhafi676%']);
  console.log(`Found ${res.rows.length} users with email containing 'bishrulhafi676':`);
  console.log(res.rows);
  
  try {
    const res2 = await client.query(`SELECT id, name, email FROM "Student" WHERE email ILIKE $1`, ['%bishrulhafi676%']);
    console.log(`Found ${res2.rows.length} students with email containing 'bishrulhafi676':`);
    console.log(res2.rows);
  } catch(e) {
    // maybe no student table
  }
  
  await client.end();
}

main().catch(console.error);
