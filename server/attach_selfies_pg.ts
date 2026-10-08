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
  console.log('Connecting to database...');
  const db = new Client({ connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify' });
  await db.connect();

  console.log('Listing S3 objects...');
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: 'selfie-out-'
  });
  const response = await s3.send(command);
  
  if (!response.Contents || response.Contents.length === 0) {
    console.log('No selfie-out images found in S3.');
    await db.end();
    return;
  }
  
  console.log(`Found ${response.Contents.length} selfie-out images.`);
  
  let attachedCount = 0;
  
  for (const obj of response.Contents) {
    const key = obj.Key!;
    // format: selfie-out-{userId}-{timestamp}.jpg
    const match = key.match(/^selfie-out-(.+)-(\d+)\.jpg$/);
    if (!match) continue;
    
    const userId = match[1];
    const timestamp = parseInt(match[2]);
    const punchTime = new Date(timestamp);
    
    // Only care about Oct 2 to Oct 5 roughly
    if (punchTime.getTime() < new Date('2026-10-01').getTime()) continue;
    
    // Calculate normalized date the same way server does (IST local)
    const punchStart = new Date(punchTime);
    punchStart.setHours(0, 0, 0, 0);
    const punchEnd = new Date(punchTime);
    punchEnd.setHours(23, 59, 59, 999);
    
    const res = await db.query(
      `SELECT id, "checkOutPhoto", notes FROM "Attendance" WHERE "employeeId" = $1 AND date >= $2 AND date <= $3`,
      [userId, punchStart, punchEnd]
    );
    
    if (res.rows.length > 0) {
      const existing = res.rows[0];
      if (!existing.checkOutPhoto) {
        console.log(`Attaching ${key} to attendance ${existing.id} for user ${userId}`);
        const notes = existing.notes ? existing.notes + '\n(Recovered offline punch-out photo)' : '(Recovered offline punch-out photo)';
        await db.query(
          `UPDATE "Attendance" SET "checkOutPhoto" = $1, notes = $2 WHERE id = $3`,
          [`/api/v1/uploads/${key}`, notes, existing.id]
        );
        attachedCount++;
      }
    }
  }
  
  console.log(`Successfully attached ${attachedCount} photos to database records!`);
  await db.end();
}

main().catch(console.error);
