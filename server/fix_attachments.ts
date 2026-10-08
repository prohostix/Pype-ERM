import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const db = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await db.connect();

  console.log('Undoing bad attachments...');
  
  // 1. Fetch all bad attachments
  const badRes = await db.query(`SELECT id, "employeeId", "checkOutPhoto", notes FROM "Attendance" WHERE notes LIKE '%Recovered offline punch-out photo%'`);
  
  const orphanPhotos = [];
  
  for (const row of badRes.rows) {
    orphanPhotos.push({ employeeId: row.employeeId, photoUrl: row.checkOutPhoto });
    
    // Remove the photo and the note suffix
    const newNotes = row.notes.replace(/\n?\(Recovered offline punch-out photo\)/g, '').trim() || null;
    await db.query(`UPDATE "Attendance" SET "checkOutPhoto" = NULL, notes = $1 WHERE id = $2`, [newNotes, row.id]);
  }
  
  console.log(`Detached ${badRes.rows.length} photos.`);
  
  // 2. Attach them to October 3rd (Saturday)
  // October 3rd IST normalized to UTC is 2026-10-02T18:30:00.000Z
  const targetDate = new Date('2026-10-02T18:30:00.000Z');
  
  let successCount = 0;
  for (const { employeeId, photoUrl } of orphanPhotos) {
    const oct3Res = await db.query(
      `SELECT id, notes FROM "Attendance" WHERE "employeeId" = $1 AND date = $2`,
      [employeeId, targetDate]
    );
    
    if (oct3Res.rows.length > 0) {
      const targetRecord = oct3Res.rows[0];
      const newNotes = targetRecord.notes ? targetRecord.notes + '\n(Recovered offline punch-out photo)' : '(Recovered offline punch-out photo)';
      
      await db.query(
        `UPDATE "Attendance" SET "checkOutPhoto" = $1, notes = $2 WHERE id = $3`,
        [photoUrl, newNotes, targetRecord.id]
      );
      successCount++;
    } else {
      console.log(`No Oct 3rd record found for employee ${employeeId} to attach ${photoUrl}`);
    }
  }
  
  console.log(`Successfully attached ${successCount} photos to October 3rd records!`);
  
  await db.end();
}
main().catch(console.error);
