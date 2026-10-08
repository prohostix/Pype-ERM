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
const bucketName = process.env.AWS_S3_BUCKET_NAME || 'pype-erm-uploads';

async function main() {
  const db = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await db.connect();

  let isTruncated = true;
  let continuationToken: string | undefined = undefined;
  
  const unattached = [];
  
  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
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
      
      // Only care about Oct 1 and later
      if (punchTime.getTime() < new Date('2026-10-01').getTime()) continue;
      
      const punchStart = new Date(punchTime);
      punchStart.setHours(0, 0, 0, 0);
      const punchEnd = new Date(punchTime);
      punchEnd.setHours(23, 59, 59, 999);
      
      const res = await db.query(
        `SELECT id, "checkOutPhoto" FROM "Attendance" WHERE "employeeId" = $1 AND date >= $2 AND date <= $3`,
        [userId, punchStart, punchEnd]
      );
      
      if (res.rows.length === 0) {
        // No record found for this time window!
        // Let's see if ANY record exists within 2 days
        const wideStart = new Date(punchStart.getTime() - 48*60*60*1000);
        const wideEnd = new Date(punchEnd.getTime() + 48*60*60*1000);
        const resWide = await db.query(
          `SELECT id, date, "checkOutPhoto" FROM "Attendance" WHERE "employeeId" = $1 AND date >= $2 AND date <= $3`,
          [userId, wideStart, wideEnd]
        );
        
        const userRes = await db.query('SELECT name, email FROM "User" WHERE id = $1', [userId]);
        const userName = userRes.rows[0]?.name || userId;
        
        unattached.push({
          key,
          userName,
          punchTime: punchTime.toISOString(),
          foundRecordsInRange: resWide.rows.length,
          datesFound: resWide.rows.map(r => r.date)
        });
      }
    }
    
    isTruncated = response.IsTruncated || false;
    continuationToken = response.NextContinuationToken;
  }
  
  console.log(`Found ${unattached.length} photos that failed to attach due to missing attendance records.`);
  console.log(JSON.stringify(unattached.slice(0, 10), null, 2));
  
  await db.end();
}
main().catch(console.error);
