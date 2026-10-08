const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT 
        fs.id AS "FeeStructure_ID",
        fs."sessionId",
        fs."specialisation",
        p.name AS "Program_Name",
        p.code AS "Program_Code",
        u.name AS "University_Name"
      FROM "FeeStructure" fs
      LEFT JOIN "Program" p ON fs."programId" = p.id
      LEFT JOIN "University" u ON fs."universityId" = u.id
      WHERE fs.id = '362c0b31-3688-4066-9811-3db2245a5e6a'
    `);
    
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }

  await client.end();
}

main().catch(console.error);
