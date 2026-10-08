import { Client } from 'pg';

async function main() {
  const db = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await db.connect();

  console.log('Finding user...');
  const userRes = await db.query(
    `SELECT id, name, "organizationId" FROM "User" WHERE name ILIKE $1`,
    ['%Ajanya Chandran%']
  );

  if (userRes.rows.length === 0) {
    console.log('User not found!');
    await db.end();
    return;
  }
  
  console.log('Users found:', userRes.rows);
  
  for (const user of userRes.rows) {
    // Let's verify org
    const orgRes = await db.query('SELECT name FROM "Organization" WHERE id = $1', [user.organizationId]);
    console.log(`User ${user.name} is in org: ${orgRes.rows[0]?.name}`);
    
    if (orgRes.rows[0]?.name.toLowerCase().includes('medugare') || orgRes.rows[0]?.name.toLowerCase().includes('medu')) {
      // Find today's attendance record (Oct 5th)
      const targetDate = new Date('2026-10-04T18:30:00.000Z'); // Assuming IST, today is Oct 5th, so UTC date stored is Oct 4th 18:30
      // wait, sometimes dates are stored as 2026-10-05T00:00:00.000Z or similar depending on the code
      
      const attRes = await db.query(
        `SELECT id, date FROM "Attendance" WHERE "employeeId" = $1 ORDER BY date DESC LIMIT 5`,
        [user.id]
      );
      
      console.log(`Recent attendances for ${user.name}:`);
      console.log(attRes.rows.map(r => ({ id: r.id, date: r.date.toISOString() })));
      
      // Look for the one that is for Oct 5th
      const todayRecord = attRes.rows.find(r => r.date.toISOString().startsWith('2026-10-04T18:30:00.000Z') || r.date.toISOString().startsWith('2026-10-05T00:00:00.000Z'));
      
      if (todayRecord) {
        console.log(`Deleting attendance ${todayRecord.id} for date ${todayRecord.date.toISOString()}`);
        await db.query(`DELETE FROM "Attendance" WHERE id = $1`, [todayRecord.id]);
        console.log('Successfully deleted!');
      } else {
        console.log('No attendance record found for today.');
      }
    }
  }

  await db.end();
}

main().catch(console.error);
