const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT id, name, code, specialisations 
      FROM "Program" 
      WHERE name ILIKE '%SENIOR SECONDARY - COMMERCE%'
    `);
    console.log('Programs:', res.rows);
    
    for (let p of res.rows) {
      const fs = await client.query(`SELECT * FROM "FeeStructure" WHERE "programId" = $1`, [p.id]);
      console.log(`Fee structures for ${p.id}:`, fs.rows.map(f => ({
        id: f.id,
        specialisation: f.specialisation,
        tuitionFee: f.tuitionFee,
        universityFee: f.universityFee,
        gst: f.gstPercentage
      })));
    }
  } catch (err) {
    console.log('Error:', err.message);
  }

  await client.end();
}

main().catch(console.error);
