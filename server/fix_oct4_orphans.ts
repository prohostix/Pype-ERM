import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

async function main() {
  const db = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await db.connect();

  console.log('Fetching orphan S3 objects...');
  let isTruncated = true;
  let continuationToken: string | undefined = undefined;
  
  let successCount = 0;
  
  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET_NAME || 'pype-erm-uploads',
      Prefix: 'selfie-out-',
      ContinuationToken: continuationToken
    });
    const response = await s3.send(command);
    if (!response.Contents) break;
    
    for (const obj of response.Contents) {
      const key = obj.Key!;
      const match = key.match(/^selfie-out-(.+)-(\d+)\.jpg$/);
      if (!match) continue;
      
      const userId = match[1];
      const timestamp = parseInt(match[2]);
      const punchTime = new Date(timestamp);
      
      if (punchTime.getTime() < new Date('2026-10-01').getTime()) continue;
      
      // Let's check if this specific photo is ALREADY attached to ANY record
      const checkRes = await db.query(
        `SELECT id FROM "Attendance" WHERE "checkOutPhoto" LIKE $1`,
        [`%${key}%`]
      );
      
      if (checkRes.rows.length === 0) {
        // This is an orphan photo!
        console.log(`Orphan photo found: ${key}`);
        
        // Let's find their Oct 4th record (2026-10-03T18:30:00.000Z)
        const oct4Res = await db.query(
          `SELECT id, notes FROM "Attendance" WHERE "employeeId" = $1 AND date = '2026-10-03T18:30:00.000Z'`,
          [userId]
        );
        
        if (oct4Res.rows.length > 0) {
          const target = oct4Res.rows[0];
          console.log(`Attaching to Oct 4th record for user ${userId}`);
          const newNotes = target.notes ? target.notes + '\n(Recovered offline punch-out photo)' : '(Recovered offline punch-out photo)';
          
          await db.query(
            `UPDATE "Attendance" SET "checkOutPhoto" = $1, notes = $2 WHERE id = $3`,
            [`/api/v1/uploads/${key}`, newNotes, target.id]
          );
          successCount++;
        } else {
          // What about Oct 3rd?
          const oct3Res = await db.query(
            `SELECT id, notes FROM "Attendance" WHERE "employeeId" = $1 AND date = '2026-10-02T18:30:00.000Z'`,
            [userId]
          );
          if (oct3Res.rows.length > 0) {
            const target = oct3Res.rows[0];
            console.log(`Attaching to Oct 3rd record for user ${userId}`);
            const newNotes = target.notes ? target.notes + '\n(Recovered offline punch-out photo)' : '(Recovered offline punch-out photo)';
            
            await db.query(
              `UPDATE "Attendance" SET "checkOutPhoto" = $1, notes = $2 WHERE id = $3`,
              [`/api/v1/uploads/${key}`, newNotes, target.id]
            );
            successCount++;
          }
        }
      }
    }
    isTruncated = response.IsTruncated || false;
    continuationToken = response.NextContinuationToken;
  }
  
  console.log(`Successfully attached ${successCount} orphan photos!`);
  await db.end();
}
main().catch(console.error);
