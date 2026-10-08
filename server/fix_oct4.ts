import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const db = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await db.connect();

  console.log('Checking for photos that should belong to Oct 4th...');
  
  // Find all Oct 3rd records that have the recovered photo
  const oct3Res = await db.query(
    `SELECT id, "employeeId", "checkOutPhoto", notes FROM "Attendance" 
     WHERE date = '2026-10-02T18:30:00.000Z' 
     AND notes LIKE '%Recovered offline punch-out photo%'`
  );
  
  let movedCount = 0;
  
  for (const row of oct3Res.rows) {
    // Check if this user had an attendance record on Oct 4th
    const oct4Res = await db.query(
      `SELECT id, "checkIn", "checkOut", "checkOutPhoto", notes FROM "Attendance" 
       WHERE "employeeId" = $1 AND date = '2026-10-03T18:30:00.000Z'`,
      [row.employeeId]
    );
    
    if (oct4Res.rows.length > 0) {
      const oct4Record = oct4Res.rows[0];
      
      // If the user checked in on Oct 4th, or has an auto-absent on Oct 4th
      // We should check if the selfie filename timestamp indicates they synced on the 4th or 5th
      const match = row.checkOutPhoto.match(/-(\d+)\.jpg$/);
      if (match) {
        const timestamp = parseInt(match[1]);
        const syncTime = new Date(timestamp);
        
        // If they synced on or after Oct 4th, and they have an active Oct 4th record
        // Did they actually punch out on Oct 4th?
        console.log(`User ${row.employeeId} has Oct 4th record. Sync time: ${syncTime.toISOString()}`);
      }
    }
  }
  
  await db.end();
}
main().catch(console.error);
